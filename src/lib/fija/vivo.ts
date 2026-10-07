import { datosCard, estadoFigura, premiosDelPartido, type ContextoPremios } from "./premios.ts";
import { votacionAbierta, FIGURA_CIERRE_HORAS } from "./figura.ts";
import { armarAlineacion, type DatosAlineacion, type FichaBanco, type FichaTitular } from "./alineacion.ts";
import { clampStat, emptyStat } from "./stats.ts";
import type { Club, ClubEvent, FiguraVote, MatchSheet, MarcaVivo } from "./types.ts";
import type { Sponsor } from "./sponsors.ts";
import { sponsorsVisibles } from "./sponsors.ts";

export type EstadoMarcador = "espera" | "juego" | "oficial" | "final";

export type PuestoPublico = {
  puesto: string;
  nick: string;
  numero: string;
  x: number;
  y: number;
};

export type PersonaVivo = {
  id: string;
  nick: string;
  name: string;
  number: number | null;
  menor?: boolean;
  accountId?: string | null;
  role?: "dt" | "ayudante" | "jugador";
  juega?: boolean;
  photo?: string | null;
};

export type ConteosFamilia = { pelota: number; aplauso: number; fuego: number };

export type LineaPublica = {
  id: string;
  kind: "gol" | "gol-rival" | "amarilla" | "roja";
  texto: string;
  marca: string;
};

export type ResultadoCorto = { rival: string; fecha: string; gf: number; gc: number };

export type FiguraPublica =
  | { estado: "abierta"; hasta: string }
  | { estado: "lista"; apodo: string }
  | { estado: "oculta" }
  | { estado: "sin" };

export type MarcadorOk = {
  ok: true;
  modo: "partido" | "equipo";
  sinPartido: boolean;
  club: string;
  rival: string;
  title: string;
  place: string;
  maps: string;
  startsAt: string;
  goalsFor: number;
  goalsAgainst: number;
  estado: EstadoMarcador;
  titulares: PuestoPublico[];
  banco: string[];
  familia: ConteosFamilia;
  actualizado: string | null;
  cerrado: string | null;
  lineas: LineaPublica[];
  goleadores: string[];
  figura: FiguraPublica;
  resultados: ResultadoCorto[];
  proximo: { cuando: string; rival: string } | null;
  escudo: boolean;
  reaccion: string;
  sponsors: { nombre: string; logoUrl: string; link?: string }[];
  /** La misma card de la pizarra: foto y nombre. Un menor va con apodo y sin foto. */
  card: DatosAlineacion | null;
};

export type MarcadorPublico = MarcadorOk | { ok: false; reason: "missing" | "limited" };

export const VIVO_READ_LIMIT = 2000;
export const VIVO_BOT_LIMIT = 240;
export const VIVO_REACT_LIMIT = 60;
export const VIVO_CACHE_MS = 5_000;
export const VIVO_OG_CACHE_MS = 60_000;
export const JUEGO_TOPE_MS = 3 * 60 * 60 * 1000;
export const ANTES_EN_VIVO_MS = 60 * 60 * 1000;
export const FINAL_VENTANA_MS = 48 * 60 * 60 * 1000;
/** Un final recién cerrado se queda en el link si el otro partido ya había arrancado. */
const FINAL_RECIEN_MS = 90 * 60 * 1000;
/** Una hora adelantada más de esto no puede ganar una mezcla. */
export const FUTURO_MS = 2 * 60 * 1000;
export const POLL_ESPERA = 60_000;
export const POLL_JUEGO = 12_000;
export const POLL_FINAL = 5 * 60_000;
const TZ = "America/Argentina/Buenos_Aires";

export function estadoMarcador(
  event: { startsAt: string; resultClosedAt?: string | null },
  now = Date.now(),
): EstadoMarcador {
  if (event.resultClosedAt) return "final";
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start) || start > now) return "espera";
  if (now - start >= JUEGO_TOPE_MS) return "oficial";
  return "juego";
}

export function vivoPointerAllows(existingCode: string | null, requestedCode: string, closed = false): boolean {
  if (closed) return false;
  if (!existingCode) return true;
  return existingCode === requestedCode;
}

/** Una marca de hora futura no cuenta: si no, el celular adelantado traba al DT. */
export function instanteConfiable(value: string | null | undefined, now = Date.now()): number {
  const time = Date.parse(value ?? "");
  if (!Number.isFinite(time) || time > now + FUTURO_MS) return 0;
  return time;
}

export function sellarInstante(value: string | undefined, now = Date.now()): string | undefined {
  if (!value) return value;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now + FUTURO_MS) return new Date(now).toISOString();
  return value;
}

export function sellarEvento<T extends ClubEvent>(event: T, now = Date.now()): T {
  const liveUpdatedAt = sellarInstante(event.liveUpdatedAt, now);
  const fechaUpdatedAt = sellarInstante(event.fechaUpdatedAt, now);
  const resultUpdatedAt = sellarInstante(event.resultUpdatedAt, now);
  if (
    liveUpdatedAt === event.liveUpdatedAt &&
    fechaUpdatedAt === event.fechaUpdatedAt &&
    resultUpdatedAt === event.resultUpdatedAt
  ) {
    return event;
  }
  return { ...event, liveUpdatedAt, fechaUpdatedAt, resultUpdatedAt };
}

