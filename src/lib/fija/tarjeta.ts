import { FORMATIONS } from "./formations.ts";
import { caja, cargar, cubrir, enviar, envolver, logo, png, recortar } from "./lienzo.ts";
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
  escudo?: string | null;
  fotoEquipo?: string | null;
};

export type TarjetaEquipoInput = {
  club: string;
  titulo: string;
  marcador: string;
  lineas?: { etiqueta: string; texto: string }[];
  escudo?: string | null;
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

export function fotoEnTarjeta(player: { photo?: string | null; menor?: boolean }, fotoEquipo?: string | null): string | null {
  if (player.menor) return null;
  if (player.photo?.startsWith("data:image/")) return player.photo;
  if (fotoEquipo?.startsWith("data:image/")) return fotoEquipo;
  return null;
}

export function lineasDelPartido(
  filas: { nick: string; goals: number; assists: number; yellow: number; red: number }[],
): { etiqueta: string; texto: string }[] {
  const goles = filas.filter((fila) => fila.goals > 0).map((fila) => `${fila.nick} ${fila.goals}`);
  const asistencias = filas.filter((fila) => fila.assists > 0).map((fila) => `${fila.nick} ${fila.assists}`);
  const tarjetas = filas
    .filter((fila) => fila.yellow > 0 || fila.red > 0)
    .map((fila) => {
      const partes = [
        fila.yellow > 0 ? `${fila.yellow} amarilla` : "",
        fila.red > 0 ? `${fila.red} roja` : "",
      ].filter(Boolean);
      return `${fila.nick} ${partes.join(", ")}`;
    });
  const lineas = [
    goles.length ? { etiqueta: "GOLES", texto: goles.join(" · ") } : null,
    asistencias.length ? { etiqueta: "ASISTENCIAS", texto: asistencias.join(" · ") } : null,
    tarjetas.length ? { etiqueta: "TARJETAS", texto: tarjetas.join(" · ") } : null,
  ].filter((linea): linea is { etiqueta: string; texto: string } => Boolean(linea));
  return lineas.length ? lineas : [{ etiqueta: "PARTIDO", texto: "Sin goles ni tarjetas cargadas" }];
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
  await insignia(ctx, input.escudo);
  await retrato(ctx, fotoEnTarjeta(input.player, input.fotoEquipo), numero);
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
  await insignia(ctx, input.escudo);
  cinta(ctx, "EL EQUIPO");
  nombres(ctx, input.lineas ?? []);
  placa(ctx, (input.titulo || input.club || "EL EQUIPO").toUpperCase());
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
  const text = `${input.titulo}: ${input.marcador}. ${(input.lineas ?? []).map((linea) => linea.texto).join(". ")}`.trim();
  return enviar(blob, "mi-vestuario-equipo.png", text);
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

async function insignia(ctx: CanvasRenderingContext2D, crest: string | null | undefined) {
  const image = crest?.startsWith("data:image/") ? await cargar(crest).catch(() => null) : null;
  if (!image) {
    logo(ctx, 820, 150, 150);
    return;
  }
  ctx.save();
  caja(ctx, 800, 140, 180, 180, 28);
  ctx.clip();
  cubrir(ctx, image, 800, 140, 180, 180);
  ctx.restore();
}

async function retrato(ctx: CanvasRenderingContext2D, src: string | null, marca: string) {
  const image = src ? await cargar(src).catch(() => null) : null;
  if (!image) {
    silueta(ctx, marca);
    return;
  }
  const x = 360;
  const y = 300;
  const w = 620;
  const h = 690;
  ctx.save();
  caja(ctx, x, y, w, h, 36);
  ctx.clip();
  cubrir(ctx, image, x, y, w, h);
  ctx.restore();
}

function nombres(ctx: CanvasRenderingContext2D, lineas: { etiqueta: string; texto: string }[]) {
  let y = 470;
  const filas = lineas.length ? lineas : [{ etiqueta: "PARTIDO", texto: "Sin goles ni tarjetas cargadas" }];
  for (const linea of filas) {
    if (y > 960) return;
    ctx.fillStyle = LIMA;
    ctx.textAlign = "left";
    ctx.font = "700 28px Barlow Condensed, sans-serif";
    ctx.fillText(linea.etiqueta, 96, y);
    y += 46;
    ctx.fillStyle = TINTA;
    ctx.font = "700 40px Barlow Condensed, sans-serif";
    y = envolver(ctx, linea.texto, 96, y, 880, 48);
    y += 22;
  }
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
