// Nube del vestuario. El código muestra la ficha y sirve para entrar.
// El plantel, el chat y los cambios solo los ve quien ya está en el equipo.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { withTransaction } from "@/lib/db";
import { mergeFiguraVotes } from "./figura";
import { FORMATIONS } from "./formations";
import { armarFormacionPublica, estadoMarcador, sanitizeLiveToken, type PuestoPublico } from "./vivo";
import { sanitizeCode } from "./sanitize";
import {
  claimExistingName,
  canAssignRoles,
  capRoster,
  clipInbox,
  clipTextList,
  decideClaim,
  freshMemberId,
  guardMember,
  pickMemberIdentity,
  resultIsOpen,
  HARD_BYTES,
  mergeAlumni,
  mergePlayerAlerts,
  mergePlayerInbox,
  nextBannedAccounts,
  noticeFits,
  preferRsvp,
  readmitAccount,
  removeMemberEverywhere,
  sanitizeSheet,
  sizeVerdict,
  withoutBanned,
} from "./club-rules";
import { pruneBundle } from "./prune";
import { vestuarioLog } from "@/lib/vestuario-log";
import type { ClubBundle, ClubEvent, MatchSheet, Member, Rsvp, Tournament } from "./types";

const COLLECTION = "clubs";
const ATTEMPTS = "intentos";
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 30;

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

async function noteLookup(userId: string, limit = ATTEMPT_LIMIT): Promise<void> {
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
    if (n > limit) throw new Error("Demasiados intentos. Esperá un rato.");
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

export async function memberIdsInClub(code: string): Promise<string[] | null> {
  const bundle = await readClub(code);
  if (!bundle) return null;
  return bundle.members.map((person) => person.id);
}

export async function memberIdInClub(code: string, userId: string): Promise<string | null> {
  const bundle = await readClub(code);
  if (!bundle) return null;
  return memberFor(bundle.members, userId)?.id ?? null;
}

export async function noticeForMember(
  code: string,
  userId: string,
  title: string,
  body: string,
): Promise<{ title: string; url: string } | null> {
  const bundle = await readClub(code);
  if (!bundle) return null;
  const me = memberFor(bundle.members, userId);
  if (!me) return null;
  return noticeFits(bundle, me.id, isStaffMember(me), title, body);
}

export async function isClubMember(code: string, userId: string): Promise<boolean> {
  if (!code || !userId) return false;
  const bundle = await readClub(code);
  return Boolean(bundle && memberFor(bundle.members, userId));
}

export const loadClubCard = createServerFn({ method: "POST" })
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

export const loadClubDoc = createServerFn({ method: "POST" })
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
    const me = memberFor(bundle.members, userId);
    if (!isStaffMember(me)) return { ok: true, bundle: { ...bundle, bannedAccounts: undefined } };
    return { ok: true, bundle };
  });

export const peekClubName = createServerFn({ method: "POST" })
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code }): Promise<string | null> => {
    if (!code) return null;
    const bundle = await readClub(code);
    const name = bundle?.club.name?.trim() ?? "";
    if (name) return name.slice(0, 80);
    const bucket = await peekBucket();
    if (bucket) {
      try {
        await noteLookup(bucket, 8);
      } catch {
        return null;
      }
    }
    return null;
  });

async function peekBucket(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const real = request?.headers?.get("x-real-ip")?.trim() ?? "";
    const forwarded = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ip = (real || forwarded).slice(0, 80);
    return ip ? `peek:${ip}` : "peek:comun";
  } catch {
    return "peek:comun";
  }
}

const VIVO = "vivo";

export type MarcadorPublico =
  | {
      ok: true;
      club: string;
      title: string;
      place: string;
      startsAt: string;
      goalsFor: number;
      goalsAgainst: number;
      estado: "espera" | "juego" | "final";
      titulares: PuestoPublico[];
      banco: string[];
    }
  | { ok: false; reason: "missing" | "limited" };

export const publicarMarcador = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; token?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    token: sanitizeLiveToken(input?.token),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason?: "esperando" }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code || !data.token) return { ok: false };
    const bundle = await readClub(data.code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !isStaffMember(me)) return { ok: false };
    const event = bundle.events.find((item) => item.kind === "partido" && item.liveToken === data.token);
    if (!event) return { ok: false, reason: "esperando" };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [VIVO, data.token, JSON.stringify({ code: data.code, eventId: event.id })],
    );
    return { ok: true };
  });

