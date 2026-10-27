import type { StateStorage } from "zustand/middleware";
import { DEMO } from "./demo-flag.ts";

export const CLAVE_DEMO = "mi-vestuario-demo";
export const CLAVE_REAL = "mi-vestuario-v6";

type Nube = (...args: unknown[]) => unknown;

let forzar: boolean | null = null;
const dobles = new Map<string, Nube>();
const intentos: string[] = [];

export function esDemo(): boolean {
  return forzar ?? DEMO;
}

/** El test prende o apaga el demo sin el build de Vite. null vuelve a la bandera real. */
export function simularDemo(valor: boolean | null) {
  forzar = valor;
  intentos.length = 0;
}

export function ponerDoble(nombre: string, fn: Nube | null) {
  if (fn) dobles.set(nombre, fn);
  else dobles.delete(nombre);
}

export function intentosDemo(): string[] {
  return [...intentos];
}

/** Único corte: en demo no se llama a la función real de la nube. */
export function cortarNube<T>(nombre: string, real: T): T {
  const fn = real as Nube;
  const wrapped = (...args: unknown[]) => {
    if (esDemo()) {
      intentos.push(nombre);
      const doble = dobles.get(nombre);
      if (doble) return doble(...args);
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

function cajaMemoria(): Caja {
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

function cajaNavegador(): Caja {
  if (typeof sessionStorage === "undefined") return cajaMemoria();
  return sessionStorage;
}

/**
 * El persist sigue llamándose mi-vestuario-v6.
 * Esta caja ignora ese nombre y usa solo la clave del demo, nunca localStorage.
 */
export function storageDemo(caja: Caja = cajaNavegador()): StateStorage {
  return {
    getItem(_name) {
      return caja.getItem(CLAVE_DEMO);
    },
    setItem(_name, value) {
      caja.setItem(CLAVE_DEMO, value);
    },
    removeItem(_name) {
      caja.removeItem(CLAVE_DEMO);
    },
  };
}
