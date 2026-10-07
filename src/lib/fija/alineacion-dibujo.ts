import { avatarSvg } from "./avatar.ts";
import {
  CUERPO,
  INTERIOR,
  MARCO,
  brillos,
  caber,
  elipse,
  fill,
  gradiente,
  lienzo,
  marca,
  prepararFuentes,
  rayas,
} from "./premios-dibujo.ts";
import { cargar, cubrir, jpeg, png, recortar } from "./lienzo.ts";
import { TIERS } from "./premios-tokens.ts";
import { tema, trazosCancha, type DatosAlineacion, type FichaBanco, type FichaTitular, type TemaAlineacion } from "./alineacion.ts";

type Ctx = CanvasRenderingContext2D;

const DISPLAY = '"Barlow Condensed", sans-serif';
const SANS = "Figtree, sans-serif";
const SILUETA = "M20 490 C 26 360 96 290 200 288 C 304 290 374 360 380 490 Z";

async function fuentes() {
  await prepararFuentes();
  await document.fonts?.load('700 26px Figtree');
  await document.fonts?.load('600 26px Figtree');
  await document.fonts?.load('800 78px "Barlow Condensed"');
  await document.fonts?.load('700 48px "Barlow Condensed"');
}

function pinturaDe(datos: DatosAlineacion): TemaAlineacion {
  return tema(datos.temaNombre, datos.colores);
}

function trazo(ctx: Ctx, puntos: { x: number; y: number }[], cerrado: boolean) {
  if (!puntos.length) return;
  ctx.beginPath();
  ctx.moveTo(puntos[0].x, puntos[0].y);
  for (const punto of puntos.slice(1)) ctx.lineTo(punto.x, punto.y);
  if (cerrado) ctx.closePath();
}

function fondo(ctx: Ctx, datos: DatosAlineacion, T: TemaAlineacion) {
  const g = ctx.createLinearGradient(0, 0, 0, datos.alto);
  g.addColorStop(0, "#0a1a10");
  g.addColorStop(0.55, "#061109");
  g.addColorStop(1, "#030805");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, datos.ancho, datos.alto);
  elipse(ctx, datos.ancho / 2, 40, 900, 560, T.fondo);
  if (datos.formato === "story") {
    elipse(ctx, 130, 40, 260, 120, "rgba(255,255,255,.22)");
    elipse(ctx, 950, 40, 260, 120, "rgba(255,255,255,.22)");
  }
  rayas(ctx, "rgba(255,255,255,.022)");
}

