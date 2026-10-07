import type { AvatarPersona } from "./avatar.ts";
import { FORMATIONS, MODALITY_SHORT } from "./formations.ts";
import type { Formation, Slot } from "./formations.ts";
import { initials } from "./format.ts";
import { imagenDe, type ImagenPersona } from "./imagen.ts";
import type { Modality, PlanId } from "./types.ts";

// PENDIENTE: decide el dueño en cada una.

/** Fotos reales en la imagen. Prende "Con fotos". El usuario puede apagarlo. Un menor nunca lleva foto. */
export const ALINEACION_FOTOS_DEFAULT: Record<"whatsapp" | "story", boolean> = { whatsapp: true, story: true };

/** Cómo sale un menor. "apodo" = apodo + avatar/iniciales, sin foto. "anonimo" = chip con el puesto, sin nombre, dorsal ni imagen. "oculto" = no se dibuja (como hoy). */
export type ModoMenor = "apodo" | "anonimo" | "oculto";

export const MENORES_EN_IMAGEN: Record<"whatsapp" | "story" | "og", ModoMenor> = { whatsapp: "apodo", story: "anonimo", og: "anonimo" };

/** El ayudante aparece al lado del DT. */
export const AYUDANTE_EN_IMAGEN = false;

/** El DT que juega (juega === true y está en el lineup) aparece en la cancha y también en la columna DT. */
export const DT_QUE_JUEGA_EN_LOS_DOS = true;

/** false: siempre se comparte el plan del equipo (event.planActivo ?? "a"). true: el plan que se está mirando, con kicker "PLAN B"/"PLAN C". */
export const COMPARTIR_PLAN_ALTERNATIVO = false;

/** Vista previa del link /vivo. "generica" = public/og.jpg. "subida" = la dibuja el celular del DT y la sube. */
export const OG_MODO: "generica" | "subida" = "generica";

/** Iniciales de un apodo de una sola palabra: 1 letra (como hoy) o 2 ("TH"). */
export const INICIALES_DOS_LETRAS = false;

export type FormatoAlineacion = "whatsapp" | "story" | "og";

type Pitch = { cx: number; top: number; bottom: number; wFar: number; wNear: number };

export type FormatoLienzo = {
  w: number;
  h: number;
  pitch: Pitch;
  rows: { tAtk: number; tArq: number };
  spread: number;
  sFar: number;
  chip: Record<string, number>;
  kind: "card" | "disc";
};

/** Mismas cuentas que design/cards/alineacion/alineacion.js. No inventar medidas. */
export const FORMATOS: Record<FormatoAlineacion, FormatoLienzo> = {
  whatsapp: {
    w: 1080,
    h: 1350,
    pitch: { cx: 540, top: 292, bottom: 1124, wFar: 700, wNear: 1010 },
    rows: { tAtk: 0.085, tArq: 0.9 },
    spread: 0.94,
    sFar: 0.88,
    chip: { f5: 180, f6: 175, f7: 170, f8: 156, f9: 146, f10: 140, f11: 136 },
    kind: "card",
  },
  story: {
    w: 1080,
    h: 1920,
    pitch: { cx: 540, top: 562, bottom: 1352, wFar: 720, wNear: 1010 },
    rows: { tAtk: 0.085, tArq: 0.9 },
    spread: 0.94,
    sFar: 0.88,
    chip: { f5: 176, f6: 171, f7: 166, f8: 152, f9: 142, f10: 136, f11: 132 },
    kind: "card",
  },
  og: {
    w: 1200,
    h: 630,
    pitch: { cx: 892, top: 60, bottom: 596, wFar: 430, wNear: 540 },
    rows: { tAtk: 0.1, tArq: 0.86 },
    spread: 0.92,
    sFar: 0.9,
    chip: { f5: 64, f6: 62, f7: 60, f8: 56, f9: 54, f10: 53, f11: 52 },
    kind: "disc",
  },
};

export const ASPECT = 1.28;

const TZ = "America/Argentina/Buenos_Aires";
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Punto = { x: number; y: number };
export type TrazoCancha = { puntos: Punto[]; cerrado: boolean };

export type SlotPuesto = Slot & { linea: number; s: number; w: number; h: number; k: number };

