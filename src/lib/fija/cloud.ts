// Nube del vestuario. El código muestra la ficha y sirve para entrar.
// El plantel, el chat y los cambios solo los ve quien ya está en el equipo.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { withTransaction } from "@/lib/db";
import { vestuarioLog } from "@/lib/vestuario-log";
import { cobrosConfiables, cajaSegura } from "./caja";
import { asistenciasDelServer, compactarHistorial } from "./compactar";
import { figuraPermitida, mergeFiguraVotes, votosAceptables } from "./figura";
import { FORMATIONS } from "./formations";
import {
  debeLimpiar,
  elegirPartidoEquipo,
  esCrawler,
  guardarCache,
  invalidarCache,
  marcadorDeDatos,
  marcadorSinFotos,
  menorAlGuardar,
  aplicarMarcasDeJugador,
  planillasDeMarcas,
  punteroHuerfano,
  sanitizeLiveToken,
  tomarCache,
  vivoAttemptKey,
  vivoBotKey,
  vivoPointerAllows,
  vivoReadLimited,
  unirLogsVivo,
  elegirResultado,
  elegirTokenEquipo,
  instanteConfiable,
  sellarInstante,
  sellarEvento,
  VIVO_BOT_LIMIT,
  VIVO_CACHE_MS,
  VIVO_READ_LIMIT,
  type MarcadorPublico,
} from "./vivo";
import { preferirJugada } from "./jugada";
import { aplicarReaccionesJugador, camposDePizarra, juntarVistos, recortarParaJugador } from "./pizarra";
import { contarDetalle } from "./familia";
import { sanitizeCode } from "./sanitize";
import { coloresDelEquipo } from "./alineacion";
import {
  claimExistingName,
  canAssignRoles,
  overAttempt,
  repairCreatedBy,
  allowedDrops,
  capRoster,
  clipInbox,
  clipTextList,
  decideClaim,
  freshMemberId,
  guardMember,
  pickMemberIdentity,
  perfilMasNuevo,
  resultIsOpen,
  bibliotecaMasNueva,
  escudoElegido,
  marcaMasNueva,
  valorConMarca,
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
import { clubSinImagenes, pruneBundle } from "./prune";
import type { ClubBundle, ClubEvent, MarcaVivo, MatchSheet, Member, Rsvp, Tournament } from "./types";

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
  | { ok: true; bundle: ClubBundle; rev: string }
  | { ok: true; unchanged: true; rev: string }
  | { ok: false; reason: "missing" | "forbidden" | "limited" };

export function traeEquipo(load: ClubLoad): load is { ok: true; bundle: ClubBundle; rev: string } {
  return load.ok === true && "bundle" in load;
}

function userIdOf(context: { userId?: string } | undefined): string {
  return String(context?.userId ?? "");
}

function memberFor(members: Member[], userId: string): Member | undefined {
  if (!userId) return undefined;
  const hits = members.filter((person) => person.accountId === userId || person.id === userId);
  return hits.find((person) => person.role === "dt")
    ?? hits.find((person) => person.role === "ayudante")
    ?? hits[0];
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
    if (overAttempt(n, limit)) throw new Error("Demasiados intentos. Esperá un rato.");
    await query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [ATTEMPTS, userId, JSON.stringify({ n, since })],
    );
  });
}

export async function readClub(code: string): Promise<ClubBundle | null> {
  const leido = await readClubRev(code);
  return leido?.bundle ?? null;
}

async function readClubRev(code: string): Promise<{ bundle: ClubBundle; rev: string } | null> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: ClubBundle | string; updated_at?: string | Date | null }>(
    "select data, updated_at from vestuario_docs where collection = $1 and id = $2",
    [COLLECTION, code],
  );
  const raw = rows[0]?.data;
  if (raw == null) return null;
  let bundle: ClubBundle | null = null;
  if (typeof raw === "string") {
    try {
      bundle = asBundle(JSON.parse(raw));
    } catch {
      bundle = null;
    }
  } else {
    bundle = asBundle(raw);
  }
  if (!bundle) return null;
  const marca = rows[0]?.updated_at;
  const rev = marca ? new Date(marca).toISOString() : "";
  return { bundle, rev: Number.isFinite(Date.parse(rev)) ? rev : "" };
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
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const escudos = await sql.query<{ data: { crest?: string | null } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      ["escudos", code],
    );
    const crudo = escudos[0]?.data;
    let crest = bundle.club.crest;
    if (typeof crudo === "string") {
      try {
        crest = (JSON.parse(crudo) as { crest?: string | null }).crest ?? null;
      } catch {
        crest = null;
      }
    } else if (crudo && typeof crudo === "object") crest = crudo.crest ?? null;
    return {
      name: bundle.club.name,
      crest: typeof crest === "string" && crest.startsWith("data:image/") ? crest : null,
      coach: coach?.name || "El DT",
      players,
    };
  });

