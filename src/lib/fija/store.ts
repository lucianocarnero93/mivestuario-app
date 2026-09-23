import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "./format";
import { notifyApp, notifyReminder } from "./notify";
import { createSeed, emptyClubState, GUEST_ID, openClubs } from "./seed";
import { sanitizeCode, sanitizeName, sanitizeText } from "./sanitize";
import { clampHours, hoursSince } from "./share";
import { loadClubDoc, saveClubDoc } from "./cloud";
import { clampStat, emptyStat } from "./stats";
import { safeStorage } from "./storage";
import type {
  AlertLog,
  ChatMessage,
  CharlaPost,
  Club,
  ClubBundle,
  ClubEvent,
  Convocatoria,
  EventKind,
  GpsConsent,
  InboxItem,
  Invite,
  MatchSheet,
  Member,
  Modality,
  PlayerMatchStat,
  ReminderPolicy,
  Role,
  RsvpStatus,
  Tournament,
} from "./types";

type CloudStatus = "idle" | "syncing" | "ok" | "off";

type State = ReturnType<typeof createSeed> & {
  hydrated: boolean;
  cloudStatus: CloudStatus;
  setHydrated: () => void;
  setActive: (id: string) => void;
  viewAsRole: (role: Role) => void;
  setRsvp: (eventId: string, status: RsvpStatus) => void;
  setMemberRsvp: (eventId: string, memberId: string, status: RsvpStatus) => void;
  sendReminder: (eventId: string) => void;
  dismissReminder: () => void;
  createEvent: (input: {
    kind: EventKind;
    title: string;
    place: string;
    mapsQuery?: string;
    lat?: number | null;
    lng?: number | null;
    startsAt: string;
    modality: Modality;
    tournamentId?: string | null;
  }) => void;
  updateEvent: (id: string, patch: Partial<ClubEvent>) => void;
  deleteEvent: (id: string) => void;
  setSpot: (eventId: string, slot: string, memberId: string | null) => void;
  setTactics: (eventId: string, tactics: string) => void;
  publishLineup: (eventId: string) => void;
  sendChat: (text: string) => void;
  postCharla: (text: string) => void;
  sendConvocatoria: (eventId: string) => void;
  setReminderPolicy: (policy: ReminderPolicy) => void;
  tickAlerts: () => void;
  markInboxRead: (id: string) => void;
  markAllRead: () => void;
  importSnapshot: (raw: unknown) => boolean;
  cederMando: (targetId: string) => void;
  setClubName: (name: string) => void;
  setClubCrest: (crest: string | null) => void;
  invitePlayer: (input: { name: string; nick: string; number: number | null }) => string | null;
  assignRole: (memberId: string, role: Role) => void;
  saveMatchSheet: (sheet: Omit<MatchSheet, "recordedAt">) => void;
  createTournament: (name: string) => string | null;
  finishTournament: (id: string) => void;
  setGpsConsent: (value: GpsConsent) => void;
  leaveClub: () => void;
  joinClub: (code: string) => Promise<boolean>;
  createClub: (name: string, crest?: string | null) => void;
  setProfile: (profile: { name: string; nick: string }) => void;
  setMyPhoto: (photo: string | null) => void;
  syncFromCloud: () => Promise<void>;
  flushCloud: () => Promise<void>;
  resetDemo: () => void;
};

const blank = {
  ...emptyClubState(),
  archivedClubs: [] as ReturnType<typeof createSeed>["archivedClubs"],
  profile: { name: "", nick: "" },
  gpsConsent: "unset" as const,
  activeId: GUEST_ID,
};

/*
  Memoria de la app. Todo lo que ves en pantalla sale de acá
  y se guarda en el celular. Si hay código de equipo, también se copia a la nube.

  Nombres sencillos de cada función:
  - createClub        crear equipo. Quien lo crea es el DT.
  - joinClub          entrar con el código que pasó el DT.
  - leaveClub         salir del equipo para poder entrar a otro.
  - invitePlayer      sumar un jugador al plantel.
  - assignRole        pasar a alguien a DT, ayudante o jugador.
  - createEvent       anotar un partido, entrenamiento o reunión.
  - setSpot           poner un jugador en un puesto de la cancha.
  - publishLineup     avisar que la formación ya está lista.
  - saveMatchSheet    guardar goles, asistencias y tarjetas.
  - createTournament  abrir un torneo nuevo.
  - finishTournament  cerrar el torneo. Las stats generales siguen.
  - setRsvp           el jugador dice si va o no.
  - sendChat          mensaje de la charla.
  - syncFromCloud     traer el equipo desde la nube.
  - flushCloud        subir el equipo a la nube.
*/