export type TemaAlineacion = {
  nombre: "neon" | "equipo";
  frame: [string, string, string, string];
  body: [string, string, string];
  ink: string;
  inkSoft: string;
  num: string;
  ribbon: string;
  ribbonInk: string;
  glow: string;
  trim: string;
  silueta: string;
  fondo: string;
  grass: [string, string];
  lines: string;
  accent: string;
  avatar: { primary: string; secondary: string };
};

export type PersonaEntrada = {
  id: string;
  name?: string;
  nick?: string;
  role?: "dt" | "ayudante" | "jugador";
  number?: number | null;
  photo?: string | null;
  menor?: boolean;
  juega?: boolean;
  avatar?: AvatarPersona | null;
};

export type EventoEntrada = {
  title: string;
  place?: string;
  startsAt: string;
  modality: Modality;
  opponent?: string;
  convocados?: string[];
  suplentes?: string[];
  formacion?: string;
};

export type PlanEntrada = {
  id: PlanId;
  lineup: Record<string, string>;
  formacion?: string;
};

export type ClubEntrada = {
  name: string;
  crest?: string | null;
  colores?: { primary: string; secondary: string } | null;
};

export type FichaTitular = {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  numero: number | null;
  nombre: string;
  imagen: ImagenPersona | null;
  anonimo: boolean;
  vacio: boolean;
};

export type FichaBanco = {
  id: string;
  nombre: string;
  numero: number | null;
  imagen: ImagenPersona | null;
  anonimo: boolean;
  rol: "banco" | "dt";
};

export type DatosAlineacion = {
  formato: FormatoAlineacion;
  ancho: number;
  alto: number;
  equipo: string;
  equipoIniciales: string;
  escudo: string | null;
  rival: string;
  fecha: string;
  hora: string;
  cancha: string;
  formatoCorto: string;
  esquema: string;
  kicker: string;
  temaNombre: "neon" | "equipo";
  colores: { primary: string; secondary: string } | null;
  titulares: FichaTitular[];
  banco: FichaBanco[];
  mas: number;
  dt: FichaBanco[];
};

export function lineas(slots: Slot[]): Slot[][] {
  const orden = slots.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const out: Slot[][] = [];
  for (const slot of orden) {
    const grupo = out[out.length - 1];
    if (!grupo || grupo[grupo.length - 1].y - slot.y > 9) out.push([slot]);
    else grupo.push(slot);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const grupo = out[i];
    const atras = out[i - 1];
    const abiertos = grupo.every((slot) => Math.abs(slot.x - 50) >= 30);
    if (abiertos && grupo[0].y >= atras[atras.length - 1].y - 12 && atras[0].key !== "ARQ") {
      out[i - 1] = atras.concat(grupo);
      out.splice(i, 1);
    }
  }
  return out;
}

export function proyectar(P: Pitch, u: number, t: number): { x: number; y: number; w: number } {
  const w = P.wFar + (P.wNear - P.wFar) * t;
  return { x: P.cx + (u - 0.5) * w, y: P.top + t * (P.bottom - P.top), w };
}

export function tDeV(P: Pitch, v: number): number {
  const r = P.wFar / P.wNear;
  const z = 1 / r + (1 - 1 / r) * v;
  return (1 / z - r) / (1 - r);
}

export function layout(slots: Slot[], formato: FormatoAlineacion | FormatoLienzo, modalidad: string): SlotPuesto[] {
  const F = typeof formato === "string" ? FORMATOS[formato] : formato;
  const P = F.pitch;
  const grupos = lineas(slots);
  const n = grupos.length;
  const base = F.chip[modalidad] || F.chip.f7;
  const out: SlotPuesto[] = [];
  grupos.forEach((grupo, i) => {
    const tRow = n === 1 ? F.rows.tArq : F.rows.tArq - (i * (F.rows.tArq - F.rows.tAtk)) / (n - 1);
    const media = grupo.reduce((suma, slot) => suma + slot.y, 0) / grupo.length;
    for (const slot of grupo) {
      const t = tRow + ((slot.y - media) / 100) * 0.55;
      const u = 0.5 + ((slot.x - 50) / 100) * F.spread;
      const p = proyectar(P, u, t);
      const crudo = F.sFar + (1 - F.sFar) * t;
      const s = +crudo.toFixed(3);
      out.push({
        key: slot.key,
        label: slot.label,
        x: Math.round(p.x),
        y: Math.round(p.y),
        s,
        w: base * crudo,
        h: base * ASPECT * crudo,
        linea: i,
        k: 1,
      });
    }
  });
  const gap = F.kind === "disc" ? 6 : 8;
  let k = 1;
  for (let a = 0; a < out.length; a++) {
    for (let b = a + 1; b < out.length; b++) {
      const A = out[a];
      const B = out[b];
      const fx = Math.abs(A.x - B.x) / ((A.w + B.w) / 2 + gap);
      const fy = Math.abs(A.y - B.y) / ((A.h + B.h) / 2 + gap);
      if (fx < 1 && fy < 1) k = Math.min(k, Math.max(fx, fy));
    }
  }
  const kFijo = +k.toFixed(3);
  for (const slot of out) {
    slot.w = Math.round(slot.w * k);
    slot.h = Math.round(slot.h * k);
    slot.k = kFijo;
  }
  return out;
}