export const loadClubDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string | { code?: string; rev?: string }) => {
    if (typeof input === "string") return { code: sanitizeCode(input), rev: "" };
    return {
      code: sanitizeCode(String(input?.code ?? "")),
      rev: String(input?.rev ?? "").slice(0, 40),
    };
  })
  .handler(async ({ data, context }): Promise<ClubLoad> => {
    const code = data.code;
    if (!code) return { ok: false, reason: "missing" };
    const userId = userIdOf(context as { userId?: string });
    const leido = await readClubRev(code);
    if (!leido) {
      try {
        await noteLookup(userId);
      } catch {
        return { ok: false, reason: "limited" };
      }
      return { ok: false, reason: "missing" };
    }
    const bundle = leido.bundle;
    if (!memberFor(bundle.members, userId)) {
      try {
        await noteLookup(userId);
      } catch {
        return { ok: false, reason: "limited" };
      }
      return { ok: false, reason: "forbidden" };
    }
    const me = memberFor(bundle.members, userId);
    if (!me) return { ok: false, reason: "forbidden" };
    if (data.rev && data.rev === leido.rev) return { ok: true, unchanged: true, rev: leido.rev };
    if (!isStaffMember(me)) return { ok: true, bundle: recortarParaJugador(bundle, me.id), rev: leido.rev };
    return { ok: true, bundle, rev: leido.rev };
  });

export const peekClubName = createServerFn({ method: "POST" })
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code }): Promise<string | null> => {
    if (!code) return null;
    const bucket = (await peekBucket()) ?? "peek:comun";
    try {
      await noteLookup(bucket, 8);
    } catch {
      return null;
    }
    const bundle = await readClub(code);
    const name = bundle?.club.name?.trim() ?? "";
    return name ? name.slice(0, 80) : null;
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
const VIVO_EQUIPO = "vivo-equipo";
const cacheMarcador = new Map<string, { at: number; value: MarcadorPublico }>();
const cuposVivo = new Map<string, { n: number; since: number }>();
let ultimoBarrido = 0;

export type { MarcadorPublico };

function invalidarMarcador(token: string) {
  invalidarCache(cacheMarcador, `t:${token}`);
  invalidarCache(cacheMarcador, `e:${token}`);
}

type PunteroVivo = { code: string | null; eventId: string; closed: boolean };

function parsePuntero(raw: unknown): { code?: string; eventId?: string; closed?: boolean } | null {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as { code?: string; eventId?: string; closed?: boolean };
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") return raw as { code?: string; eventId?: string; closed?: boolean };
  return null;
}

async function leerPuntero(
  sql: { query: (text: string, params?: unknown[]) => Promise<{ data: unknown }[]> },
  token: string,
  collection = VIVO,
): Promise<PunteroVivo> {
  const rows = await sql.query("select data from vestuario_docs where collection = $1 and id = $2", [collection, token]);
  const pointer = parsePuntero(rows[0]?.data);
  const code = sanitizeCode(String(pointer?.code ?? "")) || null;
  return {
    code,
    eventId: String(pointer?.eventId ?? ""),
    closed: pointer?.closed === true,
  };
}

async function vivoCodeOf(
  sql: { query: (text: string, params?: unknown[]) => Promise<{ data: unknown }[]> },
  token: string,
  collection = VIVO,
): Promise<string | null> {
  const puntero = await leerPuntero(sql, token, collection);
  if (puntero.closed) return null;
  return puntero.code;
}

async function guardarPuntero(
  sql: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  collection: string,
  token: string,
  data: { code: string; eventId?: string; closed?: boolean },
) {
  await sql.query(
    `insert into vestuario_docs (collection, id, data, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (collection, id)
     do update set data = excluded.data, updated_at = now()`,
    [collection, token, JSON.stringify(data)],
  );
}

async function agenteDe(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    return getRequest()?.headers?.get("user-agent") ?? "";
  } catch {
    return "";
  }
}

async function rechazoVigente(key: string, now: number): Promise<{ n: number; since: number } | null> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: { n?: number; since?: number; rejected?: boolean } | string }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [ATTEMPTS, key],
  );
  const raw = rows[0]?.data;
  let parsed: { n?: number; since?: number; rejected?: boolean } | null = null;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as { n?: number; since?: number; rejected?: boolean };
    } catch {
      parsed = null;
    }
  } else if (raw && typeof raw === "object") parsed = raw;
  if (!parsed?.rejected || typeof parsed.since !== "number") return null;
  if (now - parsed.since >= ATTEMPT_WINDOW_MS) return null;
  return { n: parsed.n ?? VIVO_READ_LIMIT + 1, since: parsed.since };
}

async function guardarRechazo(key: string, row: { n: number; since: number }) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(
    `insert into vestuario_docs (collection, id, data, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (collection, id)
     do update set data = excluded.data, updated_at = now()`,
    [ATTEMPTS, key, JSON.stringify({ n: row.n, since: row.since, rejected: true })],
  );
}

async function cupoVivo(key: string, limit: number): Promise<boolean> {
  const now = Date.now();
  const row = cuposVivo.get(key);
  if (!row || now - row.since >= ATTEMPT_WINDOW_MS) {
    const frenado = await rechazoVigente(key, now);
    if (frenado) {
      cuposVivo.set(key, frenado);
      return true;
    }
    cuposVivo.set(key, { n: 1, since: now });
    return false;
  }
  row.n += 1;
  if (!vivoReadLimited(row.n, limit)) return false;
  await guardarRechazo(key, row);
  return true;
}

async function escudoDe(code: string, crest: string | null | undefined): Promise<string | null> {
  if (crest?.startsWith("data:image/")) return crest;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: { crest?: string | null } | string }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    ["escudos", code],
  );
  const raw = rows[0]?.data;
  let data: { crest?: string | null } | null = null;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as { crest?: string | null };
    } catch {
      data = null;
    }
  } else if (raw && typeof raw === "object") data = raw;
  return data?.crest?.startsWith("data:image/") ? data.crest : null;
}