export const useFija = create<State>()(
  persist(
    (set, get) => ({
      ...blank,
      hydrated: false,
      cloudStatus: "idle" as CloudStatus,
      // Marca que el celular ya recuperó lo guardado.
      setHydrated: () => set({ hydrated: true }),

      // Elige qué persona del plantel está usando la app ahora.
      setActive: (personId) => set({ activeId: personId }),

      // Busca a la primera persona con ese puesto y la pone como usuario actual.
      viewAsRole: (role) => {
        const people = get().members;
        const personWithThatRole = people.find((person) => person.role === role);
        if (personWithThatRole) set({ activeId: personWithThatRole.id });
      },

      // El jugador actual dice si va, no va, o todavía no contestó.
      setRsvp: (eventId, status) => {
        const currentPersonId = get().activeId;
        const updatedAnswers = upsertRsvp(get().rsvps, eventId, currentPersonId, status);
        const someoneStillPending = updatedAnswers.some(
          (answer) => answer.eventId === eventId && answer.status === "pendiente",
        );
        set({
          rsvps: updatedAnswers,
          reminder: someoneStillPending ? get().reminder : null,
        });
      },

      // El DT anota la respuesta de otro jugador.
      setMemberRsvp: (eventId, memberId, status) => {
        set({ rsvps: upsertRsvp(get().rsvps, eventId, memberId, status) });
      },

      // Manda el aviso de "confirmá si vas" para un partido.
      sendReminder: (eventId) => {
        const event = get().events.find((item) => item.id === eventId);
        set({ reminder: { eventId, sentAt: new Date().toISOString() } });
        void notifyReminder(event);
      },

      // Cierra el cartel de recordatorio.
      dismissReminder: () => set({ reminder: null }),

      // Crea un partido, entrenamiento o reunión. Solo DT o ayudante.
      // Un partido no se crea si no hay torneo: tiene que quedar asociado a uno.
      createEvent: (input) => {
        if (!isStaffId(get())) return;
        const tournaments = get().tournaments;
        const chosen = tournaments.find((tournament) => tournament.id === input.tournamentId);
        const activeTournament = tournaments.find((tournament) => tournament.status === "active");
        const tournamentForMatch = chosen ?? activeTournament;
        if (input.kind === "partido" && !tournamentForMatch) return;
        const event: ClubEvent = {
          id: uid("ev"),
          kind: input.kind,
          title: sanitizeName(input.title) || "Partido",
          place: sanitizeName(input.place) || "A confirmar",
          mapsQuery: (input.mapsQuery ?? input.place).trim(),
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          startsAt: input.startsAt,
          modality: input.modality,
          lineup: {},
          tactics: "",
          lineupPublishedAt: null,
          tournamentId: input.kind === "partido" ? (tournamentForMatch?.id ?? null) : null,
        };
        const players = get().members.filter((person) => person.role === "jugador");
        const pendingAnswers = players.map((player) => ({
          eventId: event.id,
          memberId: player.id,
          status: "pendiente" as const,
        }));
        set({ events: [...get().events, event], rsvps: [...get().rsvps, ...pendingAnswers] });
      },

      // Cambia datos de un evento ya creado. Solo DT o ayudante.
      updateEvent: (id, patch) => {
        if (!isStaffId(get())) return;
        set({
          events: get().events.map((event) => (event.id === id ? { ...event, ...patch } : event)),
        });
      },

      // Borra el evento y todo lo que colgaba de él: respuestas, planilla y avisos.
      deleteEvent: (id) => {
        if (!isStaffId(get())) return;
        set({
          events: get().events.filter((event) => event.id !== id),
          rsvps: get().rsvps.filter((answer) => answer.eventId !== id),
          matchSheets: get().matchSheets.filter((sheet) => sheet.eventId !== id),
          convocatorias: get().convocatorias.filter((callup) => callup.eventId !== id),
          alertLog: get().alertLog.filter((alert) => alert.eventId !== id),
        });
      },

      // Pone a un jugador en un puesto de la cancha.
      // Si memberId viene vacío, saca a quien estaba en ese puesto.
      // Un jugador no puede estar en dos puestos a la vez.
      setSpot: (eventId, slot, memberId) => {
        if (!isStaffId(get())) return;
        set({
          events: get().events.map((event) => {
            if (event.id !== eventId) return event;
            const lineup = { ...event.lineup };
            if (!memberId) {
              delete lineup[slot];
            } else {
              for (const position of Object.keys(lineup)) {
                if (lineup[position] === memberId) delete lineup[position];
              }
              lineup[slot] = memberId;
            }
            return { ...event, lineup };
          }),
        });
      },

      // Guarda la nota táctica que escribe el DT debajo de la cancha.
      setTactics: (eventId, tactics) => {
        if (!isStaffId(get())) return;
        set({
          events: get().events.map((event) => (event.id === eventId ? { ...event, tactics } : event)),
        });
      },

      // Avisa a todo el plantel que la formación ya está publicada.
      publishLineup: (eventId) => {
        if (!isStaffId(get())) return;
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return;
        const moment = new Date().toISOString();
        const notice: InboxItem = {
          id: uid("in"),
          kind: "formacion",
          title: event.lineupPublishedAt ? "Formación actualizada" : "Formación publicada",
          body: `El DT colgó la pizarra para ${event.title}.`,
          eventId,
          audience: "all",
          at: moment,
          readBy: [get().activeId],
        };
        set({
          events: get().events.map((item) =>
            item.id === eventId ? { ...item, lineupPublishedAt: moment } : item,
          ),
          inbox: [...get().inbox, notice],
        });
        void notifyApp({
          body: notice.body,
          tag: `vestuario-form-${eventId}-${moment}`,
          eventId,
        });
      },

      // Manda un mensaje a la charla del equipo.
      sendChat: (text) => {
        const cleanText = sanitizeText(text, 400);
        if (!cleanText) return;
        const message: ChatMessage = {
          id: uid("msg"),
          memberId: get().activeId,
          text: cleanText,
          at: new Date().toISOString(),
        };
        set({ messages: [...get().messages, message] });
        void queueSync("vestuario-chat");
      },

      // El DT publica un aviso técnico y deja una notificación para todos.
      postCharla: (text) => {
        if (!isStaffId(get())) return;
        const cleanText = sanitizeText(text, 400);
        if (!cleanText) return;
        const post: CharlaPost = {
          id: uid("ch"),
          memberId: get().activeId,
          text: cleanText,
          at: new Date().toISOString(),
        };
        const notice: InboxItem = {
          id: uid("in"),
          kind: "charla",
          title: "Charla técnica",
          body: cleanText,
          audience: "all",
          at: post.at,
          readBy: [get().activeId],
        };
        set({
          charla: [...get().charla, post],
          inbox: [...get().inbox, notice],
        });
        void notifyApp({
          body: cleanText,
          tag: `vestuario-charla-${post.id}`,
        });
      },

      // El DT convoca al partido. Reinicia las alertas de ese partido.
      sendConvocatoria: (eventId) => {
        if (!isStaffId(get())) return;
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return;
        const moment = new Date().toISOString();
        const callup: Convocatoria = { eventId, sentAt: moment, sentBy: get().activeId };
        const notice: InboxItem = {
          id: uid("in"),
          kind: "convocatoria",
          title: `Convocatoria: ${event.title}`,
          body: `Confirmá si vas. ${event.place}.`,
          eventId,
          audience: "all",
          at: moment,
          readBy: [get().activeId],
        };
        set({
          convocatorias: [...get().convocatorias.filter((item) => item.eventId !== eventId), callup],
          alertLog: get().alertLog.filter((alert) => alert.eventId !== eventId),
          inbox: [...get().inbox, notice],
          reminder: { eventId, sentAt: moment },
        });
        void notifyReminder(event);
      },

      // Define a las cuántas horas se manda el primer y el segundo recordatorio.
      setReminderPolicy: (policy) => {
        if (!isStaffId(get())) return;
        const firstHours = clampHours(policy.firstHours);
        const secondHours = clampHours(Math.max(policy.secondHours, firstHours));
        set({ reminderPolicy: { firstHours, secondHours } });
      },
      // Cada tanto revisa si ya pasó el plazo y hay que recordar a los que no contestaron.
      tickAlerts: () => {
        const state = get();
        const now = Date.now();
        const { firstHours, secondHours } = state.reminderPolicy;
        let notices = state.inbox;
        let alertsSent = state.alertLog;
        let somethingChanged = false;

        for (const callup of state.convocatorias) {
          const event = state.events.find((item) => item.id === callup.eventId);
          if (!event) continue;
          const peopleWhoDidNotAnswer = state.rsvps.filter(
            (answer) => answer.eventId === callup.eventId && answer.status === "pendiente",
          );
          if (peopleWhoDidNotAnswer.length === 0) continue;

          const hoursSinceCallup = hoursSince(callup.sentAt, now);
          const alreadySentFirst = alertsSent.some(
            (alert) => alert.eventId === callup.eventId && alert.kind === "first",
          );
          const alreadySentSecond = alertsSent.some(
            (alert) => alert.eventId === callup.eventId && alert.kind === "second",
          );

          // Primer recordatorio: se lo ve el jugador que todavía no confirmó.
          if (hoursSinceCallup >= firstHours && !alreadySentFirst) {
            const moment = new Date().toISOString();
            const firstAlert: AlertLog = {
              id: uid("al"),
              eventId: callup.eventId,
              kind: "first",
              at: moment,
            };
            const notice: InboxItem = {
              id: uid("in"),
              kind: "recordatorio",
              title: "Segunda alerta de convocatoria",
              body: `Todavía no confirmaste ${event.title}.`,
              eventId: event.id,
              audience: "pending",
              at: moment,
              readBy: [],
            };
            alertsSent = [...alertsSent, firstAlert];
            notices = [...notices, notice];
            somethingChanged = true;
            void notifyApp({
              body: notice.body,
              tag: `vestuario-r1-${event.id}`,
              eventId: event.id,
            });
          }

          // Segundo recordatorio: se lo ve el DT, para reclamar por WhatsApp.
          if (hoursSinceCallup >= secondHours && !alreadySentSecond) {
            const moment = new Date().toISOString();
            const secondAlert: AlertLog = {
              id: uid("al"),
              eventId: callup.eventId,
              kind: "second",
              at: moment,
            };
            const notice: InboxItem = {
              id: uid("in"),
              kind: "recordatorio",
              title: "Pendientes para WhatsApp",
              body: `Pasaron ${secondHours} h sin respuesta en ${event.title}.`,
              eventId: event.id,
              audience: "staff",
              at: moment,
              readBy: [],
            };
            alertsSent = [...alertsSent, secondAlert];
            notices = [...notices, notice];
            somethingChanged = true;
          }
        }

        if (somethingChanged) set({ inbox: notices, alertLog: alertsSent });
      },

      // Marca un aviso como leído por la persona que está usando la app.
      markInboxRead: (noticeId) => {
        const currentPersonId = get().activeId;
        set({
          inbox: get().inbox.map((notice) =>
            notice.id === noticeId && !notice.readBy.includes(currentPersonId)
              ? { ...notice, readBy: [...notice.readBy, currentPersonId] }
              : notice,
          ),
        });
      },

      // Marca como leídos todos los avisos que esta persona puede ver.
      markAllRead: () => {
        const { activeId, inbox, members, rsvps } = get();
        const currentPerson = members.find((person) => person.id === activeId);
        if (!currentPerson) return;
        set({
          inbox: inbox.map((notice) =>
            inboxVisible(notice, currentPerson, rsvps) && !notice.readBy.includes(activeId)
              ? { ...notice, readBy: [...notice.readBy, activeId] }
              : notice,
          ),
        });
      },

      // Recupera una copia guardada del equipo. Devuelve false si el archivo no sirve.
      importSnapshot: (rawFile) => {
        const parsedTeam = parseSnapshot(rawFile);
        if (!parsedTeam) return false;
        set({ ...parsedTeam, hydrated: true, reminder: parsedTeam.reminder ?? null });
        return true;
      },

      // El DT o el ayudante cambia de puesto con otra persona.
      cederMando: (otherPersonId) => {
        const { members, activeId } = get();
        const currentPerson = members.find((person) => person.id === activeId);
        const otherPerson = members.find((person) => person.id === otherPersonId);
        if (!currentPerson || !otherPerson) return;
        if (currentPerson.role === "jugador") return;
        const roleIHaveNow = currentPerson.role;
        set({
          members: members.map((person) => {
            if (person.id === currentPerson.id) return { ...person, role: otherPerson.role };
            if (person.id === otherPerson.id) return { ...person, role: roleIHaveNow };
            return person;
          }),
          activeId: currentPerson.id,
        });
      },

      // Cambia el nombre del equipo. Solo quien lo creó.
      setClubName: (name) => {
        if (!isCreatorId(get())) return;
        const cleanName = sanitizeName(name);
        if (!cleanName) return;
        const club = get().club;
        if (!club) return;
        set({ club: { ...club, name: cleanName } });
      },

      // El DT o el ayudante cambian el escudo. La foto ya viene achicada.
      setClubCrest: (crest) => {
        if (!isStaffId(get())) return;
        const club = get().club;
        if (!club) return;
        const safe =
          crest && crest.startsWith("data:image/") && crest.length < 120_000 ? crest : null;
        set({ club: { ...club, crest: safe } });
        void get().flushCloud();
      },

      // Suma un jugador al plantel y le deja un código corto.
      // También lo anota como "pendiente" en los partidos que ya existen.
      invitePlayer: (input) => {
        if (!isCreatorId(get())) return null;
        const fullName = sanitizeName(input.name);
        const nick = sanitizeName(input.nick) || fullName.split(" ")[0] || "Jugador";
        if (!fullName) return null;
        const personId = uid("j");
        const personalCode = uid("FJ").replace("FJ-", "").slice(0, 4).toUpperCase();
        const newPlayer: Member = {
          id: personId,
          name: fullName,
          nick,
          role: "jugador",
          number: input.number,
        };
        const pendingAnswers = get().events.map((event) => ({
          eventId: event.id,
          memberId: personId,
          status: "pendiente" as const,
        }));
        const invite: Invite = {
          id: uid("inv"),
          memberId: personId,
          code: personalCode,
          createdAt: new Date().toISOString(),
        };
        set({
          members: [...get().members, newPlayer],
          rsvps: [...get().rsvps, ...pendingAnswers],
          invites: [...get().invites, invite],
        });
        return personalCode;
      },

      // Cambia el puesto de una persona. Si el puesto nuevo es DT o ayudante,
      // quien lo tenía pasa a jugador. Solo hay un DT y un ayudante.
      assignRole: (memberId, role) => {
        if (!isCreatorId(get())) return;
        const { members } = get();
        if (!members.some((person) => person.id === memberId)) return;
        set({
          members: members.map((person) => {
            if (person.id === memberId) return { ...person, role };
            if (role !== "jugador" && person.role === role) return { ...person, role: "jugador" };
            return person;
          }),
        });
      },

      // Guarda el resultado y los números de cada jugador en ese partido.
      // Si ya había planilla, la reemplaza.
      saveMatchSheet: (input) => {
        if (!isStaffId(get())) return;
        const playerStats: PlayerMatchStat[] = input.players.map((row) => ({
          memberId: row.memberId,
          goals: clampStat(row.goals),
          assists: clampStat(row.assists),
          yellow: clampStat(row.yellow),
          red: clampStat(row.red),
        }));
        const sheet: MatchSheet = {
          eventId: input.eventId,
          opponent: sanitizeName(input.opponent),
          goalsFor: clampStat(input.goalsFor),
          goalsAgainst: clampStat(input.goalsAgainst),
          notes: sanitizeText(input.notes, 400),
          recordedAt: new Date().toISOString(),
          players: playerStats,
        };
        const otherSheets = get().matchSheets.filter((saved) => saved.eventId !== sheet.eventId);
        set({ matchSheets: [...otherSheets, sheet] });
      },

      // Abre un torneo. No puede haber dos abiertos al mismo tiempo.
      // Devuelve el id del torneo nuevo para poder asociarle el partido enseguida.
      createTournament: (name) => {
        if (!isStaffId(get())) return null;
        if (get().tournaments.some((tournament) => tournament.status === "active")) return null;
        const tournamentName = sanitizeName(name);
        if (!tournamentName) return null;
        const tournament: Tournament = {
          id: uid("tor"),
          name: tournamentName,
          startedAt: new Date().toISOString(),
          endedAt: null,
          status: "active",
        };
        set({ tournaments: [...get().tournaments, tournament] });
        return tournament.id;
      },

      // Cierra el torneo. Los partidos viejos siguen contando en el total del equipo.
      finishTournament: (id) => {
        if (!isStaffId(get())) return;
        set({
          tournaments: get().tournaments.map((tournament) =>
            tournament.id === id && tournament.status === "active"
              ? { ...tournament, status: "finished", endedAt: new Date().toISOString() }
              : tournament,
          ),
        });
      },

      // El usuario aceptó o rechazó usar el GPS para marcar la cancha.
      setGpsConsent: (value) => set({ gpsConsent: value }),

      // Nombre y apodo de quien usa el celular.
      setProfile: (profile) =>
        set({
          profile: {
            name: sanitizeName(profile.name) || "Jugador",
            nick: sanitizeName(profile.nick) || "Jugador",
          },
        }),

      // La persona actual pone su foto. Sirve para DT, ayudante y jugador.
      setMyPhoto: (photo) => {
        const personId = get().activeId;
        const safe = photo && photo.startsWith("data:image/") && photo.length < 120_000 ? photo : null;
        set({
          members: get().members.map((person) =>
            person.id === personId ? { ...person, photo: safe } : person,
          ),
        });
        void get().flushCloud();
      },

      // Sale del equipo. Si era el creador, el mando pasa a otra persona.
      // El equipo queda guardado para poder volver a entrar con el código.
      leaveClub: () => {
        const state = get();
        if (!state.club) return;
        const peopleWhoStay = state.members.filter((person) => person.id !== state.activeId);
        let club: Club = state.club;
        let members = peopleWhoStay;
        if (club.createdBy === state.activeId && peopleWhoStay[0]) {
          const nextOwner =
            peopleWhoStay.find((person) => person.role === "dt") ??
            peopleWhoStay.find((person) => person.role === "ayudante") ??
            peopleWhoStay[0];
          club = { ...club, createdBy: nextOwner.id };
          members = peopleWhoStay.map((person) =>
            person.id === nextOwner.id && person.role === "jugador"
              ? { ...person, role: "dt" }
              : person,
          );
        }
        const savedCopy = toBundle({ ...state, club, members });
        const archived = upsertBundle(state.archivedClubs, savedCopy);
        set({
          ...emptyClubState(),
          archivedClubs: archived,
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: GUEST_ID,
          hydrated: true,
        });
      },
      // Entra a un equipo con el código. Primero mira la nube. Si no hay red, usa la copia local.
      joinClub: async (code) => {
        const state = get();
        if (state.club) return false;
        const inviteCode = sanitizeCode(code);
        if (!inviteCode) return false;
        set({ cloudStatus: "syncing" });

        let teamFound =
          state.archivedClubs.find((saved) => saved.club.inviteCode.toUpperCase() === inviteCode) ??
          openClubs().find((saved) => saved.club.inviteCode.toUpperCase() === inviteCode) ??
          null;
        try {
          const remoteTeam = await loadClubDoc({ data: inviteCode });
          if (remoteTeam) teamFound = remoteTeam;
        } catch {
          // Si la nube no responde, se usa la copia de arriba.
        }
        if (!teamFound) {
          set({ cloudStatus: "off" });
          return false;
        }

        const me: Member = {
          id: GUEST_ID,
          name: state.profile.name || "Jugador",
          nick: state.profile.nick || "Jugador",
          role: "jugador",
          number: null,
        };
        const members = teamFound.members.some((person) => person.id === me.id)
          ? teamFound.members
          : [...teamFound.members, me];
        set({
          ...teamFound,
          members,
          archivedClubs: state.archivedClubs.filter((saved) => saved.club.id !== teamFound.club.id),
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: me.id,
          reminder: null,
          hydrated: true,
          cloudStatus: "ok",
        });
        void get().flushCloud();
        return true;
      },

      // Crea un equipo nuevo. Quien lo crea queda como DT y recibe un código.
      createClub: (name, crest) => {
        const state = get();
        if (state.club) return;
        const teamName = sanitizeName(name);
        if (!teamName) return;
        const me: Member = {
          id: GUEST_ID,
          name: state.profile.name || "DT",
          nick: state.profile.nick || "DT",
          role: "dt",
          number: null,
        };
        const club: Club = {
          id: uid("club"),
          name: teamName,
          createdBy: me.id,
          inviteCode: uid("EQ").replace("EQ-", "").slice(0, 5).toUpperCase(),
          crest: crest && crest.startsWith("data:image/") ? crest : null,
        };
        set({
          ...emptyClubState(),
          club,
          members: [me],
          archivedClubs: state.archivedClubs,
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: me.id,
          hydrated: true,
        });
        void get().flushCloud();
      },

      // Baja de la nube la última copia del equipo en el que ya estoy.
      syncFromCloud: async () => {
        const club = get().club;
        if (!club) {
          set({ cloudStatus: "ok" });
          return;
        }
        set({ cloudStatus: "syncing" });
        try {
          const remoteTeam = await loadClubDoc({ data: club.inviteCode });
          if (remoteTeam) {
            const currentPersonId = get().activeId;
            const stillOnTheTeam = remoteTeam.members.some((person) => person.id === currentPersonId);
            set({
              ...remoteTeam,
              profile: get().profile,
              gpsConsent: get().gpsConsent,
              archivedClubs: get().archivedClubs,
              activeId: stillOnTheTeam ? currentPersonId : (remoteTeam.members[0]?.id ?? currentPersonId),
              hydrated: true,
              cloudStatus: "ok",
            });
          } else {
            await get().flushCloud();
          }
        } catch {
          set({ cloudStatus: "off" });
        }
      },

      // Sube el equipo a la nube usando el código como llave.
      flushCloud: async () => {
        const state = get();
        if (!state.club) return;
        try {
          const result = await saveClubDoc({
            data: {
              code: state.club.inviteCode,
              bundle: toBundle({ ...state, club: state.club }),
            },
          });
          set({ cloudStatus: result.ok ? "ok" : "off" });
        } catch {
          set({ cloudStatus: "off" });
        }
      },

      // Vuelve al celular vacío, sin equipo cargado.
      resetDemo: () => {
        set({ ...blank, hydrated: true, cloudStatus: "idle" });
      },
    }),
    {
      name: "mi-vestuario-v6",
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        club: s.club,
        members: s.members,
        events: s.events,
        rsvps: s.rsvps,
        messages: s.messages,
        charla: s.charla,
        matchSheets: s.matchSheets,
        invites: s.invites,
        convocatorias: s.convocatorias,
        inbox: s.inbox,
        alertLog: s.alertLog,
        reminderPolicy: s.reminderPolicy,
        tournaments: s.tournaments,
        archivedClubs: s.archivedClubs,
        profile: s.profile,
        gpsConsent: s.gpsConsent,
        activeId: s.activeId,
        reminder: s.reminder,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.matchSheets)) {
          state.matchSheets = createSeed().matchSheets;
        }
        if (!Array.isArray(state.tournaments)) {
          state.tournaments = createSeed().tournaments;
        }
        if (!Array.isArray(state.archivedClubs)) {
          state.archivedClubs = createSeed().archivedClubs;
        }
        if (!state.profile) {
          state.profile = createSeed().profile;
        }
        if (!state.gpsConsent) state.gpsConsent = "unset";
        state.setHydrated();
      },
    },
  ),
);

