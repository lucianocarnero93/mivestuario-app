import type { StateStorage } from "zustand/middleware";
import { DEMO } from "./demo-flag.ts";

export const CLAVE_DEMO = "mi-vestuario-demo";
export const CLAVE_REAL = "mi-vestuario-v6";

let forzar: boolean | null = null;

export function esDemo(): boolean {
  return forzar ?? DEMO;
}

/** El test prende o apaga el demo sin el build de Vite. */
export function simularDemo(valor: boolean | null) {
  forzar = valor;
}

/** En demo no se llama a la función real de la nube. */
export function cortarNube<T>(nombre: string, real: T): T {
  const fn = real as (...args: unknown[]) => unknown;
  const wrapped = (...args: unknown[]) => {
    if (esDemo()) {
      void nombre;
      return Promise.resolve({ ok: false, error: "Modo demo: no se guarda nada" });
    }
    return fn(...args);
  };
  return wrapped as T;
}

type Caja = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function cajaNavegador(): Caja {
  if (typeof sessionStorage === "undefined") {
    const datos = new Map<string, string>();
    return {
      getItem: (key) => datos.get(key) ?? null,
      setItem: (key, value) => {
        datos.set(key, value);
      },
      removeItem: (key) => {
        datos.delete(key);
      },
    };
  }
  return sessionStorage;
}

/**
 * El persist sigue llamándose mi-vestuario-v6.
 * Esta caja ignora ese nombre y usa solo la clave del demo, nunca localStorage.
 */
export function storageDemo(caja: Caja = cajaNavegador()): StateStorage {
  return {
    getItem() {
      return caja.getItem(CLAVE_DEMO);
    },
    setItem(_name, value) {
      caja.setItem(CLAVE_DEMO, value);
    },
    removeItem() {
      caja.removeItem(CLAVE_DEMO);
    },
  };
}
