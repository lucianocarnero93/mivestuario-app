// Nube del vestuario. El código muestra la ficha y sirve para entrar.
// El plantel, el chat y los cambios solo los ve quien ya está en el equipo.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { withTransaction } from "@/lib/db";
import { sanitizeCode } from "./sanitize";
import { vestuarioLog } from "@/lib/vestuario-log";
import type { ClubBundle, ClubEvent, MatchSheet, Member, Rsvp, Tournament } from "./types";

const COLLECTION = "clubs";
const ATTEMPTS = "intentos";
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 30;
const MAX_BYTES = 350_000;

function guardMember(person: Member, previous?: Member): Member {
  const menor = Boolean(person.menor || previous?.menor);
  if (!menor) return person;
  return { ...person, menor: true, photo: null };
}

function asBundle(value: unknown): ClubBundle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ClubBundle;
  if (!row.club || typeof row.club.inviteCode !== "string") return null;
  if (!Array.isArray(row.members) || !Array.isArray(row.events)) return null;
  return row;
}

export type ClubCard = {
  name: string;
  crest: string | null;
  coach: string;
  players: number;
};

export type ClubLoad =
  | { ok: true; bundle: ClubBundle }
  | { ok: false; reason: "missing" | "forbidden" | "limited" };

function userIdOf(context: { userId?: string } | undefined): string {
  return String(context?.userId ?? "");
}

function memberFor(members: Member[], userId: string): Member | undefined {
  if (!userId) return undefined;
  return members.find((person) => person.accountId === userId || person.id === userId);
}

function isStaffMember(person: Member | undefined): boolean {
  return person?.role === "dt" || person?.role === "ayudante";
}

async function noteLookup(userId: string): Promise<void> {
  if (!userId) throw new Error("Entrá de nuevo para buscar un equipo.");
  await withTransaction(async (query) => {
    const rows = await query<{ data: { n?: number; since?: number } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2 for update",
      [ATTEMPTS, userId],
    );
    const now = Date.now();
    let n = 1;
    let since = now;
    const raw = rows[0]?.data;
    let parsed: { n?: number; since?: number } | null = null;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw) as { n?: number; since?: number };
      } catch {
        parsed = null;
      }
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
    if (parsed && typeof parsed.since === "number" && now - parsed.since < ATTEMPT_WINDOW_MS) {
      n = (parsed.n ?? 0) + 1;
      since = parsed.since;
    }
    if (n > ATTEMPT_LIMIT) throw new Error("Demasiados intentos. Esperá un rato.");
    await query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [ATTEMPTS, userId, JSON.stringify({ n, since })],
    );
  });
}

async function readClub(code: string): Promise<ClubBundle | null> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: ClubBundle | string }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [COLLECTION, code],
  );
  const raw = rows[0]?.data;
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return asBundle(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return asBundle(raw);
}

export async function isClubMember(code: string, userId: string): Promise<boolean> {
  if (!code || !userId) return false;
  const bundle = await readClub(code);
  return Boolean(bundle && memberFor(bundle.members, userId));
}

export const loadClubCard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code, context }): Promise<ClubCard | null> => {
    if (!code) return null;
    const userId = userIdOf(context as { userId?: string });
    await noteLookup(userId);
    const bundle = await readClub(code);
    if (!bundle) return null;
    const coach =
      bundle.members.find((member) => member.role === "dt") ??
      bundle.members.find((member) => member.id === bundle.club.createdBy);
    const players = bundle.members.filter((member) => member.juega ?? member.role === "jugador").length;
    return {
      name: bundle.club.name,
      crest: bundle.club.crest,
      coach: coach?.name || "El DT",
      players,
    };
  });

export const loadClubDoc = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code, context }): Promise<ClubLoad> => {
    if (!code) return { ok: false, reason: "missing" };
    const userId = userIdOf(context as { userId?: string });
    const bundle = await readClub(code);
    if (!bundle) {
      try {
        await noteLookup(userId);
      } catch {
        return { ok: false, reason: "limited" };
      }
      return { ok: false, reason: "missing" };
    }
    if (!memberFor(bundle.members, userId)) {
      try {
        await noteLookup(userId);
      } catch {
        return { ok: false, reason: "limited" };
      }
      return { ok: false, reason: "forbidden" };
    }
    return { ok: true, bundle };
  });