function cancha(ctx: Ctx, datos: DatosAlineacion, T: TemaAlineacion) {
  const trazos = trazosCancha(datos.formato);
  trazos.bandas.forEach((banda, i) => {
    trazo(ctx, banda, true);
    ctx.fillStyle = i % 2 === 0 ? T.grass[0] : T.grass[1];
    ctx.fill();
  });
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 18;
  trazo(ctx, trazos.borde, true);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = T.lines;
  ctx.lineWidth = datos.formato === "og" ? 2.4 : 3.2;
  ctx.lineJoin = "round";
  if (T.nombre === "neon") {
    ctx.shadowColor = "rgba(184,242,90,.35)";
    ctx.shadowBlur = 6;
  }
  for (const linea of trazos.lineas) {
    trazo(ctx, linea.puntos, linea.cerrado);
    ctx.stroke();
  }
  ctx.restore();
  const pitch = datos.formato === "og" ? { top: 60, bottom: 596 } : datos.formato === "story" ? { top: 562, bottom: 1352 } : { top: 292, bottom: 1124 };
  const fade = ctx.createLinearGradient(0, pitch.top, 0, pitch.top + (pitch.bottom - pitch.top) * 0.22);
  fade.addColorStop(0, "rgba(6,17,9,.65)");
  fade.addColorStop(1, "rgba(6,17,9,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, pitch.top, datos.ancho, (pitch.bottom - pitch.top) * 0.22);
}

function imagenDelChip(ficha: FichaTitular) {
  if (!ficha.imagen || ficha.imagen.tipo === "foto" && ficha.anonimo) return null;
  if (ficha.imagen.tipo === "foto" && ficha.vacio) return null;
  return ficha.imagen;
}

async function armarChip(ficha: FichaTitular, T: TemaAlineacion): Promise<HTMLCanvasElement> {
  const W = Math.max(8, ficha.w);
  const H = Math.max(8, ficha.h);
  const dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr * (W / 720), dpr * ((1.28 * W) / 1000));
  const marco = new Path2D(MARCO);
  const cuerpo = new Path2D(CUERPO);
  ctx.fillStyle = gradiente(ctx, 720, 1000, 135, [
    [0, T.frame[0]],
    [0.45, T.frame[1]],
    [0.72, T.frame[2]],
    [1, T.frame[3]],
  ]);
  ctx.fill(marco);
  ctx.save();
  ctx.clip(cuerpo);
  const cuerpoG = ctx.createLinearGradient(0, 0, 0, 1000);
  cuerpoG.addColorStop(0, T.body[0]);
  cuerpoG.addColorStop(0.55, T.body[1]);
  cuerpoG.addColorStop(1, T.body[2]);
  ctx.fillStyle = cuerpoG;
  ctx.fillRect(0, 0, 720, 1000);
  rayas(ctx, "rgba(255,255,255,.035)");
  if (!ficha.anonimo && !ficha.vacio) await retrato(ctx, ficha, T);
  ctx.restore();
  ctx.save();
  ctx.clip(cuerpo);
  brillos(ctx);
  ctx.restore();
  ctx.strokeStyle = T.trim;
  ctx.lineWidth = 6;
  ctx.stroke(new Path2D(INTERIOR));
  if (!ficha.anonimo && ficha.numero != null) dorsal(ctx, String(ficha.numero), T);
  if (!ficha.anonimo && ficha.nombre) cinta(ctx, ficha.nombre, T);
  puesto(ctx, ficha.label, T);
  return canvas;
}

