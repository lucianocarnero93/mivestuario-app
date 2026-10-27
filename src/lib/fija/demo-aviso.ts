const AVISO = "mv-demo-aviso";

export function avisarDemo(texto: string) {
  if (typeof window === "undefined") return;
  const detail = texto.startsWith("En la demo no se manda nada")
    ? texto
    : `En la demo no se manda nada\n${texto}`;
  window.dispatchEvent(new CustomEvent(AVISO, { detail }));
}

export function escucharDemo(onAviso: (texto: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    onAviso(String((event as CustomEvent<string>).detail ?? ""));
  };
  window.addEventListener(AVISO, handler);
  return () => window.removeEventListener(AVISO, handler);
}