/** El plantel marca solo mientras el partido está en juego: desde el saque y por 3 h. */
export function partidoMarcable(startsAt: string, resultClosedAt?: string | null, now = Date.now()): boolean {
  if (resultClosedAt) return false;
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start) || start > now) return false;
  return now - start < JUEGO_TOPE_MS;
}

export function sanitizeLiveToken(value: unknown): string {
  const token = String(value ?? "");
  return /^[a-f0-9]{32}$/.test(token) ? token : "";
}

export function vivoAttemptKey(bucket: string | null | undefined, token = ""): string {
  const raw = String(bucket ?? "").trim();
  const ip = raw.startsWith("peek:") ? raw.slice(5) : raw;
  const safeIp = ip.replace(/[^a-zA-Z0-9.:_-]/g, "").slice(0, 64) || "comun";
  const safeToken = sanitizeLiveToken(token) || "sueltos";
  return `vivo:${safeIp}:${safeToken}`;
}

export function vivoBotKey(token: string): string {
  return `vivo-bot:${sanitizeLiveToken(token) || "sueltos"}`;
}

export function vivoReactKey(bucket: string | null | undefined, token: string): string {
  const raw = String(bucket ?? "").trim();
  const ip = raw.startsWith("peek:") ? raw.slice(5) : raw;
  const safeIp = ip.replace(/[^a-zA-Z0-9.:_-]/g, "").slice(0, 64) || "comun";
  const safeToken = token.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80) || "x";
  return `vivo-re:${safeIp}:${safeToken}`;
}

export function vivoReadLimited(count: number, limit = VIVO_READ_LIMIT): boolean {
  return count > limit;
}

export function registraIntento(rechazado: boolean): boolean {
  return rechazado;
}

export function esCrawler(ua: string | null | undefined): boolean {
  return /whatsapp|facebookexternalhit|facebot|telegrambot/i.test(String(ua ?? ""));
}

export function debeLimpiar(ultimo: number, ahora: number, cada = 60 * 60 * 1000): boolean {
  return ahora - ultimo >= cada;
}

export function punteroHuerfano(
  token: string,
  event: { liveToken?: string | null; kind?: string } | null,
  closed = false,
): boolean {
  if (closed) return false;
  if (!event || event.kind !== "partido") return true;
  return event.liveToken !== token;
}

export type CacheVivo<T> = Map<string, { at: number; value: T }>;

export function tomarCache<T>(cache: CacheVivo<T>, key: string, now: number, ttl = VIVO_CACHE_MS): T | null {
  const row = cache.get(key);
  if (!row) return null;
  if (now - row.at >= ttl) {
    cache.delete(key);
    return null;
  }
  return row.value;
}

export function guardarCache<T>(cache: CacheVivo<T>, key: string, value: T, now: number): void {
  cache.set(key, { at: now, value });
}

export function invalidarCache<T>(cache: CacheVivo<T>, key: string): void {
  cache.delete(key);
}

export function intervaloVivo(input: {
  estado: EstadoMarcador | "limited";
  ahora: number;
  cerrado?: string | null;
  figuraLista: boolean;
  intentoLimited?: number;
  cerca?: boolean;
}): number {
  if (input.estado === "limited") {
    const n = Math.max(1, input.intentoLimited ?? 1);
    return Math.min(POLL_FINAL, 15_000 * 2 ** (n - 1));
  }
  if (input.estado === "espera" && input.cerca) return POLL_JUEGO;
  if (input.estado === "espera" || input.estado === "oficial") return POLL_ESPERA;
  if (input.estado === "juego") return POLL_JUEGO;
  if (input.figuraLista) return 0;
  const closed = Date.parse(input.cerrado ?? "");
  if (Number.isFinite(closed) && input.ahora - closed > FINAL_VENTANA_MS) return 0;
  return POLL_FINAL;
}

/** Sin dato de edad y sin cuenta: se trata como menor en el link público. */
export function esMenorEnVivo(person: { menor?: boolean; accountId?: string | null }): boolean {
  if (person.menor === true) return true;
  if (person.menor === false) return false;
  return !person.accountId;
}

export function apodoPublico(person: PersonaVivo, grupo: PersonaVivo[] = [], puesto = ""): string {
  const nick = (person.nick || "").trim().slice(0, 22) || "Jugador";
  const mismo = grupo.filter((item) => (item.nick || "").trim() === (person.nick || "").trim());
  if (person.number == null && mismo.length > 1 && puesto) return `${nick} · ${puesto}`.slice(0, 28);
  return nick;
}

export type DocFamilia = { por: ConteosFamilia; marcas: string[] };

export function aplicarReaccionFamiliar(
  doc: DocFamilia | null,
  hash: string,
  tipo: keyof ConteosFamilia,
): DocFamilia & { nueva: boolean } {
  const por = {
    pelota: doc?.por.pelota ?? 0,
    aplauso: doc?.por.aplauso ?? 0,
    fuego: doc?.por.fuego ?? 0,
  };
  const marcas = Array.isArray(doc?.marcas) ? doc.marcas.slice(-300) : [];
  const clave = `${hash}:${tipo}`;
  if (!hash || marcas.includes(clave)) return { por, marcas, nueva: false };
  por[tipo] += 1;
  return { por, marcas: [...marcas, clave].slice(-300), nueva: true };
}

