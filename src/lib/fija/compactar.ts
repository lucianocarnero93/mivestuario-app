import { figuraDe, votacionAbierta } from "./figura.ts";
import { FIGURA_MIN_VOTOS } from "./premios.ts";
import type { ClubBundle, ClubEvent, Rsvp } from "./types.ts";

export const ASISTENCIA_DIAS = 7;
export const ENTRENAMIENTO_DIAS = 30;
export const FIGURA_COMPACTA_DIAS = 7;

export type AsistenciaCompacta = { eventId: string; voy: string[]; no?: string[] };

export type InformeCompactacion = {
  antes: Record<string, number>;
  despues: Record<string, number>;
  filasRsvp: number;
  eventos: number;
  votos: number;
};

const DIA = 24 * 60 * 60 * 1000;

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
}

function secciones(bundle: ClubBundle): Record<string, number> {
  return {
    total: bytes(bundle),
    rsvps: bytes(bundle.rsvps),
    asistencias: bytes(bundle.asistencias ?? []),
    events: bytes(bundle.events),
    votos: bytes(bundle.figuraVotes ?? []),
    avisos: bytes(bundle.inbox),
    alertas: bytes(bundle.alertLog),
    convocatorias: bytes(bundle.convocatorias),
  };
}

function viejo(iso: string, now: number, dias: number): boolean {
  const start = Date.parse(iso);
  return Number.isFinite(start) && now - start > dias * DIA;
}

function seCompactaAsistencia(event: ClubEvent, now: number): boolean {
  if (!viejo(event.startsAt, now, ASISTENCIA_DIAS)) return false;
  if (event.kind === "entrenamiento" || event.kind === "reunion") return true;
  return event.kind === "partido" && Boolean(event.resultClosedAt);
}

function figuraVieja(event: ClubEvent, now: number): boolean {
  if (!event.resultClosedAt || votacionAbierta(event, now)) return false;
  return viejo(event.resultClosedAt, now, FIGURA_COMPACTA_DIAS);
}

function armarAsistencia(eventId: string, rows: Rsvp[]): AsistenciaCompacta {
  const voy = rows.filter((row) => row.status === "voy").map((row) => row.memberId).sort();
  const no = rows.filter((row) => row.status === "no").map((row) => row.memberId).sort();
  return no.length > 0 ? { eventId, voy, no } : { eventId, voy };
}

export function respuestasDe(bundle: { rsvps?: Rsvp[]; asistencias?: AsistenciaCompacta[] }): Rsvp[] {
  const compactos = bundle.asistencias ?? [];
  const tapados = new Set(compactos.map((item) => item.eventId));
  const vivos = (bundle.rsvps ?? []).filter((row) => !tapados.has(row.eventId));
  const expandidos: Rsvp[] = [];
  for (const item of compactos) {
    for (const memberId of item.voy) expandidos.push({ eventId: item.eventId, memberId, status: "voy" });
    for (const memberId of item.no ?? []) expandidos.push({ eventId: item.eventId, memberId, status: "no" });
  }
  return [...vivos, ...expandidos];
}

export function compactarHistorial(bundle: ClubBundle, now: number): { bundle: ClubBundle; informe: InformeCompactacion } {
  const antes = secciones(bundle);
  const events = bundle.events ?? [];
  const porEvento = new Map(events.map((event) => [event.id, event]));
  const ya = new Map((bundle.asistencias ?? []).map((item) => [item.eventId, item]));
  const rsvps = [...(bundle.rsvps ?? [])];
  let filasRsvp = 0;
  let eventos = 0;
  for (const event of events) {
    if (!seCompactaAsistencia(event, now)) continue;
    eventos += 1;
    if (ya.has(event.id)) continue;
    const rows = rsvps.filter((row) => row.eventId === event.id);
    filasRsvp += rows.length;
    ya.set(event.id, armarAsistencia(event.id, rows));
  }
  const compactos = new Set(
    [...ya.keys()].filter((id) => {
      const event = porEvento.get(id);
      return event ? seCompactaAsistencia(event, now) : false;
    }),
  );
  const asistencias = [...ya.values()]
    .filter((item) => compactos.has(item.eventId))
    .map((item) => ({
      ...item,
      voy: [...item.voy].sort(),
      no: item.no && item.no.length > 0 ? [...item.no].sort() : undefined,
    }))
    .sort((a, b) => a.eventId.localeCompare(b.eventId));
  const rsvpsVivos = rsvps.filter((row) => !compactos.has(row.eventId));

  const votos = (bundle.figuraVotes ?? []).filter((vote) => {
    const event = porEvento.get(vote.eventId);
    if (!event || !figuraVieja(event, now)) return true;
    const figura = figuraDe(bundle.figuraVotes, event.id);
    if (!figura || figura.votos < FIGURA_MIN_VOTOS) return false;
    return figura.ids.includes(vote.pickId);
  });

  const alertLog = (bundle.alertLog ?? []).filter((item) => {
    const event = porEvento.get(item.eventId);
    return !event || !viejo(event.startsAt, now, ASISTENCIA_DIAS);
  });
  const convocatorias = (bundle.convocatorias ?? []).filter((item) => {
    const event = porEvento.get(item.eventId);
    return !event || !viejo(event.startsAt, now, ASISTENCIA_DIAS);
  });
  const inbox = (bundle.inbox ?? []).filter((item) => {
    if (item.kind !== "recordatorio" && item.kind !== "equipamiento") return true;
    if (!item.eventId) return true;
    const event = porEvento.get(item.eventId);
    if (!event) return true;
    return !viejo(event.startsAt, now, 0);
  });

  const next: ClubBundle = {
    ...bundle,
    rsvps: rsvpsVivos,
    asistencias,
    figuraVotes: votos,
    alertLog,
    convocatorias,
    inbox,
    compactacion: bundle.compactacion,
  };
  const despues = secciones(next);
  return {
    bundle: next,
    informe: {
      antes,
      despues,
      filasRsvp,
      eventos,
      votos: (bundle.figuraVotes ?? []).length - votos.length,
    },
  };
}

export function asistenciasDelServer(
  existing: AsistenciaCompacta[] | undefined,
  _incoming: AsistenciaCompacta[] | undefined,
): AsistenciaCompacta[] {
  return existing ?? [];
}

export function sacarDeAsistencias(lista: AsistenciaCompacta[] | undefined, memberId: string): AsistenciaCompacta[] {
  return (lista ?? []).flatMap((item) => {
    const voy = item.voy.filter((id) => id !== memberId);
    const no = (item.no ?? []).filter((id) => id !== memberId);
    if (voy.length === 0 && no.length === 0) return [];
    const next: AsistenciaCompacta = { eventId: item.eventId, voy };
    if (no.length > 0) next.no = no;
    return [next];
  });
}
