/** Bandera del modo demo. En Node no hay Vite: si la lectura falla, no es demo. */
export function leerDemo(env: { VITE_DEMO?: string } | null | undefined): boolean {
  return env?.VITE_DEMO === "1";
}

function envDeVite(): { VITE_DEMO?: string } | undefined {
  try {
    const valor = import.meta.env.VITE_DEMO;
    return typeof valor === "string" ? { VITE_DEMO: valor } : undefined;
  } catch {
    return undefined;
  }
}

export const DEMO: boolean = leerDemo(envDeVite());
