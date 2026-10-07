import type { ClubEvent, FiguraVote, MatchSheet } from "./types.ts";
import { FIGURA_CIERRE_HORAS, figuraDe, votacionAbierta } from "./figura.ts";
import { CAPITAN_ACTIVO, FIGURA_MIN_VOTOS, type TipoPremio } from "./premios.ts";

const TZ = "America/Argentina/Buenos_Aires";
const DIA = 24 * 3_600_000;

export function validarPlanilla(partido: {
  goalsFor: number;
  sinAutor?: number;
  players?: { goals: number }[];
}): { cierra: boolean; faltan: number } {
  const autores = (partido.players ?? []).reduce((suma, fila) => suma + Math.max(0, fila.goals), 0);
  const sueltos = Math.max(0, Math.round(partido.sinAutor ?? 0));
  const total = autores + sueltos;
  const gf = Math.round(partido.goalsFor);
  const faltan = Math.max(0, gf - total);
  return { cierra: faltan === 0 && total <= gf, faltan };
}

export function posicionRanking(
  memberId: string,
  filas: { memberId: string; valor: number }[],
): { puesto: number; falta: number; lider: number } | null {
  const orden = filas.filter((fila) => fila.valor > 0).sort((a, b) => b.valor - a.valor || a.memberId.localeCompare(b.memberId));
  if (orden.length === 0) return null;
  const lider = orden[0]?.valor ?? 0;
  const indice = orden.findIndex((fila) => fila.memberId === memberId);
  if (indice < 0) return { puesto: orden.length + 1, falta: lider, lider };
  return { puesto: indice + 1, falta: Math.max(0, lider - (orden[indice]?.valor ?? 0)), lider };
}

export function frasePuesto(
  puesto: { puesto: number; falta: number },
  unidad: string,
  unidades: string,
  lider = "primero",
): string {
  if (puesto.puesto === 1) return `Sos 1º en ${unidades}`;
  if (puesto.falta === 1) return `Estás a 1 ${unidad} del ${lider}`;
  if (puesto.falta > 1) return `Estás a ${puesto.falta} ${unidades} del ${lider}`;
  return `Sos ${puesto.puesto}º en ${unidades}`;
}

const CATALOGO: { tipo: TipoPremio; titulo: string; pista: string }[] = [
  { tipo: "figura", titulo: "Figura del partido", pista: "Te falta: Figura · la elige el plantel" },
  { tipo: "goleador", titulo: "Goleador/a del mes", pista: "Te falta: Goleador/a · más goles del mes" },
  { tipo: "asistidor", titulo: "Asistidor/a del mes", pista: "Te falta: Asistidor/a · más pases gol del mes" },
  { tipo: "valla", titulo: "Valla invicta", pista: "Te falta: Valla invicta · cero en contra" },
  { tipo: "presente", titulo: "Presente siempre", pista: "Te falta: Presente siempre · ir a todos" },
  { tipo: "hat-trick", titulo: "Hat-trick", pista: "Te falta: Hat-trick · 3 goles en un partido" },
  { tipo: "debut", titulo: "Debut", pista: "Te falta: Debut · el primer partido" },
  { tipo: "dt", titulo: "DT del mes", pista: "Te falta: DT del mes · el mejor mes del cuerpo técnico" },
];

export type HuecoVitrina = {
  tipo: TipoPremio;
  titulo: string;
  pista: string;
  cantidad: number;
  ganada: boolean;
};

export function vitrina(premios: { tipo: string; memberId: string }[], memberId: string): HuecoVitrina[] {
  return CATALOGO.filter((item) => item.tipo !== "dt" || memberId.length > 0)
    .filter((item) => CAPITAN_ACTIVO || item.tipo !== ("capitan" as TipoPremio))
    .map((item) => {
      const cantidad = premios.filter((premio) => premio.memberId === memberId && premio.tipo === item.tipo).length;
      return { ...item, cantidad, ganada: cantidad > 0 };
    });
}

function partesDia(now: number): { y: number; m: number; d: number; lunes: boolean } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(now));
  const leer = (tipo: string) => parts.find((parte) => parte.type === tipo)?.value ?? "";
  return {
    y: Number(leer("year")),
    m: Number(leer("month")),
    d: Number(leer("day")),
    lunes: leer("weekday") === "Mon",
  };
}

export function rangoSemana(now = Date.now()): { desde: number; hasta: number; pasada: boolean } {
  const dia = partesDia(now);
  const medianoche = Date.UTC(dia.y, dia.m - 1, dia.d, 3, 0, 0);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(now));
  const mapa: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = mapa[weekday] ?? 0;
  const lunes = medianoche - offset * DIA;
  if (dia.lunes) return { desde: lunes - 7 * DIA, hasta: lunes, pasada: true };
  return { desde: lunes, hasta: lunes + 7 * DIA, pasada: false };
}

