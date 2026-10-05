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
  const nombre = nombreEnTarjeta(input.player).toUpperCase();
  const numero = input.player.number != null ? String(input.player.number) : "–";
  const puesto = (input.puesto || "JUG").toUpperCase();
  carta(ctx, input.figura);
  columna(ctx, numero, puesto);
  ctx.fillStyle = MUDO;
  ctx.font = "600 28px Figtree, sans-serif";
  ctx.fillText(recortar(ctx, (input.club || "Mi Vestuario").toUpperCase(), 420), 100, 430);
  logo(ctx, 820, 150, 150);
  silueta(ctx, numero);
  if (input.figura) cinta(ctx, "FIGURA");
  placa(ctx, nombre);
  const goles = String(input.goles);
  atributos(ctx, [
    ["GOL", goles],
    ["PTO", puesto],
    ["FIG", input.figura ? "1" : "0"],
    ["RES", `${input.sheet.goalsFor}-${input.sheet.goalsAgainst}`],
  ]);
  return await png(ctx);
}

export async function dibujarTarjetaEquipo(input: TarjetaEquipoInput): Promise<Blob> {
  await document.fonts?.ready;
  const ctx = lienzo();
  carta(ctx, false);
  columna(ctx, input.marcador.replace("–", "-"), "EQUIPO");
  logo(ctx, 820, 150, 150);
  silueta(ctx, input.formacion || "FECHA");
  cinta(ctx, "EL EQUIPO");
  placa(ctx, (input.titulo || input.club || "EL EQUIPO").toUpperCase());
  atributos(ctx, [
    ["FORMA", input.formacion || "–"],
    ["SEDE", corto(input.lugar || "–")],
    ["GOLES", corto(input.detalle || "–")],
    ["CLUB", corto(input.club || "–")],
  ]);
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

function corto(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > 12 ? `${limpio.slice(0, 11)}…` : limpio || "–";
}

function lienzo(): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la tarjeta.");
  return ctx;
}

function carta(ctx: CanvasRenderingContext2D, figura: boolean) {
  ctx.fillStyle = "#040a07";
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = figura ? "#eaffb0" : LIMA;
  escudo(ctx, 18, 18, ANCHO - 36, ALTO - 36);
  ctx.fill();
  const fondo = ctx.createLinearGradient(0, 40, 0, ALTO);
  fondo.addColorStop(0, "#24643c");
  fondo.addColorStop(0.42, "#0e2918");
  fondo.addColorStop(1, "#07140c");
  ctx.fillStyle = fondo;
  escudo(ctx, 42, 42, ANCHO - 84, ALTO - 84);
  ctx.fill();
  ctx.save();
  escudo(ctx, 42, 42, ANCHO - 84, ALTO - 84);
  ctx.clip();
  const luz = ctx.createRadialGradient(540, 280, 40, 540, 420, 620);
  luz.addColorStop(0, "rgba(184,242,90,0.28)");
  luz.addColorStop(1, "rgba(184,242,90,0)");
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.strokeStyle = "rgba(238,246,239,0.08)";
  ctx.lineWidth = 2;
  for (let i = -200; i < ANCHO; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 80);
    ctx.lineTo(i + 280, 980);
    ctx.stroke();
  }
  ctx.restore();
}

function columna(ctx: CanvasRenderingContext2D, grande: string, puesto: string) {
  ctx.fillStyle = LIMA;
  ctx.textAlign = "left";
  ctx.font = "700 168px Barlow Condensed, sans-serif";
  const texto = recortar(ctx, grande, 460);
  ctx.fillText(texto, 96, 310);
  ctx.fillStyle = TINTA;
  ctx.font = "700 54px Barlow Condensed, sans-serif";
  ctx.fillText(puesto, 100, 380);
}

function silueta(ctx: CanvasRenderingContext2D, marca: string) {
  const cx = 620;
  ctx.fillStyle = "#163528";
  ctx.strokeStyle = LIMA;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, 470, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#10281a";
  ctx.beginPath();
  ctx.moveTo(cx - 210, 620);
  ctx.quadraticCurveTo(cx, 520, cx + 210, 620);
  ctx.lineTo(cx + 250, 760);
  ctx.lineTo(cx + 150, 740);
  ctx.lineTo(cx + 170, 1040);
  ctx.lineTo(cx - 170, 1040);
  ctx.lineTo(cx - 150, 740);
  ctx.lineTo(cx - 250, 760);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = LIMA;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(cx, 600, 42, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = TINTA;
  ctx.textAlign = "center";
  ctx.font = "700 150px Barlow Condensed, sans-serif";
  ctx.fillText(recortar(ctx, marca, 380), cx, 900);
  ctx.textAlign = "left";
}

function cinta(ctx: CanvasRenderingContext2D, texto: string) {
  ctx.fillStyle = LIMA;
  ctx.beginPath();
  ctx.moveTo(390, 118);
  ctx.lineTo(690, 118);
  ctx.lineTo(660, 178);
  ctx.lineTo(420, 178);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BOSQUE;
  ctx.textAlign = "center";
  ctx.font = "700 36px Barlow Condensed, sans-serif";
  ctx.fillText(texto, 540, 162);
  ctx.textAlign = "left";
}

function placa(ctx: CanvasRenderingContext2D, nombre: string) {
  ctx.fillStyle = LIMA;
  ctx.beginPath();
  ctx.moveTo(130, 1008);
  ctx.lineTo(950, 1008);
  ctx.lineTo(890, 1136);
  ctx.lineTo(190, 1136);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BOSQUE;
  ctx.textAlign = "center";
  ctx.font = "700 72px Barlow Condensed, sans-serif";
  ctx.fillText(recortar(ctx, nombre, 680), 540, 1098);
  ctx.textAlign = "left";
}

function atributos(ctx: CanvasRenderingContext2D, pares: [string, string][]) {
  pares.forEach(([etiqueta, valor], index) => {
    const col = index % 2;
    const fila = Math.floor(index / 2);
    const x = 150 + col * 420;
    const y = 1168 + fila * 50;
    ctx.fillStyle = MUDO;
    ctx.font = "700 26px Barlow Condensed, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(etiqueta, x, y);
    ctx.fillStyle = TINTA;
    ctx.font = "700 40px Barlow Condensed, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(recortar(ctx, valor, 220), x + 340, y);
    ctx.textAlign = "left";
  });
}

function escudo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const radio = 46;
  const punta = 78;
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.lineTo(x + w - radio, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radio);
  ctx.lineTo(x + w, y + h - punta - 30);
  ctx.quadraticCurveTo(x + w, y + h - punta, x + w * 0.72, y + h - 24);
  ctx.quadraticCurveTo(x + w / 2, y + h + 18, x + w * 0.28, y + h - 24);
  ctx.quadraticCurveTo(x, y + h - punta, x, y + h - punta - 30);
  ctx.lineTo(x, y + radio);
  ctx.quadraticCurveTo(x, y, x + radio, y);
  ctx.closePath();
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
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
}

function recortar(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > max) next = next.slice(0, -1);
  return `${next}…`;
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