function puntoDe(P: Pitch, u: number, v: number): Punto {
  const p = proyectar(P, u, tDeV(P, v));
  return { x: +p.x.toFixed(1), y: +p.y.toFixed(1) };
}

function elipse(P: Pitch, cu: number, cv: number, ru: number, rv: number, a0: number, a1: number): Punto[] {
  const pts: Punto[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    pts.push(puntoDe(P, cu + ru * Math.cos(a), cv + rv * Math.sin(a)));
  }
  return pts;
}

/** Polilíneas en px, para moveTo/lineTo. Mismas cuentas que pitchSvg. */
export function trazosCancha(formato: FormatoAlineacion): { bandas: Punto[][]; lineas: TrazoCancha[]; borde: Punto[]; luz: Punto } {
  const F = FORMATOS[formato];
  const P = F.pitch;
  const m = 0.035;
  const bandas: Punto[][] = [];
  for (let i = 0; i < 14; i++) {
    const v0 = -m + ((1 + 2 * m) * i) / 14;
    const v1 = -m + ((1 + 2 * m) * (i + 1)) / 14;
    bandas.push([
      puntoDe(P, -m, v0),
      puntoDe(P, 1 + m, v0),
      puntoDe(P, 1 + m, v1),
      puntoDe(P, -m, v1),
    ]);
  }
  const areaU = 0.622 / 2;
  const areaV = 0.138;
  const chicaU = 0.4 / 2;
  const chicaV = 0.0615;
  const ru = 0.133;
  const rv = 0.092;
  const poli = (pts: [number, number][]) => pts.map(([u, v]) => puntoDe(P, u, v));
  const lineas: TrazoCancha[] = [
    { puntos: poli([[0, 0], [1, 0], [1, 1], [0, 1]]), cerrado: true },
    { puntos: poli([[0, 0.5], [1, 0.5]]), cerrado: false },
    { puntos: elipse(P, 0.5, 0.5, ru, rv, 0, Math.PI * 2), cerrado: false },
    { puntos: poli([[0.5 - areaU, 0], [0.5 + areaU, 0], [0.5 + areaU, areaV], [0.5 - areaU, areaV]]), cerrado: true },
    { puntos: poli([[0.5 - chicaU, 0], [0.5 + chicaU, 0], [0.5 + chicaU, chicaV], [0.5 - chicaU, chicaV]]), cerrado: true },
    { puntos: poli([[0.5 - areaU, 1], [0.5 + areaU, 1], [0.5 + areaU, 1 - areaV], [0.5 - areaU, 1 - areaV]]), cerrado: true },
    { puntos: poli([[0.5 - chicaU, 1], [0.5 + chicaU, 1], [0.5 + chicaU, 1 - chicaV], [0.5 - chicaU, 1 - chicaV]]), cerrado: true },
  ];
  if (F.kind !== "disc") {
    lineas.push(
      { puntos: elipse(P, 0.5, areaV, ru * 0.62, rv * 0.62, 0.18 * Math.PI, 0.82 * Math.PI), cerrado: false },
      { puntos: elipse(P, 0.5, 1 - areaV, ru * 0.62, rv * 0.62, 1.18 * Math.PI, 1.82 * Math.PI), cerrado: false },
    );
  }
  const borde = poli([[-m, -m], [1 + m, -m], [1 + m, 1 + m], [-m, 1 + m]]);
  const c = proyectar(P, 0.5, tDeV(P, 0.5));
  return { bandas, lineas, borde, luz: { x: c.x, y: c.y } };
}

function hex(color: string): [number, number, number] {
  let c = color.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16)) as [number, number, number];
}