let flushTimer: ReturnType<typeof setTimeout> | null = null;
if (typeof window !== "undefined") {
  useFija.subscribe((state, prev) => {
    if (!state.hydrated || !state.club) return;
    if (
      state.members === prev.members &&
      state.events === prev.events &&
      state.matchSheets === prev.matchSheets &&
      state.messages === prev.messages &&
      state.tournaments === prev.tournaments &&
      state.rsvps === prev.rsvps &&
      state.charla === prev.charla &&
      state.inbox === prev.inbox &&
      state.club === prev.club
    ) {
      return;
    }
    if (flushTimer) window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      void useFija.getState().flushCloud();
    }, 800) as unknown as ReturnType<typeof setTimeout>;
  });
}

// True si la persona actual es DT o ayudante. Ellos editan cancha y planilla.
function isStaffId(state: { members: Member[]; activeId: string }): boolean {
  const me = state.members.find((m) => m.id === state.activeId);
  return me?.role === "dt" || me?.role === "ayudante";
}

// True si la persona actual es quien creó el equipo.
function isCreatorId(state: { club: Club | null; activeId: string }): boolean {
  return Boolean(state.club && state.club.createdBy === state.activeId);
}

// Arma el paquete que se sube a la nube. No incluye el perfil personal ni el GPS.
function toBundle(state: {
  club: Club;
  members: Member[];
  events: ClubEvent[];
  rsvps: State["rsvps"];
  messages: ChatMessage[];
  charla: CharlaPost[];
  matchSheets: MatchSheet[];
  invites: Invite[];
  convocatorias: Convocatoria[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  reminderPolicy: ReminderPolicy;
  tournaments: Tournament[];
}): ClubBundle {
  return {
    club: state.club,
    members: state.members,
    events: state.events,
    rsvps: state.rsvps,
    messages: state.messages,
    charla: state.charla,
    matchSheets: state.matchSheets,
    invites: state.invites,
    convocatorias: state.convocatorias,
    inbox: state.inbox,
    alertLog: state.alertLog,
    reminderPolicy: state.reminderPolicy,
    tournaments: state.tournaments,
  };
}

// Guarda o reemplaza un equipo en la lista de equipos archivados.
function upsertBundle(list: ClubBundle[], next: ClubBundle): ClubBundle[] {
  const rest = list.filter((b) => b.club.id !== next.club.id && b.club.inviteCode !== next.club.inviteCode);
  return [...rest, next];
}

// Cambia la respuesta de una persona en un evento, o la crea si no existía.
function upsertRsvp(
  rsvps: State["rsvps"],
  eventId: string,
  memberId: string,
  status: RsvpStatus,
) {
  const idx = rsvps.findIndex((r) => r.eventId === eventId && r.memberId === memberId);
  if (idx < 0) return [...rsvps, { eventId, memberId, status }];
  return rsvps.map((r, i) => (i === idx ? { ...r, status } : r));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSnapshot(raw: unknown): Partial<ReturnType<typeof createSeed>> | null {
  const data = isRecord(raw) && isRecord(raw.state) ? raw.state : raw;
  if (!isRecord(data)) return null;
  if (!Array.isArray(data.members) || !Array.isArray(data.events)) return null;
  const seedData = createSeed();
  const club =
    data.club === null
      ? null
      : isRecord(data.club)
        ? {
            id: typeof data.club.id === "string" ? data.club.id : seedData.club!.id,
            name: typeof data.club.name === "string" ? data.club.name : seedData.club!.name,
            createdBy:
              typeof data.club.createdBy === "string" ? data.club.createdBy : seedData.club!.createdBy,
            inviteCode:
              typeof data.club.inviteCode === "string"
                ? data.club.inviteCode
                : seedData.club!.inviteCode,
            crest:
              typeof data.club.crest === "string" && data.club.crest.startsWith("data:image/")
                ? data.club.crest
                : null,
          }
        : seedData.club;
  const events = (data.events as ClubEvent[]).map((event) => ({
    ...event,
    mapsQuery: event.mapsQuery ?? event.place ?? "",
    lat: typeof event.lat === "number" ? event.lat : null,
    lng: typeof event.lng === "number" ? event.lng : null,
    lineupPublishedAt: event.lineupPublishedAt ?? null,
    tournamentId: event.tournamentId ?? null,
  }));
  const policy = isRecord(data.reminderPolicy)
    ? {
        firstHours: clampHours(Number(data.reminderPolicy.firstHours) || 24),
        secondHours: clampHours(Number(data.reminderPolicy.secondHours) || 48),
      }
    : seedData.reminderPolicy;
  return {
    club,
    members: data.members as ReturnType<typeof createSeed>["members"],
    events,
    rsvps: Array.isArray(data.rsvps) ? (data.rsvps as ReturnType<typeof createSeed>["rsvps"]) : [],
    messages: Array.isArray(data.messages)
      ? (data.messages as ReturnType<typeof createSeed>["messages"])
      : [],
    charla: Array.isArray(data.charla)
      ? (data.charla as ReturnType<typeof createSeed>["charla"])
      : [],
    matchSheets: Array.isArray(data.matchSheets)
      ? (data.matchSheets as ReturnType<typeof createSeed>["matchSheets"])
      : [],
    invites: Array.isArray(data.invites)
      ? (data.invites as ReturnType<typeof createSeed>["invites"])
      : [],
    convocatorias: Array.isArray(data.convocatorias)
      ? (data.convocatorias as ReturnType<typeof createSeed>["convocatorias"])
      : [],
    inbox: Array.isArray(data.inbox) ? (data.inbox as ReturnType<typeof createSeed>["inbox"]) : [],
    alertLog: Array.isArray(data.alertLog)
      ? (data.alertLog as ReturnType<typeof createSeed>["alertLog"])
      : [],
    reminderPolicy: policy,
    tournaments: Array.isArray(data.tournaments)
      ? (data.tournaments as Tournament[])
      : seedData.tournaments,
    archivedClubs: Array.isArray(data.archivedClubs)
      ? (data.archivedClubs as ClubBundle[])
      : seedData.archivedClubs,
    profile:
      isRecord(data.profile) && typeof data.profile.name === "string"
        ? {
            name: String(data.profile.name),
            nick: typeof data.profile.nick === "string" ? data.profile.nick : String(data.profile.name),
          }
        : seedData.profile,
    gpsConsent:
      data.gpsConsent === "granted" || data.gpsConsent === "denied" || data.gpsConsent === "unset"
        ? data.gpsConsent
        : seedData.gpsConsent,
    activeId: typeof data.activeId === "string" ? data.activeId : "dt",
    reminder: (data.reminder as ReturnType<typeof createSeed>["reminder"]) ?? null,
  };
}

async function queueSync(tag: string) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sync = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (name: string) => Promise<void> };
      }
    ).sync;
    await sync?.register(tag);
  } catch {
    /* Background Sync is optional */
  }
}

