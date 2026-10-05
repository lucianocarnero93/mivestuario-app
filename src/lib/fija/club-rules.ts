import type { AlertLog, Alumni, ClubBundle, ClubEvent, InboxItem, MatchSheet, Member, Rsvp, Tournament } from "./types.ts";
import { clampStat } from "./stats.ts";

export const MAX_BYTES = 350_000;
export const HARD_BYTES = 500_000;
export const MAX_MEMBERS = 80;

export function sizeVerdict(before: number, after: number): "ok" | "soft" | "hard" {
  if (after > HARD_BYTES) return "hard";
  if (after > MAX_BYTES && after > before + 1024) return "soft";
  return "ok";
}

export function reminderIds(eventId: string, sentAt: string) {
  const scope = Date.parse(sentAt);
  return {
    scope,
    firstAlert: `al-first-${eventId}-${scope}`,
    firstNotice: `in-r1-${eventId}-${scope}`,
    secondAlert: `al-second-${eventId}-${scope}`,
    secondNotice: `in-r2-${eventId}-${scope}`,
  };
}

export type AlertPush = {
  body: string;
  tag: string;
  eventId: string;
  audience: "all" | "pending" | "staff" | "miembro";
  memberId?: string;
};

export type AlertsInput = {
  events: ClubEvent[];
  rsvps: Rsvp[];
  convocatorias: { eventId: string; sentAt: string }[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  reminderPolicy: { firstHours: number; secondHours: number };
  tournaments: Tournament[];
};

export function rsvpStamp(row: { at?: string } | undefined): number {
  if (!row?.at) return 0;
  const time = Date.parse(row.at);
  return Number.isFinite(time) ? time : 0;
}

/** Gana la respuesta más nueva. Si no hay hora, se queda la que ya estaba. */
export function preferRsvp(current: Rsvp, incoming: Rsvp): Rsvp {
  const next = rsvpStamp(incoming);
  const prev = rsvpStamp(current);
  if (next > prev) return incoming;
  if (prev > next) return current;
  return current;
}

export function equipmentHeading(startsAt: string, now: number): string {
  const day = calendarDay(startsAt);
  const today = calendarDay(new Date(now).toISOString());
  const tomorrow = calendarDay(new Date(now + 24 * 3_600_000).toISOString());
  if (day && day === today) return "Hoy hay partido";
  if (day && day === tomorrow) return "Mañana hay partido";
  return "Te toca el equipamiento";
}

function calendarDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function tournamentClosed(tournaments: Tournament[], event: ClubEvent): boolean {
  if (!event.tournamentId) return false;
  return tournaments.some((item) => item.id === event.tournamentId && item.status === "finished");
}

export function alertsDue(state: AlertsInput, now = Date.now()): {
  inbox: InboxItem[];
  alertLog: AlertLog[];
  pushes: AlertPush[];
} {
  let notices = state.inbox;
  let alertsSent = state.alertLog;
  const pushes: AlertPush[] = [];
  let changed = false;

  for (const callup of state.convocatorias) {
    const event = state.events.find((item) => item.id === callup.eventId);
    if (!event || (tournamentClosed(state.tournaments, event) && Date.parse(event.startsAt) < now)) continue;
    const pending = state.rsvps.some((row) => row.eventId === callup.eventId && row.status === "pendiente");
    if (!pending) continue;
    const kickoff = Date.parse(event.startsAt);
    if (Number.isNaN(kickoff) || kickoff <= now) continue;
    const hoursUntil = (kickoff - now) / 3_600_000;
    const ids = reminderIds(callup.eventId, callup.sentAt);
    const alreadyFirst =
      alertsSent.some(
        (alert) =>
          alert.id === ids.firstAlert ||
          (alert.eventId === callup.eventId && alert.kind === "first" && Date.parse(alert.at) >= ids.scope),
      ) || notices.some((notice) => notice.id === ids.firstNotice);
    const alreadySecond =
      alertsSent.some(
        (alert) =>
          alert.id === ids.secondAlert ||
          (alert.eventId === callup.eventId && alert.kind === "second" && Date.parse(alert.at) >= ids.scope),
      ) || notices.some((notice) => notice.id === ids.secondNotice);

    if (hoursUntil <= state.reminderPolicy.firstHours && !alreadyFirst) {
      const moment = new Date(now).toISOString();
      const body = `Todavía no confirmaste ${event.title}.`;
      alertsSent = [...alertsSent, { id: ids.firstAlert, eventId: callup.eventId, kind: "first", at: moment }];
      notices = [
        ...notices,
        {
          id: ids.firstNotice,
          kind: "recordatorio",
          title: "Falta tu confirmación",
          body,
          eventId: event.id,
          audience: "pending",
          at: moment,
          readBy: [],
        },
      ];
      pushes.push({ body, tag: `vestuario-r1-${event.id}`, eventId: event.id, audience: "pending" });
      changed = true;
    }

    if (hoursUntil <= state.reminderPolicy.secondHours && !alreadySecond) {
      const moment = new Date(now).toISOString();
      alertsSent = [...alertsSent, { id: ids.secondAlert, eventId: callup.eventId, kind: "second", at: moment }];
      notices = [
        ...notices,
        {
          id: ids.secondNotice,
          kind: "recordatorio",
          title: "Pendientes para WhatsApp",
          body: `Faltan menos de ${state.reminderPolicy.secondHours} h y no contestaron ${event.title}.`,
          eventId: event.id,
          audience: "staff",
          at: moment,
          readBy: [],
        },
      ];
      changed = true;
    }
  }

  for (const event of state.events) {
    if (event.kind !== "partido" || tournamentClosed(state.tournaments, event) || !event.equipamiento) continue;
    const hoursUntil = (Date.parse(event.startsAt) - now) / 3_600_000;
    if (hoursUntil > 24 || hoursUntil < 0) continue;
    if (alertsSent.some((alert) => alert.eventId === event.id && alert.kind === "equipment")) continue;
    const byMember = new Map<string, string[]>();
    for (const [item, memberId] of Object.entries(event.equipamiento)) {
      if (!memberId) continue;
      const list = byMember.get(memberId) ?? [];
      list.push(item);
      byMember.set(memberId, list);
    }
    if (byMember.size === 0) continue;
    const moment = new Date(now).toISOString();
    const title = equipmentHeading(event.startsAt, now);
    for (const [memberId, items] of byMember) {
      const id = `in-eq-${event.id}-${memberId}`;
      if (notices.some((notice) => notice.id === id)) continue;
      const itemLabels = items.map((item) => (item === "remeras" ? "las remeras" : "las pelotas")).join(" y ");
      const body = `Te toca llevar ${itemLabels} para ${event.title}.`;
      notices = [
        ...notices,
        {
          id,
          kind: "equipamiento",
          title,
          body,
          eventId: event.id,
          memberId,
          audience: "miembro",
          at: moment,
          readBy: [],
        },
      ];
      pushes.push({
        body,
        tag: `vestuario-eq-${event.id}-${memberId}`,
        eventId: event.id,
        audience: "miembro",
        memberId,
      });
    }
    alertsSent = [...alertsSent, { id: `al-eq-${event.id}`, eventId: event.id, kind: "equipment", at: moment }];
    changed = true;
  }

  if (!changed) return { inbox: state.inbox, alertLog: state.alertLog, pushes };
  return { inbox: notices, alertLog: alertsSent, pushes };
}

export function mergePlayerInbox(
  existing: InboxItem[],
  incoming: InboxItem[],
  meId: string,
  events: ClubEvent[],
): InboxItem[] {
  const eventIds = new Set(events.map((event) => event.id));
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = map.get(item.id);
    if (previous) {
      if (meId && item.readBy.includes(meId) && !previous.readBy.includes(meId)) {
        map.set(item.id, { ...previous, readBy: [...previous.readBy, meId] });
      }
      continue;
    }
    if (!item.eventId || !eventIds.has(item.eventId) || !playerNoticeAllowed(item, events)) continue;
    map.set(item.id, {
      ...item,
      title: item.title.slice(0, 120),
      body: item.body.slice(0, 200),
    });
  }
  return [...map.values()];
}

