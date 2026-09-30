import { create } from "zustand";
import { useMemo } from "react";
import { createJSONStorage, persist } from "zustand/middleware";
import { formatWhen, uid } from "./format";
import { notifyApp, notifyReminder } from "./notify";
import { createSeed, emptyClubState, GUEST_ID, openClubs } from "./seed";
import { sanitizeCode, sanitizeName, sanitizeText } from "./sanitize";
import { FORMATIONS } from "./formations";
import { alertsDue, preferRsvp } from "./club-rules";
import { pruneBundle } from "./prune";
import { clampHours } from "./share";
import { claimMember, closedMatchStillHeavy, leaveClubDoc, lightenClosedMatches, listMyClubs, loadClubDoc, loadPortrait, mergeTournaments, pickEvent, pickSheet, readmitAccountDoc, saveClubDoc, savePortrait, useMyName, withoutDroppedEvents } from "./cloud";
import { clearPedirEdad, readMenor } from "./edad";
import { noteQuiet } from "@/lib/note";
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
  clubNotice: string | null;
  bannedAccounts: { accountId: string; name: string; at: string }[];
  dirty: boolean;
  lastFlushErrorAt: number | null;
  cloudWeight: number | null;
  savedMine: Record<string, RsvpStatus>;
  ownerAccountId: string | null;
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
  setSpot: (eventId: string, slot: string, memberId: string | null) => string | null;
  setSuplente: (eventId: string, memberId: string, on: boolean) => string | null;
  setConvocado: (eventId: string, memberId: string, on: boolean) => string | null;
  convocarLosQueVan: (eventId: string) => string | null;
  setBoardShape: (eventId: string, modality: Modality, formacionId: string) => string | null;
  setTactics: (eventId: string, tactics: string) => void;
  publishLineup: (eventId: string) => void;
  sendChat: (text: string) => void;
  postCharla: (text: string) => void;
  deleteCharla: (id: string) => void;
  updateCharla: (id: string, text: string) => void;
  updateMember: (memberId: string, patch: { name?: string; nick?: string; number?: number | null }) => void;
  reopenTournament: (id: string) => void;
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
    saveMatchSheet: (sheet: Omit<MatchSheet, "recordedAt">, options?: { confirmClosed?: boolean }) => void;
  asignarEquipamiento: (eventId: string, item: ItemEquipamiento, memberId: string | null) => void;
  ultimoEquipamiento: (beforeEventId: string, item: ItemEquipamiento) => string | null;
  createTournament: (name: string) => string | null;
  renameTournament: (id: string, name: string) => void;
  finishTournament: (id: string) => void;
  markMatchResult: (eventId: string, done: boolean) => void;
  setGpsConsent: (value: GpsConsent) => void;
  leaveClub: () => Promise<{ ok: boolean; error?: string }>;
  forgetClub: (clubId: string, message: string) => void;
  clearClubNotice: () => void;
  readmitAccount: (accountId: string) => Promise<boolean>;
  joinClub: (code: string) => Promise<boolean>;
  createClub: (name: string, crest?: string | null) => Promise<void>;
  setActiveClub: (clubId: string) => Promise<void>;
  removeClub: (clubId: string) => void;
  setProfile: (profile: { name: string; nick: string }) => void;
  setMyPhoto: (photo: string | null) => void;
  applyMyEdad: (menor: boolean) => void;
  syncFromCloud: () => Promise<void>;
  restoreMyClubs: () => Promise<void>;
  ensureMySpot: () => Promise<void>;
  applySharedPhoto: () => Promise<void>;
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
  ownerAccountId: null as string | null,
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
  - renameTournament  cambiar el nombre de un torneo ya creado.
  - finishTournament  cerrar el torneo. Las stats generales siguen.
  - setRsvp           el jugador dice si va o no.
  - sendChat          mensaje de la charla.
  - syncFromCloud     traer el equipo desde la nube.
  - flushCloud        subir el equipo a la nube.
*/