// Dice si un aviso le corresponde a esta persona.
export function inboxVisible(
  item: InboxItem,
  me: Member,
  rsvps: { eventId: string; memberId: string; status: RsvpStatus }[],
): boolean {
  if (item.audience === "staff") return me.role === "dt" || me.role === "ayudante";
  if (item.audience === "pending") {
    const row = rsvps.find((r) => r.eventId === item.eventId && r.memberId === me.id);
    return row?.status === "pendiente";
  }
  return true;
}

export const GUEST: Member = {
  id: GUEST_ID,
  name: "Vos",
  nick: "Vos",
  role: "jugador",
  number: null,
};

// La persona que está usando la app en este momento.
export function useMe(): Member {
  return useFija((s) => {
    const found = s.members.find((m) => m.id === s.activeId);
    if (found) return found;
    if (s.members[0]) return s.members[0];
    return {
      ...GUEST,
      name: s.profile.name || GUEST.name,
      nick: s.profile.nick || GUEST.nick,
    };
  });
}

export function useIsStaff(): boolean {
  const me = useMe();
  const club = useFija((s) => s.club);
  if (!club) return false;
  return me.role === "dt" || me.role === "ayudante";
}

export function useIsCreator(): boolean {
  const me = useMe();
  return useFija((s) => Boolean(s.club && s.club.createdBy === me.id));
}