async function barrerVivo() {
  const ahora = Date.now();
  if (!debeLimpiar(ultimoBarrido, ahora)) return;
  ultimoBarrido = ahora;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query("delete from vestuario_docs where collection = $1 and updated_at < now() - interval '2 hours'", [
    ATTEMPTS,
  ]);
  const rows = await sql.query<{ id: string; data: unknown }>(
    "select id, data from vestuario_docs where collection = $1 order by updated_at asc limit 8",
    [VIVO],
  );
  for (const row of rows) {
    const pointer = parsePuntero(row.data);
    if (pointer?.closed === true) {
      await sql.query("update vestuario_docs set updated_at = now() where collection = $1 and id = $2", [VIVO, row.id]);
      continue;
    }
    const code = sanitizeCode(String(pointer?.code ?? ""));
    const bundle = code ? await readClub(code) : null;
    const event = bundle?.events.find((item) => item.id === pointer?.eventId) ?? null;
    if (punteroHuerfano(row.id, event)) {
      await sql.query("delete from vestuario_docs where collection = $1 and id = $2", [VIVO, row.id]);
      invalidarMarcador(row.id);
    }
  }
}

async function fotosParaVivo(members: { id: string; accountId?: string | null; menor?: boolean }[]): Promise<Map<string, string>> {
  const cuentas = members.filter((person) => person.accountId && person.menor !== true);
  const map = new Map<string, string>();
  if (cuentas.length === 0) return map;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ id: string; data: { photo?: string; photoCard?: string } | string }>(
      "select id, data from vestuario_docs where collection = $1 and id = any($2::text[])",
      [PORTRAITS, [...new Set(cuentas.map((person) => person.accountId as string))]],
    );
    const porCuenta = new Map(rows.map((row) => [row.id, parseRetrato(row.data)]));
    for (const person of cuentas) {
      const retrato = porCuenta.get(person.accountId as string);
      const foto = retrato?.photoCard || retrato?.photo;
      if (foto) map.set(person.id, foto);
    }
  } catch {
    return map;
  }
  return map;
}

function fotoDeMiembro(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith("data:image/") || valor.length < 16 || valor.length > 40_000) return null;
  return valor;
}

async function armarDesde(code: string, modo: "partido" | "equipo", token: string, eventId = ""): Promise<MarcadorPublico> {
  const bundle = await readClub(code);
  if (!bundle) return { ok: false, reason: "missing" };
  const event = modo === "partido"
    ? bundle.events.find((item) => item.kind === "partido" && item.id === eventId && item.liveToken === token) ?? null
    : elegirPartidoEquipo(bundle.events);
  if (modo === "partido" && !event) return { ok: false, reason: "missing" };
  const sheet = event ? bundle.matchSheets.find((item) => item.eventId === event.id) ?? null : null;
  const list = event ? (FORMATIONS[event.modality] ?? FORMATIONS.f8) : [];
  const slots = event ? (list.find((item) => item.id === event.formacion) ?? list[0])?.slots ?? [] : [];
  const crest = await escudoDe(code, bundle.club.crest);
  const reaccion = event ? (modo === "partido" ? token : `eq:${token}:${event.id}`) : "";
  const familia = reaccion ? await contarDetalle(reaccion) : { pelota: 0, aplauso: 0, fuego: 0 };
  const fotos = await fotosParaVivo(bundle.members);
  return marcadorDeDatos({
    modo,
    clubName: bundle.club.name,
    crest,
    event,
    sheet,
    slots,
    people: bundle.members.map((person) => ({
      id: person.id,
      nick: person.nick,
      name: person.name ?? "",
      number: person.number,
      menor: person.menor,
      accountId: person.accountId,
      role: person.role,
      juega: person.juega,
      photo: person.menor === true ? null : fotos.get(person.id) || fotoDeMiembro(person.photo),
    })),
    votes: bundle.figuraVotes ?? [],
    events: bundle.events,
    sheets: bundle.matchSheets,
    familia,
    sponsors: bundle.club.sponsors,
    token,
  });
}

export async function resolverMarcador(input: { t?: string; e?: string }, ua = ""): Promise<MarcadorPublico> {
  const t = sanitizeLiveToken(input.t);
  const e = sanitizeLiveToken(input.e);
  if (!t && !e) return { ok: false, reason: "missing" };
  const modo = e ? "equipo" : "partido";
  const token = e || t;
  const clave = `${modo === "equipo" ? "e" : "t"}:${token}`;
  const bucket = (await peekBucket()) ?? "peek:comun";
  const bot = esCrawler(ua);
  const limitado = await cupoVivo(bot ? vivoBotKey(token) : vivoAttemptKey(bucket, token), bot ? VIVO_BOT_LIMIT : VIVO_READ_LIMIT);
  if (limitado) return { ok: false, reason: "limited" };
  const ahora = Date.now();
  const cacheado = tomarCache(cacheMarcador, clave, ahora, VIVO_CACHE_MS);
  if (cacheado) return cacheado;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  void barrerVivo();
  if (modo === "equipo") {
    const code = await vivoCodeOf(sql, token, VIVO_EQUIPO);
    if (!code) return { ok: false, reason: "missing" };
    const armado = await armarDesde(code, "equipo", token);
    if (armado.ok) guardarCache(cacheMarcador, clave, armado, Date.now());
    return armado;
  }
  const rows = await sql.query<{ data: unknown }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [VIVO, token],
  );
  const pointer = parsePuntero(rows[0]?.data);
  if (pointer?.closed === true) return { ok: false, reason: "missing" };
  const code = sanitizeCode(String(pointer?.code ?? ""));
  const eventId = String(pointer?.eventId ?? "");
  if (!code || !eventId) return { ok: false, reason: "missing" };
  const armado = await armarDesde(code, "partido", token, eventId);
  if (armado.ok) guardarCache(cacheMarcador, clave, armado, Date.now());
  return armado;
}