export function reaccionId(modo: "partido" | "equipo", token: string, eventId: string): string {
  if (modo === "partido") return sanitizeLiveToken(token);
  const id = eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const limpio = sanitizeLiveToken(token);
  return limpio && id ? `eq:${limpio}:${id}` : "";
}

export function armarFormacionPublica(
  slots: { key: string; label: string; x: number; y: number }[],
  lineup: Record<string, string> | undefined,
  suplentes: string[] | undefined,
  people: PersonaVivo[],
  published: boolean,
): { titulares: PuestoPublico[]; banco: string[] } {
  if (!published) return { titulares: [], banco: [] };
  const publishedPeople = people.filter((person) => person.menor === true || !esMenorEnVivo(person));
  const byId = new Map(publishedPeople.map((person) => [person.id, person]));
  const titulares: PuestoPublico[] = [];
  for (const slot of slots) {
    const person = byId.get(lineup?.[slot.key] ?? "");
    if (!person) continue;
    const puesto = slot.label.slice(0, 8);
    titulares.push({
      puesto,
      nick: apodoPublico(person, publishedPeople, puesto),
      numero: person.number != null ? String(person.number) : "",
      x: slot.x,
      y: slot.y,
    });
  }
  const enCancha = new Set(Object.values(lineup ?? {}));
  const banco = (suplentes ?? [])
    .filter((id) => !enCancha.has(id))
    .map((id) => byId.get(id))
    .filter((person): person is PersonaVivo => Boolean(person))
    .map((person) => {
      const nick = apodoPublico(person, publishedPeople);
      return person.number != null ? `${person.number} ${nick}` : nick;
    });
  return { titulares, banco };
}

export function nombreRival(title: string, opponent?: string): string {
  const dePlanilla = (opponent ?? "").trim();
  const titulo = title.trim();
  if (dePlanilla && dePlanilla.toLowerCase() !== titulo.toLowerCase()) return dePlanilla.slice(0, 40);
  return titulo.replace(/^vs\.?\s+/i, "").trim().slice(0, 40) || "Rival";
}

export function inicialesDe(nombre: string): string {
  const limpio = nombre.replace(/^vs\.?\s+/i, "").trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "VS";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] ?? ""}${partes[1][0] ?? ""}`.toUpperCase();
}

export function linkMapa(
  place: string,
  mapsQuery?: string,
  lat?: number | null,
  lng?: number | null,
): string {
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  const q = (mapsQuery || place || "").trim();
  if (!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function horaCorta(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).format(date);
}

export function textoArranca(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "Horario a confirmar";
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: TZ })
    .format(date)
    .replace(".", "");
  return `Arranca ${dia} ${horaCorta(startsAt)}`;
}

export function textoFalta(startsAt: string, now = Date.now()): string {
  const ms = Date.parse(startsAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return "Ya arranca";
  const min = Math.round(ms / 60_000);
  if (min < 60) return min <= 1 ? "Falta 1 min" : `Faltan ${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 48) {
    if (!rest) return h === 1 ? "Falta 1 h" : `Faltan ${h} h`;
    return `Faltan ${h} h ${rest} min`;
  }
  const dias = Math.round(h / 24);
  return dias === 1 ? "Falta 1 día" : `Faltan ${dias} días`;
}

export function textoResultado(gf: number, gc: number): string {
  if (gf > gc) return `Terminó: ganamos ${gf}–${gc}`;
  if (gf < gc) return `Terminó: perdimos ${gf}–${gc}`;
  return `Terminó: empatamos ${gf}–${gc}`;
}

export function textoSeguilo(url: string): string {
  return `Seguilo acá ⚽ ${url}`;
}

export function textoCompartirResultado(gf: number, gc: number, url: string): string {
  return `${textoResultado(gf, gc)} ⚽ Seguilo acá: ${url}`;
}

export function textoActualizado(iso: string | null, now = Date.now()): string {
  if (!iso) return "Actualizado recién";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 45_000) return "Actualizado recién";
  const min = Math.round(ms / 60_000);
  if (min <= 1) return "Actualizado hace 1 min";
  if (min < 60) return `Actualizado hace ${min} min`;
  const h = Math.round(min / 60);
  return h <= 1 ? "Actualizado hace 1 h" : `Actualizado hace ${h} h`;
}

export function diaVolver(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "más tarde";
  const dia = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).format(date);
  return dia;
}

function diaBa(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function fechaCorta(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: TZ }).format(date);
}

export function textoCuando(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: TZ }).format(date);
  return `${dia} ${horaCorta(startsAt)}`;
}

export function minutoAproximado(log: MarcaVivo[], at: string): number | null {
  const inicio = log.find((item) => item.kind === "inicio");
  if (!inicio) return null;
  const t = Date.parse(at);
  const t0 = Date.parse(inicio.at);
  if (!Number.isFinite(t) || !Number.isFinite(t0) || t < t0) return null;
  const entretiempo = log.find((item) => item.kind === "entretiempo");
  const segundo = log.find((item) => item.kind === "segundo");
  const corte = entretiempo ? Date.parse(entretiempo.at) : Number.NaN;
  const reanuda = segundo ? Date.parse(segundo.at) : Number.NaN;
  if (Number.isFinite(corte) && Number.isFinite(reanuda) && t >= reanuda) {
    const primero = Math.max(0, corte - t0);
    const segundoTiempo = Math.max(0, t - reanuda);
    return Math.round((primero + segundoTiempo) / 60_000);
  }
  if (Number.isFinite(corte) && t >= corte) return Math.round(Math.max(0, corte - t0) / 60_000);
  return Math.round((t - t0) / 60_000);
}

