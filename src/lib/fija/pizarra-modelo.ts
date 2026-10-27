import type { ClubEvent, ConsignaEquipo, ConsignaJugador, MatchSheet, Member, Momento, OrigenGol } from "./types.ts";

export const MOMENTOS: { id: Momento; label: string }[] = [
  { id: "con", label: "Con pelota" },
  { id: "perdida", label: "La perdimos" },
  { id: "sin", label: "Sin pelota" },
  { id: "recupera", label: "La recuperamos" },
  { id: "pelota", label: "Pelota parada" },
];

export const COLOR_MOMENTO: Record<Momento, string> = {
  con: "#b8f25a",
  perdida: "#f07167",
  sin: "#8fd3f0",
  recupera: "#f0b429",
  pelota: "#cfd8d3",
  resultado: "#b8f25a",
};

const EQUIPO: ConsignaEquipo[] = [
  { id: "c1", momento: "con", texto: "Presionamos 5 segundos", principio: "presion" },
  { id: "c2", momento: "con", texto: "Salimos en 3 pases", principio: "salida" },
  { id: "c3", momento: "con", texto: "El medio no se parte", principio: "bloque" },
  { id: "c4", momento: "perdida", texto: "Si la perdés cerca, vas vos", principio: "presion" },
  { id: "c5", momento: "sin", texto: "Bloque medio: cerramos el medio", principio: "bloque" },
  { id: "c6", momento: "recupera", texto: "Salimos en 3 pases", principio: "salida" },
  { id: "c7", momento: "pelota", texto: "Córner en contra: al primer palo", principio: "primer-palo" },
  { id: "c8", momento: "pelota", texto: "Córner a favor: al segundo", principio: "segundo-palo" },
];

const JUGADOR: ConsignaJugador[] = [
  { id: "j1", slot: "MI", momento: "con", texto: "Abrís por izquierda y llegás al 2º palo", consignaId: "c2" },
  { id: "j2", slot: "MI", momento: "perdida", texto: "Si la perdés cerca, vas vos", consignaId: "c4" },
  { id: "j3", slot: "MI", momento: "sin", texto: "Vos cerrás el carril izquierdo", consignaId: "c5" },
  { id: "j4", slot: "MI", momento: "pelota", texto: "Vos picás por afuera", consignaId: "c8" },
];

export function plantillaPresion(): { plantillaId: string; consignas: ConsignaEquipo[]; consignasJugador: ConsignaJugador[] } {
  return { plantillaId: "presion-alta", consignas: EQUIPO.map((item) => ({ ...item })), consignasJugador: JUGADOR.map((item) => ({ ...item })) };
}

export function consignasDe(event: ClubEvent | undefined): ConsignaEquipo[] {
  return event?.consignas?.length ? event.consignas : [];
}

export function delMomento(lista: ConsignaEquipo[], momento: Momento): ConsignaEquipo[] {
  return lista.filter((item) => item.momento === momento).slice(0, 3);
}

export function consignasDelSlot(event: ClubEvent | undefined, slot: string): ConsignaJugador[] {
  return (event?.consignasJugador ?? []).filter((item) => item.slot === slot).slice(0, 3);
}

export function metaPlan(event: ClubEvent | undefined, convocados: number): {
  vieron: number;
  entendieron: number;
  total: number;
  llegamos: boolean;
} {
  const vistos = event?.vistos ?? [];
  const total = Math.max(convocados, vistos.length, 1);
  const entendieron = vistos.filter((item) => item.entendido).length;
  return {
    vieron: vistos.length,
    entendieron,
    total,
    llegamos: entendieron / total >= 0.8,
  };
}

export function slotDe(event: ClubEvent | undefined, memberId: string): string | null {
  if (!event) return null;
  const par = Object.entries(event.lineup).find(([, id]) => id === memberId);
  return par?.[0] ?? null;
}

export function quienFalta(event: ClubEvent | undefined, convocados: string[]): { id: string; vio: boolean; entendio: boolean }[] {
  const vistos = new Map((event?.vistos ?? []).map((item) => [item.memberId, item]));
  return convocados.map((id) => {
    const visto = vistos.get(id);
    return { id, vio: Boolean(visto), entendio: Boolean(visto?.entendido) };
  });
}

export function origenesOk(goles: OrigenGol[] | undefined, aFavor: number): boolean {
  return (goles?.length ?? 0) <= aFavor;
}

export function cumplidasDe(event: ClubEvent | undefined): { si: number; de: number } {
  const marcas = Object.values(event?.cumplidas ?? {});
  return { si: marcas.filter((item) => item === "si").length, de: marcas.length };
}

export function textoWhatsappPlan(cuando: string, rival: string, link: string): string {
  return `Ya está el plan para el ${cuando} vs ${rival}. Mirá tu rol (30 s) 👉 ${link}`;
}

export function textoFaltan(n: number, cuando: string, link: string): string {
  return `Faltan ${n} por ver el plan del ${cuando} 👉 ${link}`;
}

export function textoDespues(rival: string, si: number, de: number, link: string): string {
  return `Así nos fue con el plan vs ${rival}: cumplimos ${si} de ${de} 👉 ${link}`;
}

export function golesDe(sheet: MatchSheet | undefined, members: Member[]): string {
  if (!sheet) return "";
  const lineas = sheet.players
    .filter((fila) => fila.goals > 0)
    .map((fila) => {
      const nick = members.find((persona) => persona.id === fila.memberId)?.nick ?? "Alguien";
      return `${nick} ${fila.goals}`;
    });
  return lineas.join(" · ");
}
