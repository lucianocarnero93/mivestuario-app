const TAGS = /<\/?[^>]+>/g;

/** Indicación del DT a un puesto. No recorta el espacio del final: si no, no se puede seguir escribiendo. */
export const NOTA_JUGADOR_MAX = 80;

/** Charla para todo el equipo, debajo de la pizarra. Más larga que la de un puesto, con tope. */
export const TACTICA_EQUIPO_MAX = 420;

export function notaDeJugador(raw: string, max = NOTA_JUGADOR_MAX): string {
  return raw
    .replace(TAGS, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .slice(0, max);
}

export function sanitizeText(raw: string, max = 280): string {
  return raw
    .replace(TAGS, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
}

export function sanitizeName(raw: string): string {
  return sanitizeText(raw, 40);
}