/** Un jugador no puede inventar el texto de un aviso. Solo el recordatorio y el equipamiento, con la frase de siempre. */
export function playerNoticeAllowed(item: InboxItem, events: ClubEvent[]): boolean {
  const event = events.find((entry) => entry.id === item.eventId);
  if (!event) return false;
  if (
    item.kind === "recordatorio" &&
    item.audience === "pending" &&
    item.id.startsWith(`in-r1-${event.id}-`)
  ) {
    return item.title === "Falta tu confirmación" && item.body === `Todavía no confirmaste ${event.title}.`;
  }
  if (item.kind !== "equipamiento" || item.audience !== "miembro" || !item.memberId) return false;
  if (item.id !== `in-eq-${event.id}-${item.memberId}`) return false;
  const carried = Object.entries(event.equipamiento ?? {})
    .filter(([, memberId]) => memberId === item.memberId)
    .map(([name]) => name);
  if (carried.length === 0) return false;
  const labels = carried.map((name) => (name === "remeras" ? "las remeras" : "las pelotas")).join(" y ");
  const titles = new Set(["Hoy hay partido", "Mañana hay partido", "Te toca el equipamiento"]);
  return titles.has(item.title) && item.body === `Te toca llevar ${labels} para ${event.title}.`;
}

const APP_PATHS = new Set(["/", "/chat", "/cancha", "/agenda", "/stats", "/equipo", "/seguridad"]);