export async function escudoDelLink(input: { t?: string; e?: string }): Promise<string | null> {
  const publico = await resolverMarcador(input);
  if (!publico.ok || !publico.escudo) return null;
  const token = sanitizeLiveToken(input.e) || sanitizeLiveToken(input.t);
  if (!token) return null;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const collection = sanitizeLiveToken(input.e) ? VIVO_EQUIPO : VIVO;
  const code = await vivoCodeOf(sql, token, collection);
  if (!code) return null;
  const bundle = await readClub(code);
  return escudoDe(code, bundle?.club.crest);
}

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
    const owner = await leerPuntero(sql, data.token);
    if (!vivoPointerAllows(owner.code, data.code, owner.closed)) return { ok: false };
    await guardarPuntero(sql, VIVO, data.token, { code: data.code, eventId: event.id });
    invalidarMarcador(data.token);
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
    const owner = await leerPuntero(sql, data.token);
    if (owner.code !== data.code) return { ok: false };
    await guardarPuntero(sql, VIVO, data.token, { code: data.code, closed: true });
    invalidarMarcador(data.token);
    return { ok: true };
  });

export const publicarEquipo = createServerFn({ method: "POST" })
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
    const owner = await leerPuntero(sql, data.token, VIVO_EQUIPO);
    if (!vivoPointerAllows(owner.code, data.code, owner.closed)) return { ok: false };
    await guardarPuntero(sql, VIVO_EQUIPO, data.token, { code: data.code });
    invalidarMarcador(data.token);
    return { ok: true };
  });

export const cerrarEquipo = createServerFn({ method: "POST" })
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
    const owner = await leerPuntero(sql, data.token, VIVO_EQUIPO);
    if (owner.code !== data.code) return { ok: false };
    await guardarPuntero(sql, VIVO_EQUIPO, data.token, { code: data.code, closed: true });
    invalidarMarcador(data.token);
    return { ok: true };
  });

export const leerMarcador = createServerFn({ method: "POST" })
  .validator((input: { t?: string; e?: string; ligero?: boolean } | string) => {
    if (typeof input === "string") return { t: sanitizeLiveToken(input), e: "", ligero: false };
    return {
      t: sanitizeLiveToken(input?.t),
      e: sanitizeLiveToken(input?.e),
      ligero: input?.ligero === true,
    };
  })
  .handler(async ({ data }): Promise<MarcadorPublico> => {
    const marcador = await resolverMarcador(data, await agenteDe());
    return data.ligero ? marcadorSinFotos(marcador) : marcador;
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
const FOTO_MINI = 30_000;
const FOTO_CARD = 170_000;

function fotoData(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.startsWith("data:image/") || value.length > max || value.length < 16) return null;
  return value;
}

type RetratoGuardado =
  | { borrar: true }
  | { invalido: true }
  | { photo: string; photoCard: string | null; soloMini: boolean };

function parseRetrato(raw: { photo?: string; photoCard?: string } | string | null | undefined): {
  photo: string | null;
  photoCard: string | null;
} {
  let parsed: { photo?: string; photoCard?: string } | null = null;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as { photo?: string; photoCard?: string };
    } catch {
      parsed = null;
    }
  } else if (raw && typeof raw === "object") parsed = raw;
  return {
    photo: fotoData(parsed?.photo, FOTO_MINI),
    photoCard: fotoData(parsed?.photoCard, FOTO_CARD),
  };
}

export const savePortrait = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown): RetratoGuardado => {
    if (input == null || input === "") return { borrar: true };
    if (typeof input === "string") {
      const photo = fotoData(input, FOTO_MINI);
      if (!photo) return { invalido: true };
      return { photo, photoCard: null, soloMini: true };
    }
    if (typeof input === "object") {
      const raw = input as { photo?: unknown; photoCard?: unknown };
      const photo = fotoData(raw.photo, FOTO_MINI);
      if (!photo) return { invalido: true };
      if (raw.photoCard == null || raw.photoCard === "") return { photo, photoCard: null, soloMini: false };
      const photoCard = fotoData(raw.photoCard, FOTO_CARD);
      if (!photoCard) return { invalido: true };
      return { photo, photoCard, soloMini: false };
    }
    return { invalido: true };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql.query<{ menor: boolean | null }>(`select menor from "user" where id = $1`, [userId]);
    if (users[0]?.menor === true) {
      await sql.query("delete from vestuario_docs where collection = $1 and id = $2", [PORTRAITS, userId]);
      return { ok: false };
    }
    if ("borrar" in data) {
      await sql.query("delete from vestuario_docs where collection = $1 and id = $2", [PORTRAITS, userId]);
      return { ok: true };
    }
    if ("invalido" in data) return { ok: false };
    if (data.soloMini) {
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, jsonb_build_object('photo', $3::text), now())
         on conflict (collection, id)
         do update set data = vestuario_docs.data || jsonb_build_object('photo', $3::text), updated_at = now()`,
        [PORTRAITS, userId, data.photo],
      );
      return { ok: true };
    }
    if (data.photoCard) {
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, jsonb_build_object('photo', $3::text, 'photoCard', $4::text), now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [PORTRAITS, userId, data.photo, data.photoCard],
      );
      return { ok: true };
    }
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, jsonb_build_object('photo', $3::text), now())
       on conflict (collection, id)
       do update set data = (vestuario_docs.data - 'photoCard') || jsonb_build_object('photo', $3::text), updated_at = now()`,
      [PORTRAITS, userId, data.photo],
    );
    return { ok: true };
  });