export type PartidoSemana = {
  id: string;
  titulo: string;
  resultado: string;
  goleador: string | null;
};

export function resumenSemana(
  events: ClubEvent[],
  sheets: MatchSheet[],
  nombre: (id: string) => string,
  now = Date.now(),
): { titulo: string; partidos: PartidoSemana[] } {
  const rango = rangoSemana(now);
  const partidos = events
    .filter((event) => {
      if (event.kind !== "partido" || !event.resultClosedAt) return false;
      const inicio = Date.parse(event.startsAt);
      return inicio >= rango.desde && inicio < rango.hasta;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((event) => {
      const sheet = sheets.find((item) => item.eventId === event.id);
      const goleador = [...(sheet?.players ?? [])].sort((a, b) => b.goals - a.goals)[0];
      const marca = sheet ? `${sheet.goalsFor}–${sheet.goalsAgainst}` : "Sin cargar";
      const rival = sheet?.opponent?.trim() || event.title;
      return {
        id: event.id,
        titulo: event.title,
        resultado: `${marca} vs ${rival}`,
        goleador: goleador && goleador.goals > 0 ? nombre(goleador.memberId) : null,
      };
    });
  return { titulo: rango.pasada ? "Resumen de la semana pasada" : "Resumen de la semana", partidos };
}

const HORA = 3_600_000;

export function ultimaSemanaDelMes(now = Date.now()): boolean {
  const dia = partesDia(now);
  const ultimo = new Date(Date.UTC(dia.y, dia.m, 0)).getUTCDate();
  return dia.d > ultimo - 7;
}

export type AvisoVista = { id: string; title: string; href: string };

export function avisosDe(input: {
  now: number;
  memberId: string;
  events: ClubEvent[];
  votes: FiguraVote[];
  rows: { memberId: string; goals: number; assists: number }[];
  racha: number;
  puestoAsistenciasAntes: number | null;
}): AvisoVista[] {
  const avisos: AvisoVista[] = [];
  for (const event of input.events) {
    if (event.kind !== "partido" || !event.resultClosedAt) continue;
    const ya = input.votes.some((vote) => vote.eventId === event.id && vote.voterId === input.memberId);
    if (votacionAbierta(event, input.now) && !ya) {
      const cierra = Date.parse(event.resultClosedAt) + FIGURA_CIERRE_HORAS * HORA;
      const horas = Math.max(1, Math.ceil((cierra - input.now) / HORA));
      avisos.push({
        id: `voto:${event.id}`,
        title: `Votá la figura. Cierra en ${horas} h.`,
        href: `/fecha?partido=${event.id}#votar`,
      });
    }
    const figura = figuraDe(input.votes, event.id);
    const despues = Date.parse(event.resultClosedAt) + 96 * HORA;
    if (!votacionAbierta(event, input.now) && figura && figura.votos >= FIGURA_MIN_VOTOS && input.now < despues) {
      avisos.push({
        id: `sobre:${event.id}`,
        title: "Ya está la figura de la fecha. Abrí el sobre.",
        href: `/fecha?partido=${event.id}`,
      });
    }
  }
  if (ultimaSemanaDelMes(input.now)) {
    const puesto = posicionRanking(
      input.memberId,
      input.rows.map((fila) => ({ memberId: fila.memberId, valor: fila.goals })),
    );
    if (puesto && puesto.puesto > 1 && puesto.falta === 1) {
      avisos.push({
        id: `gol:${partesDia(input.now).y}-${partesDia(input.now).m}`,
        title: "Estás a 1 gol del Goleador del mes.",
        href: "/stats",
      });
    }
  }
  const asistencias = posicionRanking(
    input.memberId,
    input.rows.map((fila) => ({ memberId: fila.memberId, valor: fila.assists })),
  );
  if (
    asistencias &&
    input.puestoAsistenciasAntes != null &&
    asistencias.puesto > input.puestoAsistenciasAntes
  ) {
    avisos.push({
      id: `asist:${input.memberId}:${asistencias.puesto}`,
      title: "Te pasaron en asistencias.",
      href: "/stats",
    });
  }
  if (input.racha >= 3) {
    avisos.push({
      id: `racha:${input.memberId}:${input.racha}`,
      title: `Racha: ${input.racha} partidos seguidos presente.`,
      href: "/fecha",
    });
  }
  if (rangoSemana(input.now).pasada) {
    avisos.push({
      id: `resumen:${rangoSemana(input.now).desde}`,
      title: "Salió el resumen de la semana.",
      href: "/fecha",
    });
  }
  return avisos;
}