export function safeAppPath(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\\") || url.includes("://")) return "/";
  const path = url.split("?")[0]?.split("#")[0] ?? "/";
  return APP_PATHS.has(path) ? path : "/";
}

export function pushCopy(clubName: string, item: InboxItem): { title: string; body: string; url: string } {
  const url = item.kind === "formacion" ? "/cancha" : item.kind === "charla" ? "/chat" : "/";
  return {
    title: `${clubName}: ${item.title}`.slice(0, 80),
    body: item.body.slice(0, 180),
    url: safeAppPath(url),
  };
}

export function memberGetsPush(
  item: InboxItem,
  member: Member,
  status: "voy" | "no" | "pendiente" | null,
): boolean {
  if (item.audience === "staff") return member.role === "dt" || member.role === "ayudante";
  if (item.audience === "miembro") return Boolean(item.memberId && item.memberId === member.id);
  if (item.audience === "pending") return status !== "voy" && status !== "no";
  return true;
}

export function noticeFits(
  bundle: ClubBundle,
  memberId: string,
  staff: boolean,
  title: string,
  body: string,
  now = Date.now(),
): { title: string; url: string } | null {
  const fresh = (at?: string) => {
    const time = Date.parse(at ?? "");
    return Number.isFinite(time) && now - time < 10 * 60 * 1000 && now - time > -60_000;
  };
  const me = bundle.members.find((person) => person.id === memberId);
  if (!me) return null;
  const ownMessage = (bundle.messages ?? []).some(
    (item) => item.memberId === memberId && item.text === body && fresh(item.at),
  );
  if (!staff) {
    if (!ownMessage) return null;
    return { title: (me.nick || "Plantel").slice(0, 80), url: "/chat" };
  }
  const ownCharla = (bundle.charla ?? []).some(
    (item) => item.memberId === memberId && item.text === body && fresh(item.at),
  );
  const note = (bundle.inbox ?? []).find((item) => item.title === title && item.body === body && fresh(item.at));
  if (!ownMessage && !ownCharla && !note) return null;
  if (note && !ownMessage && !ownCharla) {
    const url = note.kind === "formacion" ? "/cancha" : note.kind === "charla" ? "/chat" : "/";
    return { title: note.title.slice(0, 80), url };
  }
  return { title: title.slice(0, 80) || (me.nick || "Plantel"), url: "/chat" };
}

export function mergePlayerAlerts(existing: AlertLog[], incoming: AlertLog[], eventIds: Set<string>): AlertLog[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    if (map.has(item.id)) continue;
    const fixed = item.id.startsWith("al-first-") || item.id.startsWith("al-second-") || item.id.startsWith("al-eq-");
    if (!fixed || !eventIds.has(item.eventId)) continue;
    map.set(item.id, item);
  }
  return [...map.values()];
}

export type BannedAccount = { accountId: string; name: string; at: string };

export function guardMember(person: Member, previous?: Member): Member {
  const menor = Boolean(person.menor || previous?.menor);
  if (!menor) return person;
  return { ...person, menor: true, photo: null };
}

/** El resultado se puede cargar recién cuando llega el horario del partido. */
export function resultIsOpen(startsAt: string, now = Date.now()): boolean {
  const start = Date.parse(startsAt);
  return Number.isFinite(start) && start <= now;
}

const FUTURE_SKEW_MS = 2 * 60 * 1000;

