import { avatarSvg } from "./avatar.ts";
import { caja, cargar, cubrir, enviar, logo, png } from "./lienzo.ts";
import { datosCard, fraseStory, textoCompartir, type DatosCard, type Premio, type ContextoPremios } from "./premios.ts";
import { TIERS, type Pintura } from "./premios-tokens.ts";

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

const MARCO = "M 36 0 H 262 L 290 22 H 430 L 458 0 H 684 Q 720 0 720 36 V 800 Q 720 858 664 886 L 398 992 Q 360 1006 322 992 L 56 886 Q 0 858 0 800 V 36 Q 0 0 36 0 Z";

const CUERPO = "M 46 12 H 257 L 285 34 H 435 L 463 12 H 674 Q 708 12 708 46 V 796 Q 708 850 656 876 L 394 980 Q 360 993 326 980 L 64 876 Q 12 850 12 796 V 46 Q 12 12 46 12 Z";
const INTERIOR = "M 56 24 H 252 L 280 46 H 440 L 468 24 H 664 Q 696 24 696 56 V 792 Q 696 842 648 866 L 390 968 Q 360 980 330 968 L 72 866 Q 24 842 24 792 V 56 Q 24 24 56 24 Z";
const ESCUDO = "M 0 8 Q 0 0 8 0 H 76 Q 84 0 84 8 V 52 Q 84 80 42 96 Q 0 80 0 52 Z";

export async function dibujarPremio(datos: DatosCard): Promise<Blob> {
  await prepararFuentes();
  const ctx = lienzo(720, 1000, 2);
  const tier = TIERS[datos.tier];
  const marco = new Path2D(MARCO);
  const cuerpo = new Path2D(CUERPO);
  ctx.fillStyle = gradiente(ctx, 720, 1000, 135, [
    [0, tier.frame[0]],
    [0.22, tier.frame[1]],
    [0.46, tier.frame[2]],
    [0.62, tier.frame[3]],
    [0.8, tier.frame[1]],
    [1, tier.frame[2]],
  ]);
  ctx.fill(marco);
  ctx.save();
  ctx.clip(cuerpo);
  const fondo = ctx.createLinearGradient(0, 0, 0, 1000);
  fondo.addColorStop(0, tier.body[0]);
  fondo.addColorStop(0.52, tier.body[1]);
  fondo.addColorStop(1, tier.body[2]);
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 720, 1000);
  if (datos.tier === "cancha") cesped(ctx);
  else rayas(ctx, tier.pattern);
  elipse(ctx, 430, 300, 420, 360, tier.glow);
  if (datos.tier === "pizarra") tiza(ctx);
  ctx.restore();
  await persona(ctx, datos, tier);
  await columna(ctx, datos, tier);
  cinta(ctx, datos.titulo, tier);
  contexto(ctx, datos.contexto, tier);
  nombre(ctx, datos.nombre, tier);
  equipo(ctx, datos.equipo, tier);
  stats(ctx, datos, tier);
  marca(ctx, 720, 906, 30, "MI VESTUARIO", 17, 0.16, tier.inkSoft);
  ctx.save();
  ctx.clip(cuerpo);
  brillos(ctx);
  ctx.restore();
  ctx.strokeStyle = tier.trim;
  ctx.lineWidth = 2;
  ctx.stroke(new Path2D(INTERIOR));
  return png(ctx);
}