export const cerrarMarcador = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; token?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    token: sanitizeLiveToken(input?.token),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code || !data.token) return { ok: false };
    const bundle = await readClub(data.code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !isStaffMember(me)) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query("delete from vestuario_docs where collection = $1 and id = $2", [VIVO, data.token]);
    return { ok: true };
  });

export const leerMarcador = createServerFn({ method: "POST" })
  .validator((token: string) => sanitizeLiveToken(token))
  .handler(async ({ data: token }): Promise<MarcadorPublico> => {
    if (!token) return { ok: false, reason: "missing" };
    const bucket = await peekBucket();
    if (bucket && bucket !== "peek:comun") {
      try {
        await noteLookup(`vivo:${bucket.slice(5)}`, 600);
      } catch {
        return { ok: false, reason: "limited" };
      }
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ data: { code?: string; eventId?: string } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [VIVO, token],
    );
    const raw = rows[0]?.data;
    let pointer: { code?: string; eventId?: string } | null = null;
    if (typeof raw === "string") {
      try {
        pointer = JSON.parse(raw) as { code?: string; eventId?: string };
      } catch {
        pointer = null;
      }
    } else if (raw && typeof raw === "object") {
      pointer = raw;
    }
    const code = sanitizeCode(String(pointer?.code ?? ""));
    const eventId = String(pointer?.eventId ?? "");
    if (!code || !eventId) return { ok: false, reason: "missing" };
    const bundle = await readClub(code);
    const event = bundle?.events.find((item) => item.id === eventId && item.liveToken === token);
    if (!bundle || !event) return { ok: false, reason: "missing" };
    const sheet = bundle.matchSheets.find((item) => item.eventId === event.id);
    const list = FORMATIONS[event.modality] ?? FORMATIONS.f8;
    const slots = (list.find((item) => item.id === event.formacion) ?? list[0]).slots;
    const formacion = armarFormacionPublica(
      slots,
      event.lineup,
      event.suplentes,
      bundle.members.map((person) => ({
        id: person.id,
        nick: person.nick,
        name: person.name,
        number: person.number,
      })),
      Boolean(event.lineupPublishedAt),
    );
    return {
      ok: true,
      club: bundle.club.name.slice(0, 80),
      title: event.title.slice(0, 80),
      place: (event.place || "").slice(0, 80),
      startsAt: event.startsAt,
      goalsFor: sheet?.goalsFor ?? 0,
      goalsAgainst: sheet?.goalsAgainst ?? 0,
      estado: estadoMarcador(event),
      titulares: formacion.titulares,
      banco: formacion.banco,
    };
  });

export const listMyClubs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ code: string; name: string }[]> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId) return [];
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ code: string | null; name: string | null }>(
      `select coalesce(data->'club'->>'inviteCode', id) as code,
              coalesce(data->'club'->>'name', 'Equipo') as name
         from vestuario_docs
        where collection = $1
          and jsonb_typeof(data->'members') = 'array'
          and exists (
            select 1 from jsonb_array_elements(data->'members') as member
            where member->>'accountId' = $2
          )
        limit 20`,
      [COLLECTION, userId],
    );
    return rows
      .map((row) => ({
        code: sanitizeCode(String(row.code ?? "")),
        name: String(row.name ?? "Equipo").slice(0, 80),
      }))
      .filter((row) => row.code);
  });

const PORTRAITS = "retratos";

export const savePortrait = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((photo: string | null) => {
    if (photo == null || photo === "") return null;
    const value = String(photo);
    if (!value.startsWith("data:image/") || value.length > 30_000) return null;
    return value;
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    if (!data) {
      await sql.query("delete from vestuario_docs where collection = $1 and id = $2", [PORTRAITS, userId]);
      return { ok: true };
    }
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [PORTRAITS, userId, JSON.stringify({ photo: data })],
    );
    return { ok: true };
  });

