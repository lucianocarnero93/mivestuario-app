import { FORMATIONS } from "./formations.ts";
import type { ClubEvent, MatchSheet, Member, Modality } from "./types.ts";

const LIMA = "#b8f25a";
const BOSQUE = "#0b1c12";
const TINTA = "#eef6ef";
const MUDO = "#9bb5a4";
const ANCHO = 1080;
const ALTO = 1350;

export type TarjetaInput = {
  club: string;
  event: ClubEvent;
  sheet: MatchSheet;
  player: Member;
  puesto: string;
  goles: number;
  figura: boolean;
};

export type TarjetaEquipoInput = {
  club: string;
  titulo: string;
  marcador: string;
  lugar?: string;
  formacion?: string;
  detalle?: string;
  foto?: string | null;
};

type PartidoMin = {
  modality: Modality;
  formacion?: string;
  lineup: Record<string, string>;
  suplentes?: string[];
};

export function nombreEnTarjeta(player: { nick?: string; name?: string; menor?: boolean }): string {
  const nick = (player.nick ?? "").trim();
  if (nick) return nick.slice(0, 24);
  if (player.menor) return "Jugador";
  return ((player.name ?? "").trim() || "Jugador").slice(0, 24);
}

export function puestoEnTarjeta(event: PartidoMin, memberId: string): string {
  const list = FORMATIONS[event.modality] ?? [];
  const forma = list.find((item) => item.id === event.formacion) ?? list[0];
  const slot = forma?.slots.find((item) => event.lineup[item.key] === memberId);
  if (slot) return slot.label;
  if ((event.suplentes ?? []).includes(memberId)) return "SUP";
  return "";
}

export async function dibujarTarjeta(input: TarjetaInput): Promise<Blob> {
  await document.fonts?.ready;
  const ctx = lienzo();
  marco(ctx);
  encabezado(ctx, input.club);
  const nombre = nombreEnTarjeta(input.player);
  const numero = input.player.number;
  ctx.fillStyle = LIMA;
  ctx.font = "700 168px Barlow Condensed, sans-serif";
  ctx.fillText(numero != null ? String(numero) : "—", 72, 360);
  if (input.puesto) pastilla(ctx, 760, 250, input.puesto);
  const foto = fotoJugador(input.player);
  await ventana(ctx, 72, 400, 936, 520, foto, numero != null ? String(numero) : nombre);
  ctx.fillStyle = TINTA;
  ctx.font = "700 92px Barlow Condensed, sans-serif";
  ctx.fillText(recortar(ctx, nombre, 936), 72, 1036);
  ctx.fillStyle = LIMA;
  ctx.font = "600 32px Figtree, sans-serif";
  const goles = input.goles === 1 ? "1 gol" : input.goles > 1 ? `${input.goles} goles` : "Sin goles";
  ctx.fillText([input.puesto, goles].filter(Boolean).join("  ·  "), 72, 1092);
  if (input.figura) pastilla(ctx, 72, 1124, "FIGURA DE LA FECHA", true);
  pie(ctx, `${input.sheet.goalsFor}–${input.sheet.goalsAgainst}`, input.event.title);
  return await png(ctx);
}

export async function dibujarTarjetaEquipo(input: TarjetaEquipoInput): Promise<Blob> {
  await document.fonts?.ready;
  const ctx = lienzo();
  marco(ctx);
  encabezado(ctx, input.club);
  ctx.fillStyle = LIMA;
  ctx.font = "600 28px Figtree, sans-serif";
  ctx.fillText("EL EQUIPO", 72, 250);
  ctx.fillStyle = TINTA;
  ctx.font = "700 168px Barlow Condensed, sans-serif";
  ctx.fillText(recortar(ctx, input.marcador, 936), 72, 420);
  ctx.font = "700 64px Barlow Condensed, sans-serif";
  ctx.fillText(recortar(ctx, input.titulo, 936), 72, 500);
  await ventana(ctx, 72, 540, 936, 500, input.foto ?? null, input.formacion || "FECHA");
  if (input.detalle) {
    ctx.fillStyle = TINTA;
    ctx.font = "600 32px Figtree, sans-serif";
    ctx.fillText(recortar(ctx, input.detalle, 936), 72, 1116);
  }
  const extra = [input.formacion, input.lugar].filter(Boolean).join("  ·  ");
  pie(ctx, extra || "Mi Vestuario", input.club);
  return await png(ctx);
}

export async function compartirTarjeta(input: TarjetaInput): Promise<"shared" | "saved"> {
  const blob = await dibujarTarjeta(input);
  const nombre = nombreEnTarjeta(input.player);
  const text = input.figura
    ? `${nombre} fue la figura. ${input.event.title}, ${input.sheet.goalsFor}–${input.sheet.goalsAgainst}.`
    : `${nombre} jugó ${input.event.title}. ${input.sheet.goalsFor}–${input.sheet.goalsAgainst}.`;
  return enviar(blob, "mi-vestuario-jugador.png", text);
}