async function retrato(ctx: Ctx, ficha: FichaTitular, T: TemaAlineacion) {
  const imagen = imagenDelChip(ficha);
  if (!imagen || imagen.tipo === "iniciales") {
    ctx.save();
    ctx.fillStyle = T.silueta;
    ctx.translate(160, 80);
    ctx.scale(1, 0.85);
    ctx.beginPath();
    ctx.arc(200, 150, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fill(new Path2D(SILUETA));
    ctx.restore();
    ctx.fillStyle = T.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${3.1 * 72}px ${DISPLAY}`;
    ctx.fillText((imagen?.tipo === "iniciales" ? imagen.letras : "J").slice(0, 2), 360, 430);
    return;
  }
  if (imagen.tipo === "foto") {
    const foto = await cargar(imagen.src).catch(() => null);
    if (!foto) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(22, 20, 676, 640);
    ctx.clip();
    const foco = 0.26;
    const escala = Math.max(676 / foto.width, 640 / foto.height);
    const dw = foto.width * escala;
    const dh = foto.height * escala;
    ctx.drawImage(foto, 22 + (676 - dw) / 2, 20 + (640 * foco - dh * foco), dw, dh);
    ctx.restore();
    return;
  }
  const svg = avatarSvg(imagen.avatar, T.avatar, { uid: ficha.key, size: 480 });
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const avatar = await cargar(url).catch(() => null);
  if (!avatar) return;
  const x = 720 * 0.16;
  const y = 1000 * 0.04;
  const w = 720 * 0.82;
  const h = 1000 * 0.62;
  const escala = Math.min(w / avatar.width, h / avatar.height);
  const dw = avatar.width * escala;
  const dh = avatar.height * escala;
  ctx.drawImage(avatar, x + (w - dw) / 2, y + h - dh, dw, dh);
}

function dorsal(ctx: Ctx, numero: string, T: TemaAlineacion) {
  ctx.save();
  ctx.fillStyle = T.num;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `800 ${3.3 * 72}px ${DISPLAY}`;
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = 12;
  ctx.fillText(numero, 720 * 0.08, 1000 * 0.05);
  ctx.restore();
}

function cinta(ctx: Ctx, nombre: string, T: TemaAlineacion) {
  const x = 720 * 0.03;
  const y = 1000 * 0.635;
  const w = 720 * 0.94;
  const h = 1000 * 0.155;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w * 0.96, y + h);
  ctx.lineTo(x + w * 0.04, y + h);
  ctx.closePath();
  ctx.fillStyle = T.ribbon;
  ctx.fill();
  ctx.clip();
  const texto = nombre.toUpperCase();
  const fit = caber(ctx, texto, w * 0.86, 800, DISPLAY, 2.05 * 72, 0.95 * 72, 4, 0.03);
  ctx.fillStyle = T.ribbonInk;
  ctx.font = `800 ${fit.size}px ${DISPLAY}`;
  ctx.textBaseline = "middle";
  fill(ctx, fit.text, x + w / 2, y + h / 2, 0.03, fit.size, "center");
  ctx.restore();
}

function puesto(ctx: Ctx, label: string, T: TemaAlineacion) {
  ctx.fillStyle = T.inkSoft;
  ctx.font = `700 ${1.45 * 72}px ${DISPLAY}`;
  ctx.textBaseline = "top";
  fill(ctx, label.toUpperCase(), 360, 1000 * 0.805, 0.14, 1.45 * 72, "center");
}

async function pegarChips(ctx: Ctx, datos: DatosAlineacion, T: TemaAlineacion) {
  const orden = datos.titulares.slice().sort((a, b) => a.y - b.y);
  for (const ficha of orden) {
    if (datos.formato === "og") {
      disco(ctx, ficha, T);
      continue;
    }
    const chip = await armarChip(ficha, T);
    const x = ficha.x - ficha.w / 2;
    const y = ficha.y - 0.64 * ficha.w;
    ctx.save();
    ctx.shadowColor = T.glow;
    ctx.shadowBlur = ficha.w * 0.09;
    ctx.drawImage(chip, x, y, ficha.w, ficha.h);
    ctx.restore();
  }
}

function disco(ctx: Ctx, ficha: FichaTitular, T: TemaAlineacion) {
  const r = ficha.w / 2;
  ctx.save();
  if (!ficha.vacio) {
    ctx.shadowColor = T.glow;
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  ctx.arc(ficha.x, ficha.y, r, 0, Math.PI * 2);
  if (ficha.vacio) ctx.fillStyle = "rgba(238,246,239,.35)";
  else {
    ctx.fillStyle = gradiente(ctx, ficha.w, ficha.w, 135, [
      [0, T.frame[0]],
      [0.45, T.frame[1]],
      [1, T.frame[2]],
    ]);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ficha.x, ficha.y, r * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = ficha.vacio ? "rgba(6,17,9,.75)" : T.fondo;
  ctx.fill();
  if (!ficha.vacio && ficha.numero != null) {
    ctx.fillStyle = T.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${ficha.w * 0.42}px ${DISPLAY}`;
    ctx.fillText(String(ficha.numero), ficha.x, ficha.y + 1);
  }
  ctx.restore();
  ctx.fillStyle = "#eef6ef";
  ctx.font = `700 17px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  fill(ctx, ficha.label.toUpperCase(), ficha.x, ficha.y + r + 6, 0.12, 17, "center");
}

async function escudo(ctx: Ctx, datos: DatosAlineacion, x: number, y: number, size: number, T: TemaAlineacion) {
  if (datos.escudo) {
    const img = await cargar(datos.escudo).catch(() => null);
    if (img) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.5)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      cubrir(ctx, img, x, y, size, size);
      ctx.restore();
      return;
    }
  }
  ctx.save();
  ctx.translate(x, y);
  const s = size / 132;
  ctx.scale(s, s);
  ctx.fillStyle = gradiente(ctx, 132, 152, 135, [
    [0, T.frame[0]],
    [0.45, T.frame[1]],
    [1, T.frame[2]],
  ]);
  ctx.fill(new Path2D("M 0 12 Q 0 0 12 0 H 120 Q 132 0 132 12 V 84 Q 132 128 66 152 Q 0 128 0 84 Z"));
  ctx.fillStyle = T.ribbonInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${52 / s}px ${DISPLAY}`;
  ctx.restore();
  ctx.fillStyle = T.ribbonInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(size * 0.34)}px ${DISPLAY}`;
  ctx.fillText(datos.equipoIniciales.slice(0, 3), x + size / 2, y + size * 0.46);
}

function textoCabeza(ctx: Ctx, text: string, x: number, y: number, max: number, inicio: number, minimo: number, peso: number, color: string) {
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const fit = caber(ctx, text, max, peso, DISPLAY, inicio, minimo, 2, 0.01);
  ctx.font = `${peso} ${fit.size}px ${DISPLAY}`;
  fill(ctx, fit.text, x, y, 0.01, fit.size, "left");
}

async function cabecera(ctx: Ctx, datos: DatosAlineacion, T: TemaAlineacion) {
  if (datos.formato === "og") return cabeceraOg(ctx, datos, T);
  const story = datos.formato === "story";
  const top = story ? 262 : 40;
  await escudo(ctx, datos, 48, top + 8, story ? 140 : 150, T);
  const x = 228;
  const max = 620;
  ctx.fillStyle = T.accent;
  ctx.font = `700 24px ${SANS}`;
  ctx.textBaseline = "middle";
  fill(ctx, datos.kicker, x, top + 28, 0.22, 24, "left");
  textoCabeza(ctx, datos.equipo.toUpperCase(), x, top + 88, max, story ? 70 : 78, 46, 800, "#eef6ef");
  const rival = `vs ${datos.rival}`.toUpperCase();
  ctx.textBaseline = "middle";
  const fit = caber(ctx, rival, max, 700, DISPLAY, story ? 44 : 48, 32, 2, 0.02);
  ctx.font = `700 ${fit.size}px ${DISPLAY}`;
  const vs = "VS ";
  ctx.fillStyle = T.accent;
  fill(ctx, vs, x, top + 150, 0.02, fit.size, "left");
  const anchoVs = medirAncho(ctx, vs, 0.02, fit.size);
  ctx.fillStyle = "#eef6ef";
  fill(ctx, fit.text.slice(vs.length), x + anchoVs, top + 150, 0.02, fit.size, "left");
  if (!story) {
    const meta = [datos.fecha, datos.hora, datos.cancha].filter(Boolean).join(" · ");
    ctx.font = `700 26px ${SANS}`;
    ctx.fillStyle = "#eef6ef";
    ctx.textBaseline = "middle";
    ctx.fillText(recortar(ctx, meta, max), x, top + 196);
  } else {
    let cursor = 48;
    const pastillas = [datos.fecha && datos.hora ? `${datos.fecha} · ${datos.hora}` : datos.fecha, datos.cancha].filter(Boolean);
    pastillas.forEach((texto, i) => {
      ctx.font = `700 25px ${SANS}`;
      const w = Math.min(440, ctx.measureText(texto).width + 40);
      redonda(ctx, cursor, 466, w, 48, 24);
      ctx.fillStyle = "rgba(19,42,28,.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(155,181,164,.25)";
      ctx.stroke();
      ctx.fillStyle = i === 0 ? T.accent : "#eef6ef";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(recortar(ctx, texto, w - 28), cursor + w / 2, 490);
      ctx.textAlign = "left";
      cursor += w + 12;
    });
  }
  const badgeX = datos.ancho - 48 - 150;
  const badgeY = top + 36;
  redonda(ctx, badgeX, badgeY, 150, 86, 16);
  ctx.fillStyle = T.ribbon;
  ctx.fill();
  ctx.fillStyle = T.ribbonInk;
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(datos.formatoCorto, badgeX + 75, badgeY + 46);
  ctx.fillStyle = "#eef6ef";
  ctx.font = `700 36px ${DISPLAY}`;
  ctx.fillText(recortar(ctx, datos.esquema, 200), badgeX + 75, badgeY + 110);
  ctx.textAlign = "left";
}

function medirAncho(ctx: Ctx, text: string, em: number, px: number): number {
  ctx.font = ctx.font || `700 ${px}px ${DISPLAY}`;
  if (em <= 0) return ctx.measureText(text).width;
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * em * px;
}

function redonda(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
}

async function cabeceraOg(ctx: Ctx, datos: DatosAlineacion, T: TemaAlineacion) {
  ctx.fillStyle = "#eef6ef";
  ctx.font = `800 20px ${SANS}`;
  ctx.textBaseline = "middle";
  fill(ctx, "MI VESTUARIO", 118, 70, 0.2, 20, "left");
  marca(ctx, 160, 70, 38, "", 20, 0, "#eef6ef");
  await escudo(ctx, datos, 60, 130, 120, T);
  ctx.fillStyle = T.accent;
  ctx.font = `700 20px ${SANS}`;
  fill(ctx, datos.kicker, 210, 150, 0.18, 20, "left");
  textoCabeza(ctx, datos.equipo.toUpperCase(), 210, 210, 380, 64, 36, 800, "#eef6ef");
  textoCabeza(ctx, `VS ${datos.rival}`.toUpperCase(), 60, 320, 500, 50, 28, 700, "#eef6ef");
  const meta = [datos.fecha, datos.hora, datos.cancha].filter(Boolean).join(" · ");
  ctx.font = `600 25px ${SANS}`;
  ctx.fillStyle = "#9bb5a4";
  ctx.textBaseline = "middle";
  ctx.fillText(recortar(ctx, meta, 500), 60, 380);
  redonda(ctx, 60, 430, 110, 64, 12);
  ctx.fillStyle = T.ribbon;
  ctx.fill();
  ctx.fillStyle = T.ribbonInk;
  ctx.font = `800 40px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText(datos.formatoCorto, 115, 464);
  ctx.textAlign = "left";
  ctx.fillStyle = "#eef6ef";
  ctx.font = `700 36px ${DISPLAY}`;
  ctx.fillText(recortar(ctx, datos.esquema, 280), 186, 462);
  ctx.fillStyle = "#9bb5a4";
  ctx.font = `600 20px ${SANS}`;
  ctx.fillText("Resultado y formación en el link · mivestuario.com.ar", 60, 580);
}