function stampMillis(value: string | undefined, now: number): number | null {
  const parsed = Date.parse(value ?? "");
  if (!Number.isFinite(parsed) || parsed > now + FUTURE_SKEW_MS) return null;
  return parsed;
}

/**
 * El apodo que puso el DT no lo pisa un celular viejo.
 * Sin marca de hora, un jugador no cambia el nombre que ya está en el equipo.
 * Una fecha futura no deja el apodo trabado.
 */
export function pickMemberIdentity(
  existing: Member,
  incoming: Member,
  staff: boolean,
  now = Date.now(),
): Pick<Member, "name" | "nick" | "number" | "profileAt"> {
  const existingAt = stampMillis(existing.profileAt, now);
  const incomingAt = stampMillis(incoming.profileAt, now);
  const takeIncoming =
    (incomingAt != null && (existingAt == null || incomingAt >= existingAt)) ||
    (incomingAt == null && existingAt == null && staff);
  if (!takeIncoming) {
    return {
      name: existing.name,
      nick: existing.nick,
      number: existing.number,
      profileAt: existingAt == null ? undefined : existing.profileAt,
    };
  }
  return {
    name: incoming.name || existing.name,
    nick: incoming.nick || existing.nick,
    number: incoming.number === undefined ? existing.number : incoming.number,
    profileAt: incomingAt == null ? new Date(now).toISOString() : incoming.profileAt,
  };
}

/** Una cuenta marcada menor no puede volver a false por un pedido del cliente. */
export function patchKeepsMenor<T extends { menor?: boolean }>(currentMenor: boolean, patch: T): T {
  if (!currentMenor) return patch;
  return { ...patch, menor: true };
}
export function canAssignRoles(members: Member[], createdBy: string, userId: string): boolean {
  if (!userId) return false;
  const creator = members.find((person) => person.id === createdBy);
  return Boolean(creator && (creator.accountId === userId || creator.id === userId));
}

/** Si el creador ya no está, el mando pasa a un DT con cuenta, después a un ayudante, después a cualquier cuenta. */
export function repairCreatedBy(members: Member[], createdBy: string): string {
  if (members.some((person) => person.id === createdBy)) return createdBy;
  const dt = members.find((person) => person.role === "dt" && person.accountId);
  if (dt) return dt.id;
  const ayudante = members.find((person) => person.role === "ayudante" && person.accountId);
  if (ayudante) return ayudante.id;
  const cuenta = members.find((person) => person.accountId);
  return cuenta?.id ?? createdBy;
}

/** El ayudante no saca ni banea al creador, a un DT ni a otro ayudante. */
export function allowedDrops(members: Member[], createdBy: string, droppedIds: string[], isCreator: boolean): string[] {
  const owner = repairCreatedBy(members, createdBy);
  return droppedIds.filter((id) => {
    if (id === owner) return false;
    if (isCreator) return true;
    const person = members.find((item) => item.id === id);
    return !person || (person.role !== "dt" && person.role !== "ayudante");
  });
}

export function dedupeBanned(list: BannedAccount[]): BannedAccount[] {
  const map = new Map<string, BannedAccount>();
  for (const item of list) {
    if (!item.accountId || map.has(item.accountId)) continue;
    map.set(item.accountId, item);
  }
  return [...map.values()];
}

export function nextBannedAccounts(
  existing: ClubBundle,
  incomingDroppedIds: string[] | undefined,
  staff: boolean,
  nowIso: string,
): BannedAccount[] {
  if (!staff) return existing.bannedAccounts ?? [];
  const already = new Set(existing.droppedIds ?? []);
  const nuevos: BannedAccount[] = [];
  for (const id of incomingDroppedIds ?? []) {
    if (already.has(id)) continue;
    const person = existing.members.find((item) => item.id === id);
    const account = person?.accountId ?? null;
    if (!account || !person) continue;
    nuevos.push({ accountId: account, name: person.name, at: nowIso });
  }
  return dedupeBanned([...(existing.bannedAccounts ?? []), ...nuevos]);
}

export function withoutBanned(members: Member[], banned: BannedAccount[]): Member[] {
  const ids = new Set(banned.map((item) => item.accountId));
  return members.filter((person) => !person.accountId || !ids.has(person.accountId));
}

export type ClaimMode = "join" | "resume";

export type ClaimOutcome =
  | { kind: "removed"; error: string }
  | { kind: "keep"; members: Member[] }
  | { kind: "notMember"; error: string }
  | { kind: "join"; members: Member[] };