export function activeTournament(list: Tournament[]): Tournament | undefined {
  return list.find((t) => t.status === "active");
}

export function sheetsForScope(
  sheets: MatchSheet[],
  events: ClubEvent[],
  tournamentId: string | "general",
): MatchSheet[] {
  if (tournamentId === "general") return sheets;
  const ids = new Set(
    events.filter((e) => e.tournamentId === tournamentId).map((e) => e.id),
  );
  return sheets.filter((s) => ids.has(s.eventId));
}

export function nextEvent(events: ClubEvent[]): ClubEvent | undefined {
  const now = Date.now() - 3_600_000;
  const upcoming = [...events]
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .filter((e) => +new Date(e.startsAt) >= now);
  return upcoming.find((e) => e.kind === "partido") ?? upcoming[0] ?? events[events.length - 1];
}

export function sheetFor(eventId: string, sheets: MatchSheet[]): MatchSheet | undefined {
  return sheets.find((s) => s.eventId === eventId);
}

export function defaultSheetPlayers(
  event: ClubEvent,
  members: Member[],
  existing?: MatchSheet,
): PlayerMatchStat[] {
  const players = members.filter((m) => m.role === "jugador");
  const lineupIds = new Set(Object.values(event.lineup));
  const sorted = [...players].sort((a, b) => {
    const aIn = lineupIds.has(a.id) ? 0 : 1;
    const bIn = lineupIds.has(b.id) ? 0 : 1;
    return aIn - bIn;
  });
  return sorted.map((p) => existing?.players.find((row) => row.memberId === p.id) ?? emptyStat(p.id));
}

export function convocatoriaFor(
  eventId: string,
  list: Convocatoria[],
): Convocatoria | undefined {
  return list.find((c) => c.eventId === eventId);
}

export function whatsappReady(
  eventId: string,
  convocatorias: Convocatoria[],
  policy: ReminderPolicy,
  now = Date.now(),
): boolean {
  const conv = convocatoriaFor(eventId, convocatorias);
  if (!conv) return false;
  return hoursSince(conv.sentAt, now) >= policy.secondHours;
}
