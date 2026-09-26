import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "./format";
import { notifyApp, notifyReminder } from "./notify";
import { createSeed, emptyClubState, GUEST_ID, openClubs } from "./seed";
import { sanitizeCode, sanitizeName, sanitizeText } from "./sanitize";
import { clampHours, hoursSince } from "./share";
import { claimMember, loadClubDoc, saveClubDoc, useMyName } from "./cloud";
import { authClient } from "@/lib/auth/client";
import { notifyClub } from "./push";
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
  ItemEquipamiento,
  MatchSheet,
  Member,
  Modality,
  PlayerMatchStat,
  ReminderPolicy,
  Role,
  Rsvp,
  RsvpStatus,
  Tournament,
} from "./types";

type ShelfTeam = {
  bundle: ClubBundle;
  activeId: string;
};

type CloudStatus = "idle" | "syncing" | "ok" | "off";

type State = ReturnType<typeof createSeed> & {
  otherClubs: ShelfTeam[];
  activeClubId: string | null;
  hydrated: boolean;
  cloudStatus: CloudStatus;
  cloudError: string | null;
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
  removeMember: (memberId: string) => void;
  assignRole: (memberId: string, role: Role) => void;
    setJuega: (memberId: string, juega: boolean) => void;
    saveMatchSheet: (sheet: Omit<MatchSheet, "recordedAt">) => void;
  asignarEquipamiento: (eventId: string, item: ItemEquipamiento, memberId: string | null) => void;
  ultimoEquipamiento: (beforeEventId: string, item: ItemEquipamiento) => string | null;
  createTournament: (name: string) => string | null;
  finishTournament: (id: string) => void;
  setGpsConsent: (value: GpsConsent) => void;
  leaveClub: () => void;
  joinClub: (code: string) => Promise<boolean>;
  createClub: (name: string, crest?: string | null) => Promise<void>;
  setActiveClub: (clubId: string) => Promise<void>;
  removeClub: (clubId: string) => void;
  setProfile: (profile: { name: string; nick: string }) => void;
  setMyPhoto: (photo: string | null) => void;
  syncFromCloud: () => Promise<void>;
  ensureMySpot: () => Promise<void>;
  useThisName: (memberId: string) => Promise<boolean>;
  flushCloud: () => Promise<boolean>;
  publishClub: () => Promise<boolean>;
  resetDemo: () => void;
};

const blank = {
  ...emptyClubState(),
  archivedClubs: [] as ReturnType<typeof createSeed>["archivedClubs"],
  otherClubs: [] as ShelfTeam[],
  activeClubId: null as string | null,
  profile: { name: "", nick: "" },
  gpsConsent: "unset" as const,
  activeId: GUEST_ID,
};