export function marcaTiempo(log: MarcaVivo[], at: string): string {
  const minuto = minutoAproximado(log, at);
  if (minuto != null) return `${minuto}'`;
  return horaCorta(at);
}

function textoLinea(marca: MarcaVivo, people: PersonaVivo[], club: string, rival: string): string | null {
  if (marca.kind === "inicio" || marca.kind === "entretiempo" || marca.kind === "segundo") return null;
  if (marca.kind === "gol-rival") return `Gol de ${rival}`;
  const person = people.find((item) => item.id === marca.memberId);
  const oculto = !person || esMenorEnVivo(person);
  if (marca.kind === "gol") return oculto ? `Gol de ${club}` : `Gol de ${apodoPublico(person, people)}`;
  if (marca.kind === "tarjeta") {
    const color = marca.card === "roja" ? "Roja" : "Amarilla";
    return oculto ? `${color} para ${club}` : `${color} para ${apodoPublico(person, people)}`;
  }
  return null;
}

/** Falta una hora o menos para el saque. El mismo link ya muestra el en vivo. */
export function cercaDelSaque(startsAt: string, now = Date.now()): boolean {
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start)) return false;
  const falta = start - now;
  return falta > 0 && falta <= ANTES_EN_VIVO_MS;
}

export function elegirPartidoEquipo<T extends { id: string; kind: string; startsAt: string; resultClosedAt?: string | null }>(
  events: T[],
  now = Date.now(),
): T | null {
  const partidos = events.filter((event) => event.kind === "partido");
  const enJuego = partidos
    .filter((event) => estadoMarcador(event, now) === "juego")
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const finalReciente = partidos
    .filter((event) => {
      const closed = Date.parse(event.resultClosedAt ?? "");
      return Number.isFinite(closed) && now >= closed && now - closed <= FINAL_RECIEN_MS;
    })
    .sort((a, b) => Date.parse(b.resultClosedAt ?? "") - Date.parse(a.resultClosedAt ?? ""))[0];
  if (enJuego.length > 0 && finalReciente) {
    const cierre = Date.parse(finalReciente.resultClosedAt ?? "");
    const arrancoDespues = enJuego.some((event) => Date.parse(event.startsAt) >= cierre);
    if (!arrancoDespues) return finalReciente;
    return enJuego[0];
  }
  if (enJuego[0]) return enJuego[0];
  const cerca = partidos
    .filter((event) => !event.resultClosedAt && cercaDelSaque(event.startsAt, now))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  if (cerca[0]) return cerca[0];
  const recientes = partidos
    .filter((event) => {
      const closed = Date.parse(event.resultClosedAt ?? "");
      return Number.isFinite(closed) && now >= closed && now - closed <= FINAL_VENTANA_MS;
    })
    .sort((a, b) => Date.parse(b.resultClosedAt ?? "") - Date.parse(a.resultClosedAt ?? ""));
  if (recientes[0]) return recientes[0];
  const proximos = partidos
    .filter((event) => Date.parse(event.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return proximos[0] ?? null;
}

/** El link que se apagó no vuelve con una copia vieja. Sin hora, no se apaga ni se revive. */
export function elegirTokenEquipo(
  existing: { teamLiveToken?: string | null; teamLiveAt?: string | null },
  incoming: { teamLiveToken?: string | null; teamLiveAt?: string | null },
  now = Date.now(),
): { teamLiveToken: string | null; teamLiveAt?: string } {
  const prevAt = instanteConfiable(existing.teamLiveAt ?? undefined, now);
  const nextAt = instanteConfiable(incoming.teamLiveAt ?? undefined, now);
  const prev = sanitizeLiveToken(existing.teamLiveToken ?? "") || null;
  const next = sanitizeLiveToken(incoming.teamLiveToken ?? "") || null;
  if (nextAt > prevAt) return { teamLiveToken: next, teamLiveAt: new Date(nextAt).toISOString() };
  if (prevAt > nextAt) return { teamLiveToken: prev, teamLiveAt: existing.teamLiveAt ?? new Date(prevAt).toISOString() };
  if (!prev && next) return { teamLiveToken: next, teamLiveAt: new Date(now).toISOString() };
  return { teamLiveToken: prev, teamLiveAt: existing.teamLiveAt ?? undefined };
}

/** En un empate de hora, un partido cerrado no se vuelve a abrir. */
export function elegirResultado<T extends { resultClosedAt?: string | null; resultPending?: boolean; resultUpdatedAt?: string }>(
  previous: T,
  incoming: T,
  now = Date.now(),
): T {
  const prevTime = instanteConfiable(previous.resultUpdatedAt, now);
  const nextTime = instanteConfiable(incoming.resultUpdatedAt, now);
  if (nextTime > prevTime) return incoming;
  if (nextTime < prevTime) return previous;
  if (previous.resultClosedAt && !incoming.resultClosedAt) return previous;
  if (incoming.resultClosedAt || incoming.resultPending) return incoming;
  return previous;
}

export function ultimosResultados(
  events: ClubEvent[],
  sheets: MatchSheet[],
  now = Date.now(),
  salvoId = "",
): ResultadoCorto[] {
  const rows: { at: number; row: ResultadoCorto }[] = [];
  for (const event of events) {
    if (event.kind !== "partido" || !event.resultClosedAt || event.id === salvoId) continue;
    if (Date.parse(event.startsAt) > now) continue;
    const sheet = sheets.find((item) => item.eventId === event.id);
    if (!sheet) continue;
    rows.push({
      at: Date.parse(event.startsAt),
      row: {
        rival: nombreRival(event.title, sheet.opponent),
        fecha: fechaCorta(event.startsAt),
        gf: sheet.goalsFor,
        gc: sheet.goalsAgainst,
      },
    });
  }
  return rows
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)
    .map((item) => item.row);
}

export function proximoPartido(
  events: ClubEvent[],
  now = Date.now(),
  salvoId = "",
): { cuando: string; rival: string } | null {
  const next = events
    .filter((event) => event.kind === "partido" && event.id !== salvoId && Date.parse(event.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  if (!next) return null;
  return { cuando: textoCuando(next.startsAt), rival: nombreRival(next.title) };
}

function figuraPublica(
  event: ClubEvent,
  people: PersonaVivo[],
  votes: FiguraVote[],
  sheets: MatchSheet[],
  events: ClubEvent[],
  clubName: string,
  now: number,
): FiguraPublica {
  const hasta = new Date(Date.parse(event.resultClosedAt || event.startsAt) + FIGURA_CIERRE_HORAS * 3_600_000).toISOString();
  if (votacionAbierta(event, now)) return { estado: "abierta", hasta };
  const club = { id: "publico", name: clubName, createdBy: "", inviteCode: "", crest: null } satisfies Club;
  const members = people.map((person) => ({
    id: person.id,
    name: "",
    nick: esMenorEnVivo(person) ? "" : person.nick,
    role: "jugador" as const,
    number: person.number,
    menor: esMenorEnVivo(person),
    accountId: person.accountId,
  }));
  const ctx: ContextoPremios = {
    members,
    events,
    sheets,
    votes,
    club,
    now,
  };
  if (estadoFigura(event, votes, now) !== "cerrada") return { estado: "sin" };
  let premios: ReturnType<typeof premiosDelPartido> = [];
  try {
    premios = premiosDelPartido(event.id, ctx).filter((item) => item.tipo === "figura");
  } catch {
    return { estado: "sin" };
  }
  const apodos = premios
    .map((premio) => {
      const person = people.find((item) => item.id === premio.memberId);
      if (!person || esMenorEnVivo(person)) return "";
      try {
        const card = datosCard(premio, ctx);
        if (!card.nombre.trim()) return "";
      } catch {
        return "";
      }
      const nick = (person.nick || "").trim();
      return (nick || "Jugador").slice(0, 22);
    })
    .filter(Boolean);
  if (premios.length > 0 && apodos.length === 0) return { estado: "oculta" };
  if (apodos.length === 0) return { estado: "sin" };
  return { estado: "lista", apodo: apodos.join(" y ") };
}

function fotoDe(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith("data:image/") || valor.length < 16 || valor.length > 170_000) return null;
  return valor;
}

function nombreEnCard(person: PersonaVivo): string {
  if (person.menor === true) return (person.nick || "").trim().slice(0, 24);
  return ((person.name || "").trim() || (person.nick || "").trim()).slice(0, 24);
}

function cardDelPartido(
  event: ClubEvent,
  people: PersonaVivo[],
  club: string,
  sheet: MatchSheet | null,
): DatosAlineacion | null {
  if (!event.lineupPublishedAt) return null;
  const visibles = people.filter((person) => person.menor === true || !esMenorEnVivo(person));
  try {
    const datos = armarAlineacion({
      formato: "whatsapp",
      event: {
        title: event.title,
        place: event.place,
        startsAt: event.startsAt,
        modality: event.modality,
        convocados: event.convocados,
        suplentes: event.suplentes,
        formacion: event.formacion,
      },
      plan: { id: "a", lineup: event.lineup ?? {}, formacion: event.formacion },
      members: visibles.map((person) => {
        const menor = person.menor === true;
        return {
          id: person.id,
          nick: nombreEnCard(person),
          role: person.role,
          number: person.number,
          menor,
          juega: person.juega,
          photo: menor ? null : fotoDe(person.photo),
        };
      }),
      club: { name: club },
      sheet,
      conFotos: true,
      tema: "neon",
    });
    if (datos.titulares.length === 0 && datos.dt.length === 0) return null;
    return { ...datos, escudo: null };
  } catch {
    return null;
  }
}

export function marcadorDeDatos(input: {
  modo: "partido" | "equipo";
  clubName: string;
  crest: string | null;
  event: ClubEvent | null;
  sheet: MatchSheet | null;
  slots: { key: string; label: string; x: number; y: number }[];
  people: PersonaVivo[];
  votes: FiguraVote[];
  events: ClubEvent[];
  sheets: MatchSheet[];
  familia: ConteosFamilia;
  now?: number;
  sponsors?: Sponsor[];
  token: string;
}): MarcadorPublico {
  const now = input.now ?? Date.now();
  const gente = input.people;
  const people = gente.map((person) => ({ ...person, name: "" }));
  const event = input.event && input.event.kind === "partido" ? input.event : null;
  const resultados = input.modo === "equipo" ? ultimosResultados(input.events, input.sheets, now, event?.id ?? "") : [];
  const proximo = input.modo === "equipo" ? proximoPartido(input.events, now, event?.id ?? "") : null;
  const sponsors = sponsorsVisibles(input.sponsors).map((item) => ({
    nombre: item.nombre,
    logoUrl: item.logoUrl,
    link: item.link,
  }));
  if (!event) {
    if (input.modo !== "equipo" || !input.clubName) return { ok: false, reason: "missing" };
    return {
      ok: true,
      modo: "equipo",
      sinPartido: true,
      club: input.clubName.slice(0, 80),
      rival: "",
      title: "Sin partido",
      place: "",
      maps: "",
      startsAt: new Date(now).toISOString(),
      goalsFor: 0,
      goalsAgainst: 0,
      estado: "espera",
      titulares: [],
      banco: [],
      familia: input.familia,
      actualizado: null,
      cerrado: null,
      lineas: [],
      goleadores: [],
      figura: { estado: "sin" },
      resultados,
      proximo,
      escudo: Boolean(input.crest?.startsWith("data:image/")),
      reaccion: "",
      sponsors,
      card: null,
    };
  }
  const rival = nombreRival(event.title, input.sheet?.opponent);
  const club = input.clubName.slice(0, 80) || "Equipo";
  const formacion = armarFormacionPublica(
    input.slots,
    event.lineup,
    event.suplentes,
    people,
    Boolean(event.lineupPublishedAt),
  );
  const log = event.liveLog ?? [];
  const lineas = log
    .map((marca) => {
      const texto = textoLinea(marca, people, club, rival);
      if (!texto) return null;
      const kind = marca.kind === "tarjeta" ? (marca.card === "roja" ? "roja" : "amarilla") : marca.kind;
      if (kind !== "gol" && kind !== "gol-rival" && kind !== "amarilla" && kind !== "roja") return null;
      return { id: marca.id, kind, texto, marca: marcaTiempo(log, marca.at) };
    })
    .filter((item): item is LineaPublica => Boolean(item));
  const goleadores = (input.sheet?.players ?? [])
    .filter((row) => row.goals > 0)
    .map((row) => people.find((person) => person.id === row.memberId))
    .filter((person): person is PersonaVivo => Boolean(person))
    .filter((person) => !esMenorEnVivo(person))
    .map((person) => apodoPublico(person, people));
  return {
    ok: true,
    modo: input.modo,
    sinPartido: false,
    club,
    rival,
    title: event.title.slice(0, 80),
    place: (event.place || "").slice(0, 80),
    maps: linkMapa(event.place, event.mapsQuery, event.lat, event.lng),
    startsAt: event.startsAt,
    goalsFor: input.sheet?.goalsFor ?? 0,
    goalsAgainst: input.sheet?.goalsAgainst ?? 0,
    estado: estadoMarcador(event, now),
    titulares: formacion.titulares,
    banco: formacion.banco,
    familia: input.familia,
    actualizado: event.liveUpdatedAt ?? null,
    cerrado: event.resultClosedAt ?? null,
    lineas,
    goleadores,
    figura: figuraPublica(event, people, input.votes, input.sheets, input.events, club, now),
    resultados,
    proximo,
    escudo: Boolean(input.crest?.startsWith("data:image/")),
    reaccion: reaccionId(input.modo, input.token, event.id),
    sponsors,
    card: cardDelPartido(event, gente, club, input.sheet),
  };
}

const MARCAS_VIVO = new Set<MarcaVivo["kind"]>(["gol", "gol-rival", "tarjeta", "inicio", "entretiempo", "segundo"]);

function marcaVivaValida(marca: MarcaVivo, roster: Set<string>): boolean {
  if (!marca || typeof marca.id !== "string" || !/^[A-Za-z0-9_-]{4,40}$/.test(marca.id)) return false;
  if (!MARCAS_VIVO.has(marca.kind)) return false;
  if (!Number.isFinite(Date.parse(marca.at ?? ""))) return false;
  if ((marca.kind === "gol" || marca.kind === "tarjeta") && (!marca.memberId || !roster.has(marca.memberId))) return false;
  if (marca.kind === "tarjeta" && marca.card !== "amarilla" && marca.card !== "roja") return false;
  return true;
}

function marcaLimpia(marca: MarcaVivo): MarcaVivo {
  const limpia: MarcaVivo = { id: marca.id, kind: marca.kind, at: marca.at.slice(0, 40) };
  if ((marca.kind === "gol" || marca.kind === "tarjeta") && marca.memberId) limpia.memberId = marca.memberId;
  if (marca.kind === "tarjeta") limpia.card = marca.card === "roja" ? "roja" : "amarilla";
  return limpia;
}

/** El plantel puede sumar una marca o deshacer la última. No reescribe el resto. */
export function combinarMarcasVivo(
  base: MarcaVivo[],
  pedido: MarcaVivo[] | undefined,
  roster: Set<string>,
  deshacer = true,
): MarcaVivo[] {
  if (!Array.isArray(pedido)) return base;
  const validas = pedido.filter((marca) => marcaVivaValida(marca, roster));
  if (
    deshacer &&
    base.length > 0 &&
    pedido.length === base.length - 1 &&
    base.slice(0, -1).every((marca, index) => pedido[index]?.id === marca.id)
  ) {
    return base.slice(0, -1);
  }
  const ids = new Set(base.map((marca) => marca.id));
  const nuevas = validas.filter((marca) => !ids.has(marca.id)).slice(0, 8).map(marcaLimpia);
  if (nuevas.length === 0) return base;
  return [...base, ...nuevas].slice(-40);
}

/** Junta las marcas de los dos celulares. No reemplaza el registro entero. */
export function unirLogsVivo(
  previous: MarcaVivo[] | undefined,
  incoming: MarcaVivo[] | undefined,
  prevLiveAt: string | undefined,
  nextLiveAt: string | undefined,
  now = Date.now(),
): MarcaVivo[] {
  const base = previous ?? [];
  if (!Array.isArray(incoming)) return base;
  const pedido = incoming;
  const roster = new Set<string>();
  for (const marca of [...base, ...pedido]) {
    if (marca?.memberId) roster.add(marca.memberId);
  }
  const deshacer = instanteConfiable(nextLiveAt, now) > instanteConfiable(prevLiveAt, now);
  return combinarMarcasVivo(base, pedido, roster, deshacer);
}

function ajustarPlanilla(sheet: MatchSheet, marca: MarcaVivo, signo: 1 | -1, ahora: string): MatchSheet {
  const players = sheet.players.map((row) => ({ ...row }));
  let goalsFor = sheet.goalsFor;
  let goalsAgainst = sheet.goalsAgainst;
  if (marca.kind === "gol" && marca.memberId) {
    goalsFor = clampStat(goalsFor + signo);
    const row = players.find((item) => item.memberId === marca.memberId) ?? emptyStat(marca.memberId);
    row.goals = clampStat(row.goals + signo);
    if (!players.some((item) => item.memberId === marca.memberId)) players.push(row);
  }
  if (marca.kind === "gol-rival") goalsAgainst = clampStat(goalsAgainst + signo);
  if (marca.kind === "tarjeta" && marca.memberId) {
    const row = players.find((item) => item.memberId === marca.memberId) ?? emptyStat(marca.memberId);
    if (marca.card === "roja") row.red = clampStat(row.red + signo);
    else row.yellow = clampStat(row.yellow + signo);
    if (!players.some((item) => item.memberId === marca.memberId)) players.push(row);
  }
  return {
    ...sheet,
    goalsFor,
    goalsAgainst,
    players: players.filter((row) => row.goals > 0 || row.assists > 0 || row.yellow > 0 || row.red > 0),
    recordedAt: ahora,
  };
}

export function aplicarMarcasDeJugador<T extends ClubEvent>(
  base: T[],
  incoming: ClubEvent[],
  members: { id: string }[],
  now = Date.now(),
): T[] {
  const roster = new Set(members.map((person) => person.id));
  const map = new Map(incoming.map((event) => [event.id, event]));
  return base.map((event) => {
    if (event.kind !== "partido" || !partidoMarcable(event.startsAt, event.resultClosedAt, now)) return event;
    const pedido = map.get(event.id);
    if (!pedido) return event;
    const pedidoAt = instanteConfiable(pedido.liveUpdatedAt, now);
    const baseAt = instanteConfiable(event.liveUpdatedAt, now);
    const deshacer = pedidoAt > baseAt;
    const liveLog = combinarMarcasVivo(event.liveLog ?? [], pedido.liveLog, roster, deshacer);
    const igual =
      liveLog.length === (event.liveLog ?? []).length &&
      liveLog.every((marca, index) => marca.id === event.liveLog?.[index]?.id);
    if (igual) return event;
    const ahora = new Date(now).toISOString();
    return { ...event, liveLog, liveUpdatedAt: ahora, fechaUpdatedAt: ahora, resultPending: true, resultUpdatedAt: ahora };
  });
}

export function planillasDeMarcas(sheets: MatchSheet[], antes: ClubEvent[], despues: ClubEvent[], now = Date.now()): MatchSheet[] {
  const map = new Map(sheets.map((sheet) => [sheet.eventId, sheet]));
  const previo = new Map(antes.map((event) => [event.id, event.liveLog ?? []]));
  const ahora = new Date(now).toISOString();
  for (const event of despues) {
    const base = previo.get(event.id) ?? [];
    const live = event.liveLog ?? [];
    if (live.length === base.length && live.every((marca, index) => marca.id === base[index]?.id)) continue;
    let sheet = map.get(event.id);
    if (live.length === base.length - 1 && base.slice(0, -1).every((marca, index) => marca.id === live[index]?.id)) {
      if (!sheet) continue;
      map.set(event.id, ajustarPlanilla(sheet, base[base.length - 1], -1, ahora));
      continue;
    }
    const ids = new Set(base.map((marca) => marca.id));
    const nuevas = live.filter((marca) => !ids.has(marca.id));
    if (nuevas.length === 0) continue;
    if (!sheet) {
      sheet = {
        eventId: event.id,
        opponent: (event.title || "Rival").slice(0, 80),
        goalsFor: 0,
        goalsAgainst: 0,
        notes: "",
        recordedAt: ahora,
        players: [],
      };
    }
    for (const marca of nuevas) sheet = ajustarPlanilla(sheet, marca, 1, ahora);
    map.set(event.id, sheet);
  }
  return [...map.values()];
}

function imagenSinBytes(imagen: FichaTitular["imagen"]): FichaTitular["imagen"] {
  if (imagen?.tipo === "foto") return { tipo: "foto", src: "" };
  return imagen;
}

function fichaSinBytes<T extends { imagen: FichaBanco["imagen"] }>(ficha: T): T {
  return { ...ficha, imagen: imagenSinBytes(ficha.imagen) };
}

/** El poll siguiente no vuelve a bajar las fotos. El celular reusa las que ya tiene. */
export function marcadorSinFotos(marcador: MarcadorPublico): MarcadorPublico {
  if (!marcador.ok || !marcador.card) return marcador;
  const card = marcador.card;
  return {
    ...marcador,
    card: {
      ...card,
      titulares: card.titulares.map(fichaSinBytes),
      banco: card.banco.map(fichaSinBytes),
      dt: card.dt.map(fichaSinBytes),
    },
  };
}

function reponerFoto<T extends { imagen: FichaTitular["imagen"]; nombre: string; numero?: number | null }>(
  ficha: T,
  previa: T | undefined,
): { ficha: T; falta: boolean } {
  if (ficha.imagen?.tipo !== "foto" || ficha.imagen.src) return { ficha, falta: false };
  const misma = previa && previa.nombre === ficha.nombre && previa.numero === ficha.numero;
  const src = misma && previa.imagen?.tipo === "foto" ? previa.imagen.src : "";
  if (!src) return { ficha, falta: true };
  return { ficha: { ...ficha, imagen: { tipo: "foto", src } }, falta: false };
}

/** Pega las fotos ya descargadas sobre un marcador liviano. `falta` pide una bajada completa. */
export function conservarFotos(
  nueva: DatosAlineacion,
  anterior: DatosAlineacion | null,
): { card: DatosAlineacion; falta: boolean } {
  let falta = false;
  const titulares = nueva.titulares.map((ficha) => {
    const puesta = reponerFoto(ficha, anterior?.titulares.find((item) => item.key === ficha.key));
    falta = falta || puesta.falta;
    return puesta.ficha;
  });
  const banco = nueva.banco.map((ficha) => {
    const puesta = reponerFoto(ficha, anterior?.banco.find((item) => item.id === ficha.id));
    falta = falta || puesta.falta;
    return puesta.ficha;
  });
  const dt = nueva.dt.map((ficha) => {
    const puesta = reponerFoto(ficha, anterior?.dt.find((item) => item.id === ficha.id));
    falta = falta || puesta.falta;
    return puesta.ficha;
  });
  return { card: { ...nueva, titulares, banco, dt }, falta };
}

export function tituloCompartido(
  m: Pick<MarcadorOk, "estado" | "club" | "rival" | "startsAt" | "goalsFor" | "goalsAgainst">,
  now = Date.now(),
): string {
  if (m.estado === "juego") return `En juego · ${m.club} ${m.goalsFor}–${m.goalsAgainst} ${m.rival}`.slice(0, 90);
  if (m.estado === "final") {
    const frase =
      m.goalsFor > m.goalsAgainst
        ? `Ganamos ${m.goalsFor}–${m.goalsAgainst}`
        : m.goalsFor < m.goalsAgainst
          ? `Perdimos ${m.goalsFor}–${m.goalsAgainst}`
          : `Empatamos ${m.goalsFor}–${m.goalsAgainst}`;
    return `Terminó · ${frase}`;
  }
  if (m.estado === "oficial") return `Terminó · ${m.club} vs ${m.rival}`.slice(0, 90);
  const hoy = diaBa(m.startsAt) === diaBa(new Date(now).toISOString());
  const cuando = hoy ? `Hoy ${horaCorta(m.startsAt)}` : textoArranca(m.startsAt).replace("Arranca ", "");
  return `${cuando} · ${m.club} vs ${m.rival}`.slice(0, 90);
}

export function descripcionCompartida(): string {
  return "Resultado y formación, con fotos y nombres.";
}

export function escaparXml(value: string): string {
  return value
    .replaceAll("&", "\u0026amp;")
    .replaceAll("<", "\u0026lt;")
    .replaceAll(">", "\u0026gt;")
    .replaceAll('"', "\u0026quot;");
}

export function cspVivo(): string {
  return [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/**
 * El menor lo decide el perfil más nuevo del DT.
 * Si el que llega no es el más nuevo, queda el valor que ya estaba.
 * Si no viene el dato, tampoco se borra.
 */
export function menorAlGuardar(
  anterior: boolean | undefined,
  pedido: boolean | undefined,
  pedidoGana = false,
): boolean | undefined {
  if (pedidoGana && typeof pedido === "boolean") return pedido;
  if (typeof anterior === "boolean") return anterior;
  return pedidoGana ? pedido : anterior;
}