export function decideClaim(input: {
  members: Member[];
  droppedIds?: string[];
  bannedAccounts?: BannedAccount[];
  accountId: string;
  mode: ClaimMode;
  draft: { name: string; nick: string; number: number | null; menor: boolean };
  freshId: string;
  claimId?: string;
}): ClaimOutcome {
  const banned = new Set((input.bannedAccounts ?? []).map((item) => item.accountId));
  if (banned.has(input.accountId)) {
    return { kind: "removed", error: "El DT te sacó de este equipo." };
  }
  const dropped = new Set(input.droppedIds ?? []);
  const byAccount = input.members.find(
    (person) => person.accountId === input.accountId || person.id === input.accountId,
  );
  const claimed =
    !byAccount && input.mode === "join" && input.claimId
      ? input.members.find((person) => person.id === input.claimId && !person.accountId && !dropped.has(person.id))
      : undefined;
  const current = byAccount ?? claimed;
  if (current && (dropped.has(current.id) || dropped.has(input.accountId))) {
    return { kind: "keep", members: input.members };
  }
  if (!current && input.mode === "resume") {
    return { kind: "notMember", error: "Ya no estás en el plantel de este equipo." };
  }
  const id = current ? current.id : dropped.has(input.accountId) ? input.freshId : input.accountId;
  const next = guardMember(
    current
      ? {
          ...current,
          accountId: input.accountId,
          number: current.number ?? input.draft.number,
          menor: input.draft.menor || current.menor,
        }
      : {
          id,
          name: input.draft.name,
          nick: input.draft.nick || input.draft.name.split(" ")[0] || "Jugador",
          role: "jugador",
          number: input.draft.number,
          accountId: input.accountId,
          juega: true,
          menor: input.draft.menor,
        },
    current,
  );
  const stripped = input.members.map((person) =>
    person.accountId === input.accountId && person.id !== next.id ? { ...person, accountId: null } : person,
  );
  return { kind: "join", members: [...stripped.filter((person) => person.id !== next.id), next] };
}

export function freshMemberId(): string {
  const bytes = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `m-${bytes}`;
}

export function capRoster(previous: Member[], next: Member[], max = MAX_MEMBERS): Member[] {
  if (next.length <= max) return next;
  const known = new Set(previous.map((person) => person.id));
  const kept = next.filter((person) => known.has(person.id));
  const added = next.filter((person) => !known.has(person.id));
  return [...kept, ...added].slice(0, Math.max(max, kept.length));
}

export function mergeAlumni(kept: Alumni[] | undefined, incoming: Alumni[] | undefined): Alumni[] {
  const map = new Map<string, Alumni>();
  for (const item of [...(kept ?? []), ...(incoming ?? [])]) {
    if (!item?.id || !item.name || map.has(item.id)) continue;
    map.set(item.id, {
      id: item.id.slice(0, 80),
      name: item.name.slice(0, 80),
      nick: (item.nick || item.name).slice(0, 40),
    });
  }
  return [...map.values()].slice(0, 300);
}

export function detachAccount(bundle: ClubBundle, accountId: string): ClubBundle {
  if (!accountId) return bundle;
  return {
    ...bundle,
    members: bundle.members.map((person) =>
      person.accountId === accountId ? { ...person, accountId: null } : person,
    ),
  };
}

export function sanitizeSheet(sheet: MatchSheet): MatchSheet {
  const players = (Array.isArray(sheet.players) ? sheet.players : [])
    .slice(0, 40)
    .map((row) => ({
      memberId: String(row.memberId ?? "").slice(0, 80),
      goals: clampStat(row.goals),
      assists: clampStat(row.assists),
      yellow: clampStat(row.yellow),
      red: clampStat(row.red),
    }))
    .filter((row) => row.memberId);
  const goalsFor = clampStat(sheet.goalsFor);
  let left = goalsFor;
  const fitted = players.map((row) => {
    const goals = Math.min(row.goals, left);
    left -= goals;
    return { ...row, goals };
  });
  return {
    ...sheet,
    opponent: String(sheet.opponent ?? "").slice(0, 80),
    notes: String(sheet.notes ?? "").slice(0, 400),
    goalsFor,
    goalsAgainst: clampStat(sheet.goalsAgainst),
    players: fitted,
  };
}

