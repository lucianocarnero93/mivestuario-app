import { enviar } from "./lienzo.ts";

export type StoryKind = "convocados" | "vivo" | "final" | "figura";

export async function compartirStory(input: {
  kind: StoryKind;
  club: string;
  titulo: string;
  marcador: string;
  detalle: string;
}): Promise<"shared" | "saved"> {
  const blob = await dibujarStory(input);
  return enviar(blob, "fecha.png", textoStory(input), { copiarTexto: true });
}

function textoStory(input: { kind: StoryKind; titulo: string; marcador: string; detalle: string }): string {
  if (input.kind === "convocados") return `Convocados para ${input.titulo}. ${input.detalle}`;
  if (input.kind === "figura") return `Figura de ${input.titulo}: ${input.detalle}.`;
  if (input.kind === "final") return `Final ${input.titulo}: ${input.marcador}. ${input.detalle}`;
  return `${input.titulo} va ${input.marcador}. ${input.detalle}`;
}

async function dibujarStory(input: {
  kind: StoryKind;
  club: string;
  titulo: string;
  marcador: string;
  detalle: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la imagen.");
  ctx.fillStyle = "#10281c";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#1f5c3a";
  ctx.fillRect(0, 0, 1080, 360);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 48px sans-serif";
  ctx.fillText("Mi Vestuario", 72, 150);
  ctx.font = "500 40px sans-serif";
  ctx.fillText(cortar(ctx, input.club, 900), 72, 230);
  ctx.fillStyle = "#e7f56a";
  ctx.font = "700 42px sans-serif";
  const titulo = input.kind === "convocados" ? "CONVOCADOS" : input.kind === "figura" ? "FIGURA" : input.kind === "final" ? "FINAL" : "EN JUEGO";
  ctx.fillText(titulo, 72, 480);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "700 92px sans-serif";
  ctx.fillText(cortar(ctx, input.kind === "convocados" ? input.titulo : input.marcador, 920), 72, 680);
  ctx.font = "500 48px sans-serif";
  ctx.fillText(cortar(ctx, input.kind === "convocados" ? input.detalle : input.titulo, 920), 72, 820);
  ctx.font = "500 42px sans-serif";
  ctx.fillStyle = "#d6f5e3";
  envolver(ctx, input.detalle, 72, 960, 920, 64);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo armar la imagen.");
  return blob;
}

function cortar(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
}

function envolver(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, alto: number) {
  const palabras = text.split(" ");
  let linea = "";
  let cursor = y;
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > max) {
      ctx.fillText(linea, x, cursor);
      linea = palabra;
      cursor += alto;
      if (cursor > 1600) return;
    } else linea = prueba;
  }
  if (linea) ctx.fillText(linea, x, cursor);
}