export async function currentAccount(): Promise<{ id: string; name: string } | null> {
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
      clubNotice: null as string | null,
      bannedAccounts: [] as { accountId: string; name: string; at: string }[],
      dirty: false,
      lastFlushErrorAt: null as number | null,
      cloudWeight: null as number | null,
      savedMine: {} as Record<string, RsvpStatus>,
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
        if (tournamentClosedFor(get(), eventId)) return;
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
        if (!isStaffId(get())) return;
        if (tournamentClosedFor(get(), eventId)) return;
        set({ rsvps: upsertRsvp(get().rsvps, eventId, memberId, status) });
      },

      sendReminder: (eventId) => {
        if (!isStaffId(get())) return;
        if (tournamentClosedFor(get(), eventId)) return;
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return;
        const moment = new Date().toISOString();
        const notice: InboxItem = {
          id: `in-now-${eventId}-${Date.parse(moment)}`,
          kind: "recordatorio",
          title: "El DT te está esperando",
          body: `Confirmá si vas a ${event.title}.`,
          eventId,
          audience: "pending",
          at: moment,
          readBy: [get().activeId],
        };
        set({
          inbox: [...get().inbox, notice],
          reminder: { eventId, sentAt: moment },
        });
        void notifyReminder(event);
      },

      // Cierra el cartel de recordatorio.
      dismissReminder: () => set({ reminder: null }),

      // Crea un partido, entrenamiento o reunión. Solo DT o ayudante.
      // Un partido no se crea si no hay torneo: tiene que quedar asociado a uno.
      createEvent: (input) => {
        if (!isStaffId(get())) return;
        const tournaments = get().tournaments;
        const chosen = input.tournamentId
          ? tournaments.find((tournament) => tournament.id === input.tournamentId)
          : undefined;
        if (input.kind === "partido" && input.tournamentId && (!chosen || chosen.status === "finished")) return;
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
          tournamentId: input.kind === "partido" ? input.tournamentId || null : null,
        };
                const players = get().members.filter(
          (person) => person.juega ?? person.role === "jugador",
        );
        const pendingAnswers = players.map((player) => ({
          eventId: event.id,
          memberId: player.id,
          status: "pendiente" as const,
        }));
        const notice = fechaNotice(get().activeId, event, "Nueva fecha", `${event.title} · ${formatWhen(event.startsAt)} · ${event.place}`);
        set({
          events: [...get().events, event],
          rsvps: [...get().rsvps, ...pendingAnswers],
          inbox: notice ? [...get().inbox, notice] : get().inbox,
        });
      },

      // Cambia datos de un evento ya creado. Solo DT o ayudante.
      updateEvent: (id, patch) => {
        if (!isStaffId(get())) return;
        const current = get().events.find((event) => event.id === id);
        if (!current) return;
        if (patch.tournamentId && patch.tournamentId !== current.tournamentId) {
          const next = get().tournaments.find((tournament) => tournament.id === patch.tournamentId);
          if (!next || next.status === "finished") return;
        }
        const touchesBoard =
          "lineup" in patch ||
          "formacion" in patch ||
          "modality" in patch ||
          "tactics" in patch ||
          "convocados" in patch ||
          "suplentes" in patch;
        const nextStart = patch.startsAt ?? current.startsAt;
        const scheduleChanged =
          (patch.startsAt != null && patch.startsAt !== current.startsAt) ||
          (patch.place != null && patch.place !== current.place) ||
          (patch.title != null && patch.title !== current.title);
        const upcoming = Date.parse(nextStart) >= Date.now() - 3_600_000;
        const notice =
          scheduleChanged && upcoming
            ? fechaNotice(
                get().activeId,
                { ...current, ...patch, startsAt: nextStart },
                "Cambió una fecha",
                `${patch.title || current.title} · ${formatWhen(nextStart)} · ${patch.place || current.place}`,
              )
            : null;
        set({
          events: get().events.map((event) =>
            event.id === id
              ? {
                  ...event,
                  ...patch,
                  lineupUpdatedAt: touchesBoard ? new Date().toISOString() : event.lineupUpdatedAt,
                }
              : event,
          ),
          inbox: notice ? [...get().inbox, notice] : get().inbox,
        });
      },

      // Borra el evento y todo lo que colgaba de él: respuestas, planilla y avisos.
      deleteEvent: (id) => {
        if (!isStaffId(get())) return;
        const droppedEventIds = [...new Set([...(get().droppedEventIds ?? []), id])];
        set({
          droppedEventIds,
          events: get().events.filter((event) => event.id !== id),
          rsvps: get().rsvps.filter((answer) => answer.eventId !== id),
          matchSheets: get().matchSheets.filter((sheet) => sheet.eventId !== id),
          convocatorias: get().convocatorias.filter((callup) => callup.eventId !== id),
          alertLog: get().alertLog.filter((alert) => alert.eventId !== id),
          inbox: get().inbox.filter((item) => item.eventId !== id),
        });
      },

      // Pone a un jugador en un puesto de la cancha.
      // Si memberId viene vacío, saca a quien estaba en ese puesto.
      // Un jugador no puede estar en dos puestos a la vez.
      setSpot: (eventId, slot, memberId) => {
        if (!isStaffId(get())) return "Solo el DT o el ayudante arman la pizarra.";
        if (tournamentClosedFor(get(), eventId)) return "El torneo está cerrado.";
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return "Ese partido no está.";
        if (memberId) {
          const aviso = avisoParaCancha(get(), event, memberId);
          if (aviso) return aviso;
        }
        set({
          events: get().events.map((item) => {
            if (item.id !== eventId) return item;
            const lineup = { ...item.lineup };
            let suplentes = item.suplentes ?? [];
            let convocados = item.convocados;
            if (!memberId) {
              delete lineup[slot];
            } else {
              for (const position of Object.keys(lineup)) {
                if (lineup[position] === memberId) delete lineup[position];
              }
              lineup[slot] = memberId;
              suplentes = suplentes.filter((id) => id !== memberId);
              if (!convocados) {
                convocados = [...new Set([...Object.values(lineup), ...suplentes])];
              } else if (!convocados.includes(memberId)) {
                return item;
              }
            }
            return {
              ...item,
              lineup,
              suplentes,
              convocados,
              lineupUpdatedAt: new Date().toISOString(),
            };
          }),
        });
        return null;
      },

      setSuplente: (eventId, memberId, on) => {
        if (!isStaffId(get())) return "Solo el DT o el ayudante arman la pizarra.";
        if (tournamentClosedFor(get(), eventId)) return "El torneo está cerrado.";
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return "Ese partido no está.";
        if (on) {
          const aviso = avisoParaCancha(get(), event, memberId);
          if (aviso) return aviso;
        }
        set({
          events: get().events.map((item) => {
            if (item.id !== eventId) return item;
            const lineup = { ...item.lineup };
            if (on) {
              for (const position of Object.keys(lineup)) {
                if (lineup[position] === memberId) delete lineup[position];
              }
            }
            const base = item.convocados ?? [...new Set([...Object.values(item.lineup), ...(item.suplentes ?? [])])];
            const convocados = !on || base.includes(memberId) ? base : [...base, memberId];
            const suplentes = on
              ? [...new Set([...(item.suplentes ?? []).filter((id) => id !== memberId), memberId])]
              : (item.suplentes ?? []).filter((id) => id !== memberId);
            return {
              ...item,
              lineup,
              convocados,
              suplentes,
              lineupUpdatedAt: new Date().toISOString(),
            };
          }),
        });
        return null;
      },

      setConvocado: (eventId, memberId, on) => {
        if (!isStaffId(get())) return "Solo el DT o el ayudante arman la convocatoria.";
        if (tournamentClosedFor(get(), eventId)) return "El torneo está cerrado.";
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return "Ese partido no está.";
        if (on && rsvpDe(get(), eventId, memberId) === "no") {
          return "Dijo que no va.";
        }
        set({
          events: get().events.map((item) => {
            if (item.id !== eventId) return item;
            const actuales = item.convocados ?? [
              ...new Set([...Object.values(item.lineup), ...(item.suplentes ?? [])]),
            ];
            const convocados = on
              ? [...new Set([...actuales, memberId])]
              : actuales.filter((id) => id !== memberId);
            const lineup = on
              ? item.lineup
              : Object.fromEntries(Object.entries(item.lineup).filter(([, id]) => id !== memberId));
            const suplentes = (item.suplentes ?? []).filter((id) => convocados.includes(id));
            return { ...item, convocados, lineup, suplentes, lineupUpdatedAt: new Date().toISOString() };
          }),
        });
        return null;
      },

      convocarLosQueVan: (eventId) => {
        if (!isStaffId(get())) return "Solo el DT o el ayudante arman la convocatoria.";
        if (tournamentClosedFor(get(), eventId)) return "El torneo está cerrado.";
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return "Ese partido no está.";
        const van = new Set(
          get()
            .members.filter((person) => person.juega ?? person.role === "jugador")
            .filter((person) => rsvpDe(get(), eventId, person.id) === "voy")
            .map((person) => person.id),
        );
        if (van.size === 0) return "Nadie confirmó que va.";
        const afuera = Object.values(event.lineup).filter((id) => !van.has(id));
        set({
          events: get().events.map((item) => {
            if (item.id !== eventId) return item;
            const lineup = Object.fromEntries(Object.entries(item.lineup).filter(([, id]) => van.has(id)));
            const suplentes = (item.suplentes ?? []).filter((id) => van.has(id));
            return {
              ...item,
              convocados: [...van],
              lineup,
              suplentes,
              lineupUpdatedAt: new Date().toISOString(),
            };
          }),
        });
        return afuera.length > 0 ? "Saqué de la cancha a quien no confirmó que va." : null;
      },

      setBoardShape: (eventId, modality, formacionId) => {
        if (!isStaffId(get())) return "Solo el DT o el ayudante cambian la formación.";
        if (tournamentClosedFor(get(), eventId)) return "El torneo está cerrado.";
        const event = get().events.find((item) => item.id === eventId);
        if (!event) return "Ese partido no está.";
        const oldSlots = slotsDe(event.modality, event.formacion);
        const nextSlots = slotsDe(modality, formacionId);
        const ordered = oldSlots.map((slot) => event.lineup[slot.key]).filter((id): id is string => Boolean(id));
        const lineup: Record<string, string> = {};
        const used = new Set<string>();
        nextSlots.forEach((slot, index) => {
          const id = ordered[index];
          if (!id || used.has(id)) return;
          lineup[slot.key] = id;
          used.add(id);
        });
        const overflow = ordered.filter((id) => !used.has(id));
        const convocados = [
          ...new Set([...(event.convocados ?? [...ordered, ...(event.suplentes ?? [])]), ...overflow]),
        ];
        const suplentes = [
          ...new Set([
            ...(event.suplentes ?? []).filter((id) => convocados.includes(id) && !used.has(id)),
            ...overflow,
          ]),
        ];
        set({
          events: get().events.map((item) =>
            item.id === eventId
              ? {
                  ...item,
                  modality,
                  formacion: formacionId,
                  lineup,
                  convocados,
                  suplentes,
                  lineupUpdatedAt: new Date().toISOString(),
                }
              : item,
          ),
        });
        if (overflow.length === 0) return null;
        const nombres = overflow
          .map((id) => get().members.find((person) => person.id === id)?.nick ?? "Un jugador")
          .join(", ");
        return `Pasaron al banco: ${nombres}.`;
      },

      // Guarda la nota táctica que escribe el DT debajo de la cancha.
      setTactics: (eventId, tactics) => {
        if (!isStaffId(get())) return;
        if (tournamentClosedFor(get(), eventId)) return;
        set({
          events: get().events.map((event) =>
            event.id === eventId
              ? { ...event, tactics, lineupUpdatedAt: new Date().toISOString() }
              : event,
          ),
        });
      },

      // Avisa a todo el plantel que la formación ya está publicada.
      publishLineup: (eventId) => {
        if (!isStaffId(get())) return;
        if (tournamentClosedFor(get(), eventId)) return;
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

      deleteCharla: (id) => {
        if (!isStaffId(get())) return;
        const post = get().charla.find((item) => item.id === id);
        if (!post) return;
        set({
          charla: get().charla.filter((item) => item.id !== id),
          inbox: get().inbox.filter((item) => !(item.kind === "charla" && item.at === post.at && item.body === post.text)),
        });
      },

      updateCharla: (id, text) => {
        if (!isStaffId(get())) return;
        const cleanText = sanitizeText(text, 400);
        if (!cleanText) return;
        set({
          charla: get().charla.map((post) => (post.id === id ? { ...post, text: cleanText } : post)),
        });
      },

      updateMember: (memberId, patch) => {
        if (!isStaffId(get())) return;
        const name = patch.name != null ? sanitizeName(patch.name) : undefined;
        const nick = patch.nick != null ? sanitizeName(patch.nick) : undefined;
        set({
          members: get().members.map((person) => {
            if (person.id !== memberId) return person;
            return {
              ...person,
              name: name || person.name,
              nick: nick || person.nick,
              number: patch.number === undefined ? person.number : patch.number,
            };
          }),
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
        const secondHours = clampHours(policy.secondHours);
        set({ reminderPolicy: { firstHours, secondHours } });
      },
      // Cada tanto revisa si ya pasó el plazo y hay que recordar a los que no contestaron.
      tickAlerts: () => {
        const state = get();
        const due = alertsDue(
          {
            events: state.events,
            rsvps: state.rsvps,
            convocatorias: state.convocatorias,
            inbox: state.inbox,
            alertLog: state.alertLog,
            reminderPolicy: state.reminderPolicy,
            tournaments: state.tournaments,
          },
          Date.now(),
        );
        if (due.inbox === state.inbox && due.alertLog === state.alertLog) return;
        set({ inbox: due.inbox, alertLog: due.alertLog });
        const me = state.members.find((person) => person.id === state.activeId);
        if (!me) return;
        for (const push of due.pushes) {
          if (!pushReaches(me, push, state.rsvps, state.events)) continue;
          void notifyApp({ body: push.body, tag: push.tag, eventId: push.eventId });
        }
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
        if (!isCreatorId(get())) return;
        const { members, activeId, club } = get();
        const currentPerson = members.find((person) => person.id === activeId);
        const otherPerson = members.find((person) => person.id === otherPersonId);
        if (!currentPerson || !otherPerson || !club) return;
        if (currentPerson.id === otherPerson.id) return;
        const roleIHaveNow = currentPerson.role;
        set({
          members: members.map((person) => {
            if (person.id === currentPerson.id) return { ...person, role: otherPerson.role };
            if (person.id === otherPerson.id) return { ...person, role: roleIHaveNow };
            return person;
          }),
          club: { ...club, createdBy: otherPerson.id },
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
        const target = state.members.find((person) => person.id === memberId);
        const allowed = isCreatorId(state) || (isStaffId(state) && target?.menor === true);
        if (!allowed || !memberId || memberId === state.activeId) return;
        if (!state.members.some((person) => person.id === memberId)) return;
        const droppedIds = [...new Set([...(state.droppedIds ?? []), memberId])];
        set({
          droppedIds,
          members: state.members.filter((person) => person.id !== memberId),
          rsvps: state.rsvps.filter((row) => row.memberId !== memberId),
          invites: state.invites.filter((invite) => invite.memberId !== memberId),
          events: state.events.map((event) => {
            const lineup = Object.fromEntries(
              Object.entries(event.lineup).filter(([, id]) => id !== memberId),
            );
            const convocados = (event.convocados ?? []).filter((id) => id !== memberId);
            const suplentes = (event.suplentes ?? []).filter((id) => id !== memberId);
            const changed =
              Object.keys(lineup).length !== Object.keys(event.lineup).length ||
              convocados.length !== (event.convocados ?? []).length ||
              suplentes.length !== (event.suplentes ?? []).length;
            return changed
              ? { ...event, lineup, convocados, suplentes, lineupUpdatedAt: new Date().toISOString() }
              : event;
          }),
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
            if (person.id === memberId) {
              return { ...person, role, juega: role === "jugador" ? true : person.juega };
            }
            if (role !== "jugador" && person.role === role) {
              return { ...person, role: "jugador", juega: true };
            }
            return person;
          }),
        });
      },
            // Marca o desmarca si alguien juega (aparece en la cancha, planilla y convocatorias).
      // Puede ser cualquiera del plantel: jugador, DT o ayudante.
      setJuega: (memberId, juega) => {
        if (!isStaffId(get()) && !isCreatorId(get())) return;
        const members = get().members.map((person) =>
          person.id === memberId ? { ...person, juega } : person,
        );
        const now = Date.now();
        const rsvps = juega
          ? [
              ...get().rsvps,
              ...missingPlayingRsvps({ ...get(), members }).filter((row) => row.memberId === memberId),
            ]
          : get().rsvps.filter((row) => {
              if (row.memberId !== memberId || row.status !== "pendiente") return true;
              const event = get().events.find((item) => item.id === row.eventId);
              return !event || +new Date(event.startsAt) < now;
            });
        set({ members, rsvps });
      },

      // Guarda el resultado y los números de cada jugador en ese partido.
      // Si ya había planilla, la reemplaza.
      saveMatchSheet: (input, options) => {
        if (!isStaffId(get())) return;
        const event = get().events.find((item) => item.id === input.eventId);
        const tournament = get().tournaments.find((item) => item.id === event?.tournamentId);
        if (tournament?.status === "finished" && !options?.confirmClosed) return;
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

      // Abre un torneo. Puede haber más de uno abierto (liga y copa).
      // Devuelve el id del torneo nuevo para poder asociarle el partido enseguida.
      createTournament: (name) => {
        if (!isStaffId(get())) return null;
        const tournamentName = sanitizeName(name);
        if (!tournamentName) return null;
        const tournament: Tournament = {
          id: uid("tor"),
          name: tournamentName,
          startedAt: new Date().toISOString(),
          endedAt: null,
          status: "active",
          updatedAt: new Date().toISOString(),
        };
        set({ tournaments: [...get().tournaments, tournament] });
        return tournament.id;
      },

      renameTournament: (id, name) => {
        if (!isStaffId(get())) return;
        const tournamentName = sanitizeName(name);
        if (!tournamentName) return;
        set({
          tournaments: get().tournaments.map((tournament) =>
            tournament.id === id
              ? { ...tournament, name: tournamentName, updatedAt: new Date().toISOString() }
              : tournament,
          ),
        });
      },

      // Cierra el torneo. Los partidos viejos siguen contando en el total del equipo.
      finishTournament: (id) => {
        if (!isStaffId(get())) return;
        const current = get();
        if (!current.club) return;
        const tournament = current.tournaments.find((item) => item.id === id);
        if (!tournament || tournament.status !== "active") return;
        const now = new Date().toISOString();
        const tournaments = current.tournaments.map((item) =>
          item.id === id
            ? { ...item, status: "finished" as const, endedAt: now, updatedAt: now }
            : item,
        );
        const light = lightenClosedMatches({
          ...toBundle({ ...current, club: current.club, tournaments }),
          tournaments,
        });
        set({
          tournaments,
          events: light.events,
          rsvps: light.rsvps,
          inbox: light.inbox,
          alertLog: light.alertLog,
          convocatorias: light.convocatorias,
        });
      },

      reopenTournament: (id) => {
        if (!isStaffId(get())) return;
        const now = new Date().toISOString();
        set({
          tournaments: get().tournaments.map((item) =>
            item.id === id ? { ...item, status: "active" as const, endedAt: null, updatedAt: now } : item,
          ),
        });
      },

      markMatchResult: (eventId, done) => {
        if (!isStaffId(get())) return;
        const now = new Date().toISOString();
        set({
          events: get().events.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  resultClosedAt: done ? now : null,
                  resultPending: !done,
                  resultUpdatedAt: now,
                }
              : event,
          ),
        });
      },

      // El usuario aceptó o rechazó usar el GPS para marcar la cancha.
      setGpsConsent: (value) => {
        const me = get().members.find((person) => person.id === get().activeId);
        if ((me?.menor || readMenor()) && value === "granted") return;
        set({ gpsConsent: value });
      },

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
        const me = get().members.find((person) => person.id === personId);
        if (me?.menor || readMenor()) return;
        const safe = photo && photo.startsWith("data:image/") && photo.length < 30_000 ? photo : null;
        set({
          members: get().members.map((person) =>
            person.id === personId ? { ...person, photo: safe } : person,
          ),
        });
        void savePortrait({ data: safe }).catch(() => undefined);
        void get().flushCloud();
      },

      applyMyEdad: (menor) => {
        const personId = get().activeId;
        set({
          members: get().members.map((person) =>
            person.id === personId
              ? { ...person, menor: menor || person.menor, photo: menor ? null : person.photo }
              : person,
          ),
        });
      },

      // Sale solo del equipo activo. Si hay otros, entra al siguiente.
      // No borra el equipo de la nube: el plantel sigue ahí.
      leaveClub: async () => {
        const state = get();
        if (!state.club) return { ok: true };
        const code = state.club.inviteCode;
        const result = await leaveClubDoc({ data: { code } });
        if (!result.ok) return { ok: false, error: result.error || "No pudimos sacarte del equipo. Probá de nuevo." };
        if (flushTimer) {
          window.clearTimeout(flushTimer);
          flushTimer = null;
        }
        forgetStoredMember(code);
        const others = state.otherClubs.filter((item) => item.bundle.club.id !== state.club?.id);
        const next = others[0];
        if (next) {
          set({
            ...next.bundle,
            otherClubs: others.slice(1),
            activeClubId: next.bundle.club.id,
            archivedClubs: state.archivedClubs,
            profile: state.profile,
            gpsConsent: state.gpsConsent,
            activeId: memberIdOnTeam(next),
            reminder: null,
            hydrated: true,
            cloudStatus: "ok",
            cloudError: null,
          });
          void get().syncFromCloud();
          return { ok: true };
        }
        set({
          ...emptyClubState(),
          otherClubs: [],
          activeClubId: null,
          archivedClubs: state.archivedClubs,
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: GUEST_ID,
          hydrated: true,
          cloudStatus: "idle",
          cloudError: null,
        });
        return { ok: true };
      },

      forgetClub: (clubId, message) => {
        const state = get();
        if (flushTimer) {
          window.clearTimeout(flushTimer);
          flushTimer = null;
        }
        const active = state.club?.id === clubId;
        const code = active
          ? state.club?.inviteCode
          : state.otherClubs.find((item) => item.bundle.club.id === clubId)?.bundle.club.inviteCode;
        if (code) forgetStoredMember(code);
        if (!active) {
          set({
            otherClubs: state.otherClubs.filter((item) => item.bundle.club.id !== clubId),
            clubNotice: message,
          });
          return;
        }
        const others = state.otherClubs.filter((item) => item.bundle.club.id !== clubId);
        const next = others[0];
        if (next) {
          set({
            ...next.bundle,
            otherClubs: others.slice(1),
            activeClubId: next.bundle.club.id,
            archivedClubs: state.archivedClubs,
            profile: state.profile,
            gpsConsent: state.gpsConsent,
            activeId: memberIdOnTeam(next),
            reminder: null,
            hydrated: true,
            clubNotice: message,
          });
          return;
        }
        set({
          ...emptyClubState(),
          otherClubs: [],
          activeClubId: null,
          archivedClubs: state.archivedClubs,
          profile: state.profile,
          gpsConsent: state.gpsConsent,
          activeId: GUEST_ID,
          hydrated: true,
          clubNotice: message,
        });
      },

      clearClubNotice: () => set({ clubNotice: null }),

      readmitAccount: async (accountId) => {
        const club = get().club;
        if (!club || !accountId) return false;
        const result = await readmitAccountDoc({ data: { code: club.inviteCode, accountId } });
        if (!result.ok || !result.bundle) return false;
        applyingCloud = true;
        set({
          members: result.bundle.members,
          bannedAccounts: result.bundle.bannedAccounts ?? [],
          cloudStatus: "ok",
          cloudError: null,
        });
        applyingCloud = false;
        return true;
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
        let teamFound: ClubBundle | null = null;
        let cloudFailed = false;
        try {
          const remoteTeam = await loadClubDoc({ data: inviteCode });
          if (remoteTeam.ok) teamFound = remoteTeam.bundle;
          else if (remoteTeam.reason === "limited") {
            set({ cloudStatus: "off" });
            throw new Error("Demasiados intentos. Esperá un rato.");
          } else if (remoteTeam.reason === "forbidden") {
            const account = await currentAccountId();
            if (!account) {
              set({ cloudStatus: "off" });
              throw new Error("Entrá con tu mail para unirte.");
            }
            const name = (state.profile.name || "Jugador").trim() || "Jugador";
            const nick = (state.profile.nick || name.split(" ")[0] || "Jugador").trim();
            const claimed = await claimMember({
              data: {
                code: inviteCode,
                mode: "join",
                member: { id: account, name, nick, number: null, menor: readMenor() },
              },
            });
            if (claimed.removed) {
              set({ cloudStatus: "off" });
              throw new Error(claimed.error || "El DT te sacó de este equipo.");
            }
            if (!claimed.ok) {
              set({ cloudStatus: "off" });
              throw new Error(claimed.error || "No se pudo entrar al equipo.");
            }
            const again = await loadClubDoc({ data: inviteCode });
            if (!again.ok) {
              set({ cloudStatus: "off" });
              throw new Error("No pudimos leer el equipo.");
            }
            teamFound = again.bundle;
          }
        } catch (error) {
          if (error instanceof Error && error.message !== "No pudimos leer el equipo.") {
            const known = error.message.includes("Demasiados") || error.message.includes("mail") || error.message.includes("entrar") || error.message.includes("anotar") || error.message.includes("sesión") || error.message.includes("Falta") || error.message.includes("sacó");
            if (known) throw error;
          }
          cloudFailed = true;
        }
        if (!teamFound && cloudFailed) {
          teamFound =
            state.archivedClubs.find((saved) => saved.club.inviteCode.toUpperCase() === inviteCode) ??
            openClubs().find((saved) => saved.club.inviteCode.toUpperCase() === inviteCode) ??
            null;
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
              menor: Boolean(existing.menor || readMenor()) || undefined,
            }
          : {
              id: personId,
              name: state.profile.name || "Jugador",
              nick: state.profile.nick || "Jugador",
              role: "jugador",
              number: null,
              accountId: account,
              menor: readMenor() || undefined,
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
            mode: "join",
            member: { id: personId, name: me.name, nick: me.nick, number: me.number, menor: me.menor === true },
          },
        });
        if (claimed.removed) {
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
          throw new Error(claimed.error || "El DT te sacó de este equipo.");
        }
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
          cloudError: get().dirty ? get().cloudError : null,
          savedMine: mineSaved(teamFound.rsvps, linked?.id ?? personId),
          ownerAccountId: account ?? get().ownerAccountId,
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
          menor: readMenor() || undefined,
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
          ownerAccountId: account ?? state.ownerAccountId,
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
        void get().syncFromCloud().then(() => get().applySharedPhoto());
      },

      removeClub: (clubId) => {
        const state = get();
        if (!clubId) return;
        if (state.club?.id === clubId) {
          void get().leaveClub();
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
        if (linked && linked.id !== state.activeId) set({ activeId: linked.id });
        if (linked) {
          const remote = await loadClubDoc({ data: club.inviteCode });
          const onServer =
            remote.ok &&
            remote.bundle.members.some((person) => person.accountId === account.id || person.id === account.id);
          if (onServer || remote.reason === "limited" || remote.reason === "missing") return;
        }
        const name = linked?.name || account.name || state.profile.name || "Jugador";
        const nick = linked?.nick || name.split(" ")[0] || "Jugador";
        try {
          const result = await claimMember({
            data: {
              code: club.inviteCode,
              mode: "resume",
              member: {
                id: account.id,
                name,
                nick,
                number: linked?.number ?? null,
                menor: linked?.menor === true || readMenor(),
              },
            },
          });
          if (result.removed) {
            get().forgetClub(
              club.id,
              `El DT te sacó de «${club.name}». Si fue un error, pedile que te deje volver a entrar.`,
            );
            return;
          }
          if (result.notMember) {
            get().forgetClub(
              club.id,
              `Ya no estás en el plantel de «${club.name}». Si querés volver, pedile el código al DT.`,
            );
            return;
          }
          if (!result.ok || !result.members) return;
          const mine = result.members.find(
            (person) => person.accountId === account.id || person.id === account.id,
          );
          applyingCloud = true;
          set({
            members: result.members,
            activeId: mine?.id ?? state.activeId,
            cloudStatus: "ok",
            cloudError: get().dirty ? get().cloudError : null,
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
          cloudError: get().dirty ? get().cloudError : null,
        });
        applyingCloud = false;
        localRev += 1;
        return true;
      },

      // En un celular nuevo, trae los equipos donde esta cuenta ya está.
      restoreMyClubs: async () => {
        let listed: { code: string; name: string }[] = [];
        try {
          listed = await listMyClubs();
        } catch {
          return;
        }
        if (!listed.length) return;
        const account = await currentAccount();
        const accountId = account?.id ?? null;
        const state = get();
        const known = new Set<string>();
        if (state.club) known.add(state.club.inviteCode.toUpperCase());
        for (const item of state.otherClubs) known.add(item.bundle.club.inviteCode.toUpperCase());
        const missing = listed.filter((item) => !known.has(item.code.toUpperCase()));
        if (!missing.length) return;
        const loaded: ClubBundle[] = [];
        for (const item of missing.slice(0, 12)) {
          try {
            const remote = await loadClubDoc({ data: item.code });
            if (remote.ok) loaded.push(remote.bundle);
          } catch {
            // El siguiente equipo puede estar bien.
          }
        }
        if (!loaded.length) return;
        const current = get();
        if (!current.club) {
          const [first, ...rest] = loaded;
          if (!first) return;
          const activeId = memberOnBundle(first, accountId);
          applyingCloud = true;
          set({
            ...first,
            otherClubs: rest.map((bundle) => ({ bundle, activeId: memberOnBundle(bundle, accountId) })),
            activeClubId: first.club.id,
            activeId,
            profile: current.profile,
            gpsConsent: current.gpsConsent,
            archivedClubs: current.archivedClubs,
            ownerAccountId: accountId ?? current.ownerAccountId,
            hydrated: true,
            cloudStatus: "ok",
            dirty: false,
            savedMine: mineSaved(first.rsvps, activeId),
            reminder: null,
          });
          applyingCloud = false;
          return;
        }
        const shelf = loaded.reduce<ShelfTeam[]>(
          (list, bundle) => upsertShelf(list, { bundle, activeId: memberOnBundle(bundle, accountId) }),
          current.otherClubs,
        );
        applyingCloud = true;
        set({ otherClubs: shelf });
        applyingCloud = false;
      },

      applySharedPhoto: async () => {
        const state = get();
        const me = state.members.find((person) => person.id === state.activeId);
        if (!me || me.menor) return;
        if (me.photo && me.photo.startsWith("data:image/") && me.photo.length < 30_000) {
          void savePortrait({ data: me.photo }).catch(() => undefined);
          return;
        }
        const account = await currentAccount();
        const accountId = account?.id ?? state.ownerAccountId;
        let photo: string | null = null;
        if (accountId) {
          for (const team of state.otherClubs) {
            const person = team.bundle.members.find(
              (item) => (item.accountId === accountId || item.id === accountId) && item.photo && !item.menor,
            );
            if (person?.photo) {
              photo = person.photo;
              break;
            }
          }
        }
        if (!photo) {
          try {
            const remote = await loadPortrait();
            photo = remote.photo;
          } catch {
            photo = null;
          }
        }
        if (!photo || !photo.startsWith("data:image/") || photo.length > 30_000) return;
        const still = get().members.find((person) => person.id === get().activeId);
        if (!still || still.menor || still.photo) return;
        get().setMyPhoto(photo);
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
          if (remoteTeam.ok) {
            const current = get();
            const local = toBundle({ ...current, club });
            const merged = mergeClubBundles(local, remoteTeam.bundle, {
              activeId: current.activeId,
              staff: isStaffId(current),
            });
            const extras = isStaffId(current) ? missingPlayingRsvps(merged) : [];
            applyingCloud = true;
            set({
              ...merged,
              rsvps: [...merged.rsvps, ...extras],
              otherClubs: current.otherClubs,
              activeClubId: merged.club.id,
              profile: current.profile,
              gpsConsent: current.gpsConsent,
              archivedClubs: current.archivedClubs,
              activeId: current.activeId,
              hydrated: true,
              cloudStatus: current.dirty ? current.cloudStatus : "ok",
              cloudError: current.dirty ? current.cloudError : null,
              savedMine: mineSaved(remoteTeam.bundle.rsvps, current.activeId),
              bannedAccounts: merged.bannedAccounts ?? current.bannedAccounts,
            });
            applyingCloud = false;
            const remoteIds = new Set(remoteTeam.bundle.members.map((person) => person.id));
            const localOnly = local.members.some((person) => !remoteIds.has(person.id));
            const tournamentChanged =
              isStaffId(current) &&
              merged.tournaments.some((item) => {
                const previous = (remoteTeam.bundle.tournaments ?? []).find((row) => row.id === item.id);
                return (
                  !previous ||
                  previous.name !== item.name ||
                  previous.status !== item.status
                );
              });
            if (
              extras.length > 0 ||
              localOnly ||
              tournamentChanged ||
              (isStaffId(current) && closedMatchStillHeavy(remoteTeam.bundle))
            ) {
              await get().flushCloud();
            }
          } else if (remoteTeam.reason === "forbidden") {
            if (!resumeTried.has(club.id)) {
              resumeTried.add(club.id);
              await get().ensureMySpot();
            } else if (!quiet) {
              set({ cloudStatus: "off" });
            }
          } else if (remoteTeam.reason === "missing") {
            const published = await get().publishClub();
            if (!published && !quiet) set({ cloudStatus: "off" });
          } else if (!quiet) {
            set({
              cloudStatus: "off",
              cloudError: remoteTeam.reason === "limited" ? "Demasiados intentos. Esperá un rato." : null,
            });
          }
        } catch {
          if (!quiet) set({ cloudStatus: "off" });
        } finally {
          syncingNow = false;
          const after = get();
          const last = after.lastFlushErrorAt;
          const waited = last == null || Date.now() - last > flushRetryWait();
          if ((after.dirty || mineUnsaved(after)) && after.club && waited) void get().flushCloud();
        }
      },

      // Sube el equipo a la nube usando el código como llave. Reintenta solo.
      flushCloud: async () => {
        const epoch = cloudEpoch;
        const state = get();
        if (!state.club) return false;
        set({ cloudStatus: "syncing" });
        let lastError = "No se pudo guardar el equipo.";
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (epoch !== cloudEpoch) return false;
          const clubNow = get().club;
          if (!clubNow) return false;
          try {
            let remote: ClubBundle | null = null;
            try {
              const loaded = await loadClubDoc({ data: clubNow.inviteCode });
              if (loaded.ok) remote = loaded.bundle;
              else if (loaded.reason === "forbidden") {
                lastError = "No estás en este equipo.";
                break;
              } else if (loaded.reason === "limited") {
                lastError = "Demasiados intentos. Esperá un rato.";
                break;
              }
            } catch {
              remote = null;
            }
            if (epoch !== cloudEpoch) return false;
            const revAtSend = localRev;
            const current = get();
            if (!current.club) return false;
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
            if (result.ok && result.bundle) {
              if (epoch !== cloudEpoch) return false;
              flushFailStreak = 0;
              const notice = freshNotice(current.activeId, remote, merged);
              const pushNotice = () => {
                if (!notice) return;
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
              };
              if (localRev !== revAtSend) {
                pushNotice();
                applyingCloud = true;
                set({
                  cloudStatus: "syncing",
                  dirty: true,
                  lastFlushErrorAt: null,
                  cloudWeight: result.weight ?? get().cloudWeight,
                });
                applyingCloud = false;
                if (flushTimer) window.clearTimeout(flushTimer);
                flushTimer = window.setTimeout(() => void useFija.getState().flushCloud(), 800) as unknown as ReturnType<typeof setTimeout>;
                return true;
              }
              const savedBundle = result.bundle;
              applyingCloud = true;
              set({
                ...savedBundle,
                otherClubs: get().otherClubs,
                activeClubId: savedBundle.club.id,
                profile: get().profile,
                gpsConsent: get().gpsConsent,
                archivedClubs: get().archivedClubs,
                activeId: get().activeId,
                hydrated: true,
                cloudStatus: "ok",
                cloudError: null,
                dirty: false,
                lastFlushErrorAt: null,
                cloudWeight: result.weight ?? null,
                savedMine: mineSaved(savedBundle.rsvps, get().activeId),
                clubNotice: get().clubNotice,
                bannedAccounts: savedBundle.bannedAccounts ?? get().bannedAccounts,
              });
              applyingCloud = false;
              pushNotice();
              return true;
            }
            lastError = result.error || lastError;
          } catch (error) {
            lastError = cloudFailureMessage(error);
          }
          await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        }
        if (epoch !== cloudEpoch) return false;
        flushFailStreak += 1;
        set({ cloudStatus: "off", cloudError: lastError, lastFlushErrorAt: Date.now(), dirty: true });
        noteQuiet("guardar", lastError);
        return false;
      },

      // Guarda y después comprueba que el código se puede leer. Recién ahí se puede invitar.
      publishClub: async () => {
        const uploaded = await get().flushCloud();
        const code = get().club?.inviteCode;
        if (!uploaded || !code) return false;
        try {
          const remote = await loadClubDoc({ data: code });
          if (!remote.ok) {
            set({
              cloudStatus: "off",
              cloudError: "El equipo no quedó publicado. Tocá de nuevo en un momento.",
            });
            noteQuiet("guardar", "no quedó publicado");
            return false;
          }
          set({ cloudStatus: "ok", cloudError: null });
          return true;
        } catch {
          set({
            cloudStatus: "off",
            cloudError: "No pudimos confirmar el equipo. Probá de nuevo.",
          });
          noteQuiet("guardar", "no se pudo confirmar");
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
        droppedEventIds: s.droppedEventIds ?? [],
        reminder: s.reminder,
        dirty: s.dirty,
        savedMine: s.savedMine,
        ownerAccountId: s.ownerAccountId,
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
        if (!Array.isArray(state.droppedEventIds)) state.droppedEventIds = [];
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
let localRev = 0;
let flushFailStreak = 0;
let cloudEpoch = 0;
const resumeTried = new Set<string>();

export function wipeLocalTeamData({ keepInvite = false } = {}) {
  cloudEpoch += 1;
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  useFija.setState({
    ...blank,
    hydrated: true,
    cloudStatus: "idle",
    cloudError: null,
    dirty: false,
    savedMine: {},
    ownerAccountId: null,
    clubNotice: null,
    bannedAccounts: [],
    lastFlushErrorAt: null,
    cloudWeight: null,
  });
  useFija.persist.clearStorage();
  if (typeof window === "undefined") return;
  try {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("mv-member-") || key === "mv-menor" || (!keepInvite && key === "mv-invite")) drop.push(key);
    }
    for (const key of drop) localStorage.removeItem(key);
  } catch {
    // Si el celular no deja borrar, la memoria igual quedó vacía.
  }
  clearPedirEdad();
}