export async function compartirTarjetaEquipo(input: TarjetaEquipoInput): Promise<"shared" | "saved"> {
  const blob = await dibujarTarjetaEquipo(input);
  const text = `${input.titulo}: ${input.marcador}. ${input.detalle ?? ""}`.trim();
  return enviar(blob, "mi-vestuario-equipo.png", text);
}

function fotoJugador(player: Member): string | null {
  if (player.menor) return null;
  return player.photo?.startsWith("data:image/") ? player.photo : null;
}

function lienzo(): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la tarjeta.");
  return ctx;
}

function marco(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = LIMA;
  caja(ctx, 0, 0, ANCHO, ALTO, 0);
  ctx.fill();
  ctx.fillStyle = BOSQUE;
  caja(ctx, 28, 28, ANCHO - 56, ALTO - 56, 48);
  ctx.fill();
}

function encabezado(ctx: CanvasRenderingContext2D, club: string) {
  logo(ctx, 72, 64, 88);
  ctx.fillStyle = TINTA;
  ctx.font = "700 52px Barlow Condensed, sans-serif";
  ctx.fillText("MI VESTUARIO", 180, 112);
  ctx.fillStyle = MUDO;
  ctx.font = "600 26px Figtree, sans-serif";
  ctx.fillText(recortar(ctx, club || "Tu equipo", 760), 180, 152);
}

function pie(ctx: CanvasRenderingContext2D, izquierda: string, derecha: string) {
  ctx.fillStyle = MUDO;
  ctx.font = "600 28px Figtree, sans-serif";
  ctx.fillText(recortar(ctx, izquierda, 480), 72, 1268);
  const texto = recortar(ctx, derecha, 460);
  ctx.fillText(texto, ANCHO - 72 - ctx.measureText(texto).width, 1268);
}

function pastilla(ctx: CanvasRenderingContext2D, x: number, y: number, texto: string, ancha = false) {
  ctx.font = "700 32px Barlow Condensed, sans-serif";
  const ancho = Math.max(120, ctx.measureText(texto).width + (ancha ? 48 : 36));
  ctx.fillStyle = LIMA;
  caja(ctx, x, y, ancho, 56, 28);
  ctx.fill();
  ctx.fillStyle = "#0c1a10";
  ctx.fillText(texto, x + (ancha ? 24 : 18), y + 38);
}

async function ventana(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  src: string | null,
  respaldo: string,
) {
  ctx.save();
  caja(ctx, x, y, w, h, 32);
  ctx.clip();
  ctx.fillStyle = "#10281a";
  ctx.fillRect(x, y, w, h);
  const image = src ? await cargar(src).catch(() => null) : null;
  if (image) {
    cubrir(ctx, image, x, y, w, h);
  } else {
    ctx.fillStyle = "#147a3a";
    ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
    ctx.strokeStyle = "rgba(238,246,239,.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, w * 0.7, 80, 0, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.font = "700 180px Barlow Condensed, sans-serif";
    const label = recortar(ctx, respaldo, w - 80);
    ctx.fillText(label, x + (w - ctx.measureText(label).width) / 2, y + h * 0.48);
  }
  ctx.restore();
}

function cubrir(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 32;
  const bloque = (px: number, py: number, w: number, h: number, rad: number, fill: string) => {
    ctx.fillStyle = fill;
    caja(ctx, x + px * s, y + py * s, w * s, h * s, rad * s);
    ctx.fill();
  };
  bloque(4, 6, 10, 20, 2, LIMA);
  bloque(18, 6, 10, 20, 2, LIMA);
  bloque(6, 8, 6, 2, 1, BOSQUE);
  bloque(6, 12, 6, 2, 1, BOSQUE);
  bloque(20, 8, 6, 2, 1, BOSQUE);
  bloque(20, 12, 6, 2, 1, BOSQUE);
  const circulo = (cx: number, cy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x + cx * s, y + cy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  };
  circulo(12, 22, 1.5, BOSQUE);
  circulo(20, 22, 1.5, BOSQUE);
  circulo(16, 16, 6, BOSQUE);
  circulo(16, 16, 5.2, TINTA);
  ctx.fillStyle = BOSQUE;
  ctx.beginPath();
  const puntos = [
    [16, 12.85],
    [19, 15.03],
    [17.85, 18.55],
    [14.15, 18.55],
    [13, 15.03],
  ];
  ctx.moveTo(x + puntos[0][0] * s, y + puntos[0][1] * s);
  for (const [px, py] of puntos.slice(1)) ctx.lineTo(x + px * s, y + py * s);
  ctx.closePath();
  ctx.fill();
}

function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

function png(ctx: CanvasRenderingContext2D): Promise<Blob> {
  const canvas = ctx.canvas;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo armar la tarjeta."))), "image/png");
  });
}

async function enviar(blob: Blob, filename: string, text: string): Promise<"shared" | "saved"> {
  const file = new File([blob], filename, { type: "image/png" });
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
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return "saved";
}
