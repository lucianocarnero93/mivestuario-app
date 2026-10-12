import { cargar, png, recortar } from "./lienzo.ts";
import { marca, prepararFuentes } from "./premios-dibujo.ts";
import type { PartidoSemana } from "./vista.ts";

const LIMA = "#b8f25a";
const TINTA = "#eef6ef";
const SUAVE = "#9bb5a4";
const DISPLAY = '"Barlow Condensed", sans-serif';

export async function dibujarResumen(input: {
  titulo: string;
  club: string;
  escudo: string | null;
  partidos: PartidoSemana[];
}): Promise<Blob> {
  await prepararFuentes();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la imagen.");
  const fondo = ctx.createLinearGradient(0, 0, 0, 1920);
  fondo.addColorStop(0, "#123222");
  fondo.addColorStop(0.42, "#0b1c12");
  fondo.addColorStop(1, "#061109");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 1080, 1920);
  marca(ctx, 1080, 118, 64, "MI VESTUARIO", 36, 0.16, TINTA);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = SUAVE;
  ctx.font = `600 32px ${DISPLAY}`;
  ctx.fillText(recortar(ctx, input.club.toUpperCase() || "EL EQUIPO", 860), 540, 188);
  ctx.fillStyle = LIMA;
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.fillText(recortar(ctx, input.titulo.toUpperCase(), 960), 540, 268);
  const marcaSemana = resumenDe(input.partidos);
  ctx.fillStyle = TINTA;
  ctx.font = `700 40px ${DISPLAY}`;
  ctx.fillText(marcaSemana, 540, 340);
  const partidos = input.partidos.slice(0, 3);
  if (partidos.length === 0) {
    ctx.fillStyle = SUAVE;
    ctx.font = `600 40px ${DISPLAY}`;
    ctx.fillText("Esta semana no hubo partidos cerrados.", 540, 860);
  }
  const escudo = input.escudo?.startsWith("data:image/") ? await cargar(input.escudo).catch(() => null) : null;
  if (escudo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(980, 118, 42, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(escudo, 938, 76, 84, 84);
    ctx.restore();
  }
  const fotos = new Map<string, HTMLImageElement>();
  await Promise.all(
    partidos.flatMap((partido) =>
      partido.titulares.map(async (titular) => {
        if (!titular.foto || titular.oculto || fotos.has(titular.foto)) return;
        const imagen = await cargar(titular.foto).catch(() => null);
        if (imagen) fotos.set(titular.foto, imagen);
      }),
    ),
  );
  const top = 400;
  const alto = partidos.length === 0 ? 0 : (1680 - top - 24 * (partidos.length - 1)) / partidos.length;
  partidos.forEach((partido, index) => {
    const y = top + index * (alto + 24);
    partidoEn(ctx, partido, 56, y, 968, alto, fotos);
  });
  ctx.fillStyle = LIMA;
  ctx.font = `700 28px ${DISPLAY}`;
  ctx.textAlign = "center";
  if (input.partidos.length > 3) {
    ctx.fillStyle = SUAVE;
    ctx.fillText(`Y ${input.partidos.length - 3} MÁS`, 540, 1748);
    ctx.fillStyle = LIMA;
  }
  ctx.fillText("¿Tu equipo no tiene cards? mivestuario.com.ar", 540, 1824);
  return png(ctx);
}

function resumenDe(partidos: PartidoSemana[]): string {
  if (partidos.length === 0) return "";
  let ganados = 0;
  let empates = 0;
  let perdidos = 0;
  let favor = 0;
  let contra = 0;
  for (const partido of partidos) {
    if (partido.verbo === "Ganado") ganados += 1;
    else if (partido.verbo === "Perdido") perdidos += 1;
    else if (partido.verbo === "Empate") empates += 1;
    favor += partido.goalsFor;
    contra += partido.goalsAgainst;
  }
  const partes = [`${ganados} ${ganados === 1 ? "GANADO" : "GANADOS"}`];
  if (empates) partes.push(`${empates} ${empates === 1 ? "EMPATE" : "EMPATES"}`);
  if (perdidos) partes.push(`${perdidos} ${perdidos === 1 ? "PERDIDO" : "PERDIDOS"}`);
  return `${partes.join("  ·  ")}    ${favor}–${contra}`;
}

