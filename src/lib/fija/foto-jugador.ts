const MIN_LADO = 400;
const MINI = 128;
const CARD = 512;
const MINI_MAX = 30_000;
const CARD_MAX = 160_000;

type Fuente = CanvasImageSource & { width: number; height: number; close?: () => void };

export async function leerFotoJugador(file: File): Promise<{ src: string; card: string } | { error: string }> {
  const image = await abrir(file);
  if (!image) return { error: "No se pudo usar esa imagen. Probá con otra foto." };
  try {
    if (Math.min(image.width, image.height) < MIN_LADO) return { error: "Esa foto es muy chica. Probá con otra." };
    const mini = cuadrado(image, MINI, 0.7);
    if (!mini || mini.length >= MINI_MAX) return { error: "No se pudo usar esa imagen. Probá con otra foto." };
    const card = nitida(image);
    if (!card) return { error: "Esa foto pesa demasiado. Probá con otra." };
    return { src: mini, card };
  } finally {
    image.close?.();
  }
}

function nitida(image: Fuente): string | null {
  for (const quality of [0.8, 0.72, 0.64, 0.6]) {
    const card = cuadrado(image, CARD, quality);
    if (card && card.length <= CARD_MAX) return card;
  }
  for (const size of [448, 384, 320]) {
    const card = cuadrado(image, size, 0.6);
    if (card && card.length <= CARD_MAX) return card;
  }
  return null;
}

function cuadrado(image: Fuente, size: number, quality: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function abrir(file: File): Promise<Fuente | null> {
  try {
    if (typeof createImageBitmap === "function") {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    }
  } catch {
    /* el navegador no giró la foto; seguimos con Image */
  }
  const url = await leer(file);
  if (!url) return null;
  const image = new Image();
  const cargada = await new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
  return cargada ? image : null;
}

function leer(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  });
}
