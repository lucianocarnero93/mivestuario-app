export type EstadoMarcador = "espera" | "juego" | "final";

export function estadoMarcador(
  event: { startsAt: string; resultClosedAt?: string | null },
  now = Date.now(),
): EstadoMarcador {
  if (event.resultClosedAt) return "final";
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start) || start > now) return "espera";
  return "juego";
}

export function sanitizeLiveToken(value: unknown): string {
  const token = String(value ?? "");
  return /^[a-f0-9]{32}$/.test(token) ? token : "";
}