async function circulo(ctx: Ctx, ficha: FichaBanco, x: number, y: number, T: TemaAlineacion, dt: boolean) {
  const colores = dt ? TIERS.pizarra.frame : T.frame;
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fillStyle = gradiente(ctx, 84, 84, 135, [
    [0, colores[0]],
    [0.55, colores[1]],
    [1, colores[2]],
  ]);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fillStyle = dt ? "#0a120d" : T.fondo;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.clip();
  if (!ficha.anonimo && ficha.imagen?.tipo === "foto") {
    const img = await cargar(ficha.imagen.src).catch(() => null);
    if (img && !ficha.anonimo) cubrir(ctx, img, x - 38, y - 38, 76, 76);
  } else if (!ficha.anonimo && ficha.imagen?.tipo === "avatar") {
    const svg = avatarSvg(ficha.imagen.avatar, T.avatar, { uid: ficha.id, size: 160 });
    const img = await cargar(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`).catch(() => null);
    if (img) ctx.drawImage(img, x - 34, y - 30, 68, 68);
  } else if (!ficha.anonimo) {
    const letras = ficha.imagen?.tipo === "iniciales" ? ficha.imagen.letras : ficha.nombre.slice(0, 1);
    ctx.fillStyle = "#eef6ef";
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letras || "J", x, y);
  }
  ctx.restore();
  const badge = dt ? "DT" : ficha.anonimo || ficha.numero == null ? "" : String(ficha.numero);
  if (badge) {
    ctx.beginPath();
    ctx.arc(x + 24, y + 24, 16, 0, Math.PI * 2);
    ctx.fillStyle = dt ? "#b8f25a" : T.ribbon;
    ctx.fill();
    ctx.fillStyle = dt ? "#0c1a10" : T.ribbonInk;
    ctx.font = `800 16px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, x + 24, y + 25);
  }
  if (!ficha.anonimo && ficha.nombre) {
    ctx.fillStyle = "#eef6ef";
    ctx.font = `700 22px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(recortar(ctx, ficha.nombre.toUpperCase(), 100), x, y + 50);
  }
}

async function banco(ctx: Ctx, datos: DatosAlineacion, T: TemaAlineacion) {
  if (datos.formato === "og") return;
  const y = datos.formato === "story" ? 1392 : 1150;
  const alto = datos.formato === "story" ? 170 : 150;
  redonda(ctx, 40, y, datos.ancho - 80, alto, 22);
  ctx.fillStyle = "rgba(19,42,28,.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(155,181,164,.16)";
  ctx.stroke();
  const hayBanco = datos.banco.length > 0;
  if (hayBanco) {
    ctx.fillStyle = "#9bb5a4";
    ctx.font = `700 19px ${SANS}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    fill(ctx, "BANCO", 64, y + 14, 0.24, 19, "left");
    let x = 96;
    for (const ficha of datos.banco) {
      await circulo(ctx, ficha, x, y + 78, T, false);
      x += 104;
    }
    if (datos.mas > 0) {
      ctx.beginPath();
      ctx.arc(x, y + 78, 38, 0, Math.PI * 2);
      ctx.fillStyle = T.fondo;
      ctx.fill();
      ctx.fillStyle = "#eef6ef";
      ctx.font = `800 28px ${DISPLAY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${datos.mas}`, x, y + 78);
      ctx.font = `700 22px ${DISPLAY}`;
      ctx.fillText("MÁS", x, y + 128);
    }
  }
  if (datos.dt.length) {
    const x = datos.ancho - 120;
    ctx.strokeStyle = "rgba(155,181,164,.25)";
    ctx.beginPath();
    ctx.moveTo(x - 50, y + 28);
    ctx.lineTo(x - 50, y + alto - 20);
    ctx.stroke();
    ctx.fillStyle = "#9bb5a4";
    ctx.font = `700 19px ${SANS}`;
    ctx.textAlign = "left";
    fill(ctx, "DT", x - 30, y + 14, 0.24, 19, "left");
    await circulo(ctx, datos.dt[0], x + 10, y + 78, T, true);
  }
}

