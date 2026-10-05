import type { ClubEvent, MatchSheet, Member } from "./types";

export type TarjetaInput = {
  club: string;
  event: ClubEvent;
  sheet: MatchSheet;
  player: Member;
  puesto: string;
  goles: number;
  figura: boolean;
};

export async function dibujarTarjeta(input: TarjetaInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la tarjeta.");
  ctx.fillStyle = "#143024";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#1f5c3a";
  ctx.fillRect(0, 0, 1080, 280);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 42px sans-serif";
  ctx.fillText("Mi Vestuario", 72, 110);
  ctx.font = "500 36px sans-serif";
  ctx.fillText(recortar(ctx, input.club, 900), 72, 180);
  ctx.fillStyle = "#d6f5e3";
  ctx.font = "600 64px sans-serif";
  const marcador = `${input.sheet.goalsFor}–${input.sheet.goalsAgainst}`;
  ctx.fillText(marcador, 72, 400);
  ctx.font = "500 40px sans-serif";
  ctx.fillStyle = "#f4f1ea";
  ctx.fillText(recortar(ctx, input.event.title, 900), 72, 480);
  const photo = !input.player.menor && input.player.photo?.startsWith("data:image/") ? input.player.photo : null;
  if (photo) {
    try {
      const image = await cargar(photo);
      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 700, 96, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, 84, 604, 192, 192);
      ctx.restore();
    } catch {
      // Sin foto, la tarjeta igual sale.
    }
  }
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "700 72px sans-serif";
  ctx.fillText(recortar(ctx, input.player.nick || input.player.name, 860), 72, 900);
  ctx.font = "500 40px sans-serif";
  ctx.fillStyle = "#d6f5e3";
  const linea = [input.puesto, input.goles === 1 ? "1 gol" : input.goles > 1 ? `${input.goles} goles` : ""]
    .filter(Boolean)
    .join(" · ");
  if (linea) ctx.fillText(linea, 72, 980);
  if (input.figura) {
    ctx.fillStyle = "#e7f56a";
    ctx.fillRect(72, 1040, 420, 88);
    ctx.fillStyle = "#143024";
    ctx.font = "700 40px sans-serif";
    ctx.fillText("Figura del partido", 96, 1096);
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo armar la tarjeta.");
  return blob;
}

export async function compartirTarjeta(input: TarjetaInput): Promise<"shared" | "saved"> {
  const blob = await dibujarTarjeta(input);
  const file = new File([blob], "mi-vestuario.png", { type: "image/png" });
  const text = input.figura
    ? `${input.player.nick} fue la figura. ${input.event.title}, ${input.sheet.goalsFor}–${input.sheet.goalsAgainst}.`
    : `${input.player.nick} jugó ${input.event.title}. ${input.sheet.goalsFor}–${input.sheet.goalsAgainst}.`;
  try {
    if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ files: [file], title: "Mi Vestuario", text });
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mi-vestuario.png";
  link.click();
  URL.revokeObjectURL(url);
  return "saved";
}

function recortar(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > max) next = next.slice(0, -1);
  return `${next}…`;
}

function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("foto"));
    image.src = src;
  });
}
