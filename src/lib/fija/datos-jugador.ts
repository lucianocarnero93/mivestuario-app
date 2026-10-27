import type { ClubEvent, MatchSheet, Member } from "./types.ts";

export const DATOS_MIN_PARTIDOS = 5;

type Fila = { n: number; g: number; e: number; p: number; gf: number; gc: number };

function vacia(): Fila {
  return { n: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
}

function sumar(fila: Fila, hoja: MatchSheet) {
  fila.n += 1;
  fila.gf += hoja.goalsFor;
  fila.gc += hoja.goalsAgainst;
  if (hoja.goalsFor > hoja.goalsAgainst) fila.g += 1;
  else if (hoja.goalsFor === hoja.goalsAgainst) fila.e += 1;
  else fila.p += 1;
}

function jugo(event: ClubEvent, memberId: string): boolean {
  return Object.values(event.lineup).includes(memberId) || (event.suplentes ?? []).includes(memberId);
}

export function miImpacto(memberId: string, events: ClubEvent[], sheets: MatchSheet[]): {
  titular: Fila;
  comparacion?: Fila;
  pocos: boolean;
} {
  const titular = vacia();
  const sin = vacia();
  for (const hoja of sheets) {
    const evento = events.find((item) => item.id === hoja.eventId);
    if (!evento) continue;
    const adentro = Object.values(evento.lineup).includes(memberId);
    sumar(adentro ? titular : sin, hoja);
  }
  const mejor = titular.n > 0 && sin.n > 0 && titular.g / titular.n >= sin.g / sin.n;
  return { titular, comparacion: mejor ? sin : undefined, pocos: titular.n < DATOS_MIN_PARTIDOS };
}

export function miPuesto(memberId: string, events: ClubEvent[], sheets: MatchSheet[], members: Member[]): string | null {
  const porLinea = new Map<string, { n: number; aporte: number }>();
  for (const hoja of sheets) {
    const evento = events.find((item) => item.id === hoja.eventId);
    if (!evento) continue;
    const slot = Object.entries(evento.lineup).find(([, id]) => id === memberId)?.[0];
    if (!slot) continue;
    const linea = slot === "ARQ" ? "arquero" : slot.startsWith("L") || slot === "DF" ? "defensa" : slot.startsWith("M") ? "volante" : "delantero";
    const stat = hoja.players.find((fila) => fila.memberId === memberId);
    const actual = porLinea.get(linea) ?? { n: 0, aporte: 0 };
    actual.n += 1;
    actual.aporte += (stat?.goals ?? 0) + (stat?.assists ?? 0);
    porLinea.set(linea, actual);
  }
  const mejor = [...porLinea.entries()].filter(([, fila]) => fila.n >= 3).sort((a, b) => b[1].aporte - a[1].aporte)[0];
  if (!mejor) return null;
  const nick = members.find((persona) => persona.id === memberId)?.nick;
  void nick;
  return `Donde más sumás: de ${mejor[0]} (${mejor[1].n} partidos, ${mejor[1].aporte} goles + asistencias)`;
}

export function misSociedades(memberId: string, sheets: MatchSheet[], members: Member[]): string | null {
  const mapa = new Map<string, number>();
  for (const hoja of sheets) {
    const yo = hoja.players.find((fila) => fila.memberId === memberId);
    if (!yo || (yo.goals === 0 && yo.assists === 0)) continue;
    for (const otro of hoja.players) {
      if (otro.memberId === memberId || otro.goals + otro.assists === 0) continue;
      mapa.set(otro.memberId, (mapa.get(otro.memberId) ?? 0) + Math.min(yo.assists || yo.goals, otro.goals || otro.assists));
    }
  }
  const mejor = [...mapa.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
  if (!mejor) return null;
  const nick = members.find((persona) => persona.id === mejor[0])?.nick ?? "un compañero";
  return `Vos + ${nick} = ${mejor[1]} goles`;
}

export function miTendencia(memberId: string, sheets: MatchSheet[]): string | null {
  const propios = sheets.filter((hoja) => hoja.players.some((fila) => fila.memberId === memberId));
  const ultimos = propios.slice(-5);
  const previos = propios.slice(-10, -5);
  const suma = (lista: MatchSheet[]) =>
    lista.reduce((total, hoja) => {
      const fila = hoja.players.find((item) => item.memberId === memberId);
      return total + (fila?.goals ?? 0) + (fila?.assists ?? 0);
    }, 0);
  if (ultimos.length < 3) return null;
  const ahora = suma(ultimos);
  const antes = suma(previos);
  if (previos.length >= 3 && ahora < antes) return null;
  if (previos.length >= 3 && ahora > antes) return `Venís en subida: ${ahora} en los últimos ${ultimos.length}`;
  return `Seguís sumando: ${ahora} en los últimos ${ultimos.length}`;
}

export function porQueCard(memberId: string, slot: string, events: ClubEvent[], sheets: MatchSheet[], members: Member[]): string {
  const delSlot = events.filter((evento) => evento.lineup[slot] === memberId);
  const jugados = sheets.filter((hoja) => events.some((evento) => evento.id === hoja.eventId && jugo(evento, memberId)));
  const sociedad = misSociedades(memberId, sheets, members);
  const base = `titular en ${slot} ${delSlot.length} de ${Math.max(jugados.length, delSlot.length)}`;
  return sociedad ? `${base} · ${sociedad.replace("Vos + ", "").replace(" = ", " con ")}` : base;
}

export function pocosPartidos(n: number): boolean {
  return n < DATOS_MIN_PARTIDOS;
}