function flushRetryWait(): number {
  if (flushFailStreak <= 0) return 30_000;
  return Math.min(30_000 * 2 ** (flushFailStreak - 1), 5 * 60_000);
}

function mineUnsaved(state: { activeId: string; rsvps: Rsvp[]; savedMine: Record<string, RsvpStatus> }): boolean {
  return state.rsvps.some(
    (row) => row.memberId === state.activeId && state.savedMine[row.eventId] !== row.status,
  );
}
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
    localRev += 1;
    if (!state.dirty) useFija.setState({ dirty: true });
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

function tournamentClosedFor(
  state: { events: ClubEvent[]; tournaments: Tournament[] },
  eventId: string,
): boolean {
  const event = state.events.find((item) => item.id === eventId);
  if (!event?.tournamentId) return false;
  const finished = state.tournaments.some(
    (tournament) => tournament.id === event.tournamentId && tournament.status === "finished",
  );
  if (!finished) return false;
  const start = Date.parse(event.startsAt);
  if (!Number.isNaN(start) && start >= Date.now() - 3_600_000) return false;
  return true;
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
  const map = new Map(remote.map((event) => [event.id, event]));
  for (const event of local) {
    const previous = map.get(event.id);
    map.set(event.id, previous ? pickEvent(previous, event) : event);
  }
  return [...map.values()];
}

