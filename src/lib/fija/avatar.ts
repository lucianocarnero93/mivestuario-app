export const COLORES_DEFAULT = { primary: "#1f6f3f", secondary: "#b8f25a" };

export type AvatarPersona = {
  piel?: string;
  pelo?: string;
};

export function avatarSvg(
  avatar: AvatarPersona | null | undefined,
  colores: { primary: string; secondary: string },
  opciones: { uid: string; size: number },
): string {
  const size = Math.max(64, opciones.size);
  const piel = avatar?.piel || "#f1c7a2";
  const pelo = avatar?.pelo || "#1c140f";
  const variante = (opciones.uid.charCodeAt(0) || 1) % 3;
  const peloPath =
    variante === 0
      ? "M148 196 C148 96 332 96 332 196 C304 150 176 150 148 196 Z"
      : variante === 1
        ? "M156 210 C140 70 340 80 328 214 C300 120 180 120 156 210 Z"
        : "M150 188 C150 108 330 108 330 188 L300 168 L180 168 Z";
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 480 480"><path d="M36 520 C48 300 118 246 240 244 C362 246 432 300 444 520 Z" fill="${colores.secondary}" stroke="${colores.primary}" stroke-width="10"/><circle cx="240" cy="196" r="96" fill="${piel}"/><path d="${peloPath}" fill="${pelo}"/><circle cx="208" cy="198" r="8" fill="#1c140f"/><circle cx="272" cy="198" r="8" fill="#1c140f"/><path d="M214 236 Q240 256 266 236" fill="none" stroke="#1c140f" stroke-width="6" stroke-linecap="round"/></svg>`;
}