function unionById<T extends { id: string }>(kept: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of kept ?? []) map.set(item.id, item);
  for (const item of incoming ?? []) {
    const previous = map.get(item.id);
    map.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return [...map.values()];
}

function tournamentStamp(item: Tournament): number {
  const stamp = Date.parse(item.updatedAt ?? "");
  return Number.isFinite(stamp) ? stamp : 0;
}

// El nombre que se guardó último queda. Una copia vieja del celular no lo pisa.
export function mergeTournaments(
  kept: Tournament[] | null | undefined,
  incoming: Tournament[] | null | undefined,
): Tournament[] {
  const map = new Map<string, Tournament>();
  for (const item of kept ?? []) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of incoming ?? []) {
    if (!item?.id) continue;
    const previous = map.get(item.id);
    if (!previous) {
      map.set(item.id, item);
      continue;
    }
    const prevTime = tournamentStamp(previous);
    const nextTime = tournamentStamp(item);
    if (nextTime > prevTime) map.set(item.id, { ...previous, ...item });
    else if (prevTime > nextTime) map.set(item.id, { ...item, ...previous });
    else if (
      previous.name !== item.name ||
      previous.status !== item.status ||
      previous.endedAt !== item.endedAt
    ) {
      map.set(item.id, { ...previous, ...item, updatedAt: new Date().toISOString() });
    }
  }
  return [...map.values()];
}

// Un torneo cerrado no necesita la convocatoria ni la pizarra.
// Quedan el partido y la planilla, que son los que arman las estadísticas.
export function lightenClosedMatches(bundle: ClubBundle): ClubBundle {
  const closed = new Set(
    (bundle.tournaments ?? [])
      .filter((tournament) => tournament.status === "finished")
      .map((tournament) => tournament.id),
  );
  if (closed.size === 0) return bundle;
  const ids = new Set(
    (bundle.events ?? [])
      .filter((event) => event.tournamentId && closed.has(event.tournamentId))
      .map((event) => event.id),
  );
  if (ids.size === 0) return bundle;
  return {
    ...bundle,
    events: bundle.events.map((event) => {
      if (!ids.has(event.id)) return event;
      if (Object.keys(event.lineup ?? {}).length === 0 && !event.tactics && !event.formacion) return event;
      return { ...event, lineup: {}, tactics: "", formacion: undefined };
    }),
    rsvps: (bundle.rsvps ?? []).filter((row) => !ids.has(row.eventId)),
    inbox: (bundle.inbox ?? []).filter((item) => !item.eventId || !ids.has(item.eventId)),
    alertLog: (bundle.alertLog ?? []).filter((item) => !ids.has(item.eventId)),
    convocatorias: (bundle.convocatorias ?? []).filter((item) => !ids.has(item.eventId)),
  };
}

export function closedMatchStillHeavy(bundle: ClubBundle): boolean {
  const light = lightenClosedMatches(bundle);
  if (light === bundle) return false;
  return (
    light.rsvps.length !== (bundle.rsvps ?? []).length ||
    light.inbox.length !== (bundle.inbox ?? []).length ||
    light.alertLog.length !== (bundle.alertLog ?? []).length ||
    light.convocatorias.length !== (bundle.convocatorias ?? []).length ||
    light.events.some((event, index) => event !== bundle.events[index])
  );
}

