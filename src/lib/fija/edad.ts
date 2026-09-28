const KEY = "mv-menor";
const PEDIR_KEY = "mv-pedir-edad";

export function rememberMenor(menor: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, menor ? "1" : "0");
}

export function readMenor(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function rememberPedirEdad() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PEDIR_KEY, "1");
}

export function clearPedirEdad() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PEDIR_KEY);
}

export function readPedirEdad(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PEDIR_KEY) === "1";
}

/** Años cumplidos. Null si la fecha no existe o es futura. No se guarda. */
export function edadEnAnios(isoDate: string, hoy = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900) return null;
  const born = new Date(year, month - 1, day);
  if (born.getFullYear() !== year || born.getMonth() !== month - 1 || born.getDate() !== day) return null;
  const today = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (born > today) return null;
  let age = today.getFullYear() - year;
  const birthday = new Date(today.getFullYear(), month - 1, day);
  if (today < birthday) age -= 1;
  return age;
}

export function esMenor(isoDate: string, hoy = new Date()): boolean | null {
  const age = edadEnAnios(isoDate, hoy);
  if (age === null) return null;
  return age < 18;
}