function partidoEn(
  ctx: CanvasRenderingContext2D,
  partido: PartidoSemana,
  x: number,
  y: number,
  w: number,
  h: number,
  fotos: Map<string, HTMLImageElement>,
) {
  ctx.save();
  redondear(ctx, x, y, w, h, 36);
  ctx.fillStyle = "rgba(18,50,34,.92)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(184,242,90,.28)";
  ctx.stroke();
  const grande = h > 700;
  const cabeza = grande ? 250 : 168;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = LIMA;
  ctx.font = `800 ${grande ? 36 : 28}px ${DISPLAY}`;
  ctx.fillText(partido.verbo.toUpperCase(), x + 36, y + (grande ? 52 : 36));
  ctx.textAlign = "right";
  ctx.fillStyle = SUAVE;
  ctx.font = `700 ${grande ? 30 : 24}px ${DISPLAY}`;
  ctx.fillText(recortar(ctx, partido.esquema.toUpperCase(), 520), x + w - 36, y + (grande ? 52 : 36));
  ctx.textAlign = "left";
  ctx.fillStyle = TINTA;
  ctx.font = `800 ${grande ? 120 : 64}px ${DISPLAY}`;
  ctx.fillText(`${partido.goalsFor}–${partido.goalsAgainst}`, x + 36, y + (grande ? 148 : 100));
  ctx.fillStyle = SUAVE;
  ctx.font = `700 ${grande ? 36 : 26}px ${DISPLAY}`;
  const detalle = [`VS ${partido.rival.toUpperCase()}`, tarjetasDe(partido)].filter(Boolean).join("   ·   ");
  ctx.fillText(recortar(ctx, detalle, w - 72), x + 36, y + (grande ? 214 : 142));
  const statsAlto = 92;
  const pitch = { x: x + 48, y: y + cabeza, w: w - 96, h: Math.max(110, h - cabeza - statsAlto) };
  cancha(ctx, pitch);
  const radio = Math.max(18, Math.min(grande ? 42 : 28, pitch.h / 11));
  for (const titular of partido.titulares) {
    const t = grande ? 0.07 + (titular.y / 100) * 0.76 : 0.12 + (titular.y / 100) * 0.76;
    const u = 0.1 + (titular.x / 100) * 0.8;
    const punto = proyectar(pitch, u, t);
    ficha(ctx, punto.x, punto.y, radio, titular, fotos.get(titular.foto ?? "") ?? null, grande);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${grande ? 32 : 26}px ${DISPLAY}`;
  const base = y + h - 78;
  ctx.fillStyle = LIMA;
  ctx.fillText("GOLES", x + 36, base);
  ctx.fillStyle = TINTA;
  ctx.fillText(recortar(ctx, lista(partido.goles) || "—", w - 280), x + 180, base);
  ctx.fillStyle = LIMA;
  ctx.fillText("ASIST.", x + 36, base + 40);
  ctx.fillStyle = TINTA;
  ctx.fillText(recortar(ctx, lista(partido.asistencias) || "—", w - 220), x + 180, base + 40);
  ctx.restore();
}

function lista(aportes: PartidoSemana["goles"]): string {
  return aportes
    .filter((aporte) => !aporte.oculto)
    .map((aporte) => (aporte.n > 1 ? `${aporte.nombre} ${aporte.n}` : aporte.nombre))
    .join("  ·  ");
}

function tarjetasDe(partido: PartidoSemana): string {
  const partes: string[] = [];
  if (partido.amarillas > 0) partes.push(`${partido.amarillas} AMARILLA${partido.amarillas === 1 ? "" : "S"}`);
  if (partido.rojas > 0) partes.push(`${partido.rojas} ROJA${partido.rojas === 1 ? "" : "S"}`);
  return partes.join("  ·  ");
}

function cancha(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }) {
  ctx.save();
  for (let i = 0; i < 8; i++) {
    trapecio(ctx, box, i / 8, (i + 1) / 8);
    ctx.fillStyle = i % 2 === 0 ? "#1d5c36" : "#174d2e";
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(232,243,234,.7)";
  ctx.lineWidth = 3;
  trapecio(ctx, box, 0, 1);
  ctx.stroke();
  const medio = borde(box, 0.5);
  ctx.beginPath();
  ctx.moveTo(medio.left, medio.y);
  ctx.lineTo(medio.right, medio.y);
  ctx.stroke();
  const centro = proyectar(box, 0.5, 0.5);
  ctx.beginPath();
  ctx.ellipse(centro.x, centro.y, box.w * 0.12, box.h * 0.1, 0, 0, Math.PI * 2);
  ctx.stroke();
  area(ctx, box, 0.16, true);
  area(ctx, box, 0.16, false);
  ctx.restore();
}

function area(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, profundo: number, arriba: boolean) {
  const t0 = arriba ? 0 : 1 - profundo;
  const t1 = arriba ? profundo : 1;
  const a = borde(box, t0);
  const b = borde(box, t1);
  const ancho = Math.min(a.width, b.width) * 0.62;
  const cx = box.x + box.w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - ancho / 2, a.y);
  ctx.lineTo(cx + ancho / 2, a.y);
  ctx.lineTo(cx + ancho / 2, b.y);
  ctx.lineTo(cx - ancho / 2, b.y);
  ctx.closePath();
  ctx.stroke();
}

function trapecio(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, t0: number, t1: number) {
  const a = borde(box, t0);
  const b = borde(box, t1);
  ctx.beginPath();
  ctx.moveTo(a.left, a.y);
  ctx.lineTo(a.right, a.y);
  ctx.lineTo(b.right, b.y);
  ctx.lineTo(b.left, b.y);
  ctx.closePath();
}

function borde(box: { x: number; y: number; w: number; h: number }, t: number) {
  const width = box.w * (0.62 + 0.36 * t);
  const cx = box.x + box.w / 2;
  return { y: box.y + t * box.h, left: cx - width / 2, right: cx + width / 2, width };
}

function proyectar(box: { x: number; y: number; w: number; h: number }, u: number, v: number) {
  const linea = borde(box, v);
  return { x: linea.left + u * linea.width, y: linea.y };
}

function ficha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radio: number,
  titular: PartidoSemana["titulares"][number],
  foto: HTMLImageElement | null,
  grande: boolean,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fillStyle = "#0c1a10";
  ctx.fill();
  if (foto && !titular.oculto) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radio - 3, 0, Math.PI * 2);
    ctx.clip();
    const escala = Math.max((radio * 2) / foto.width, (radio * 2) / foto.height);
    const dw = foto.width * escala;
    const dh = foto.height * escala;
    ctx.drawImage(foto, x - dw / 2, y - dh / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = TINTA;
    ctx.font = `800 ${radio * 0.85}px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letras(titular.oculto ? titular.puesto : titular.nombre || titular.puesto), x, y + 1);
  }
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = LIMA;
  ctx.stroke();
  if (grande && titular.nombre && !titular.oculto) {
    ctx.font = `700 ${Math.max(18, radio * 0.48)}px ${DISPLAY}`;
    ctx.fillStyle = TINTA;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(recortar(ctx, titular.nombre.toUpperCase(), radio * 3.4), x, y + radio + 6);
  }
  ctx.restore();
}

function letras(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "·";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] ?? ""}${partes[1][0] ?? ""}`.toUpperCase();
}

function redondear(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
}