export async function dibujarStoryPremio(
  datos: DatosCard,
  frase: { kicker: string; frase: string; sub: string; nombreResaltado: string },
): Promise<Blob> {
  await prepararFuentes();
  const ctx = lienzo(1080, 1920, 1);
  const fondo = ctx.createLinearGradient(0, 0, 0, 1920);
  fondo.addColorStop(0, "#0f2a1a");
  fondo.addColorStop(0.45, "#0b1c12");
  fondo.addColorStop(1, "#061109");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 1080, 1920);
  rayas(ctx, "rgba(184,242,90,.035)");
  elipse(ctx, 540, 860, 760, 700, TIERS[datos.tier].glow);
  cancha(ctx);
  marca(ctx, 1080, 237, 54, "MI VESTUARIO", 34, 0.2, "#eef6ef");
  ctx.fillStyle = "#9bb5a4";
  ctx.font = '600 30px Figtree, sans-serif';
  ctx.textBaseline = "top";
  centrar(ctx, recorte(ctx, frase.kicker, 920), 540, 284, 0, 30);
  const blob = await dibujarPremio(datos);
  const url = URL.createObjectURL(blob);
  try {
    const imagen = await cargar(url);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 30;
    ctx.drawImage(imagen, 126, 350, 828, 1150);
    ctx.restore();
  } finally {
    URL.revokeObjectURL(url);
  }
  fraseGrande(ctx, frase.frase, frase.nombreResaltado, 1534);
  ctx.fillStyle = "#9bb5a4";
  ctx.font = '600 36px Figtree, sans-serif';
  ctx.textBaseline = "top";
  centrar(ctx, recorte(ctx, frase.sub, 920), 540, 1628, 0, 36);
  ctx.fillStyle = "#b8f25a";
  ctx.font = '700 30px "Barlow Condensed", sans-serif';
  centrar(ctx, "MIVESTUARIO.COM.AR", 540, 1712, 0.18, 30);
  return png(ctx);
}

export async function compartirPremio(
  premio: Premio,
  contextoPremio: ContextoPremios,
  modo: "card" | "story",
): Promise<"shared" | "saved"> {
  const datos = datosCard(premio, contextoPremio);
  const archivo = `mi-vestuario-${premio.tipo}-${limpiar(datos.nombre)}.png`;
  const texto = textoCompartir(premio);
  const blob = modo === "story" ? await dibujarStoryPremio(datos, fraseStory(premio)) : await dibujarPremio(datos);
  return enviar(blob, archivo, texto);
}

async function prepararFuentes() {
  await document.fonts?.ready;
  await document.fonts?.load('800 96px "Barlow Condensed"');
  await document.fonts?.load('700 42px "Barlow Condensed"');
  await document.fonts?.load('600 24px Figtree');
}

