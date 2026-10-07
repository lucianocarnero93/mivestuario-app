import type { ClubEvent, Encuesta, MatchSheet, ReaccionFecha, Rsvp } from "./types.ts";

const HORA = 3_600_000;
const EN_JUEGO_HORAS = 3;

export function estaJugado(event: ClubEvent, _sheet?: MatchSheet): boolean {
  return event.kind === "partido" && Boolean(event.resultClosedAt);
}

export function enJuego(event: ClubEvent, now = Date.now()): boolean {
  if (event.kind !== "partido" || event.resultClosedAt) return false;
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start) || start > now) return false;
  return now - start <= EN_JUEGO_HORAS * HORA;
}

export function fechaVisible(
  events: ClubEvent[],
  elegidoId: string | undefined,
  staff: boolean,
  now = Date.now(),
): ClubEvent | undefined {
  const partidos = events.filter((event) => event.kind === "partido" && (staff || !event.fechaOculta));
  const elegido = partidos.find((event) => event.id === elegidoId);
  if (elegido) return elegido;
  const vivo = partidos
    .filter((event) => enJuego(event, now))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  if (vivo) return vivo;
  const proximo = partidos
    .filter((event) => !event.resultClosedAt && Date.parse(event.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  if (proximo) return proximo;
  const falta = partidos
    .filter((event) => !event.resultClosedAt && Date.parse(event.startsAt) <= now)
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  if (falta) return falta;
  return partidos
    .filter((event) => event.resultClosedAt)
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
}

export function clasificarAgenda(events: ClubEvent[], sheets: MatchSheet[], now = Date.now()) {
  const proximos: ClubEvent[] = [];
  const falta: ClubEvent[] = [];
  const jugados: ClubEvent[] = [];
  const entrenamientos: ClubEvent[] = [];
  for (const event of events) {
    if (event.kind !== "partido") {
      entrenamientos.push(event);
      continue;
    }
    const sheet = sheets.find((item) => item.eventId === event.id);
    if (estaJugado(event, sheet)) jugados.push(event);
    else if (enJuego(event, now) || Date.parse(event.startsAt) >= now) proximos.push(event);
    else falta.push(event);
  }
  const porInicio = (a: ClubEvent, b: ClubEvent) => Date.parse(a.startsAt) - Date.parse(b.startsAt);
  proximos.sort(porInicio);
  entrenamientos.sort(porInicio);
  falta.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  jugados.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return { proximos, falta, jugados, entrenamientos };
}

export function contarConfirmaciones(
  players: { id: string }[],
  rsvps: { memberId: string; status: string }[],
) {
  let voy = 0;
  let no = 0;
  for (const player of players) {
    const status = rsvps.find((row) => row.memberId === player.id)?.status;
    if (status === "voy") voy += 1;
    else if (status === "no") no += 1;
  }
  return {
    voy,
    no,
    pending: Math.max(players.length - voy - no, 0),
    total: Math.max(players.length, 1),
  };
}

export function ponerReaccion(
  list: ReaccionFecha[] | undefined,
  memberId: string,
  emoji: ReaccionFecha["emoji"],
  at: string,
): ReaccionFecha[] {
  return [...(list ?? []).filter((item) => item.memberId !== memberId), { memberId, emoji, at }].slice(-80);
}

export function votarEncuesta(encuesta: Encuesta, memberId: string, opcion: number, at: string): Encuesta {
  if (!Number.isInteger(opcion) || opcion < 0 || opcion >= encuesta.opciones.length) return encuesta;
  const votos = [
    ...encuesta.votos.filter((voto) => voto.memberId !== memberId),
    { memberId, opcion, at },
  ];
  return { ...encuesta, votos };
}

export function fotoAbierta(event: ClubEvent, now = Date.now()): boolean {
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start) || now < start) return false;
  const cierre = event.resultClosedAt ? Date.parse(event.resultClosedAt) : start;
  const desde = Number.isFinite(cierre) ? cierre : start;
  return now <= desde + 24 * HORA;
}

export function rachaVoy(events: ClubEvent[], rsvps: Rsvp[], memberId: string, sheets: MatchSheet[]): number {
  const jugados = events
    .filter((event) => estaJugado(event, sheets.find((sheet) => sheet.eventId === event.id)))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  let n = 0;
  for (const event of jugados) {
    const status = rsvps.find((row) => row.eventId === event.id && row.memberId === memberId)?.status;
    if (status !== "voy") break;
    n += 1;
  }
  return n;
}

function sheetCerrada(sheet: MatchSheet, events: ClubEvent[]): boolean {
  return Boolean(events.find((event) => event.id === sheet.eventId)?.resultClosedAt);
}

export function rachaInvicto(sheets: MatchSheet[], events: ClubEvent[]): number {
  const orden = [...sheets].filter((sheet) => sheetCerrada(sheet, events)).sort((a, b) => {
    const aStart = Date.parse(events.find((event) => event.id === a.eventId)?.startsAt ?? a.recordedAt);
    const bStart = Date.parse(events.find((event) => event.id === b.eventId)?.startsAt ?? b.recordedAt);
    return bStart - aStart;
  });
  let n = 0;
  for (const sheet of orden) {
    if (sheet.goalsFor < sheet.goalsAgainst) break;
    n += 1;
  }
  return n;
}

export function rachaGoles(sheets: MatchSheet[], events: ClubEvent[], memberId: string): number {
  const orden = [...sheets].filter((sheet) => sheetCerrada(sheet, events)).sort((a, b) => {
    const aStart = Date.parse(events.find((event) => event.id === a.eventId)?.startsAt ?? a.recordedAt);
    const bStart = Date.parse(events.find((event) => event.id === b.eventId)?.startsAt ?? b.recordedAt);
    return bStart - aStart;
  });
  let n = 0;
  for (const sheet of orden) {
    const goles = sheet.players.find((row) => row.memberId === memberId)?.goals ?? 0;
    if (goles < 1) break;
    n += 1;
  }
  return n;
}

export type MomentoFecha = "antes" | "en_juego" | "despues" | "sin_partido";

const DESPUES_HORAS = 96;

export function momentoFecha(events: ClubEvent[], now = Date.now()): MomentoFecha {
  const partidos = events.filter((event) => event.kind === "partido");
  if (partidos.length === 0) return "sin_partido";
  if (partidos.some((event) => enJuego(event, now))) return "en_juego";
  const cerrado = partidos
    .filter((event) => event.resultClosedAt)
    .sort((a, b) => Date.parse(b.resultClosedAt ?? "") - Date.parse(a.resultClosedAt ?? ""))[0];
  if (cerrado?.resultClosedAt) {
    const cierre = Date.parse(cerrado.resultClosedAt);
    if (Number.isFinite(cierre) && now < cierre + DESPUES_HORAS * HORA) return "despues";
  }
  if (partidos.some((event) => !event.resultClosedAt && Date.parse(event.startsAt) > now)) return "antes";
  return "sin_partido";
}

export function recapSemana(events: ClubEvent[], sheets: MatchSheet[], now = Date.now()) {
  const desde = now - 7 * 24 * HORA;
  const ids = new Set(
    events
      .filter((event) => {
        const start = Date.parse(event.startsAt);
        return event.kind === "partido" && start >= desde && start <= now;
      })
      .map((event) => event.id),
  );
  const jugados = sheets.filter((sheet) => ids.has(sheet.eventId) && sheetCerrada(sheet, events));
  return {
    pj: jugados.length,
    gf: jugados.reduce((sum, sheet) => sum + sheet.goalsFor, 0),
  };
}