function toHex(a: number[]): string {
  return (
    "#" +
    a
      .map((x) =>
        Math.max(0, Math.min(255, Math.round(x)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.map((x, i) => x + (B[i] - x) * t));
}

export function lum(c: string): number {
  const a = hex(c).map((x) => {
    const n = x / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contraste(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function coloresValidos(x: unknown): { primary: string; secondary: string } | null {
  if (!x || typeof x !== "object") return null;
  const raw = x as { primary?: unknown; secondary?: unknown };
  const ok = (c: unknown) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
  if (!ok(raw.primary) || !ok(raw.secondary)) return null;
  return { primary: String(raw.primary).toLowerCase(), secondary: String(raw.secondary).toLowerCase() };
}

/** Un color inválido no pisa al que ya estaba. null lo borra. Si el campo no viene, queda el anterior. */
export function coloresDelEquipo(
  incoming: unknown,
  existing: { primary: string; secondary: string } | null | undefined,
): { primary: string; secondary: string } | null {
  if (incoming === undefined) return existing ?? null;
  if (incoming === null) return null;
  return coloresValidos(incoming) ?? existing ?? null;
}

export function tema(nombre: "neon" | "equipo", colores?: { primary: string; secondary: string } | null): TemaAlineacion {
  if (nombre !== "equipo" || !colores) {
    return {
      nombre: "neon",
      frame: ["#f6ffd9", "#b8f25a", "#6aa824", "#d9ff9a"],
      body: ["#24603a", "#0f2c1b", "#061109"],
      ink: "#eef6ef",
      inkSoft: "#b9d4c2",
      num: "#b8f25a",
      ribbon: "#b8f25a",
      ribbonInk: "#0c1a10",
      glow: "rgba(184,242,90,.45)",
      trim: "rgba(184,242,90,.55)",
      silueta: "#2c6a42",
      fondo: "#24603a",
      grass: ["#1d5c36", "#195231"],
      lines: "rgba(232,243,234,.62)",
      accent: "#b8f25a",
      avatar: { primary: "#1f6f3f", secondary: "#b8f25a" },
    };
  }
  const p = colores.primary;
  const s = colores.secondary;
  const cuerpo = lum(p) < 0.02 ? mix(p, s, 0.28) : p;
  const acento = contraste(s, "#0b1c12") >= 3 ? s : mix(s, "#ffffff", 0.45);
  const ribbonInk = contraste(acento, "#0c1a10") >= 4.5 ? "#0c1a10" : "#ffffff";
  const cuerpoMedio = mix(cuerpo, "#000", 0.38);
  const numero = contraste(acento, cuerpoMedio) >= 3 ? acento : mix(acento, "#fff", 0.82);
  return {
    nombre: "equipo",
    frame: [mix(acento, "#fff", 0.72), acento, mix(acento, "#000", 0.42), mix(acento, "#fff", 0.4)],
    body: [mix(cuerpo, "#fff", 0.12), mix(cuerpo, "#000", 0.38), mix(cuerpo, "#000", 0.78)],
    ink: "#ffffff",
    inkSoft: mix(acento, "#fff", 0.55),
    num: numero,
    ribbon: acento,
    ribbonInk,
    glow: `rgba(${hex(acento).join(",")},.42)`,
    trim: `rgba(${hex(acento).join(",")},.6)`,
    silueta: mix(cuerpo, "#fff", 0.18),
    fondo: cuerpo,
    grass: ["#1b5332", "#174a2c"],
    lines: "rgba(240,244,240,.6)",
    accent: acento,
    avatar: { primary: p, secondary: s },
  };
}

/** Apodo, nunca el nombre real. Si no hay apodo: "Jugador". */
export function nombrePublico(m: { nick?: string | null }): string {
  return (m.nick ?? "").trim().slice(0, 24) || "Jugador";
}

export function inicialesPublicas(m: { nick?: string | null }): string {
  const nombre = nombrePublico(m);
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (INICIALES_DOS_LETRAS && partes.length === 1) return partes[0].slice(0, 2).toUpperCase() || "J";
  const letras = ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
  return letras || "J";
}

/** Foto solo si se pidió y no es menor. Si no hay foto: avatar y, si no, iniciales del apodo. */
export function imagenPublica(m: PersonaEntrada, fotoNitida: string | null | undefined, conFotos: boolean): ImagenPersona {
  const pedirFoto = conFotos && m.menor !== true;
  const base = imagenDe(
    {
      id: m.id,
      name: m.name,
      nick: m.nick,
      menor: m.menor,
      photo: pedirFoto ? m.photo : null,
      avatar: m.avatar,
    },
    pedirFoto ? fotoNitida : null,
  );
  if (base.tipo === "foto") return base;
  if (base.tipo === "avatar" && m.avatar) return { tipo: "avatar", avatar: m.avatar };
  return { tipo: "iniciales", letras: inicialesPublicas(m) };
}

export function rivalDe(event: { title: string; opponent?: string | null }, sheet?: { opponent?: string | null } | null): string {
  return event.opponent?.trim() || sheet?.opponent?.trim() || event.title.replace(/^\s*vs\.?\s+/i, "").trim();
}

export function esquemaDe(forma: { name: string }): string {
  return forma.name.replace(/\s*\([^)]*\)/g, "").trim();
}

type PartesDia = { y: number; m: number; d: number; wd: number; hh: string; mm: string };

function partesBA(iso: string | number | Date): PartesDia | null {
  const fecha = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const wd = SEMANA.indexOf(get("weekday"));
  const hh = get("hour") === "24" ? "00" : get("hour");
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), wd, hh, mm: get("minute") };
}

function diaSerial(p: PartesDia): number {
  return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86_400_000);
}

export function fechaCorta(startsAt: string): string {
  const p = partesBA(startsAt);
  if (!p) return "";
  const dia = String(p.d).padStart(2, "0");
  const mes = String(p.m).padStart(2, "0");
  return `${DIAS_CORTOS[p.wd] ?? "Día"} ${dia}/${mes}`;
}

export function horaCorta(startsAt: string): string {
  const p = partesBA(startsAt);
  if (!p) return "";
  return `${p.hh}:${p.mm}`;
}

export function cuandoTexto(startsAt: string, now: number | Date = Date.now()): string {
  const partido = partesBA(startsAt);
  const hoy = partesBA(now instanceof Date ? now : new Date(now));
  if (!partido) return "pronto";
  const fecha = `el ${partido.d}/${String(partido.m).padStart(2, "0")}`;
  if (!hoy) return fecha;
  const diff = diaSerial(partido) - diaSerial(hoy);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff >= 2 && diff <= 6) return `el ${DIAS_LARGOS[partido.wd] ?? "día"}`;
  return fecha;
}

export function textoAlineacion(input: { rival: string; startsAt: string; link?: string; now?: number | Date }): string {
  const cuando = cuandoTexto(input.startsAt, input.now ?? Date.now());
  const base = `Así salimos ${cuando} vs ${input.rival} ⚽`;
  if (input.link) return `${base} Mirá la formación: ${input.link}`;
  return `${base} Armado en Mi Vestuario.`;
}

function slug(texto: string): string {
  const limpio = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return limpio || "equipo";
}

export function archivoAlineacion(input: { equipo: string; rival: string; startsAt: string; formato: "whatsapp" | "story" }): string {
  const p = partesBA(input.startsAt);
  const fecha = p ? `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}` : "fecha";
  return `mi-vestuario-formacion-${slug(input.equipo)}-vs-${slug(input.rival)}-${fecha}-${input.formato}.png`;
}

function formaDe(modality: Modality, id?: string): Formation {
  const lista = FORMATIONS[modality];
  return lista.find((item) => item.id === id) ?? lista[0];
}

function kickerDe(id: PlanId): string {
  if (id === "b") return "PLAN B";
  if (id === "c") return "PLAN C";
  return "ASÍ SALIMOS";
}

function fichaPersona(m: PersonaEntrada, foto: string | undefined, conFotos: boolean, modo: ModoMenor, rol: "banco" | "dt"): FichaBanco | null {
  if (m.menor && modo === "oculto") return null;
  if (m.menor && modo === "anonimo") {
    return { id: m.id, nombre: "", numero: null, imagen: null, anonimo: true, rol };
  }
  return {
    id: m.id,
    nombre: nombrePublico(m),
    numero: m.number ?? null,
    imagen: imagenPublica(m, foto, conFotos),
    anonimo: false,
    rol,
  };
}

export function armarAlineacion(input: {
  formato: FormatoAlineacion;
  event: EventoEntrada;
  plan: PlanEntrada;
  forma?: Formation;
  members: PersonaEntrada[];
  club: ClubEntrada;
  sheet?: { opponent?: string | null } | null;
  fotosCard?: Record<string, string | null | undefined>;
  conFotos?: boolean;
  tema: "neon" | "equipo";
  link?: string;
  now?: number | Date;
  /** Solo para tests. En la app manda MENORES_EN_IMAGEN. */
  menores?: ModoMenor;
}): DatosAlineacion {
  const formato = input.formato;
  const F = FORMATOS[formato];
  const forma = input.forma ?? formaDe(input.event.modality, input.plan.formacion || input.event.formacion);
  const puestos = layout(forma.slots, formato, input.event.modality);
  const modo = input.menores ?? MENORES_EN_IMAGEN[formato];
  const conFotos = input.conFotos === true && formato !== "og";
  const fotos = input.fotosCard ?? {};
  const porId = new Map(input.members.map((m) => [m.id, m]));
  const esOg = formato === "og";
  const titulares: FichaTitular[] = [];

  for (const slot of puestos) {
    const member = porId.get(input.plan.lineup[slot.key] ?? "");
    if (!member) {
      if (!esOg) continue;
      titulares.push({
        key: slot.key,
        label: slot.label,
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        numero: null,
        nombre: "",
        imagen: null,
        anonimo: true,
        vacio: true,
      });
      continue;
    }
    if (member.menor && modo === "oculto") continue;
    const anonimo = member.menor === true && modo === "anonimo";
    let imagen: ImagenPersona | null = esOg || anonimo ? null : imagenPublica(member, fotos[member.id], conFotos);
    if (imagen?.tipo === "foto" && member.menor) imagen = { tipo: "iniciales", letras: inicialesPublicas(member) };
    titulares.push({
      key: slot.key,
      label: slot.label,
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
      numero: esOg && member.menor ? null : anonimo ? null : (member.number ?? null),
      nombre: esOg || anonimo ? "" : nombrePublico(member),
      imagen,
      anonimo: esOg || anonimo,
      vacio: esOg && (anonimo || member.menor === true),
    });
  }
  titulares.sort((a, b) => a.y - b.y || a.x - b.x);

  const enCancha = new Set(Object.values(input.plan.lineup));
  const convocados = input.event.convocados;
  const bancoCrudo = (input.event.suplentes ?? []).filter((id) => {
    if (enCancha.has(id)) return false;
    const persona = porId.get(id);
    if (!persona) return false;
    if (convocados && !convocados.includes(id)) return false;
    return true;
  });
  const bancoTodas = esOg
    ? []
    : bancoCrudo
        .map((id) => fichaPersona(porId.get(id) as PersonaEntrada, fotos[id] ?? undefined, conFotos, modo, "banco"))
        .filter((ficha): ficha is FichaBanco => Boolean(ficha));
  const banco = bancoTodas.length > 7 ? bancoTodas.slice(0, 6) : bancoTodas;
  const mas = bancoTodas.length > 7 ? bancoTodas.length - 6 : 0;

  const dt = esOg
    ? []
    : input.members
        .filter((m) => {
          if (m.role === "dt") {
            const juegaYEsta = m.juega === true && enCancha.has(m.id);
            if (juegaYEsta && !DT_QUE_JUEGA_EN_LOS_DOS) return false;
            return true;
          }
          return AYUDANTE_EN_IMAGEN && m.role === "ayudante";
        })
        .map((m) => fichaPersona(m, fotos[m.id] ?? undefined, conFotos, modo, "dt"))
        .filter((ficha): ficha is FichaBanco => Boolean(ficha));

  const colores = input.tema === "equipo" ? coloresValidos(input.club.colores) : null;
  const escudo = input.club.crest?.startsWith("data:image/") ? input.club.crest : null;

  return {
    formato,
    ancho: F.w,
    alto: F.h,
    equipo: input.club.name.trim() || "Equipo",
    equipoIniciales: initials(input.club.name) || "EQ",
    escudo,
    rival: rivalDe(input.event, input.sheet),
    fecha: fechaCorta(input.event.startsAt),
    hora: horaCorta(input.event.startsAt),
    cancha: (input.event.place ?? "").trim(),
    formatoCorto: MODALITY_SHORT[input.event.modality],
    esquema: esquemaDe(forma),
    kicker: kickerDe(input.plan.id),
    temaNombre: colores ? "equipo" : "neon",
    colores,
    titulares,
    banco,
    mas,
    dt,
  };
}
