export type NotaJugada = {
  id: string;
  texto: string;
  audio: boolean;
};

export type Jugada = {
  notas: NotaJugada[];
  updatedAt: string;
};

const MAX_NOTAS = 6;

function marca(value: Jugada | undefined): number {
  const tiempo = value?.updatedAt ? Date.parse(value.updatedAt) : 0;
  return Number.isFinite(tiempo) ? tiempo : 0;
}

export function sanitizeJugada(value: unknown): Jugada | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { notas?: unknown; updatedAt?: unknown };
  const updatedAt = String(raw.updatedAt ?? "");
  const valida = Number.isFinite(Date.parse(updatedAt));
  const notas: NotaJugada[] = [];
  if (Array.isArray(raw.notas)) {
    for (const item of raw.notas.slice(0, MAX_NOTAS)) {
      if (!item || typeof item !== "object") continue;
      const row = item as { id?: unknown; texto?: unknown; audio?: unknown };
      const id = String(row.id ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16);
      if (!id) continue;
      notas.push({
        id,
        texto: String(row.texto ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 160),
        audio: row.audio === true,
      });
    }
  }
  if (!notas.length && !valida) return undefined;
  return { notas, updatedAt: valida ? updatedAt : "" };
}

export function preferirJugada(previous: Jugada | undefined, incoming: Jugada | undefined): Jugada | undefined {
  if (marca(incoming) >= marca(previous)) return sanitizeJugada(incoming);
  return sanitizeJugada(previous);
}

export function notasVisibles(jugada: Jugada | undefined): NotaJugada[] {
  return (sanitizeJugada(jugada)?.notas ?? []).filter((nota) => nota.texto.trim() || nota.audio);
}