/*
  Memoria de la app. Todo lo que ves en pantalla sale de acá
  y se guarda en el celular. Si hay código de equipo, también se copia a la nube.

  Nombres sencillos de cada función:
  - createClub        crear equipo. Quien lo crea es el DT. Si ya hay uno, lo guarda y abre el nuevo.
  - joinClub          entrar con el código. Si ya estás en otro, lo guarda y cambia.
  - leaveClub         salir solo del equipo activo. Los otros quedan.
  - setActiveClub     cambiar de equipo sin salir.
  - removeClub        sacar un equipo de este celular. No lo borra de la nube.
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

async function currentAccount(): Promise<{ id: string; name: string } | null> {
  try {
    const session = await authClient.getSession();
    const id = session?.data?.user?.id;
    const name = session?.data?.user?.name;
    if (typeof id !== "string" || id.length === 0) return null;
    return { id, name: typeof name === "string" ? name.trim() : "" };
  } catch {
    return null;
  }
}

async function currentAccountId(): Promise<string | null> {
  const account = await currentAccount();
  return account?.id ?? null;
}

let applyingCloud = false;
let syncingNow = false;

export const useFija = create<State>()(
  persist(
    (set, get) => ({
      ...blank,
      hydrated: false,
      cloudStatus: "idle" as CloudStatus,
      cloudError: null as string | null,
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
                const players = get().members.filter(
          (person) => person.juega ?? person.role === "jugador",
        );
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

            // Notificaciones de equipamiento: 24h antes del partido.
        // Solo a los que llevan algo. Si llevan 2 cosas, va en una sola notificación.
        const HOURS_BEFORE = 24;
        const MS_PER_HOUR = 3_600_000;
        for (const event of state.events) {
          if (event.kind !== "partido") continue;
          if (!event.equipamiento) continue;
          const hoursUntil = (+new Date(event.startsAt) - now) / MS_PER_HOUR;
          if (hoursUntil > HOURS_BEFORE || hoursUntil < 0) continue;
          const alreadyNotified = alertsSent.some(
            (alert) => alert.eventId === event.id && alert.kind === "equipment",
          );
          if (alreadyNotified) continue;

          // Agrupar por miembro: { memberId: ["remeras", "pelotas"] }
          const byMember = new Map<string, ItemEquipamiento[]>();
          for (const [item, memberId] of Object.entries(event.equipamiento)) {
            if (!memberId) continue;
            const list = byMember.get(memberId) ?? [];
            list.push(item as ItemEquipamiento);
            byMember.set(memberId, list);
          }
          if (byMember.size === 0) continue;

          const moment = new Date().toISOString();
          for (const [memberId, items] of byMember) {
            const itemLabels = items
              .map((i) => (i === "remeras" ? "las remeras" : "las pelotas"))
              .join(" y ");
            const notice: InboxItem = {
              id: uid("in"),
              kind: "equipamiento",
              title: "Mañana hay partido",
              body: `Te toca llevar ${itemLabels} para ${event.title}.`,
              eventId: event.id,
              audience: "miembro",
              at: moment,
              readBy: [],
            };
            notices = [...notices, notice];
            void notifyApp({
              body: notice.body,
              tag: `vestuario-eq-${event.id}-${memberId}`,
              eventId: event.id,
            });
          }
          alertsSent = [
            ...alertsSent,
            { id: uid("al"), eventId: event.id, kind: "equipment", at: moment },
          ];
          somethingChanged = true;
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

      // Suma un jugador al plantel. Entra con el código del vestuario, no con uno aparte.
      invitePlayer: (input) => {
        if (!isCreatorId(get())) return null;
        const fullName = sanitizeName(input.name);
        const nick = sanitizeName(input.nick) || fullName.split(" ")[0] || "Jugador";
        if (!fullName) return null;
        const personId = uid("j");
        const teamCode = get().club?.inviteCode ?? null;
        if (!teamCode) return null;
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
          code: teamCode,
          createdAt: new Date().toISOString(),
        };
        set({
          members: [...get().members, newPlayer],
          rsvps: [...get().rsvps, ...pendingAnswers],
          invites: [...get().invites, invite],
        });
        return teamCode;
      },

      removeMember: (memberId) => {
        const state = get();
        if (!isCreatorId(state) || !memberId || memberId === state.activeId) return;
        if (!state.members.some((person) => person.id === memberId)) return;
        const droppedIds = [...new Set([...(state.droppedIds ?? []), memberId])];
        set({
          droppedIds,
          members: state.members.filter((person) => person.id !== memberId),
          rsvps: state.rsvps.filter((row) => row.memberId !== memberId),
          invites: state.invites.filter((invite) => invite.memberId !== memberId),
          events: state.events.map((event) => ({
            ...event,
            lineup: Object.fromEntries(Object.entries(event.lineup).filter(([, id]) => id !== memberId)),
          })),
        });
        void get().flushCloud();
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
            // Marca o desmarca si alguien juega (aparece en la cancha, planilla y convocatorias).
      // Puede ser cualquiera del plantel: jugador, DT o ayudante.
      setJuega: (memberId, juega) => {
        if (!isStaffId(get()) && !isCreatorId(get())) return;
        set({
          members: get().members.map((person) =>
            person.id === memberId ? { ...person, juega } : person,
          ),
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
      // El DT o el ayudante asignan quién lleva un item del equipamiento.
      // También puede ser un jugador del plantel (DT/ayudante que juegan).
      asignarEquipamiento: (eventId, item, memberId) => {
        if (!isStaffId(get())) return;
        set({
          events: get().events.map((event) => {
            if (event.id !== eventId) return event;
            const equipamiento = { ...(event.equipamiento ?? {}) };
            if (!memberId) {
              delete equipamiento[item];
            } else {
              equipamiento[item] = memberId;
            }
            return { ...event, equipamiento };
          }),
        });
      },

      // Busca el último partido anterior a `beforeEventId` donde alguien llevó `item`.
      // Devuelve el memberId o null.
      ultimoEquipamiento: (beforeEventId, item) => {
        const events = get().events;
        const before = events.find((e) => e.id === beforeEventId);
        if (!before) return null;
        const previous = events
          .filter(
            (e) =>
              e.kind === "partido" &&
              e.id !== beforeEventId &&
              +new Date(e.startsAt) < +new Date(before.startsAt),
          )
          .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
        for (const event of previous) {
          const memberId = event.equipamiento?.[item];
          if (memberId) return memberId;
        }
        return null;
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

      // Sale solo del equipo activo. Si hay otros, entra al siguiente.
      // No borra el equipo de la nube: el plantel sigue ahí.
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
        const others = state.otherClubs.filter((item) => item.bundle.club.id !== state.club?.id);
        const next = others[0];
        if (next) {
          const rest = others.slice(1);
          set({
            ...next.bundle,
            otherClubs: rest,
            activeClubId: next.bundle.club.id,
            archivedClubs: archived,
            profile: state.profile,
            gpsConsent: state.gpsConsent,
            activeId: memberIdOnTeam(next),
            reminder: null,
            hydrated: true,
          });
          void get().syncFromCloud();
          return;
        }
        set({
          ...emptyClubState(),
          otherClubs: [],
          activeClubId: null,
          archivedClubs: archived,
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: GUEST_ID,
          hydrated: true,
        });
      },
      // Entra a un equipo. Si ya estás en otro, lo guarda y cambia a este.
      joinClub: async (code) => {
        const state = get();
        const inviteCode = sanitizeCode(code);
        if (!inviteCode) return false;
        if (state.club?.inviteCode.toUpperCase() === inviteCode) return true;

        const shelved = state.otherClubs.find(
          (item) => item.bundle.club.inviteCode.toUpperCase() === inviteCode,
        );
        if (shelved && state.club) {
          try {
            await get().flushCloud();
          } catch {
            // La copia local del estante alcanza para cambiar.
          }
          const fresh = get();
          const current = fresh.club ? snapshotShelf(fresh) : null;
          const rest = fresh.otherClubs.filter((item) => item.bundle.club.id !== shelved.bundle.club.id);
          const shelf = current ? upsertShelf(rest, current) : rest;
          set({
            ...shelved.bundle,
            otherClubs: shelf.filter((item) => item.bundle.club.id !== shelved.bundle.club.id),
            activeClubId: shelved.bundle.club.id,
            archivedClubs: fresh.archivedClubs,
            profile: fresh.profile,
            gpsConsent: fresh.gpsConsent,
            activeId: memberIdOnTeam(shelved),
            reminder: null,
            hydrated: true,
            cloudStatus: "syncing",
          });
          void get().syncFromCloud();
          return true;
        }

        set({ cloudStatus: "syncing" });
        let teamFound =
          state.archivedClubs.find((saved) => saved.club.inviteCode.toUpperCase() === inviteCode) ??
          openClubs().find((saved) => saved.club.inviteCode.toUpperCase() === inviteCode) ??
          null;
        let cloudFailed = false;
        try {
          const remoteTeam = await loadClubDoc({ data: inviteCode });
          if (remoteTeam) teamFound = remoteTeam;
        } catch {
          cloudFailed = true;
        }
        if (!teamFound) {
          set({ cloudStatus: "off" });
          if (cloudFailed) throw new Error("No pudimos leer el equipo.");
          return false;
        }

        const account = await currentAccountId();
        const mine = memberIdForCode(inviteCode);
        const wanted = (state.profile.name || "").trim().toLowerCase();
        const byAccount = account
          ? teamFound.members.find((person) => person.accountId === account || person.id === account)
          : undefined;
        const byName =
          !byAccount && wanted.length >= 2
            ? teamFound.members.filter((person) => person.name.trim().toLowerCase() === wanted && !person.accountId)
            : [];
        let personId = byAccount?.id ?? (byName.length === 1 ? byName[0].id : mine.known ? mine.id : account || mine.id);
        if (!byAccount && !mine.known && byName.length !== 1) {
          while (teamFound.members.some((person) => person.id === personId)) {
            personId = uid("j");
          }
        }
        rememberMemberId(inviteCode, personId);
        const existing = teamFound.members.find((person) => person.id === personId);
        const me: Member = existing
          ? {
              ...existing,
              name: state.profile.name || existing.name,
              nick: state.profile.nick || existing.nick,
              accountId: account || existing.accountId || null,
            }
          : {
              id: personId,
              name: state.profile.name || "Jugador",
              nick: state.profile.nick || "Jugador",
              role: "jugador",
              number: null,
              accountId: account,
            };
        const members = existing
          ? teamFound.members.map((person) => (person.id === personId ? me : person))
          : [...teamFound.members, me];

        let shelf = state.otherClubs.filter(
          (item) =>
            item.bundle.club.id !== teamFound.club.id &&
            item.bundle.club.inviteCode.toUpperCase() !== inviteCode,
        );
        if (state.club) {
          try {
            await get().flushCloud();
          } catch {
            // Seguimos: el equipo anterior queda en el estante.
          }
          const fresh = get();
          const shot = snapshotShelf(fresh);
          if (shot) shelf = upsertShelf(shelf, shot);
        }

        set({
          ...teamFound,
          members,
          otherClubs: shelf,
          activeClubId: teamFound.club.id,
          archivedClubs: state.archivedClubs.filter((saved) => saved.club.id !== teamFound.club.id),
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: personId,
          reminder: null,
          hydrated: true,
          cloudStatus: "syncing",
        });
        const claimed = await claimMember({
          data: {
            code: inviteCode,
            member: { id: personId, name: me.name, nick: me.nick, number: me.number },
          },
        });
        if (!claimed.ok || !claimed.members?.some((person) => person.id === personId || (account != null && person.accountId === account))) {
          set({
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
            droppedIds: state.droppedIds,
            otherClubs: state.otherClubs,
            activeClubId: state.activeClubId,
            archivedClubs: state.archivedClubs,
            activeId: state.activeId,
            reminder: state.reminder,
            cloudStatus: "off",
          });
          throw new Error("No se pudo entrar al equipo. Fijate la conexión y probá de nuevo.");
        }
        applyingCloud = true;
        const linked = account
          ? claimed.members.find((person) => person.accountId === account || person.id === account)
          : undefined;
        set({
          members: claimed.members,
          activeId: linked?.id ?? personId,
          cloudStatus: "ok",
          cloudError: null,
        });
        applyingCloud = false;
        return true;
      },

      // Crea un equipo nuevo. Si ya había uno, lo deja guardado y abre este.
      createClub: async (name, crest) => {
        const state = get();
        const teamName = sanitizeName(name);
        if (!teamName) return;
        let shelf = state.otherClubs;
        if (state.club) {
          try {
            await get().flushCloud();
          } catch {
            // El estante se queda con la copia local.
          }
          const fresh = get();
          const shot = snapshotShelf(fresh);
          if (shot) shelf = upsertShelf(fresh.otherClubs, shot);
        }
        const account = await currentAccountId();
        const me: Member = {
          id: account || uid("dt"),
          name: state.profile.name || "DT",
          nick: state.profile.nick || "DT",
          role: "dt",
          number: null,
          accountId: account,
        };
        const club: Club = {
          id: uid("club"),
          name: teamName,
          createdBy: me.id,
          inviteCode: generarCodigoEquipo(),
          crest: crest && crest.startsWith("data:image/") ? crest : null,
        };
        set({
          ...emptyClubState(),
          club,
          members: [me],
          otherClubs: shelf.filter((item) => item.bundle.club.id !== club.id),
          activeClubId: club.id,
          archivedClubs: state.archivedClubs,
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: me.id,
          hydrated: true,
        });
        void get().publishClub();
      },

      setActiveClub: async (clubId) => {
        const state = get();
        if (!clubId || state.club?.id === clubId) return;
        const next = state.otherClubs.find((item) => item.bundle.club.id === clubId);
        if (!next || !state.club) return;
        try {
          await get().flushCloud();
        } catch {
          // Cambiamos igual: la copia local no se pierde.
        }
        const fresh = get();
        const current = snapshotShelf(fresh);
        if (!current) return;
        const rest = fresh.otherClubs.filter((item) => item.bundle.club.id !== clubId);
        set({
          ...next.bundle,
          otherClubs: upsertShelf(rest, current).filter((item) => item.bundle.club.id !== next.bundle.club.id),
          activeClubId: next.bundle.club.id,
          archivedClubs: fresh.archivedClubs,
          profile: fresh.profile,
          gpsConsent: fresh.gpsConsent,
          activeId: memberIdOnTeam(next),
          reminder: null,
          hydrated: true,
          cloudStatus: "syncing",
        });
        void get().syncFromCloud();
      },

      removeClub: (clubId) => {
        const state = get();
        if (!clubId) return;
        if (state.club?.id === clubId) {
          get().leaveClub();
          return;
        }
        set({
          otherClubs: state.otherClubs.filter((item) => item.bundle.club.id !== clubId),
        });
      },

      // Si la cuenta ya está en alguien, no se crea otra persona ni se mueve sola.
      ensureMySpot: async () => {
        const account = await currentAccount();
        if (!account) return;
        const state = get();
        const club = state.club;
        if (!club) return;
        const linked = state.members.find(
          (person) => person.accountId === account.id || person.id === account.id,
        );
        if (linked) {
          if (linked.id !== state.activeId) set({ activeId: linked.id });
          return;
        }
        try {
          const result = await claimMember({
            data: {
              code: club.inviteCode,
              member: {
                id: account.id,
                name: account.name || state.profile.name || "Jugador",
                nick: (account.name || state.profile.nick || "Jugador").split(" ")[0] || "Jugador",
                number: null,
              },
            },
          });
          if (!result.ok || !result.members) return;
          const mine = result.members.find(
            (person) => person.accountId === account.id || person.id === account.id,
          );
          applyingCloud = true;
          set({
            members: result.members,
            activeId: mine?.id ?? state.activeId,
            cloudStatus: "ok",
            cloudError: null,
          });
          applyingCloud = false;
        } catch {
          // Si falla, no se pega la cuenta a otro nombre.
        }
      },

      useThisName: async (memberId: string) => {
        const state = get();
        const club = state.club;
        if (!club || !memberId) return false;
        const result = await useMyName({ data: { code: club.inviteCode, memberId } });
        if (!result.ok || !result.members) return false;
        applyingCloud = true;
        set({
          members: result.members,
          activeId: memberId,
          cloudStatus: "ok",
          cloudError: null,
        });
        applyingCloud = false;
        return true;
      },

      // Baja de la nube la última copia del equipo en el que ya estoy.
      syncFromCloud: async () => {
        if (syncingNow) return;
        const club = get().club;
        if (!club) {
          set({ cloudStatus: "ok" });
          return;
        }
        syncingNow = true;
        const quiet = get().cloudStatus === "ok";
        if (!quiet) set({ cloudStatus: "syncing" });
        try {
          const remoteTeam = await loadClubDoc({ data: club.inviteCode });
          if (remoteTeam) {
            const current = get();
            const local = toBundle({ ...current, club });
            const merged = mergeClubBundles(local, remoteTeam, {
              activeId: current.activeId,
              staff: isStaffId(current),
            });
            applyingCloud = true;
            set({
              ...merged,
              otherClubs: current.otherClubs,
              activeClubId: merged.club.id,
              profile: current.profile,
              gpsConsent: current.gpsConsent,
              archivedClubs: current.archivedClubs,
              activeId: current.activeId,
              hydrated: true,
              cloudStatus: "ok",
              cloudError: null,
            });
            applyingCloud = false;
            const remoteIds = new Set(remoteTeam.members.map((person) => person.id));
            const localOnly = local.members.some((person) => !remoteIds.has(person.id));
            if (localOnly) await get().flushCloud();
          } else {
            const published = await get().publishClub();
            if (!published && !quiet) set({ cloudStatus: "off" });
          }
        } catch {
          if (!quiet) set({ cloudStatus: "off" });
        } finally {
          syncingNow = false;
        }
      },

      // Sube el equipo a la nube usando el código como llave. Reintenta solo.
      flushCloud: async () => {
        const state = get();
        if (!state.club) return false;
        set({ cloudStatus: "syncing", cloudError: null });
        let lastError = "No se pudo guardar el equipo.";
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const current = get();
          if (!current.club) return false;
          try {
            let remote: ClubBundle | null = null;
            try {
              remote = await loadClubDoc({ data: current.club.inviteCode });
            } catch {
              remote = null;
            }
            const local = toBundle({ ...current, club: current.club });
            const merged = remote
              ? mergeClubBundles(local, remote, { activeId: current.activeId, staff: isStaffId(current) })
              : local;
            const result = await saveClubDoc({
              data: {
                code: merged.club.inviteCode,
                bundle: merged,
              },
            });
            if (result.ok) {
              const savedBundle = result.bundle;
              applyingCloud = true;
              set({
                ...(savedBundle ?? merged),
                otherClubs: get().otherClubs,
                activeClubId: (savedBundle ?? merged).club.id,
                profile: get().profile,
                gpsConsent: get().gpsConsent,
                archivedClubs: get().archivedClubs,
                activeId: get().activeId,
                hydrated: true,
                cloudStatus: "ok",
                cloudError: null,
              });
              applyingCloud = false;
              const notice = freshNotice(current.activeId, remote, merged);
              if (notice) {
                void notifyClub({
                  data: {
                    code: merged.club.inviteCode,
                    exceptMemberId: current.activeId,
                    title: notice.title,
                    body: notice.body,
                    url: notice.url,
                    tag: notice.tag,
                  },
                });
              }
              return true;
            }
            lastError = result.error || lastError;
          } catch (error) {
            lastError = cloudFailureMessage(error);
          }
          await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        }
        set({ cloudStatus: "off", cloudError: lastError });
        return false;
      },

      // Guarda y después comprueba que el código se puede leer. Recién ahí se puede invitar.
      publishClub: async () => {
        const uploaded = await get().flushCloud();
        const code = get().club?.inviteCode;
        if (!uploaded || !code) return false;
        try {
          const remote = await loadClubDoc({ data: code });
          if (!remote) {
            set({
              cloudStatus: "off",
              cloudError: "El equipo no quedó publicado. Tocá de nuevo en un momento.",
            });
            return false;
          }
          set({ cloudStatus: "ok", cloudError: null });
          return true;
        } catch {
          set({
            cloudStatus: "off",
            cloudError: "No pudimos confirmar el equipo. Probá de nuevo.",
          });
          return false;
        }
      },

      // Vuelve al celular vacío, sin equipo cargado.
      resetDemo: () => {
        set({ ...blank, hydrated: true, cloudStatus: "idle", cloudError: null });
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
        otherClubs: s.otherClubs,
        activeClubId: s.activeClubId,
        profile: s.profile,
        gpsConsent: s.gpsConsent,
        activeId: s.activeId,
        droppedIds: s.droppedIds ?? [],
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
        if (!Array.isArray(state.otherClubs)) state.otherClubs = [];
        if (!state.activeClubId) state.activeClubId = state.club?.id ?? null;
        if (!Array.isArray(state.droppedIds)) state.droppedIds = [];
        if (!state.profile) {
          state.profile = createSeed().profile;
        }
        if (!state.gpsConsent) state.gpsConsent = "unset";

        // Migración: setear `juega` en miembros que no lo tengan.
        // Jugadores → true (ya juegan). Staff → false (hasta que se marque).
        if (Array.isArray(state.members)) {
          state.members = state.members.map((person) => {
            if (typeof person.juega === "boolean") return person;
            return { ...person, juega: person.role === "jugador" };
          });
        }

        state.setHydrated();
      },
    },
  ),
);

let flushTimer: ReturnType<typeof setTimeout> | null = null;
if (typeof window !== "undefined") {
  useFija.subscribe((state, prev) => {
    if (applyingCloud) return;
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

function cloudFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("unauthorized") || message.includes("forbidden")) {
    return "La sesión no llegó al servidor. Salí y volvé a entrar.";
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("load failed")) {
    return "No hay red. Probá de nuevo cuando vuelva la conexión.";
  }
  return "No se pudo guardar el equipo. Probá de nuevo.";
}

// True si la persona actual es DT o ayudante. Ellos editan cancha y planilla.
function isStaffId(state: { members: Member[]; activeId: string }): boolean {
  const me = state.members.find((m) => m.id === state.activeId);
  return me?.role === "dt" || me?.role === "ayudante";
}

function keepAccountOwner(remote: Member[], merged: Member[]): Member[] {
  const owner = new Map<string, string>();
  for (const person of remote) {
    if (person.accountId) owner.set(person.accountId, person.id);
  }
  return merged.map((person) => {
    if (!person.accountId) return person;
    const remoteOwner = owner.get(person.accountId);
    if (remoteOwner && remoteOwner !== person.id) return { ...person, accountId: null };
    return person;
  });
}

function unionById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    const previous = map.get(item.id);
    map.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return [...map.values()];
}

function mergeEvents(remote: ClubEvent[], local: ClubEvent[], staff: boolean): ClubEvent[] {
  if (!remote.length) return local;
  if (!staff) return remote;
  return unionById(remote, local);
}

function mergeRsvps(remote: Rsvp[], local: Rsvp[], activeId: string): Rsvp[] {
  const key = (row: Rsvp) => `${row.eventId}:${row.memberId}`;
  const map = new Map<string, Rsvp>();
  for (const row of remote) map.set(key(row), row);
  for (const row of local) {
    const previous = map.get(key(row));
    if (!previous || row.memberId === activeId) map.set(key(row), row);
    else if (previous.status === "pendiente" && row.status !== "pendiente") map.set(key(row), row);
  }
  return [...map.values()];
}

function mergeSheets(remote: MatchSheet[], local: MatchSheet[], staff: boolean): MatchSheet[] {
  const map = new Map(remote.map((sheet) => [sheet.eventId, sheet]));
  if (staff) {
    for (const sheet of local) map.set(sheet.eventId, sheet);
  }
  return [...map.values()];
}

function mergeClubBundles(
  local: ClubBundle,
  remote: ClubBundle,
  who: { activeId: string; staff: boolean },
): ClubBundle {
  const club = who.staff ? { ...remote.club, ...local.club } : { ...local.club, ...remote.club };
  club.inviteCode = remote.club.inviteCode || local.club.inviteCode;
  if (!who.staff && local.club.crest) club.crest = local.club.crest;
  return {
    club,
    members: keepAccountOwner(
      remote.members,
      unionById(remote.members, local.members).filter(
        (person) => !(remote.droppedIds ?? []).includes(person.id) && !(local.droppedIds ?? []).includes(person.id),
      ),
    ),
    events: mergeEvents(remote.events, local.events, who.staff),
    rsvps: mergeRsvps(remote.rsvps, local.rsvps, who.activeId),
    messages: unionById(remote.messages, local.messages),
    charla: unionById(remote.charla, local.charla),
    matchSheets: mergeSheets(remote.matchSheets, local.matchSheets, who.staff),
    invites: unionById(remote.invites, local.invites),
    convocatorias: unionById(
      remote.convocatorias.map((item) => ({ ...item, id: item.eventId })),
      local.convocatorias.map((item) => ({ ...item, id: item.eventId })),
    ).map(({ id: _id, ...item }) => item),
    inbox: unionById(remote.inbox, local.inbox),
    alertLog: unionById(remote.alertLog, local.alertLog),
    reminderPolicy: who.staff ? local.reminderPolicy : remote.reminderPolicy,
    tournaments: unionById(remote.tournaments, who.staff ? local.tournaments : []),
    droppedIds: [...new Set([...(remote.droppedIds ?? []), ...(local.droppedIds ?? [])])],
  };
}

function freshNotice(
  activeId: string,
  remote: ClubBundle | null,
  merged: ClubBundle,
): { title: string; body: string; url: string; tag: string } | null {
  const now = Date.now();
  const fresh = (at: string) => now - new Date(at).getTime() < 3 * 60 * 1000;
  const remoteMessages = new Set((remote?.messages ?? []).map((item) => item.id));
  const remoteCharla = new Set((remote?.charla ?? []).map((item) => item.id));
  const remoteInbox = new Set((remote?.inbox ?? []).map((item) => item.id));
  const post = [...merged.charla]
    .reverse()
    .find((item) => !remoteCharla.has(item.id) && item.memberId === activeId && fresh(item.at));
  if (post) return { title: "Charla del vestuario", body: post.text, url: "/chat", tag: `ch-${post.id}` };
  const message = [...merged.messages]
    .reverse()
    .find((item) => !remoteMessages.has(item.id) && item.memberId === activeId && fresh(item.at));
  if (message) {
    const nick = merged.members.find((item) => item.id === message.memberId)?.nick ?? "Plantel";
    return { title: nick, body: message.text, url: "/chat", tag: `msg-${message.id}` };
  }
  const note = [...merged.inbox]
    .reverse()
    .find((item) => !remoteInbox.has(item.id) && fresh(item.at) && item.readBy.includes(activeId));
  if (!note) return null;
  const url = note.kind === "formacion" ? "/cancha" : note.kind === "charla" ? "/chat" : "/";
  return { title: note.title, body: note.body, url, tag: `in-${note.id}` };
}

// True si la persona actual es quien creó el equipo.
// Genera un código de equipo de 5 letras mayúsculas, sin caracteres confundibles.
// Excluye: I, L, O para evitar confusiones al tipear.
function generarCodigoEquipo(): string {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZ"; // sin I, L, O
  let codigo = "";
  for (let i = 0; i < 5; i += 1) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  return codigo;
}
// True si la persona actual es quien creó el equipo.
function isCreatorId(state: { club: Club | null; activeId: string }): boolean {
  return Boolean(state.club && state.club.createdBy === state.activeId);
}

function snapshotShelf(state: {
  club: Club | null;
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
  activeId: string;
}): ShelfTeam | null {
  if (!state.club) return null;
  return { bundle: toBundle({ ...state, club: state.club }), activeId: state.activeId };
}

function upsertShelf(list: ShelfTeam[], next: ShelfTeam): ShelfTeam[] {
  const code = next.bundle.club.inviteCode.toUpperCase();
  return [
    ...list.filter(
      (item) => item.bundle.club.id !== next.bundle.club.id && item.bundle.club.inviteCode.toUpperCase() !== code,
    ),
    next,
  ];
}

function memberIdOnTeam(team: ShelfTeam): string {
  if (team.bundle.members.some((person) => person.id === team.activeId)) return team.activeId;
  return team.bundle.members[0]?.id ?? team.activeId;
}

function memberIdForCode(inviteCode: string): { id: string; known: boolean } {
  const key = `mv-member-${inviteCode}`;
  if (typeof window === "undefined") return { id: uid("j"), known: false };
  try {
    const stored = localStorage.getItem(key);
    if (stored && stored !== GUEST_ID) return { id: stored, known: true };
    const id = uid("j");
    localStorage.setItem(key, id);
    return { id, known: false };
  } catch {
    return { id: uid("j"), known: false };
  }
}

function rememberMemberId(inviteCode: string, personId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`mv-member-${inviteCode}`, personId);
  } catch {
    // El id igual viaja en la memoria de esta sesión.
  }
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
  droppedIds?: string[];
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
    droppedIds: state.droppedIds ?? [],
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
  if (item.audience === "miembro") {
    // Solo lo ve el miembro asignado al equipamiento de ese partido.
    const event = useFija.getState().events.find((e) => e.id === item.eventId);
    if (!event?.equipamiento) return false;
    return Object.values(event.equipamiento).includes(me.id);
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
// Devuelve los miembros que juegan (cancha, planilla, convocatorias).
// Incluye DT y ayudante que también juegan.
export function useJugadores(): Member[] {
  return useFija((s) =>
    s.members.filter((p) => p.juega ?? p.role === "jugador"),
  );
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
  const players = members.filter((m) => m.juega ?? m.role === "jugador");
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