export const loadPortrait = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ photo: string | null }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId) return { photo: null };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ data: { photo?: string } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [PORTRAITS, userId],
    );
    const raw = rows[0]?.data;
    let parsed: { photo?: string } | null = null;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw) as { photo?: string };
      } catch {
        parsed = null;
      }
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
    const photo = parsed?.photo;
    if (!photo || !photo.startsWith("data:image/") || photo.length > 30_000) return { photo: null };
    return { photo };
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
      .filter((event) => {
        if (!event.tournamentId || !closed.has(event.tournamentId) || event.kind !== "partido") return false;
        const start = Date.parse(event.startsAt);
        const alreadyPlayed = !Number.isNaN(start) && start < Date.now() - 3_600_000;
        const hasResult = (bundle.matchSheets ?? []).some((sheet) => sheet.eventId === event.id) || Boolean(event.resultClosedAt);
        return alreadyPlayed && hasResult;
      })
      .map((event) => event.id),
  );
  if (ids.size === 0) return bundle;
  return {
    ...bundle,
    events: bundle.events.map((event) => {
      if (!ids.has(event.id)) return event;
      if (
        Object.keys(event.lineup ?? {}).length === 0 &&
        !event.tactics &&
        !event.formacion &&
        (event.suplentes ?? []).length === 0 &&
        (event.convocados ?? []).length === 0
      ) {
        return event;
      }
      return { ...event, lineup: {}, tactics: "", formacion: undefined, suplentes: [], convocados: [] };
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
  const tidy = tidySquad(keepResultMark(previous, incoming, merged));
  const prevLive = boardStamp(previous.liveUpdatedAt);
  const nextLive = boardStamp(incoming.liveUpdatedAt);
  const liveSource = nextLive >= prevLive ? incoming : previous;
  return {
    ...tidy,
    liveToken: liveSource.liveToken ?? null,
    liveUpdatedAt: liveSource.liveUpdatedAt,
  };
}

function tidySquad(event: ClubEvent): ClubEvent {
  const seen = new Set<string>();
  const lineup: Record<string, string> = {};
  for (const [key, id] of Object.entries(event.lineup ?? {})) {
    if (!id || seen.has(id)) continue;
    if (event.convocados && !event.convocados.includes(id)) continue;
    seen.add(id);
    lineup[key] = id;
  }
  const convocados = event.convocados ? [...new Set(event.convocados)] : event.convocados;
  const titulares = new Set(Object.values(lineup));
  const suplentes = [...new Set((event.suplentes ?? []).filter((id) => !titulares.has(id) && (!convocados || convocados.includes(id))))];
  return { ...event, lineup, convocados, suplentes };
}

function sheetTime(sheet: MatchSheet): number {
  const time = sheet.recordedAt ? +new Date(sheet.recordedAt) : 0;
  return Number.isFinite(time) ? time : 0;
}

export function pickSheet(previous: MatchSheet, incoming: MatchSheet): MatchSheet {
  return sheetTime(incoming) >= sheetTime(previous) ? incoming : previous;
}

export function withoutDroppedCharla(bundle: ClubBundle, dropped: Set<string>): ClubBundle {
  if (dropped.size === 0) return { ...bundle, droppedCharlaIds: [] };
  return {
    ...bundle,
    droppedCharlaIds: [...dropped],
    charla: (bundle.charla ?? []).filter((item) => !dropped.has(item.id)),
    inbox: (bundle.inbox ?? []).filter((item) => !dropped.has(item.id)),
  };
}

export function withoutDroppedEvents(bundle: ClubBundle, dropped: Set<string>): ClubBundle {
  if (dropped.size === 0) return { ...bundle, droppedEventIds: [...dropped] };
  return {
    ...bundle,
    droppedEventIds: [...dropped],
    events: bundle.events.filter((event) => !dropped.has(event.id)),
    rsvps: (bundle.rsvps ?? []).filter((row) => !dropped.has(row.eventId)),
    matchSheets: (bundle.matchSheets ?? []).filter((sheet) => !dropped.has(sheet.eventId)),
    figuraVotes: (bundle.figuraVotes ?? []).filter((row) => !dropped.has(row.eventId)),
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

function mergeSheetsByTime(kept: MatchSheet[], incoming: MatchSheet[], events: ClubEvent[]): MatchSheet[] {
  const starts = new Map(events.map((event) => [event.id, event.startsAt]));
  const map = new Map(kept.map((sheet) => [sheet.eventId, sheet]));
  for (const sheet of incoming) {
    const start = starts.get(sheet.eventId);
    if (!start || !resultIsOpen(start)) continue;
    const previous = map.get(sheet.eventId);
    map.set(sheet.eventId, sanitizeSheet(previous ? pickSheet(previous, sheet) : sheet));
  }
  return [...map.values()];
}

function callerIsCreator(existing: ClubBundle, userId: string): boolean {
  return canAssignRoles(existing.members, existing.club.createdBy, userId);
}

function lockStaffRoles(existing: ClubBundle, members: Member[], userId: string): Member[] {
  if (callerIsCreator(existing, userId)) return members;
  const roles = new Map(existing.members.map((person) => [person.id, person.role]));
  return members.map((person) => {
    const role = roles.get(person.id);
    if (role) return { ...person, role };
    return { ...person, role: "jugador" };
  });
}

function capOversizedPhotos(previous: Member[], next: Member[]): Member[] {
  const oldById = new Map(previous.map((person) => [person.id, person]));
  return next.map((person) => {
    const photo = person.photo;
    if (!photo || photo.length <= 40_000) return person;
    const old = oldById.get(person.id);
    if (old && old.photo === photo) return person;
    return { ...person, photo: old?.photo ?? null };
  });
}

function withinHardLimit(bundle: ClubBundle): boolean {
  return Buffer.byteLength(JSON.stringify(bundle), "utf8") <= HARD_BYTES;
}

function mergeRsvps(kept: Rsvp[], incoming: Rsvp[]): Rsvp[] {
  const map = new Map<string, Rsvp>();
  for (const row of kept) map.set(`${row.eventId}:${row.memberId}`, row);
  for (const row of incoming) {
    const key = `${row.eventId}:${row.memberId}`;
    const previous = map.get(key);
    map.set(key, previous ? preferRsvp(previous, row) : row);
  }
  return [...map.values()];
}

function mergeForSave(existing: ClubBundle | null, incoming: ClubBundle, userId: string): ClubBundle {
  if (!existing) {
    return pruneBundle(
      lightenClosedMatches(
        withoutDroppedEvents(
          { ...incoming,
          members: capRoster([], capOversizedPhotos([], incoming.members)),
          messages: clipTextList(incoming.messages ?? []),
          charla: clipTextList(incoming.charla ?? []),
          inbox: clipInbox(incoming.inbox ?? []),
          matchSheets: (incoming.matchSheets ?? [])
            .filter((sheet) => {
              const event = incoming.events.find((item) => item.id === sheet.eventId);
              return Boolean(event && resultIsOpen(event.startsAt));
            })
            .map(sanitizeSheet),
          alumni: mergeAlumni([], incoming.alumni),
        },
          new Set(incoming.droppedEventIds ?? []),
        ),
      ),
    );
  }
  const me = memberFor(existing.members, userId);
  const staff = isStaffMember(me);
  const creatorId = existing.club.createdBy;
  const requestedDrops = (staff ? (incoming.droppedIds ?? []) : []).filter((id) => id !== creatorId);
  const dropped = new Set(
    staff
      ? [...(existing.droppedIds ?? []).filter((id) => id !== creatorId), ...requestedDrops]
      : (existing.droppedIds ?? []),
  );
  const droppedEvents = new Set(
    staff
      ? [...(existing.droppedEventIds ?? []), ...(incoming.droppedEventIds ?? [])]
      : (existing.droppedEventIds ?? []),
  );
  const droppedCharla = new Set(
    staff
      ? [...(existing.droppedCharlaIds ?? []), ...(incoming.droppedCharlaIds ?? [])]
      : (existing.droppedCharlaIds ?? []),
  );
  const previous = new Map(existing.members.map((person) => [person.id, person]));
  const bannedAccounts = nextBannedAccounts(existing, requestedDrops, staff, new Date().toISOString());
  const members = withoutBanned(
    staff
      ? unionById(existing.members, incoming.members)
          .filter((person) => !dropped.has(person.id))
          .map((person) => {
            const old = previous.get(person.id);
            const identity = old ? pickMemberIdentity(old, person, true) : null;
            const next = identity
              ? { ...person, name: identity.name, nick: identity.nick, number: identity.number, profileAt: identity.profileAt }
              : person;
            const kept = guardMember(old?.accountId ? { ...next, accountId: old.accountId } : next, old);
            return kept;
          })
      : existing.members.map((person) => {
        if (person.accountId !== userId && person.id !== userId) return person;
        const mine = incoming.members.find((item) => item.id === person.id || item.accountId === userId);
        if (!mine) return person;
        const identity = pickMemberIdentity(person, mine, false);
        return guardMember(
          {
            ...person,
            name: identity.name,
            nick: identity.nick,
            number: identity.number,
            profileAt: identity.profileAt,
            photo: mine.photo && mine.photo.length > 40_000 ? person.photo : mine.photo,
          },
          person,
        );
      }),
    bannedAccounts,
  );
  const seenAccount = new Set<string>();
  const unique: Member[] = [];
  for (const person of members) {
    if (person.accountId) {
      if (seenAccount.has(person.accountId)) continue;
      seenAccount.add(person.accountId);
    }
    unique.push(person);
  }
  const leaving = existing.members.filter((person) => dropped.has(person.id));
  const alumni = mergeAlumni(
    mergeAlumni(
      existing.alumni,
      leaving.map((person) => ({ id: person.id, name: person.name, nick: person.nick })),
    ),
    staff ? incoming.alumni : [],
  );
  const capped = capRoster(existing.members, capOversizedPhotos(existing.members, unique));
  const listed = lockStaffRoles(existing, capped, userId);
  const eventIds = new Set(existing.events.map((event) => event.id));
  const ownRsvps = incoming.rsvps.filter((row) => row.memberId === me?.id);
  return withoutDroppedCharla(
    pruneBundle(
    lightenClosedMatches(
    withoutDroppedEvents(
      {
    club: staff
      ? {
          ...existing.club,
          ...incoming.club,
          name: callerIsCreator(existing, userId) ? incoming.club.name || existing.club.name : existing.club.name,
          inviteCode: existing.club.inviteCode,
          createdBy: callerIsCreator(existing, userId) ? incoming.club.createdBy || existing.club.createdBy : existing.club.createdBy,
        }
      : existing.club,
    members: listed,
    events: staff ? mergeEvents(existing.events, incoming.events) : existing.events,
    rsvps: mergeRsvps(existing.rsvps, staff ? incoming.rsvps : ownRsvps).filter((row) => listed.some((person) => person.id === row.memberId)),
    messages: clipTextList(unionById(existing.messages, incoming.messages)),
    charla: clipTextList(staff ? unionById(existing.charla, incoming.charla) : existing.charla),
    matchSheets: staff
      ? mergeSheetsByTime(
          existing.matchSheets,
          incoming.matchSheets,
          [
            ...existing.events.map((event) => incoming.events.find((item) => item.id === event.id) ?? event),
            ...incoming.events.filter((event) => !existing.events.some((item) => item.id === event.id)),
          ],
        )
      : existing.matchSheets,
    figuraVotes: mergeFiguraVotes(
      existing.figuraVotes,
      staff ? incoming.figuraVotes : (incoming.figuraVotes ?? []).filter((row) => row.voterId === me?.id),
    ),
    invites: staff ? unionById(existing.invites, incoming.invites) : existing.invites,
    convocatorias: staff
      ? unionById(
          (existing.convocatorias ?? []).map((item) => ({ ...item, id: item.eventId })),
          (incoming.convocatorias ?? []).map((item) => ({ ...item, id: item.eventId })),
        ).map(({ id: _id, ...item }) => item)
      : (existing.convocatorias ?? []),
    inbox: clipInbox(
      staff
        ? unionById(existing.inbox, incoming.inbox)
        : mergePlayerInbox(existing.inbox, incoming.inbox, me?.id ?? "", existing.events),
    ),
    alertLog: staff
      ? unionById(existing.alertLog, incoming.alertLog)
      : mergePlayerAlerts(existing.alertLog, incoming.alertLog, eventIds),
    reminderPolicy: staff ? (incoming.reminderPolicy ?? existing.reminderPolicy) : existing.reminderPolicy,
    tournaments: staff
      ? mergeTournaments(existing.tournaments, incoming.tournaments)
      : mergeTournaments(existing.tournaments, []),
    droppedIds: [...dropped],
    alumni,
    bannedAccounts,
      },
      droppedEvents,
    ),
  ),
  ),
    droppedCharla,
  );
}

export const saveClubDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; bundle: ClubBundle }) => ({
    code: sanitizeCode(input.code),
    bundle: input.bundle,
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; bundle?: ClubBundle; weight?: number }> => {
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
        const before = existing ? Buffer.byteLength(JSON.stringify(existing), "utf8") : 0;
        const next = mergeForSave(existing, data.bundle, userId);
        const payload = JSON.stringify(next);
        const after = Buffer.byteLength(payload, "utf8");
        if (sizeVerdict(before, after) !== "ok") throw new Error("El equipo pesa demasiado para subirlo.");
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
        return { next, weight: after };
      });
      return { ok: true, bundle: merged.next, weight: merged.weight };
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
      mode?: string;
      member: { id: string; name: string; nick: string; role?: string; number?: number | null; menor?: boolean };
    }) => ({
      code: sanitizeCode(input.code),
      mode: input.mode === "resume" ? "resume" as const : "join" as const,
      id: String(input.member?.id ?? "").slice(0, 80),
      name: String(input.member?.name ?? "").slice(0, 80),
      nick: String(input.member?.nick ?? "").slice(0, 40),
      number: typeof input.member?.number === "number" ? input.member.number : null,
      menor: input.member?.menor === true,
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; members?: Member[]; removed?: boolean; notMember?: boolean }> => {
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
        const decision = decideClaim({
          members: existing.members,
          droppedIds: existing.droppedIds,
          bannedAccounts: existing.bannedAccounts,
          accountId,
          mode: data.mode,
          draft: { name: data.name, nick: data.nick, number: data.number, menor },
          freshId: freshMemberId(),
          claimId: data.id,
        });
        if (decision.kind === "removed") return { removed: true as const, members: existing.members };
        if (decision.kind === "notMember") return { notMember: true as const, members: existing.members };
        if (decision.kind === "keep") return { members: decision.members };
        const next = pruneBundle({ ...existing, members: decision.members });
        if (!withinHardLimit(next)) throw new Error("El equipo pesa demasiado para subirlo.");
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify(next)],
        );
        return { members: next.members };
      });
      if ("removed" in members && members.removed) {
        return { ok: false, removed: true, error: "El DT te sacó de este equipo." };
      }
      if ("notMember" in members && members.notMember) {
        return { ok: false, notMember: true, error: "Ya no estás en el plantel de este equipo." };
      }
      return { ok: true, members: members.members };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      vestuarioLog("plantel", message);
      if (message.includes("no está") || message.includes("pesa demasiado")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo anotar en el plantel." };
    }
  });

