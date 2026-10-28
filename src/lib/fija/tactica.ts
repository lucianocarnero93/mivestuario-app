import { alternarCruce, MAX_CRUCES } from "./modelos-evento.ts";
import { MODELOS, modeloPorId, type Modelo } from "./modelos.ts";

export const CLAVES_EQUIPO = [
  "Presionar arriba",
  "Juntos y cortos",
  "Hablar siempre",
  "Pase al libre",
  "Cerrar el medio",
  "Salir jugando",
] as const;

export const FRASES = [
  "Pedila siempre",
  "Quedate abierto",
  "No bajes de más",
  "Primer pase adelante",
  "Hablá y marcá",
  "Cerrá el medio",
] as const;

export const CUANDOS = ["1T 10'", "1T 25'", "2T 5'", "2T 10'", "2T 20'"] as const;

export const MAX_CLAVES = 3;
export const MAX_MODELOS = 3;
export const MAX_CAMBIOS = 4;

export type PelotaQuien = {
  corners?: string;
  tiros?: string;
  penales?: string;
  contra?: { primer?: string; segundo?: string; arriba?: string };
  favor?: { atras?: string };
};

export type CambioPlaneado = { sale: string; entra: string; cuando: string };

export type ModeloCargado = { id: string; cruces: [string, string][] };

export type TacticaPartido = {
  claves?: string[];
  frases?: Record<string, string>;
  pelota?: PelotaQuien;
  cambios?: CambioPlaneado[];
  modelos?: ModeloCargado[];
};

const CLAVES = new Set<string>(CLAVES_EQUIPO);
const FRASE = new Set<string>(FRASES);
const CUANDO = new Set<string>(CUANDOS);
const IDS = new Set(MODELOS.map((item) => item.id));

function idLimpio(value: unknown): string {
  if (typeof value !== "string") return "";
  const clean = value.trim();
  if (!clean || clean.length > 40) return "";
  return clean;
}

function pelotaLimpia(value: PelotaQuien | undefined): PelotaQuien | undefined {
  if (!value) return undefined;
  const uno = (item: unknown) => idLimpio(item) || undefined;
  const contra = value.contra
    ? {
        primer: uno(value.contra.primer),
        segundo: uno(value.contra.segundo),
        arriba: uno(value.contra.arriba),
      }
    : undefined;
  const favor = value.favor ? { atras: uno(value.favor.atras) } : undefined;
  const next: PelotaQuien = {
    corners: uno(value.corners),
    tiros: uno(value.tiros),
    penales: uno(value.penales),
    contra,
    favor,
  };
  return next;
}

function crucesLimpios(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];
  const out: [string, string][] = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const a = idLimpio(item[0]);
    const b = idLimpio(item[1]);
    if (!a || !b || a === b) continue;
    const next = alternarCruce(out, a, b);
    if (next.length < out.length) {
      out.splice(0, out.length, ...next);
      continue;
    }
    if (out.length >= MAX_CRUCES) continue;
    if (next.length === out.length) continue;
    out.push([a, b]);
  }
  return out.slice(0, MAX_CRUCES);
}

export function normalizarTactica(input: TacticaPartido | null | undefined): TacticaPartido {
  const claves: string[] = [];
  for (const item of input?.claves ?? []) {
    if (!CLAVES.has(item) || claves.includes(item)) continue;
    if (claves.length >= MAX_CLAVES) break;
    claves.push(item);
  }
  const frases: Record<string, string> = {};
  for (const [id, frase] of Object.entries(input?.frases ?? {})) {
    const key = idLimpio(id);
    if (!key || !FRASE.has(frase)) continue;
    frases[key] = frase;
  }
  const cambios: CambioPlaneado[] = [];
  for (const item of input?.cambios ?? []) {
    const sale = idLimpio(item?.sale);
    const entra = idLimpio(item?.entra);
    if (!sale || !entra || sale === entra || !CUANDO.has(item?.cuando ?? "")) continue;
    if (cambios.length >= MAX_CAMBIOS) break;
    cambios.push({ sale, entra, cuando: item.cuando });
  }
  const modelos: ModeloCargado[] = [];
  for (const item of input?.modelos ?? []) {
    if (!item || !IDS.has(item.id) || modelos.some((row) => row.id === item.id)) continue;
    if (modelos.length >= MAX_MODELOS) break;
    modelos.push({ id: item.id, cruces: crucesLimpios(item.cruces) });
  }
  return { claves, frases, pelota: pelotaLimpia(input?.pelota), cambios, modelos };
}

export function puedeCargarTactica(rol: "dt" | "ayudante" | "jugador"): boolean {
  return rol === "dt" || rol === "ayudante";
}

export function alternarClave(claves: string[], clave: string): string[] {
  if (!CLAVES.has(clave)) return claves;
  if (claves.includes(clave)) return claves.filter((item) => item !== clave);
  if (claves.length >= MAX_CLAVES) return claves;
  return [...claves, clave];
}

type Persona = { id: string; nick: string; number: number | null; menor?: boolean };

function apodo(persona: Persona | undefined): string {
  if (!persona) return "el cambio";
  return persona.nick || "el cambio";
}

export function tareasDe(tactica: TacticaPartido | undefined, memberId: string, members: Persona[]): string[] {
  if (!tactica || !memberId) return [];
  const out: string[] = [];
  const pelota = tactica.pelota;
  if (pelota?.corners === memberId) out.push("Pateás los córners.");
  if (pelota?.tiros === memberId) out.push("Pateás los tiros libres.");
  if (pelota?.penales === memberId) out.push("Pateás los penales.");
  if (pelota?.contra?.primer === memberId) out.push("En el córner en contra, primer palo.");
  if (pelota?.contra?.segundo === memberId) out.push("En el córner en contra, segundo palo.");
  if (pelota?.contra?.arriba === memberId) out.push("En el córner en contra, quedás arriba.");
  if (pelota?.favor?.atras === memberId) out.push("En el córner a favor, quedás atrás.");
  for (const cambio of tactica.cambios ?? []) {
    if (cambio.sale === memberId) {
      const entra = members.find((item) => item.id === cambio.entra);
      const numero = entra && entra.number != null ? `${entra.number} ` : "";
      out.push(`Salís a los ${cambio.cuando}. Entra ${numero}${apodo(entra)}.`);
    } else if (cambio.entra === memberId) {
      const sale = members.find((item) => item.id === cambio.sale);
      out.push(`Entrás a los ${cambio.cuando}${sale ? ` por ${apodo(sale)}` : ""}.`);
    }
  }
  return out;
}

export function textoWhatsapp(modelo: Modelo): string {
  const claves = modelo.claves.map((item, index) => `${index + 1}. ${item}`).join("\n");
  return `${modelo.nombre}\n${claves}\nMirá el movimiento en la pizarra.`;
}

export function modelosDelPartido(tactica: TacticaPartido | undefined): Modelo[] {
  const out: Modelo[] = [];
  for (const item of tactica?.modelos ?? []) {
    const modelo = modeloPorId(item.id);
    if (modelo) out.push(modelo);
  }
  return out;
}
