export const CLASES_FLECHA = ["pase", "desmarque", "presion", "cobertura", "conduccion"] as const;

export type ClaseFlecha = (typeof CLASES_FLECHA)[number];

export type Trazo =
  | { id: string; tipo: "flecha"; clase: ClaseFlecha; x1: number; y1: number; x2: number; y2: number }
  | { id: string; tipo: "zona"; x: number; y: number }
  | { id: string; tipo: "texto"; x: number; y: number; texto: string };

export type PasoJugada = {
  id: string;
  nota: string;
  trazos: Trazo[];
};

export type Jugada = {
  pasos: PasoJugada[];
  updatedAt: string;
};

const MAX_PASOS = 5;
const MAX_TRAZOS = 8;

function cota(value: unknown): number {
  const numero = Number(value);
  if (!Number.isFinite(numero)) return 0;
  return Math.min(100, Math.max(0, Math.round(numero)));
}

function palabras(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
    .slice(0, 24);
}

function marca(value: Jugada | undefined): number {
  const tiempo = value?.updatedAt ? Date.parse(value.updatedAt) : 0;
  return Number.isFinite(tiempo) ? tiempo : 0;
}

function leerTrazo(value: unknown): Trazo | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { id?: unknown; tipo?: unknown; clase?: unknown; texto?: unknown };
  const id = String(row.id ?? "").slice(0, 16);
  if (!id) return null;
  if (row.tipo === "flecha" && CLASES_FLECHA.includes(row.clase as ClaseFlecha)) {
    const flecha = row as { x1?: unknown; y1?: unknown; x2?: unknown; y2?: unknown };
    return {
      id,
      tipo: "flecha",
      clase: row.clase as ClaseFlecha,
      x1: cota(flecha.x1),
      y1: cota(flecha.y1),
      x2: cota(flecha.x2),
      y2: cota(flecha.y2),
    };
  }
  if (row.tipo === "zona") {
    const zona = row as { x?: unknown; y?: unknown };
    return { id, tipo: "zona", x: cota(zona.x), y: cota(zona.y) };
  }
  if (row.tipo === "texto") {
    const texto = palabras(row.texto);
    if (!texto) return null;
    const punto = row as { x?: unknown; y?: unknown };
    return { id, tipo: "texto", x: cota(punto.x), y: cota(punto.y), texto };
  }
  return null;
}

export function sanitizeJugada(value: unknown): Jugada | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { pasos?: unknown; updatedAt?: unknown };
  const updatedAt = String(raw.updatedAt ?? "");
  const valida = Number.isFinite(Date.parse(updatedAt));
  const pasos: PasoJugada[] = [];
  if (Array.isArray(raw.pasos)) {
    for (const paso of raw.pasos.slice(0, MAX_PASOS)) {
      if (!paso || typeof paso !== "object") continue;
      const row = paso as { id?: unknown; nota?: unknown; trazos?: unknown };
      const trazos: Trazo[] = [];
      const lista = Array.isArray(row.trazos) ? row.trazos : [];
      for (const item of lista.slice(0, MAX_TRAZOS)) {
        const trazo = leerTrazo(item);
        if (trazo) trazos.push(trazo);
      }
      pasos.push({
        id: String(row.id ?? "").slice(0, 16) || `p${pasos.length + 1}`,
        nota: String(row.nota ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
        trazos,
      });
    }
  }
  if (!pasos.length && !valida) return undefined;
  if (!valida) return { pasos, updatedAt: "" };
  return { pasos, updatedAt };
}

export function preferirJugada(previous: Jugada | undefined, incoming: Jugada | undefined): Jugada | undefined {
  if (marca(incoming) >= marca(previous)) return sanitizeJugada(incoming);
  return sanitizeJugada(previous);
}

export function jugadaVisible(jugada: Jugada | undefined): PasoJugada[] {
  return (sanitizeJugada(jugada)?.pasos ?? []).filter((paso) => paso.nota || paso.trazos.length > 0);
}