function mergeRsvps(remote: Rsvp[], local: Rsvp[]): Rsvp[] {
  const key = (row: Rsvp) => `${row.eventId}:${row.memberId}`;
  const map = new Map<string, Rsvp>();
  for (const row of remote) map.set(key(row), row);
  for (const row of local) {
    const previous = map.get(key(row));
    map.set(key(row), previous ? preferRsvp(previous, row) : row);
  }
  return [...map.values()];
}

function mergeSheets(remote: MatchSheet[], local: MatchSheet[], staff: boolean): MatchSheet[] {
  const map = new Map(remote.map((sheet) => [sheet.eventId, sheet]));
  if (staff) {
    for (const sheet of local) {
      const previous = map.get(sheet.eventId);
      map.set(sheet.eventId, previous ? pickSheet(previous, sheet) : sheet);
    }
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
  const droppedEvents = new Set([
    ...(remote.droppedEventIds ?? []),
    ...(who.staff ? (local.droppedEventIds ?? []) : []),
  ]);
  return pruneBundle(
    lightenClosedMatches(
    withoutDroppedEvents(
      {
    club,
    members: keepAccountOwner(
      remote.members,
      unionById(remote.members, local.members).filter(
        (person) => !(remote.droppedIds ?? []).includes(person.id) && !(local.droppedIds ?? []).includes(person.id),
      ),
    ),
    events: mergeEvents(remote.events, local.events, who.staff),
    rsvps: mergeRsvps(remote.rsvps, local.rsvps),
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
    tournaments: mergeTournaments(remote.tournaments, who.staff ? local.tournaments : []),
    droppedIds: [...new Set([...(remote.droppedIds ?? []), ...(local.droppedIds ?? [])])],
    bannedAccounts: who.staff ? (remote.bannedAccounts ?? []) : [],
      },
      droppedEvents,
    ),
    ),
  );
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
  droppedIds?: string[];
  droppedEventIds?: string[];
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

function mineSaved(rows: { eventId: string; memberId: string; status: RsvpStatus }[], memberId: string) {
  const saved: Record<string, RsvpStatus> = {};
  for (const row of rows) {
    if (row.memberId === memberId) saved[row.eventId] = row.status;
  }
  return saved;
}

function forgetStoredMember(inviteCode: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`mv-member-${inviteCode}`);
  } catch {
    // Si el celular no deja borrar, igual se sale del equipo en memoria.
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
  droppedEventIds?: string[];
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
    droppedEventIds: state.droppedEventIds ?? [],
  };
}

