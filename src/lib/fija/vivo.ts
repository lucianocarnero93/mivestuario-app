import { datosCard, estadoFigura, premiosDelPartido, type ContextoPremios } from "./premios.ts";
import { votacionAbierta, FIGURA_CIERRE_HORAS } from "./figura.ts";
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
};

export type MarcadorPublico = MarcadorOk | { ok: false; reason: "missing" | "limited" };

export const VIVO_READ_LIMIT = 2000;
export const VIVO_BOT_LIMIT = 240;
export const VIVO_REACT_LIMIT = 60;
export const VIVO_CACHE_MS = 5_000;
export const VIVO_OG_CACHE_MS = 60_000;
export const JUEGO_TOPE_MS = 3 * 60 * 60 * 1000;
export const FINAL_VENTANA_MS = 48 * 60 * 60 * 1000;
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

export function vivoPointerAllows(existingCode: string | null, requestedCode: string): boolean {
  if (!existingCode) return true;
  return existingCode === requestedCode;
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
): boolean {
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
}): number {
  if (input.estado === "limited") {
    const n = Math.max(1, input.intentoLimited ?? 1);
    return Math.min(POLL_FINAL, 15_000 * 2 ** (n - 1));
  }
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
  const publishedPeople = people.filter((person) => !esMenorEnVivo(person));
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

export function elegirPartidoEquipo<T extends { id: string; kind: string; startsAt: string; resultClosedAt?: string | null }>(
  events: T[],
  now = Date.now(),
): T | null {
  const partidos = events.filter((event) => event.kind === "partido");
  const enJuego = partidos
    .filter((event) => estadoMarcador(event, now) === "juego")
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  if (enJuego[0]) return enJuego[0];
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
  const people = input.people.map((person) => ({ ...person, name: "" }));
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
  };
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
  return "Resultado y formación con apodos. Sin fotos ni nombres.";
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

export function menorAlGuardar(anterior: boolean | undefined, pedido: boolean | undefined): boolean | undefined {
  if (anterior === true || pedido === true) return true;
  if (pedido === false) return false;
  return anterior;
}
