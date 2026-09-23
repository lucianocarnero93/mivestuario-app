import type { StateStorage } from "zustand/middleware";

const memory = new Map<string, string>();
let available: boolean | null = null;

function canUseLocalStorage(): boolean {
  if (available != null) return available;
  try {
    if (typeof localStorage === "undefined") {
      available = false;
      return false;
    }
    const probe = "__cancha_fija_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    available = true;
    return true;
  } catch {
    available = false;
    return false;
  }
}

export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      if (canUseLocalStorage()) {
        const value = localStorage.getItem(name);
        if (value != null) {
          memory.set(name, value);
          return value;
        }
      }
    } catch {
      available = false;
    }
    return memory.get(name) ?? null;
  },
  setItem(name, value) {
    memory.set(name, value);
    try {
      if (canUseLocalStorage()) localStorage.setItem(name, value);
    } catch {
      available = false;
    }
  },
  removeItem(name) {
    memory.delete(name);
    try {
      if (canUseLocalStorage()) localStorage.removeItem(name);
    } catch {
      available = false;
    }
  },
};