export const loadPortrait = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ photo: string | null; photoCard: string | null }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId) return { photo: null, photoCard: null };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ data: { photo?: string; photoCard?: string } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [PORTRAITS, userId],
    );
    return parseRetrato(rows[0]?.data);
  });

export const loadFotosCard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: unknown) => sanitizeCode(String(code ?? "")))
  .handler(async ({ data: code, context }): Promise<{ memberId: string; photoCard: string; photo: string | null }[]> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !code) return [];
    const bundle = await readClub(code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !me) return [];
    const cuentas = bundle.members.filter((person) => person.accountId && !person.menor);
    if (cuentas.length === 0) return [];
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ id: string; data: { photo?: string; photoCard?: string } | string }>(
      "select id, data from vestuario_docs where collection = $1 and id = any($2::text[])",
      [PORTRAITS, [...new Set(cuentas.map((person) => person.accountId as string))]],
    );
    const porCuenta = new Map(rows.map((row) => [row.id, parseRetrato(row.data)]));
    const fotos: { memberId: string; photoCard: string; photo: string | null }[] = [];
    for (const person of cuentas) {
      const retrato = porCuenta.get(person.accountId as string);
      const photoCard = retrato?.photoCard || retrato?.photo;
      if (photoCard) fotos.push({ memberId: person.id, photoCard, photo: retrato?.photo ?? null });
    }
    return fotos;
  });

const ESCUDOS = "escudos";

function escudoData(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("data:image/") || value.length >= 120_000 || value.length < 16) return null;
  return value;
}

export const saveCrest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; crest?: string | null }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    crest: input?.crest == null || input.crest === "" ? null : escudoData(input.crest),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code) return { ok: false };
    const bundle = await readClub(data.code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !isStaffMember(me)) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [ESCUDOS, data.code, JSON.stringify({ crest: data.crest })],
    );
    return { ok: true };
  });

