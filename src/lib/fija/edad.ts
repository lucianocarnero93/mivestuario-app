const KEY = "mv-menor";

export function rememberMenor(menor: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, menor ? "1" : "0");
}

export function readMenor(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