function pie(ctx: Ctx, datos: DatosAlineacion) {
  if (datos.formato === "og") return;
  const y = datos.formato === "story" ? 1578 : 1306;
  marca(ctx, datos.ancho, y, 34, "MI VESTUARIO", 18, 0.02, "#9bb5a4");
}

export async function dibujarAlineacion(datos: DatosAlineacion, pintura?: TemaAlineacion): Promise<Blob> {
  await fuentes();
  const T = pintura ?? pinturaDe(datos);
  const ctx = lienzo(datos.ancho, datos.alto, 1);
  fondo(ctx, datos, T);
  cancha(ctx, datos, T);
  await pegarChips(ctx, datos, T);
  await cabecera(ctx, datos, T);
  await banco(ctx, datos, T);
  pie(ctx, datos);
  return png(ctx);
}

export async function dibujarOgAlineacion(datos: DatosAlineacion, pintura?: TemaAlineacion): Promise<Blob> {
  await fuentes();
  const T = pintura ?? pinturaDe(datos);
  const ctx = lienzo(1200, 630, 1);
  const pieza = { ...datos, formato: "og" as const, ancho: 1200, alto: 630, banco: [], dt: [], mas: 0 };
  fondo(ctx, pieza, T);
  cancha(ctx, pieza, T);
  await pegarChips(ctx, pieza, T);
  await cabecera(ctx, pieza, T);
  let blob = await jpeg(ctx, 0.85);
  if (blob.size > 300 * 1024) blob = await jpeg(ctx, 0.6);
  return blob;
}