export const loadCrest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: unknown) => sanitizeCode(String(code ?? "")))
  .handler(async ({ data: code, context }): Promise<{ crest: string | null }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !code) return { crest: null };
    const bundle = await readClub(code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !me) return { crest: null };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ data: { crest?: string | null } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [ESCUDOS, code],
    );
    const raw = rows[0]?.data;
    let parsed: { crest?: string | null } | null = null;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw) as { crest?: string | null };
      } catch {
        parsed = null;
      }
    } else if (raw && typeof raw === "object") parsed = raw;
    if (rows[0]) return { crest: escudoData(parsed?.crest) };
    const viejo = escudoData(bundle.club.crest);
    if (!viejo) return { crest: null };
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id) do nothing`,
      [ESCUDOS, code, JSON.stringify({ crest: viejo })],
    );
    return { crest: viejo };
  });

const AUDIOS = "audios";

function audioValido(value: unknown): string | null {
  const audio = String(value ?? "");
  if (!audio.startsWith("data:audio/") || audio.length > 500_000) return null;
  return audio;
}

function claveAudio(code: string, eventId: string, notaId: string): string {
  return `${code}:${eventId}:${notaId}`.slice(0, 96);
}

export const saveAudioJugada = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; eventId?: string; notaId?: string; audio?: string | null }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    eventId: String(input?.eventId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40),
    notaId: String(input?.notaId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16),
    audio: input?.audio == null || input.audio === "" ? null : audioValido(input.audio),
    invalido: !(input?.audio == null || input.audio === "") && !audioValido(input?.audio),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code || !data.eventId || !data.notaId || data.invalido) return { ok: false };
    const bundle = await readClub(data.code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !isStaffMember(me)) return { ok: false };
    if (!bundle.events.some((event) => event.id === data.eventId)) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = claveAudio(data.code, data.eventId, data.notaId);
    if (!data.audio) {
      await sql.query("delete from vestuario_docs where collection = $1 and id = $2", [AUDIOS, id]);
      return { ok: true };
    }
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [AUDIOS, id, JSON.stringify({ audio: data.audio })],
    );
    return { ok: true };
  });

export const loadAudioJugada = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; eventId?: string; notaId?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    eventId: String(input?.eventId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40),
    notaId: String(input?.notaId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16),
  }))
  .handler(async ({ data, context }): Promise<{ audio: string | null }> => {
    const userId = userIdOf(context as { userId?: string });
    if (!userId || !data.code || !data.eventId || !data.notaId) return { audio: null };
    const bundle = await readClub(data.code);
    const me = memberFor(bundle?.members ?? [], userId);
    if (!bundle || !me) return { audio: null };
    if (!isStaffMember(me) && data.notaId !== "equipo") return { audio: null };
    if (!bundle.events.some((event) => event.id === data.eventId)) return { audio: null };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ data: { audio?: string } | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [AUDIOS, claveAudio(data.code, data.eventId, data.notaId)],
    );
    const raw = rows[0]?.data;
    let parsed: { audio?: string } | null = null;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw) as { audio?: string };
      } catch {
        parsed = null;
      }
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
    return { audio: audioValido(parsed?.audio) };
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
      return { ...event, lineup: {}, tactics: "", formacion: undefined, suplentes: [], convocados: [], planes: undefined, pasos: null, pelotaParada: null, notas: undefined, videoUrl: undefined, vistos: undefined };
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

export function pickEvent(previous: ClubEvent, incoming: ClubEvent, now = Date.now()): ClubEvent {
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
  const tidy = tidySquad(keepResultMark(previous, incoming, merged, now));
  const prevLive = instanteConfiable(previous.liveUpdatedAt, now);
  const nextLive = instanteConfiable(incoming.liveUpdatedAt, now);
  const liveSource = nextLive >= prevLive ? incoming : previous;
  return sellarEvento(
    {
      ...tidy,
      liveToken: liveSource.liveToken ?? null,
      liveUpdatedAt: liveSource.liveUpdatedAt,
      jugada: preferirJugada(previous.jugada, incoming.jugada),
      vistos: juntarVistos(previous.vistos, incoming.vistos),
      ...camposDePizarra(previous, incoming),
      ...camposFecha(previous, incoming, now),
      ...datosDeFecha(previous, incoming),
    },
    now,
  );
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

function sheetTime(sheet: MatchSheet, now = Date.now()): number {
  return instanteConfiable(sheet.recordedAt, now);
}

export function pickSheet(previous: MatchSheet, incoming: MatchSheet, now = Date.now()): MatchSheet {
  const chosen = sheetTime(incoming, now) >= sheetTime(previous, now) ? incoming : previous;
  const recordedAt = sellarInstante(chosen.recordedAt, now) ?? chosen.recordedAt;
  return recordedAt === chosen.recordedAt ? chosen : { ...chosen, recordedAt };
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

function datosDeFecha(previous: ClubEvent, incoming: ClubEvent): Pick<ClubEvent, "title" | "place" | "mapsQuery" | "lat" | "lng" | "startsAt" | "detailsUpdatedAt"> {
  const prev = boardStamp(previous.detailsUpdatedAt);
  const next = boardStamp(incoming.detailsUpdatedAt);
  const source = prev === 0 && next === 0 ? previous : next > prev ? incoming : previous;
  return {
    title: source.title,
    place: source.place,
    mapsQuery: source.mapsQuery,
    lat: source.lat,
    lng: source.lng,
    startsAt: source.startsAt,
    detailsUpdatedAt: source.detailsUpdatedAt,
  };
}

function camposFecha(previous: ClubEvent, incoming: ClubEvent, now = Date.now()): Pick<ClubEvent, "liveLog" | "reacciones" | "fechaOculta" | "encuesta" | "fechaUpdatedAt"> {
  const prev = instanteConfiable(previous.fechaUpdatedAt, now);
  const next = instanteConfiable(incoming.fechaUpdatedAt, now);
  const liveLog = unirLogsVivo(previous.liveLog, incoming.liveLog, previous.liveUpdatedAt, incoming.liveUpdatedAt, now);
  if (prev === 0 && next === 0) {
    return {
      liveLog,
      reacciones: (incoming.reacciones ?? previous.reacciones ?? []).slice(-80),
      fechaOculta: Boolean(incoming.fechaOculta || previous.fechaOculta),
      encuesta: incoming.encuesta ?? previous.encuesta,
      fechaUpdatedAt: incoming.fechaUpdatedAt ?? previous.fechaUpdatedAt,
    };
  }
  const source = next >= prev ? incoming : previous;
  return {
    liveLog,
    reacciones: (source.reacciones ?? []).slice(-80),
    fechaOculta: Boolean(source.fechaOculta),
    encuesta: source.encuesta,
    fechaUpdatedAt: source.fechaUpdatedAt,
  };
}

function keepResultMark(previous: ClubEvent, incoming: ClubEvent, merged: ClubEvent, now = Date.now()): ClubEvent {
  const source = elegirResultado(previous, incoming, now);
  return {
    ...merged,
    resultClosedAt: source.resultClosedAt ?? null,
    resultPending: Boolean(source.resultPending),
    resultUpdatedAt: source.resultUpdatedAt,
  };
}

function logDistinto(antes: MarcaVivo[] | undefined, despues: MarcaVivo[] | undefined): boolean {
  const left = antes ?? [];
  const right = despues ?? [];
  return left.length !== right.length || left.some((marca, index) => marca.id !== right[index]?.id);
}

function hojasConLog(merged: MatchSheet[], serverSheets: MatchSheet[], antes: ClubEvent[], despues: ClubEvent[]): MatchSheet[] {
  const desdeLog = planillasDeMarcas(serverSheets, antes, despues);
  const tocados = new Set(
    despues
      .filter((event) => logDistinto(antes.find((item) => item.id === event.id)?.liveLog, event.liveLog))
      .map((event) => event.id),
  );
  if (tocados.size === 0) return merged;
  const porLog = new Map(desdeLog.filter((sheet) => tocados.has(sheet.eventId)).map((sheet) => [sheet.eventId, sheet]));
  const next = merged.map((sheet) => porLog.get(sheet.eventId) ?? sheet);
  for (const [id, sheet] of porLog) {
    if (!next.some((item) => item.eventId === id)) next.push(sheet);
  }
  return next;
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

function lockStaffRoles(existing: ClubBundle, incomingAt: string | undefined, members: Member[], userId: string): Member[] {
  const roles = new Map(existing.members.map((person) => [person.id, person.role]));
  const bloquear = () =>
    members.map((person) => {
      const role = roles.get(person.id);
      if (role) return { ...person, role };
      return { ...person, role: "jugador" as const };
    });
  if (!callerIsCreator(existing, userId)) return bloquear();
  const previa = existing.club.rolesAt;
  if (previa && incomingAt !== previa && !marcaMasNueva(previa, incomingAt)) return bloquear();
  return members;
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

function cajaAlGuardar(
  existing: ClubBundle["caja"],
  incoming: ClubBundle["caja"],
  staff: boolean,
  memberId?: string,
): ClubBundle["caja"] {
  return cajaSegura(existing, incoming, staff, memberId);
}

function mergeForSave(existing: ClubBundle | null, incoming: ClubBundle, userId: string): ClubBundle {
  if (!existing) {
    return pruneBundle(
      lightenClosedMatches(
        withoutDroppedEvents(
          { ...incoming,
          members: capRoster([], capOversizedPhotos([], incoming.members)),
          messages: clipTextList(
            (incoming.messages ?? []).filter((item) => {
              const author = incoming.members.find((person) => person.id === item.memberId);
              return Boolean(author && (author.accountId === userId || author.id === userId));
            }),
          ),
          charla: clipTextList(incoming.charla ?? []),
          inbox: clipInbox(incoming.inbox ?? []),
          matchSheets: (incoming.matchSheets ?? [])
            .filter((sheet) => {
              const event = incoming.events.find((item) => item.id === sheet.eventId);
              return Boolean(event && resultIsOpen(event.startsAt));
            })
            .map(sanitizeSheet),
          alumni: mergeAlumni([], incoming.alumni),
          caja: incoming.caja
            ? { ...incoming.caja, cobros: cobrosConfiables(undefined, incoming.caja.cobros) }
            : incoming.caja,
        },
          new Set(incoming.droppedEventIds ?? []),
        ),
      ),
    );
  }
  const me = memberFor(existing.members, userId);
  const staff = isStaffMember(me);
  const creatorId = repairCreatedBy(existing.members, existing.club.createdBy);
  const isOwner = canAssignRoles(existing.members, creatorId, userId);
  const requestedDrops = staff ? allowedDrops(existing.members, creatorId, incoming.droppedIds ?? [], isOwner) : [];
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
    staff || isOwner
      ? unionById(existing.members, incoming.members)
          .filter((person) => !dropped.has(person.id))
          .map((person) => {
            const old = previous.get(person.id);
            const identity = old ? pickMemberIdentity(old, person, true) : null;
            const pedidoGana = !old || perfilMasNuevo(old, person, true);
            const next = identity
              ? { ...person, name: identity.name, nick: identity.nick, number: identity.number, profileAt: identity.profileAt }
              : person;
            const menor = menorAlGuardar(old?.menor, person.menor, pedidoGana);
            const withMenor = menor === undefined ? next : { ...next, menor };
            return guardMember(old?.accountId ? { ...withMenor, accountId: old.accountId } : withMenor, old);
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
  const seenAccount = new Map<string, number>();
  const unique: Member[] = [];
  const peso = (person: Member) =>
    person.id === creatorId ? 100 : person.role === "dt" ? 30 : person.role === "ayudante" ? 20 : 10;
  for (const person of members) {
    if (!person.accountId) {
      unique.push(person);
      continue;
    }
    const slot = seenAccount.get(person.accountId);
    if (slot === undefined) {
      seenAccount.set(person.accountId, unique.length);
      unique.push(person);
      continue;
    }
    if (peso(person) > peso(unique[slot])) unique[slot] = person;
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
  const listed = lockStaffRoles(existing, incoming.club.rolesAt, capped, userId);
  const eventIds = new Set(existing.events.map((event) => event.id));
  const ownRsvps = incoming.rsvps.filter((row) => row.memberId === me?.id);
  const reacciones = staff
    ? mergeEvents(existing.events, incoming.events)
    : aplicarReaccionesJugador(existing.events, incoming.events, me?.id);
  const mergedEvents = staff
    ? reacciones
    : me
      ? aplicarMarcasDeJugador(reacciones, incoming.events, existing.members)
      : reacciones;
  const votos = (staff ? incoming.figuraVotes ?? [] : (incoming.figuraVotes ?? []).filter((row) => row.voterId === me?.id))
    .filter((row) => figuraPermitida(row, mergedEvents));
  const votosPrevios = (existing.figuraVotes ?? []).filter((row) => figuraPermitida(row, mergedEvents));
  const coloresElegidos = valorConMarca(
    existing.club.colores ?? null,
    incoming.club.colores ?? null,
    existing.club.coloresAt,
    incoming.club.coloresAt,
  );
  const coloresConMarca = Boolean(existing.club.coloresAt || incoming.club.coloresAt);
  const recordatorios = valorConMarca(
    existing.reminderPolicy,
    incoming.reminderPolicy ?? existing.reminderPolicy,
    existing.reminderAt,
    incoming.reminderAt,
  );
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
          createdBy: callerIsCreator(existing, userId)
            ? incoming.club.createdBy || creatorId
            : creatorId,
          rolesAt: callerIsCreator(existing, userId) && marcaMasNueva(existing.club.rolesAt, incoming.club.rolesAt)
            ? incoming.club.rolesAt
            : existing.club.rolesAt,
          crest: escudoElegido(existing.club.crest, incoming.club.crest, staff),
          colores: coloresConMarca
            ? coloresDelEquipo(coloresElegidos.value, existing.club.colores)
            : coloresDelEquipo(incoming.club.colores, existing.club.colores),
          coloresAt: coloresConMarca ? coloresElegidos.at : existing.club.coloresAt,
          ...elegirTokenEquipo(existing.club, incoming.club),
        }
      : existing.club,
    members: listed,
    events: mergedEvents.map((event) => sellarEvento(event)),
    rsvps: mergeRsvps(
      existing.rsvps,
      (staff ? incoming.rsvps : ownRsvps).filter(
        (row) => !(existing.asistencias ?? []).some((item) => item.eventId === row.eventId),
      ),
    ).filter((row) => listed.some((person) => person.id === row.memberId)),
    asistencias: asistenciasDelServer(existing.asistencias, incoming.asistencias),
    compactacion: existing.compactacion,
    messages: clipTextList(
      unionById(
        existing.messages,
        (incoming.messages ?? []).filter((item) => Boolean(me?.id) && item.memberId === me?.id),
      ),
    ),
    charla: clipTextList(staff ? unionById(existing.charla, incoming.charla) : existing.charla),
    matchSheets: staff
      ? hojasConLog(mergeSheetsByTime(existing.matchSheets, incoming.matchSheets, mergedEvents), existing.matchSheets, existing.events, mergedEvents)
      : planillasDeMarcas(existing.matchSheets, existing.events, mergedEvents),
    figuraVotes: mergeFiguraVotes(votosPrevios, votosAceptables(votosPrevios, votos, mergedEvents, Date.now())),
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
    reminderPolicy: staff ? recordatorios.value : existing.reminderPolicy,
    reminderAt: staff ? recordatorios.at : existing.reminderAt,
    tournaments: staff
      ? mergeTournaments(existing.tournaments, incoming.tournaments)
      : mergeTournaments(existing.tournaments, []),
    droppedIds: [...dropped],
    alumni,
    bannedAccounts,
    caja: cajaAlGuardar(existing.caja, incoming.caja, staff, me?.id),
    biblioteca: staff && bibliotecaMasNueva(incoming.bibliotecaAt, existing.bibliotecaAt)
      ? (incoming.biblioteca ?? []).slice(0, 30)
      : (existing.biblioteca ?? []),
    bibliotecaAt: staff && bibliotecaMasNueva(incoming.bibliotecaAt, existing.bibliotecaAt)
      ? incoming.bibliotecaAt
      : existing.bibliotecaAt,
      },
      droppedEvents,
    ),
  ),
  ),
    droppedCharla,
  );
}

function modoCompactar(): "off" | "dry" | "on" {
  const value = process.env.COMPACTAR_HISTORIAL;
  if (value === "off" || value === "on" || value === "dry") return value;
  return "dry";
}

async function conHistorialCompacto(
  query: (sql: string, params?: unknown[]) => Promise<unknown>,
  code: string,
  bundle: ClubBundle,
): Promise<ClubBundle> {
  const modo = modoCompactar();
  if (modo === "off") return bundle;
  const ahora = Date.now();
  const informe = compactarHistorial(bundle, ahora).informe;
  if (modo === "dry") {
    vestuarioLog(
      "compactar",
      `kb ${informe.antes.total} ${informe.despues.total} filas ${informe.filasRsvp} votos ${informe.votos} eventos ${informe.eventos}`,
    );
    return bundle;
  }
  if (!bundle.compactacion?.version) {
    await query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ('respaldos', $1, $2::jsonb, now())
       on conflict (collection, id) do nothing`,
      [`${code}:compactar-v1`, JSON.stringify(bundle)],
    );
  }
  return compactarHistorial({ ...bundle, compactacion: { version: 1 } }, ahora).bundle;
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
        const next = clubSinImagenes(mergeForSave(existing, data.bundle, userId));
        const staff = isStaffMember(memberFor((existing ?? data.bundle).members, userId));
        const pedido = staff ? escudoData(data.bundle.club?.crest) : null;
        const viejo = escudoData(existing?.club.crest);
        if (pedido) {
          await query(
            `insert into vestuario_docs (collection, id, data, updated_at)
             values ('escudos', $1, $2::jsonb, now())
             on conflict (collection, id)
             do update set data = excluded.data, updated_at = now()`,
            [data.code, JSON.stringify({ crest: pedido })],
          );
        } else if (viejo) {
          await query(
            `insert into vestuario_docs (collection, id, data, updated_at)
             values ('escudos', $1, $2::jsonb, now())
             on conflict (collection, id) do nothing`,
            [data.code, JSON.stringify({ crest: viejo })],
          );
        }
        const yo = memberFor((existing ?? data.bundle).members, userId);
        for (const person of data.bundle.members ?? []) {
          if (!yo || person.accountId !== userId || person.id !== yo.id) continue;
          if (person.menor || yo.menor) continue;
          const foto = person.photo;
          if (!foto || !foto.startsWith("data:image/") || foto.length > 30_000) continue;
          await query(
            `insert into vestuario_docs (collection, id, data, updated_at)
             values ('retratos', $1, $2::jsonb, now())
             on conflict (collection, id) do nothing`,
            [person.accountId, JSON.stringify({ photo: foto })],
          );
        }
        const guardado = await conHistorialCompacto(query, data.code, next);
        const payload = JSON.stringify(guardado);
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
        return { next: guardado, weight: after };
      });
      if (merged.next.club.teamLiveToken) invalidarMarcador(merged.next.club.teamLiveToken);
      for (const event of merged.next.events) {
        if (event.liveToken) invalidarMarcador(event.liveToken);
      }
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
        if (decision.kind === "staff") return { staffError: decision.error, members: existing.members };
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
      if ("staffError" in members && members.staffError) {
        return { ok: false, error: members.staffError };
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
          await query("delete from vestuario_docs where collection = $1 and split_part(id, ':', 1) = $2", ["respaldos", data.code]);
          await query("delete from vestuario_docs where collection = $1 and split_part(id, ':', 1) = $2", ["archivo", data.code]);
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