export function clipTextList<T extends { text?: string }>(list: T[], max = 400): T[] {
  return list.map((item) => ({ ...item, text: String(item.text ?? "").slice(0, max) }));
}

export function clipInbox(list: InboxItem[]): InboxItem[] {
  return list.map((item) => ({
    ...item,
    title: String(item.title ?? "").slice(0, 120),
    body: String(item.body ?? "").slice(0, 200),
  }));
}

function stripFromEvent(event: ClubEvent, memberId: string): ClubEvent {
  const lineup = Object.fromEntries(Object.entries(event.lineup).filter(([, id]) => id !== memberId));
  return {
    ...event,
    lineup,
    convocados: (event.convocados ?? []).filter((id) => id !== memberId),
    suplentes: (event.suplentes ?? []).filter((id) => id !== memberId),
  };
}

export function removeMemberEverywhere(
  bundle: ClubBundle,
  memberId: string,
): { bundle: ClubBundle; empty: boolean } {
  let members = bundle.members.filter((person) => person.id !== memberId);
  const gone = bundle.members.find((person) => person.id === memberId);
  const alumni = gone
    ? mergeAlumni(bundle.alumni, [{ id: gone.id, name: gone.name, nick: gone.nick }])
    : (bundle.alumni ?? []);
  let club = bundle.club;
  if (club.createdBy === memberId && members[0]) {
    const nextOwner =
      members.find((person) => person.role === "dt") ??
      members.find((person) => person.role === "ayudante") ??
      members[0];
    club = { ...club, createdBy: nextOwner.id };
    members = members.map((person) =>
      person.id === nextOwner.id && person.role === "jugador" ? { ...person, role: "dt" } : person,
    );
  }
  const next: ClubBundle = {
    ...bundle,
    club,
    members,
    alumni,
    droppedIds: [...new Set([...(bundle.droppedIds ?? []), memberId])],
    rsvps: bundle.rsvps.filter((row) => row.memberId !== memberId),
    invites: bundle.invites.filter((invite) => invite.memberId !== memberId),
    events: bundle.events.map((event) => stripFromEvent(event, memberId)),
  };
  return { bundle: next, empty: members.length === 0 };
}

/** Une la cuenta con un nombre cargado a mano y saca el duplicado, sin banear. */
export function claimExistingName(
  bundle: ClubBundle,
  accountId: string,
  targetId: string,
): { ok: true; bundle: ClubBundle } | { ok: false; error: string } {
  const target = bundle.members.find((person) => person.id === targetId);
  if (!target) return { ok: false, error: "Ese nombre no está en el plantel." };
  if (target.accountId && target.accountId !== accountId) {
    return { ok: false, error: "Ese nombre ya tiene otra cuenta." };
  }
  const caller = bundle.members.find((person) => person.accountId === accountId || person.id === accountId);
  if (!caller) return { ok: false, error: "No estás en este equipo." };
  const staff = caller.role === "dt" || caller.role === "ayudante";
  if (staff && caller.id !== target.id) {
    return { ok: false, error: "Ya estás en el equipo. Ese nombre es de otro jugador." };
  }
  if (!staff && target.accountId && target.id !== caller.id) {
    return { ok: false, error: "Ese nombre ya tiene otra cuenta." };
  }
  if (target.id === caller.id && target.accountId === accountId) return { ok: true, bundle };
  const duplicate = bundle.members.find(
    (person) => person.id !== target.id && (person.accountId === accountId || person.id === accountId),
  );
  const members = bundle.members.map((person) =>
    person.id === target.id ? { ...person, accountId } : person,
  );
  let nextBundle: ClubBundle = { ...bundle, members };
  if (duplicate && duplicate.id !== bundle.club.createdBy) {
    const stripped = removeMemberEverywhere(nextBundle, duplicate.id);
    nextBundle = stripped.bundle;
    const kept = nextBundle.members.find((person) => person.id === target.id);
    if (kept) {
      nextBundle = {
        ...nextBundle,
        members: nextBundle.members.map((person) =>
          person.id === target.id ? { ...person, accountId } : person,
        ),
      };
    }
  }
  return { ok: true, bundle: nextBundle };
}

export function readmitAccount(bundle: ClubBundle, accountId: string): ClubBundle {
  return {
    ...bundle,
    bannedAccounts: (bundle.bannedAccounts ?? []).filter((item) => item.accountId !== accountId),
  };
}