export const leaveClubDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: sanitizeCode(input?.code) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code) return { ok: false, error: "No pudimos sacarte del equipo. Probá de nuevo." };
    try {
      await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          [COLLECTION, data.code],
        );
        if (!rows[0]) return;
        const raw = rows[0].data;
        const existing = typeof raw === "string" ? asBundle(JSON.parse(raw)) : asBundle(raw);
        if (!existing) return;
        const me = memberFor(existing.members, userId);
        if (!me) return;
        const removed = removeMemberEverywhere(existing, me.id);
        if (removed.empty) {
          await query("delete from vestuario_docs where collection = $1 and id = $2", [COLLECTION, data.code]);
          await query("delete from vestuario_docs where collection = $1 and id = $2", ["pushes", data.code]);
          return;
        }
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify(removed.bundle)],
        );
        const pushes = await query<{ data: { subs?: { memberId: string }[] } | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          ["pushes", data.code],
        );
        const pushRaw = pushes[0]?.data;
        const parsed = typeof pushRaw === "string" ? JSON.parse(pushRaw) : pushRaw;
        const subs = Array.isArray(parsed?.subs)
          ? parsed.subs.filter((item: { memberId?: string }) => item.memberId !== me.id)
          : [];
        if (pushes[0]) {
          await query(
            `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
            ["pushes", data.code, JSON.stringify({ subs })],
          );
        }
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "No pudimos sacarte del equipo. Probá de nuevo." };
    }
  });

export const readmitAccountDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; accountId: string }) => ({
    code: sanitizeCode(input?.code),
    accountId: String(input?.accountId ?? "").slice(0, 80),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; bundle?: ClubBundle }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code || !data.accountId) return { ok: false, error: "No se pudo dejar volver." };
    try {
      const bundle = await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          [COLLECTION, data.code],
        );
        if (!rows[0]) throw new Error("Ese equipo no está.");
        const raw = rows[0].data;
        const existing = typeof raw === "string" ? asBundle(JSON.parse(raw)) : asBundle(raw);
        if (!existing) throw new Error("Ese equipo no está.");
        const me = memberFor(existing.members, userId);
        if (me?.id !== existing.club.createdBy) throw new Error("Solo quien creó el equipo puede dejar volver.");
        const next = readmitAccount(existing, data.accountId);
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify(next)],
        );
        return next;
      });
      return { ok: true, bundle };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Solo") || message.includes("no está")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo dejar volver." };
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
        const claimed = claimExistingName(existing, accountId, data.memberId);
        if (!claimed.ok) throw new Error(claimed.error);
        const next = pruneBundle(claimed.bundle);
        if (!withinHardLimit(next)) throw new Error("El equipo pesa demasiado para subirlo.");
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify(next)],
        );
        return next.members;
      });
      return { ok: true, members };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      vestuarioLog("nombre", message);
      if (message.includes("no está") || message.includes("otra cuenta") || message.includes("pesa demasiado")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo usar ese nombre." };
    }
  });


