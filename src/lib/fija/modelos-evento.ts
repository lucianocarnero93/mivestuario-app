import type { Slot } from "./formations.ts";
import { aplicaEn, textoDeRol, type LineaBloque, type Modelo } from "./modelos.ts";

export const FICHA_MIN = 4;
export const FICHA_MAX = 96;
export const MAX_CRUCES = 12;

export type FichaModelo = {
  id: string;
  slot: string;
  etiqueta: string;
  memberId: string;
  x: number;
  y: number;
  linea: LineaBloque;
};

export type CuadroResuelto = {
  texto: string;
  fichas: FichaModelo[];
  pelota: { x: number; y: number };
};

function clamp(n: number): number {
  return Math.min(FICHA_MAX, Math.max(FICHA_MIN, n));
}

export function lineaDeSlot(slot: { key: string; y: number }): LineaBloque {
  if (slot.key === "ARQ") return "arq";
  if (slot.y >= 58) return "def";
  if (slot.y >= 34) return "med";
  return "del";
}

/** El arquero nunca es actor. Cada actor se queda con el slot libre más cercano de su línea. */
export function asignarActores(slots: Slot[], modelo: Modelo): Map<string, string> {
  const libre = new Set(slots.filter((slot) => slot.key !== "ARQ").map((slot) => slot.key));
  const mapa = new Map<string, string>();
  for (const actor of modelo.actores) {
    const candidatos = slots.filter((slot) => libre.has(slot.key) && lineaDeSlot(slot) === actor.linea);
    if (candidatos.length === 0) continue;
    candidatos.sort((a, b) => Math.abs(a.x - actor.lado) - Math.abs(b.x - actor.lado) || a.y - b.y);
    const elegido = candidatos[0];
    if (!elegido) continue;
    libre.delete(elegido.key);
    mapa.set(actor.id, elegido.key);
  }
  return mapa;
}

export function resolverCuadros(
  modelo: Modelo,
  slots: Slot[],
  lineup: Record<string, string>,
  modalidad: Parameters<typeof aplicaEn>[1],
): CuadroResuelto[] | null {
  if (!aplicaEn(modelo, modalidad)) return null;
  const actores = asignarActores(slots, modelo);
  return modelo.cuadros.map((cuadro) => {
    const pos = new Map(slots.map((slot) => [slot.key, { x: slot.x, y: slot.y }]));
    for (const ajuste of cuadro.lineas ?? []) {
      const ancho = ajuste.ancho ?? 1;
      const dx = ajuste.dx ?? 0;
      const dy = ajuste.dy ?? 0;
      for (const slot of slots) {
        if (lineaDeSlot(slot) !== ajuste.linea) continue;
        const cur = pos.get(slot.key);
        if (!cur) continue;
        pos.set(slot.key, {
          x: clamp(50 + (cur.x - 50) * ancho + dx),
          y: clamp(cur.y + dy),
        });
      }
    }
    for (const mov of cuadro.actores ?? []) {
      const key = actores.get(mov.id);
      if (!key) continue;
      const cur = pos.get(key);
      if (!cur) continue;
      pos.set(key, { x: clamp(cur.x + (mov.dx ?? 0)), y: clamp(cur.y + (mov.dy ?? 0)) });
    }
    const fichas: FichaModelo[] = slots.map((slot) => {
      const cur = pos.get(slot.key) ?? { x: slot.x, y: slot.y };
      return {
        id: slot.key,
        slot: slot.key,
        etiqueta: slot.key,
        memberId: lineup[slot.key] ?? "",
        x: clamp(cur.x),
        y: clamp(cur.y),
        linea: lineaDeSlot(slot),
      };
    });
    let pelota = { x: 50, y: 50 };
    if ("actor" in cuadro.pelota) {
      const key = actores.get(cuadro.pelota.actor);
      const ficha = key ? fichas.find((item) => item.slot === key) : undefined;
      pelota = ficha ? { x: ficha.x, y: clamp(ficha.y - 6) } : { x: 50, y: 40 };
    } else {
      pelota = { x: clamp(cuadro.pelota.x), y: clamp(cuadro.pelota.y) };
    }
    return { texto: cuadro.texto, fichas, pelota };
  });
}

function parDe(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/** Repetir el mismo par lo saca de la lista. No pasan de 12. */
export function alternarCruce(cruces: [string, string][], a: string, b: string): [string, string][] {
  if (!a || !b || a === b) return cruces;
  const clave = parDe(a, b);
  const sin = cruces.filter(([x, y]) => parDe(x, y) !== clave);
  if (sin.length !== cruces.length) return sin;
  if (cruces.length >= MAX_CRUCES) return cruces;
  return [...cruces, [a, b]];
}

/** Cambia fichas solo en este modelo. La formación del partido no se toca. */
export function aplicarCruces(lineup: Record<string, string>, cruces: [string, string][]): Record<string, string> {
  const next = { ...lineup };
  for (const [a, b] of cruces) {
    if (!a || !b || a === b) continue;
    const slotA = Object.entries(next).find(([, id]) => id === a)?.[0];
    const slotB = Object.entries(next).find(([, id]) => id === b)?.[0];
    if (!slotA || !slotB) continue;
    next[slotA] = b;
    next[slotB] = a;
  }
  return next;
}

export function lineaDeJugador(
  modelo: Modelo,
  slots: Slot[],
  lineup: Record<string, string>,
  memberId: string,
): string | null {
  const slot = slots.find((item) => lineup[item.key] === memberId);
  if (!slot) return null;
  return textoDeRol(modelo, lineaDeSlot(slot));
}
