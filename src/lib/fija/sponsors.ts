export const SPONSORS_ACTIVO = false;

export type Sponsor = {
  id: string;
  nombre: string;
  logoUrl: string;
  link?: string;
  activo: boolean;
};

/** Misma origen: path propio o data URL. Nada de un servidor de anuncios. */
export function logoPropio(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  return url.startsWith("data:image/");
}

export function sponsorsVisibles(lista: Sponsor[] | undefined): Sponsor[] {
  if (!SPONSORS_ACTIVO) return [];
  return (lista ?? [])
    .filter((item) => item.activo && item.nombre.trim() && logoPropio(item.logoUrl))
    .slice(0, 3)
    .map((item) => ({
      ...item,
      nombre: item.nombre.trim().slice(0, 40),
      link: item.link && /^https:\/\//.test(item.link) ? item.link : undefined,
    }));
}

// TODO: antes de poner SPONSORS_ACTIVO en true, revisar la política de privacidad.
// Nunca habilitar redes de anuncios en equipos con menores.
