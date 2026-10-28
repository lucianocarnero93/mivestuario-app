export function avisarDemo(texto: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mv-demo-aviso", { detail: texto }));
}