// Cambia la respuesta de una persona en un evento, o la crea si no existía.
function fechaNotice(activeId: string, event: ClubEvent, title: string, body: string): InboxItem | null {
  if (Date.parse(event.startsAt) < Date.now() - 3_600_000) return null;
  return {
    id: uid("in"),
    kind: "convocatoria",
    title,
    body: body.slice(0, 180),
    eventId: event.id,
    audience: "all",
    at: new Date().toISOString(),
    readBy: activeId ? [activeId] : [],
  };
}

function memberOnBundle(bundle: ClubBundle, accountId: string | null): string {
  const me = accountId
    ? bundle.members.find((person) => person.accountId === accountId || person.id === accountId)
    : undefined;
  return me?.id ?? bundle.members[0]?.id ?? GUEST_ID;
}

function equipmentTarget(item: InboxItem): string | null {
  if (item.memberId) return item.memberId;
  if (!item.eventId) return null;
  const prefix = `in-eq-${item.eventId}-`;
  return item.id.startsWith(prefix) ? item.id.slice(prefix.length) : null;
}

function pushReaches(
  me: Member,
  push: { audience: "all" | "pending" | "staff" | "miembro"; eventId: string; memberId?: string },
  rsvps: Rsvp[],
  events: ClubEvent[],
): boolean {
  const event = events.find((entry) => entry.id === push.eventId);
  const kickoff = event ? Date.parse(event.startsAt) : Number.NaN;
  if (!event || Number.isNaN(kickoff) || kickoff < Date.now() - 3_600_000) return false;
  if (push.audience === "staff") return me.role === "dt" || me.role === "ayudante";
  if (push.audience === "pending") {
    const row = rsvps.find((entry) => entry.eventId === push.eventId && entry.memberId === me.id);
    return row?.status === "pendiente";
  }
  if (push.audience === "miembro") return Boolean(push.memberId) && push.memberId === me.id;
  return true;
}

