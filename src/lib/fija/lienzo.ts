const LIMA = "#b8f25a";
const BOSQUE = "#0b1c12";
const TINTA = "#eef6ef";

export function cubrir(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("foto"));
    image.src = src;
  });
}

export function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
}

export function recortar(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > max) next = next.slice(0, -1);
  return `${next}…`;
}

export function envolver(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, max: number, alto: number) {
  const palabras = texto.split(" ");
  let linea = "";
  let cursor = y;
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > max && linea) {
      ctx.fillText(linea, x, cursor);
      linea = palabra;
      cursor += alto;
      if (cursor > 980) return cursor;
    } else linea = prueba;
  }
  if (linea && cursor <= 980) ctx.fillText(linea, x, cursor);
  return cursor + alto;
}

export function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
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

export function png(ctx: CanvasRenderingContext2D): Promise<Blob> {
  const canvas = ctx.canvas;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo armar la tarjeta."))), "image/png");
  });
}

export async function enviar(
  blob: Blob,
  filename: string,
  text: string,
  opciones?: { copiarTexto?: boolean },
): Promise<"shared" | "saved"> {
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
  if (opciones?.copiarTexto) await navigator.clipboard?.writeText(text);
  return "saved";
}