function lienzo(ancho: number, alto: number, escala: number): Ctx {
  const canvas = document.createElement("canvas");
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la tarjeta.");
  if (escala !== 1) ctx.scale(escala, escala);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function gradiente(ctx: Ctx, w: number, h: number, grados: number, paradas: [number, string][]) {
  const rad = (grados * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const largo = Math.abs(dx) * w + Math.abs(dy) * h;
  const g = ctx.createLinearGradient(w / 2 - (dx * largo) / 2, h / 2 - (dy * largo) / 2, w / 2 + (dx * largo) / 2, h / 2 + (dy * largo) / 2);
  for (const [stop, color] of paradas) g.addColorStop(stop, color);
  return g;
}

function rayas(ctx: Ctx, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.translate(360, 500);
  ctx.rotate((118 * Math.PI) / 180);
  ctx.beginPath();
  for (let i = -1500; i <= 1500; i += 40) {
    ctx.moveTo(i, -1500);
    ctx.lineTo(i, 1500);
  }
  ctx.stroke();
  ctx.restore();
}

function cesped(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.055)";
  for (let x = 0; x < 720; x += 120) ctx.fillRect(x, 0, 60, 1000);
  ctx.restore();
}

function tiza(ctx: Ctx) {
  ctx.save();
  ctx.strokeStyle = "rgba(232,234,216,.10)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(560, 170, 26, 0, Math.PI * 2);
  ctx.arc(470, 300, 26, 0, Math.PI * 2);
  ctx.moveTo(600, 300);
  ctx.lineTo(640, 340);
  ctx.moveTo(640, 300);
  ctx.lineTo(600, 340);
  ctx.moveTo(300, 230);
  ctx.lineTo(340, 270);
  ctx.moveTo(340, 230);
  ctx.lineTo(300, 270);
  ctx.moveTo(486, 280);
  ctx.bezierCurveTo(540, 220, 590, 220, 620, 270);
  ctx.moveTo(612, 250);
  ctx.lineTo(622, 272);
  ctx.lineTo(598, 276);
  ctx.moveTo(230, 120);
  ctx.bezierCurveTo(300, 90, 380, 110, 420, 160);
  ctx.moveTo(40, 640);
  ctx.bezierCurveTo(120, 600, 200, 600, 260, 640);
  ctx.stroke();
  ctx.restore();
}

function elipse(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / h, 1);
  const radio = h / 2;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radio);
  g.addColorStop(0, color);
  g.addColorStop(0.7, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function brillos(ctx: Ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const rad = (112 * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const medio = Math.abs(360 * dx) + Math.abs(500 * dy);
  const g = ctx.createLinearGradient(360 - dx * medio, 500 - dy * medio, 360 + dx * medio, 500 + dy * medio);
  g.addColorStop(0.18, "rgba(255,255,255,0)");
  g.addColorStop(0.3, "rgba(255,255,255,0)");
  g.addColorStop(0.38, "rgba(255,255,255,.22)");
  g.addColorStop(0.46, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 720, 1000);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  const top = ctx.createLinearGradient(0, 0, 0, 220);
  top.addColorStop(0, "rgba(255,255,255,.18)");
  top.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, 720, 220);
  ctx.restore();
}

async function persona(ctx: Ctx, datos: DatosCard, tier: Pintura) {
  if (datos.imagen.tipo === "foto") {
    const ok = await foto(ctx, datos.imagen.src);
    if (ok) return;
  }
  if (datos.imagen.tipo === "avatar") {
    const ok = await avatar(ctx, datos);
    if (ok) return;
  }
  silueta(ctx, datos.letras, tier);
}

async function foto(ctx: Ctx, src: string): Promise<boolean> {
  const image = await cargar(src).catch(() => null);
  if (!image) return false;
  const w = 500;
  const h = 560;
  const dpr = 2;
  const off = document.createElement("canvas");
  off.width = w * dpr;
  off.height = h * dpr;
  const o = off.getContext("2d");
  if (!o) return false;
  o.scale(dpr, dpr);
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = "high";
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  o.drawImage(image, (w - dw) * 0.5, (h - dh) * 0.3, dw, dh);
  o.globalCompositeOperation = "destination-in";
  const rx = 0.6 * w;
  const ry = 0.66 * h;
  o.save();
  o.translate(w * 0.5, h * 0.4);
  o.scale(rx / ry, 1);
  const g = o.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.56, "rgba(0,0,0,1)");
  g.addColorStop(0.76, "rgba(0,0,0,.6)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  o.fillStyle = g;
  o.beginPath();
  o.arc(0, 0, ry, 0, Math.PI * 2);
  o.fill();
  o.restore();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(off, 196, 38, w, h);
  return true;
}

async function avatar(ctx: Ctx, datos: DatosCard): Promise<boolean> {
  if (datos.imagen.tipo !== "avatar") return false;
  const svg = avatarSvg(datos.imagen.avatar, datos.colores, { uid: datos.uid, size: 960 });
  const image = await cargar(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`).catch(() => null);
  if (!image) return false;
  const size = 480;
  const dpr = 2;
  const off = document.createElement("canvas");
  off.width = size * dpr;
  off.height = size * dpr;
  const o = off.getContext("2d");
  if (!o) return false;
  o.scale(dpr, dpr);
  o.drawImage(image, 0, 0, size, size);
  o.globalCompositeOperation = "destination-in";
  const g = o.createLinearGradient(0, size * 0.82, 0, size);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  o.fillStyle = g;
  o.fillRect(0, 0, size, size);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.28)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(off, 206, 82, size, size);
  ctx.restore();
  return true;
}

function silueta(ctx: Ctx, letras: string, tier: Pintura) {
  ctx.save();
  ctx.fillStyle = tier.silhouette;
  ctx.beginPath();
  ctx.arc(446, 258, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(246, 108);
  ctx.fill(new Path2D("M20 490 C 26 360 96 290 200 288 C 304 290 374 360 380 490 Z"));
  ctx.restore();
  ctx.fillStyle = tier.stat;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = '800 136px "Barlow Condensed", sans-serif';
  ctx.fillText(letras.slice(0, 3), 446, 410);
  ctx.restore();
}

async function columna(ctx: Ctx, datos: DatosCard, tier: Pintura) {
  const centro = 124;
  ctx.fillStyle = tier.stat;
  ctx.textBaseline = "top";
  const numero = caber(ctx, datos.stat, 150, 800, '"Barlow Condensed", sans-serif', 168, 96, 4, 0);
  ctx.font = `800 ${numero.size}px "Barlow Condensed", sans-serif`;
  centrar(ctx, numero.text, centro, 58, 0, numero.size);
  ctx.fillStyle = tier.ink;
  const etiqueta = caber(ctx, datos.statLabel, 156, 700, '"Barlow Condensed", sans-serif', 23, 14, 1, 0.12);
  ctx.font = `700 ${etiqueta.size}px "Barlow Condensed", sans-serif`;
  centrar(ctx, etiqueta.text, centro, 209, 0.12, etiqueta.size);
  if (datos.puesto) {
    ctx.fillStyle = tier.ink;
    const puesto = caber(ctx, datos.puesto, 156, 700, '"Barlow Condensed", sans-serif', 50, 28, 2, 0);
    ctx.font = `700 ${puesto.size}px "Barlow Condensed", sans-serif`;
    centrar(ctx, puesto.text, centro, 251, 0, puesto.size);
  }
  if (datos.dorsal) {
    ctx.fillStyle = tier.inkSoft;
    ctx.font = '700 30px "Barlow Condensed", sans-serif';
    centrar(ctx, datos.dorsal, centro, 305, 0, 30);
  }
  ctx.fillStyle = tier.trim;
  ctx.fillRect(centro - 35, 353, 70, 3);
  await escudo(ctx, datos, tier);
  decorar(ctx, datos, tier);
}

async function escudo(ctx: Ctx, datos: DatosCard, tier: Pintura) {
  const imagen = datos.escudo ? await cargar(datos.escudo).catch(() => null) : null;
  ctx.save();
  ctx.translate(82, 374);
  const path = new Path2D(ESCUDO);
  if (imagen) {
    ctx.save();
    ctx.clip(path);
    cubrir(ctx, imagen, 0, 0, 84, 96);
    ctx.restore();
  } else {
    ctx.fillStyle = tier.crestBg;
    ctx.fill(path);
    ctx.fillStyle = tier.crestInk;
    ctx.font = '800 34px "Barlow Condensed", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(datos.equipoIniciales.slice(0, 3), 42, 48);
  }
  ctx.restore();
}

function decorar(ctx: Ctx, datos: DatosCard, tier: Pintura) {
  const deco = datos.deco;
  if (!deco) return;
  const centro = 124;
  ctx.save();
  if (deco.tipo === "pelotas") {
    const n = deco.n;
    const tam = n >= 4 ? 28 : 40;
    const paso = tam + 8;
    let x = centro - ((n - 1) * paso) / 2;
    for (let i = 0; i < n; i += 1) {
      pelota(ctx, x, 494 + tam / 2, tam / 2, tier.ink, tier.ribbonInk);
      x += paso;
    }
  } else if (deco.tipo === "checks") {
    const n = Math.min(deco.n, 8);
    const tam = 30;
    const gap = 6;
    const porFila = 4;
    const filas = Math.ceil(n / porFila);
    for (let i = 0; i < n; i += 1) {
      const fila = Math.floor(i / porFila);
      const enFila = Math.min(porFila, n - fila * porFila);
      const col = i % porFila;
      const ancho = enFila * tam + (enFila - 1) * gap;
      const x = centro - ancho / 2 + col * (tam + gap);
      const y = 494 + fila * (tam + gap) - ((filas - 1) * (tam + gap)) / 2;
      ctx.beginPath();
      ctx.fillStyle = tier.ribbonBg;
      ctx.arc(x + tam / 2, y + tam / 2, tam / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tier.ribbonInk;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 15);
      ctx.lineTo(x + 13, y + 20);
      ctx.lineTo(x + 22, y + 10);
      ctx.stroke();
    }
  } else {
    etiqueta(ctx, deco.texto, tier);
  }
  ctx.restore();
}

function pelota(ctx: Ctx, cx: number, cy: number, radio: number, tinta: string, trazo: string) {
  ctx.beginPath();
  ctx.fillStyle = tinta;
  ctx.arc(cx, cy, radio * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = trazo;
  ctx.lineWidth = Math.max(1.5, radio * 0.1);
  ctx.stroke();
  ctx.fillStyle = trazo;
  ctx.beginPath();
  const puntos = [
    [0, -0.45],
    [0.4, -0.15],
    [0.25, 0.35],
    [-0.25, 0.35],
    [-0.4, -0.15],
  ];
  puntos.forEach(([px, py], index) => {
    const x = cx + px * radio;
    const y = cy + py * radio;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

function etiqueta(ctx: Ctx, texto: string, tier: Pintura) {
  ctx.font = '800 22px "Barlow Condensed", sans-serif';
  const ancho = medir(ctx, texto, 0.12, 22) + 28;
  const alto = 38;
  const x = 720 - 48 - ancho;
  const y = 66;
  ctx.fillStyle = tier.ribbonBg;
  caja(ctx, x, y, ancho, alto, 8);
  ctx.fill();
  ctx.fillStyle = tier.ribbonInk;
  ctx.textBaseline = "middle";
  fill(ctx, texto, x + ancho / 2, y + alto / 2, 0.12, 22, "center");
}

function cinta(ctx: Ctx, titulo: string, tier: Pintura) {
  ctx.fillStyle = tier.ribbonBg;
  ctx.beginPath();
  ctx.moveTo(40, 566);
  ctx.lineTo(680, 566);
  ctx.lineTo(654, 626);
  ctx.lineTo(66, 626);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tier.ribbonInk;
  ctx.textBaseline = "middle";
  const linea = caber(ctx, titulo, 560, 800, '"Barlow Condensed", sans-serif', 38, 26, 1, 0.09);
  ctx.font = `800 ${linea.size}px "Barlow Condensed", sans-serif`;
  centrar(ctx, linea.text, 360, 596, 0.09, linea.size);
}

function contexto(ctx: Ctx, texto: string, tier: Pintura) {
  ctx.fillStyle = tier.inkSoft;
  ctx.font = "600 24px Figtree, sans-serif";
  ctx.textBaseline = "top";
  centrar(ctx, recorte(ctx, texto, 580), 360, 636, 0, 24);
}

function nombre(ctx: Ctx, texto: string, tier: Pintura) {
  ctx.fillStyle = tier.ink;
  ctx.textBaseline = "top";
  const linea = caber(ctx, texto, 620, 800, '"Barlow Condensed", sans-serif', 96, 56, 2, 0);
  ctx.font = `800 ${linea.size}px "Barlow Condensed", sans-serif`;
  centrar(ctx, linea.text, 360, 670 + (100 - linea.size) / 2, 0, linea.size);
}

function equipo(ctx: Ctx, texto: string, tier: Pintura) {
  ctx.fillStyle = tier.inkSoft;
  ctx.font = "700 20px Figtree, sans-serif";
  ctx.textBaseline = "top";
  centrar(ctx, recorte(ctx, texto.toUpperCase(), 600), 360, 774, 0.16, 20);
}

function stats(ctx: Ctx, datos: DatosCard, tier: Pintura) {
  const x0 = 92;
  const x1 = 628;
  const columnas = 3;
  const anchoCol = (x1 - x0) / columnas;
  ctx.strokeStyle = tier.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, 812);
  ctx.lineTo(x1, 812);
  ctx.stroke();
  datos.stats.slice(0, 3).forEach((stat, index) => {
    const x = x0 + anchoCol * index + anchoCol / 2;
    if (index > 0) {
      ctx.beginPath();
      ctx.moveTo(x0 + anchoCol * index, 826);
      ctx.lineTo(x0 + anchoCol * index, 888);
      ctx.stroke();
    }
    ctx.fillStyle = tier.ink;
    ctx.font = '700 42px "Barlow Condensed", sans-serif';
    ctx.textBaseline = "top";
    centrar(ctx, recorte(ctx, stat.valor, anchoCol - 16), x, 822, 0, 42);
    ctx.fillStyle = tier.inkSoft;
    ctx.font = "700 15px Figtree, sans-serif";
    centrar(ctx, recorte(ctx, stat.etiqueta.toUpperCase(), anchoCol - 12), x, 868, 0.14, 15);
  });
}

function marca(ctx: Ctx, anchoLienzo: number, y: number, logoSize: number, texto: string, px: number, tracking: number, color: string) {
  ctx.font = `700 ${px}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const w = medir(ctx, texto, tracking, px);
  const gap = Math.round(logoSize * 0.28);
  const total = logoSize + gap + w;
  const x = (anchoLienzo - total) / 2;
  ctx.fillStyle = "#0b1c12";
  caja(ctx, x, y - logoSize / 2, logoSize, logoSize, logoSize * (7 / 32));
  ctx.fill();
  logo(ctx, x, y - logoSize / 2, logoSize);
  ctx.fillStyle = color;
  fill(ctx, texto, x + logoSize + gap, y, tracking, px, "left");
}

function cancha(ctx: Ctx) {
  ctx.save();
  ctx.strokeStyle = "rgba(232,243,234,.07)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(540, 960, 250, 0, Math.PI * 2);
  ctx.moveTo(80, 960);
  ctx.lineTo(1000, 960);
  ctx.stroke();
  ctx.strokeRect(240, -10, 600, 250);
  ctx.strokeRect(240, 1680, 600, 250);
  ctx.restore();
}

function fraseGrande(ctx: Ctx, frase: string, nombre: string, y: number) {
  const texto = frase.toUpperCase();
  const resalte = nombre.toUpperCase();
  const max = 960;
  let size = 76;
  let actual = texto;
  while (size > 48) {
    ctx.font = `800 ${size}px "Barlow Condensed", sans-serif`;
    if (medir(ctx, actual, 0, size) <= max) break;
    size -= 2;
  }
  ctx.font = `800 ${size}px "Barlow Condensed", sans-serif`;
  if (medir(ctx, actual, 0, size) > max) actual = recorte(ctx, actual, max);
  ctx.textBaseline = "top";
  const idx = resalte ? actual.indexOf(resalte) : -1;
  if (idx < 0) {
    ctx.fillStyle = "#eef6ef";
    centrar(ctx, actual, 540, y, 0, size);
    return;
  }
  const antes = actual.slice(0, idx);
  const medio = actual.slice(idx, idx + resalte.length);
  const despues = actual.slice(idx + resalte.length);
  const total = medir(ctx, actual, 0, size);
  let x = 540 - total / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#eef6ef";
  ctx.fillText(antes, x, y);
  x += medir(ctx, antes, 0, size);
  ctx.fillStyle = "#b8f25a";
  ctx.fillText(medio, x, y);
  x += medir(ctx, medio, 0, size);
  ctx.fillStyle = "#eef6ef";
  ctx.fillText(despues, x, y);
}

function caber(ctx: Ctx, text: string, max: number, peso: number, familia: string, inicio: number, minimo: number, paso: number, em: number) {
  let size = inicio;
  while (size > minimo) {
    ctx.font = `${peso} ${size}px ${familia}`;
    if (medir(ctx, text, em, size) <= max) return { size, text };
    size = Math.max(minimo, size - paso);
  }
  ctx.font = `${peso} ${minimo}px ${familia}`;
  let actual = text;
  while (actual.length > 1 && medir(ctx, `${actual}…`, em, minimo) > max) actual = actual.slice(0, -1);
  return { size: minimo, text: actual === text ? actual : `${actual}…` };
}

function recorte(ctx: Ctx, text: string, max: number): string {
  if (medir(ctx, text, 0, 16) <= max && ctx.measureText(text).width <= max) return text;
  let actual = text;
  while (actual.length > 1 && ctx.measureText(`${actual}…`).width > max) actual = actual.slice(0, -1);
  return actual === text ? actual : `${actual}…`;
}

function centrar(ctx: Ctx, text: string, x: number, y: number, em: number, px: number) {
  fill(ctx, text, x, y, em, px, "center");
}

function espaciadoNativo(): boolean {
  return typeof CanvasRenderingContext2D !== "undefined" && "letterSpacing" in CanvasRenderingContext2D.prototype;
}

function fill(ctx: Ctx, text: string, x: number, y: number, em: number, px: number, align: CanvasTextAlign) {
  if (!text) return;
  if (em <= 0 || espaciadoNativo()) {
    const previo = ctx.letterSpacing;
    ctx.textAlign = align;
    if (em > 0) ctx.letterSpacing = `${em}em`;
    ctx.fillText(text, x, y);
    ctx.letterSpacing = previo ?? "0px";
    return;
  }
  const w = medir(ctx, text, em, px);
  let cursor = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.textAlign = "left";
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + em * px;
  }
}

function medir(ctx: Ctx, text: string, em: number, px: number): number {
  if (!text) return 0;
  if (em > 0 && espaciadoNativo()) {
    const previo = ctx.letterSpacing;
    ctx.letterSpacing = `${em}em`;
    const w = ctx.measureText(text).width;
    ctx.letterSpacing = previo ?? "0px";
    return w;
  }
  const base = ctx.measureText(text).width;
  if (em <= 0 || text.length < 2) return base;
  return base + (text.length - 1) * em * px;
}

function limpiar(nombre: string): string {
  const limpio = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return limpio || "jugador";
}