function upsertRsvp(
  rsvps: State["rsvps"],
  eventId: string,
  memberId: string,
  status: RsvpStatus,
) {
  const idx = rsvps.findIndex((r) => r.eventId === eventId && r.memberId === memberId);
  const at = new Date().toISOString();
  if (idx < 0) return [...rsvps, { eventId, memberId, status, at }];
  return rsvps.map((r, i) => (i === idx ? { ...r, status, at } : r));
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

function slotsDe(modality: Modality, formacionId?: string) {
  const list = FORMATIONS[modality] ?? FORMATIONS.f8;
  return (list.find((item) => item.id === formacionId) ?? list[0]).slots;
}

function rsvpDe(
  state: { rsvps: { eventId: string; memberId: string; status: RsvpStatus }[] },
  eventId: string,
  memberId: string,
): RsvpStatus | undefined {
  return state.rsvps.find((row) => row.eventId === eventId && row.memberId === memberId)?.status;
}

function avisoParaCancha(
  state: { members: Member[]; rsvps: { eventId: string; memberId: string; status: RsvpStatus }[] },
  event: ClubEvent,
  memberId: string,
): string | null {
  const person = state.members.find((item) => item.id === memberId);
  if (!person || !(person.juega ?? person.role === "jugador")) return "No está en el plantel que juega.";
  if (event.convocados && !event.convocados.includes(memberId)) return "No está convocado.";
  if (rsvpDe(state, event.id, memberId) === "no") return "Dijo que no va.";
  return null;
}

function missingPlayingRsvps(state: {
  members: Member[];
  events: ClubEvent[];
  rsvps: { eventId: string; memberId: string }[];
}): { eventId: string; memberId: string; status: "pendiente" }[] {
  const players = state.members.filter((person) => person.juega ?? person.role === "jugador");
  const open = state.events.filter(
    (event) => event.kind !== "reunion" && +new Date(event.startsAt) >= Date.now() - 3_600_000,
  );
  const have = new Set(state.rsvps.map((row) => `${row.eventId}:${row.memberId}`));
  const extra: { eventId: string; memberId: string; status: "pendiente" }[] = [];
  for (const event of open) {
    for (const player of players) {
      if (have.has(`${event.id}:${player.id}`)) continue;
      extra.push({ eventId: event.id, memberId: player.id, status: "pendiente" });
    }
  }
  return extra;
}

// Dice si un aviso le corresponde a esta persona.
export function inboxVisible(
  item: InboxItem,
  me: Member,
  rsvps: { eventId: string; memberId: string; status: RsvpStatus }[],
): boolean {
  const events = useFija.getState().events;
  const event = item.eventId ? events.find((entry) => entry.id === item.eventId) : undefined;
  const kickoff = event ? Date.parse(event.startsAt) : Number.NaN;
  const finished = !Number.isNaN(kickoff) && kickoff < Date.now() - 3_600_000;
  if ((item.kind === "recordatorio" || item.kind === "equipamiento") && (finished || !event)) return false;
  if (item.audience === "staff") return me.role === "dt" || me.role === "ayudante";
  if (item.audience === "pending") {
    if (finished) return false;
    const row = rsvps.find((r) => r.eventId === item.eventId && r.memberId === me.id);
    return row?.status === "pendiente";
  }
  if (item.audience === "miembro" || item.kind === "equipamiento") {
    const target = item.memberId || equipmentTarget(item);
    return Boolean(target) && target === me.id;
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
  const found = useFija((s) => s.members.find((m) => m.id === s.activeId));
  const name = useFija((s) => s.profile.name);
  const nick = useFija((s) => s.profile.nick);
  return useMemo(
    () => found ?? { ...GUEST, name: name || GUEST.name, nick: nick || GUEST.nick },
    [found, name, nick],
  );
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

export function matchSettled(event: ClubEvent, sheet?: MatchSheet): boolean {
  if (event.kind !== "partido") return false;
  if (event.resultPending) return false;
  if (event.resultClosedAt) return true;
  return Boolean(sheet);
}

export function eventOfClosedTournament(event: ClubEvent, tournaments: Tournament[]): boolean {
  if (!event.tournamentId) return false;
  return tournaments.some(
    (tournament) => tournament.id === event.tournamentId && tournament.status === "finished",
  );
}

export function nextEvent(
  events: ClubEvent[],
  options?: { tournaments?: Tournament[]; sheets?: MatchSheet[] },
): ClubEvent | undefined {
  const tournaments = options?.tournaments ?? [];
  const sheets = options?.sheets ?? [];
  const visible = events.filter((event) => {
    if (!eventOfClosedTournament(event, tournaments)) return true;
    return !matchSettled(event, sheetFor(event.id, sheets));
  });
  const now = Date.now();
  const upcoming = visible
    .filter((event) => +new Date(event.startsAt) >= now - 3_600_000)
    .filter((event) => event.kind !== "partido" || !matchSettled(event, sheetFor(event.id, sheets)))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  if (upcoming[0]) return upcoming[0];
  const pending = visible
    .filter(
      (event) =>
        event.kind === "partido" &&
        !matchSettled(event, sheetFor(event.id, sheets)) &&
        +new Date(event.startsAt) < now,
    )
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  return pending[0];
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
  const benchIds = new Set(event.suplentes ?? []);
  const sorted = [...players].sort((a, b) => {
    const rank = (id: string) => (lineupIds.has(id) ? 0 : benchIds.has(id) ? 1 : 2);
    return rank(a.id) - rank(b.id);
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
  startsAt: string,
  now = Date.now(),
): boolean {
  const conv = convocatoriaFor(eventId, convocatorias);
  if (!conv || !startsAt) return false;
  const kickoff = Date.parse(startsAt);
  if (Number.isNaN(kickoff)) return false;
  return (kickoff - now) / 3_600_000 <= policy.secondHours;
}