function boardStamp(value: string | undefined): number {
  const time = value ? +new Date(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

export function pickEvent(previous: ClubEvent, incoming: ClubEvent): ClubEvent {
  const previousSpots = Object.keys(previous.lineup ?? {}).length;
  const incomingSpots = Object.keys(incoming.lineup ?? {}).length;
  const boardChanged =
    previous.modality !== incoming.modality || (previous.formacion ?? "") !== (incoming.formacion ?? "");
  const prevBoard = boardStamp(previous.lineupUpdatedAt);
  const nextBoard = boardStamp(incoming.lineupUpdatedAt);
  const merged =
    nextBoard > prevBoard
      ? { ...previous, ...incoming }
      : prevBoard > nextBoard
        ? { ...incoming, ...previous }
        : boardChanged || incomingSpots >= previousSpots
          ? { ...previous, ...incoming }
          : { ...incoming, ...previous, lineup: previous.lineup };
  return keepResultMark(previous, incoming, merged);
}

function sheetTime(sheet: MatchSheet): number {
  const time = sheet.recordedAt ? +new Date(sheet.recordedAt) : 0;
  return Number.isFinite(time) ? time : 0;
}

export function pickSheet(previous: MatchSheet, incoming: MatchSheet): MatchSheet {
  return sheetTime(incoming) >= sheetTime(previous) ? incoming : previous;
}

export function withoutDroppedEvents(bundle: ClubBundle, dropped: Set<string>): ClubBundle {
  if (dropped.size === 0) return { ...bundle, droppedEventIds: [...dropped] };
  return {
    ...bundle,
    droppedEventIds: [...dropped],
    events: bundle.events.filter((event) => !dropped.has(event.id)),
    rsvps: (bundle.rsvps ?? []).filter((row) => !dropped.has(row.eventId)),
    matchSheets: (bundle.matchSheets ?? []).filter((sheet) => !dropped.has(sheet.eventId)),
    convocatorias: (bundle.convocatorias ?? []).filter((item) => !dropped.has(item.eventId)),
    inbox: (bundle.inbox ?? []).filter((item) => !item.eventId || !dropped.has(item.eventId)),
    alertLog: (bundle.alertLog ?? []).filter((item) => !dropped.has(item.eventId)),
  };
}
function mergeEvents(kept: ClubEvent[], incoming: ClubEvent[]): ClubEvent[] {
  const map = new Map<string, ClubEvent>();
  for (const event of kept) map.set(event.id, event);
  for (const event of incoming) {
    const previous = map.get(event.id);
    map.set(event.id, previous ? pickEvent(previous, event) : event);
  }
  return [...map.values()];
}

function keepResultMark(previous: ClubEvent, incoming: ClubEvent, merged: ClubEvent): ClubEvent {
  const prevTime = previous.resultUpdatedAt ? +new Date(previous.resultUpdatedAt) : 0;
  const nextTime = incoming.resultUpdatedAt ? +new Date(incoming.resultUpdatedAt) : 0;
  const source =
    nextTime > prevTime ? incoming : nextTime < prevTime ? previous : incoming.resultClosedAt || incoming.resultPending ? incoming : previous;
  return {
    ...merged,
    resultClosedAt: source.resultClosedAt ?? null,
    resultPending: Boolean(source.resultPending),
    resultUpdatedAt: source.resultUpdatedAt,
  };
}

function mergeSheetsByTime(kept: MatchSheet[], incoming: MatchSheet[]): MatchSheet[] {
  const map = new Map(kept.map((sheet) => [sheet.eventId, sheet]));
  for (const sheet of incoming) {
    const previous = map.get(sheet.eventId);
    map.set(sheet.eventId, previous ? pickSheet(previous, sheet) : sheet);
  }
  return [...map.values()];
}

function mergeRsvps(kept: Rsvp[], incoming: Rsvp[]): Rsvp[] {
  const map = new Map<string, Rsvp>();
  for (const row of kept) map.set(`${row.eventId}:${row.memberId}`, row);
  for (const row of incoming) {
    const key = `${row.eventId}:${row.memberId}`;
    const previous = map.get(key);
    if (previous && previous.status !== "pendiente" && row.status === "pendiente") continue;
    map.set(key, row);
  }
  return [...map.values()];
}

function mergeForSave(existing: ClubBundle | null, incoming: ClubBundle, userId: string): ClubBundle {
  if (!existing) {
    return lightenClosedMatches(
      withoutDroppedEvents(incoming, new Set(incoming.droppedEventIds ?? [])),
    );
  }
  const me = memberFor(existing.members, userId);
  const staff = isStaffMember(me);
  const dropped = new Set(staff ? [...(existing.droppedIds ?? []), ...(incoming.droppedIds ?? [])] : (existing.droppedIds ?? []));
  const droppedEvents = new Set(
    staff
      ? [...(existing.droppedEventIds ?? []), ...(incoming.droppedEventIds ?? [])]
      : (existing.droppedEventIds ?? []),
  );
  const previous = new Map(existing.members.map((person) => [person.id, person]));
  const members = staff
    ? unionById(existing.members, incoming.members)
        .filter((person) => !dropped.has(person.id))
        .map((person) => {
          const old = previous.get(person.id);
          const kept = guardMember(old?.accountId ? { ...person, accountId: old.accountId } : person, old);
          return kept;
        })
    : existing.members.map((person) => {
        if (person.accountId !== userId && person.id !== userId) return person;
        const mine = incoming.members.find((item) => item.id === person.id || item.accountId === userId);
        if (!mine) return person;
        return guardMember(
          {
            ...person,
            name: mine.name || person.name,
            nick: mine.nick || person.nick,
            number: mine.number ?? person.number,
            photo: mine.photo,
          },
          person,
        );
      });
  const seenAccount = new Set<string>();
  const unique: Member[] = [];
  for (const person of members) {
    if (person.accountId) {
      if (seenAccount.has(person.accountId)) continue;
      seenAccount.add(person.accountId);
    }
    unique.push(person);
  }
  const ownRsvps = incoming.rsvps.filter((row) => row.memberId === me?.id);
  return lightenClosedMatches(
    withoutDroppedEvents(
      {
    club: staff ? { ...existing.club, ...incoming.club, inviteCode: existing.club.inviteCode, createdBy: existing.club.createdBy } : existing.club,
    members: unique,
    events: staff ? mergeEvents(existing.events, incoming.events) : existing.events,
    rsvps: mergeRsvps(existing.rsvps, staff ? incoming.rsvps : ownRsvps).filter((row) => unique.some((person) => person.id === row.memberId)),
    messages: unionById(existing.messages, incoming.messages),
    charla: staff ? unionById(existing.charla, incoming.charla) : existing.charla,
    matchSheets: staff ? mergeSheetsByTime(existing.matchSheets, incoming.matchSheets) : existing.matchSheets,
    invites: staff ? unionById(existing.invites, incoming.invites) : existing.invites,
    convocatorias: staff
      ? unionById(
          (existing.convocatorias ?? []).map((item) => ({ ...item, id: item.eventId })),
          (incoming.convocatorias ?? []).map((item) => ({ ...item, id: item.eventId })),
        ).map(({ id: _id, ...item }) => item)
      : (existing.convocatorias ?? []),
    inbox: unionById(existing.inbox, incoming.inbox),
    alertLog: staff ? unionById(existing.alertLog, incoming.alertLog) : existing.alertLog,
    reminderPolicy: staff ? (incoming.reminderPolicy ?? existing.reminderPolicy) : existing.reminderPolicy,
    tournaments: staff
      ? mergeTournaments(existing.tournaments, incoming.tournaments)
      : mergeTournaments(existing.tournaments, []),
    droppedIds: [...dropped],
      },
      droppedEvents,
    ),
  );
}

export const saveClubDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; bundle: ClubBundle }) => ({
    code: sanitizeCode(input.code),
    bundle: input.bundle,
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; bundle?: ClubBundle }> => {
    if (!data.code || !data.bundle?.club) return { ok: false, error: "El equipo está incompleto." };
    const userId = userIdOf(context as { userId?: string });
    if (!userId) return { ok: false, error: "Entrá de nuevo para guardar." };
    try {
      const merged = await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          [COLLECTION, data.code],
        );
        const raw = rows[0]?.data;
        let existing: ClubBundle | null = null;
        if (typeof raw === "string") {
          try {
            existing = asBundle(JSON.parse(raw));
          } catch {
            existing = null;
          }
        } else if (raw) {
          existing = asBundle(raw);
        }
        if (existing && !memberFor(existing.members, userId)) {
          throw new Error("No estás en este equipo.");
        }
        if (!existing && !memberFor(data.bundle.members, userId)) {
          throw new Error("No estás en este equipo.");
        }
        const next = mergeForSave(existing, data.bundle, userId);
        const payload = JSON.stringify(next);
        if (payload.length > MAX_BYTES) throw new Error("El equipo pesa demasiado para subirlo.");
        if (!rows[0]) {
          await query(
            `insert into vestuario_docs (collection, id, data, updated_at)
             values ($1, $2, $3::jsonb, now())`,
            [COLLECTION, data.code, payload],
          );
        } else {
          await query(
            `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
            [COLLECTION, data.code, payload],
          );
        }
        return next;
      });
      return { ok: true, bundle: merged };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      vestuarioLog("guardar", message);
      if (message.includes("pesa demasiado") || message.includes("No estás")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo guardar el equipo." };
    }
  });

export const claimMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      code: string;
      member: { id: string; name: string; nick: string; role?: string; number?: number | null; menor?: boolean };
    }) => ({
      code: sanitizeCode(input.code),
      id: String(input.member?.id ?? "").slice(0, 80),
      name: String(input.member?.name ?? "").slice(0, 80),
      nick: String(input.member?.nick ?? "").slice(0, 40),
      number: typeof input.member?.number === "number" ? input.member.number : null,
      menor: input.member?.menor === true,
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; members?: Member[] }> => {
    if (!data.code || !data.name) return { ok: false, error: "Falta el jugador." };
    const accountId = String((context as { userId?: string }).userId ?? "");
    if (!accountId) return { ok: false, error: "No hay sesión." };
    try {
      await noteLookup(accountId);
    } catch {
      return { ok: false, error: "Demasiados intentos. Esperá un rato." };
    }
    try {
      const members = await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          [COLLECTION, data.code],
        );
        if (!rows[0]) throw new Error("Ese equipo no está en la nube.");
        const raw = rows[0].data;
        let existing: ClubBundle | null = null;
        if (typeof raw === "string") {
          try {
            existing = asBundle(JSON.parse(raw));
          } catch {
            existing = null;
          }
        } else {
          existing = asBundle(raw);
        }
        if (!existing) throw new Error("Ese equipo no está en la nube.");
        const accountRows = await query<{ menor: boolean }>(`select "menor" from "user" where "id" = $1`, [
          accountId,
        ]);
        const menor = Boolean(accountRows[0]?.menor || data.menor);
        const dropped = new Set(existing.droppedIds ?? []);
        const byAccount = existing.members.find(
          (person) => person.accountId === accountId || person.id === accountId,
        );
        const current = byAccount;
        if (current && (dropped.has(current.id) || dropped.has(accountId))) {
          return existing.members;
        }
        const next = guardMember(
          current
            ? {
                ...current,
                accountId,
                number: current.number ?? data.number,
                menor: menor || current.menor,
              }
            : {
                id: accountId,
                name: data.name,
                nick: data.nick || data.name.split(" ")[0] || "Jugador",
                role: "jugador" as const,
                number: data.number,
                accountId,
                juega: true,
                menor,
              },
          current,
        );
        const stripped = existing.members.map((person) =>
          person.accountId === accountId && person.id !== next.id ? { ...person, accountId: null } : person,
        );
        const without = stripped.filter((person) => person.id !== next.id);
        const list = [...without, next];
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify({ ...existing, members: list })],
        );
        return list;
      });
      return { ok: true, members };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      vestuarioLog("plantel", message);
      if (message.includes("no está")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo anotar en el plantel." };
    }
  });

export const useMyName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; memberId: string }) => ({
    code: sanitizeCode(input.code),
    memberId: String(input.memberId ?? "").slice(0, 80),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; members?: Member[] }> => {
    const accountId = String((context as { userId?: string }).userId ?? "");
    if (!accountId || !data.code || !data.memberId) return { ok: false, error: "Falta el nombre." };
    try {
      const members = await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          [COLLECTION, data.code],
        );
        if (!rows[0]) throw new Error("Ese equipo no está en la nube.");
        const raw = rows[0].data;
        let existing: ClubBundle | null = null;
        if (typeof raw === "string") {
          try {
            existing = asBundle(JSON.parse(raw));
          } catch {
            existing = null;
          }
        } else {
          existing = asBundle(raw);
        }
        if (!existing) throw new Error("Ese equipo no está en la nube.");
        const caller = memberFor(existing.members, accountId);
        if (!isStaffMember(caller)) throw new Error("No podés cambiar de nombre.");
        const target = existing.members.find((person) => person.id === data.memberId);
        if (!target) throw new Error("Ese nombre no está en el plantel.");
        if (target.accountId && target.accountId !== accountId) {
          throw new Error("Ese nombre ya tiene otra cuenta.");
        }
        const list = existing.members.map((person) => {
          if (person.id === target.id) return { ...person, accountId };
          if (person.accountId === accountId) return { ...person, accountId: null };
          return person;
        });
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify({ ...existing, members: list })],
        );
        return list;
      });
      return { ok: true, members };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      vestuarioLog("nombre", message);
      if (message.includes("no está") || message.includes("otra cuenta")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo usar ese nombre." };
    }
  });


