export async function compartirPizarra(input: {
  title: string;
  rival: string;
  pauta: string;
  puestos: { x: number; y: number; nick: string; etiqueta: string }[];
}): Promise<"shared" | "saved"> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo armar la pizarra.");
  ctx.fillStyle = "#143024";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "700 48px sans-serif";
  ctx.fillText(cortar(ctx, input.title, 940), 70, 90);
  if (input.rival) {
    ctx.fillStyle = "#d6f5e3";
    ctx.font = "500 32px sans-serif";
    ctx.fillText(cortar(ctx, `Ellos: ${input.rival}`, 940), 70, 150);
  }
  ctx.strokeStyle = "rgba(244,241,234,0.45)";
  ctx.strokeRect(70, 190, 940, 620);
  for (const puesto of input.puestos) {
    const x = 70 + (puesto.x / 100) * 940;
    const y = 190 + (puesto.y / 100) * 620;
    ctx.beginPath();
    ctx.fillStyle = puesto.etiqueta ? "#e7f56a" : "#f4f1ea";
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 34px sans-serif";
  let linea = 880;
  const notas = input.puestos.filter((puesto) => puesto.etiqueta || puesto.nick);
  for (const puesto of notas.slice(0, 12)) {
    const texto = puesto.etiqueta ? `${puesto.nick}: ${puesto.etiqueta}` : puesto.nick;
    ctx.fillText(cortar(ctx, texto, 940), 70, linea);
    linea += 36;
  }
  if (input.pauta && linea < 1280) {
    ctx.fillStyle = "#d6f5e3";
    ctx.fillText(cortar(ctx, input.pauta, 940), 70, Math.min(linea + 20, 1280));
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo armar la pizarra.");
  const file = new File([blob], "pizarra.png", { type: "image/png" });
  const text = input.rival ? `${input.title}. Ellos: ${input.rival}` : input.title;
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
  link.download = "pizarra.png";
  link.click();
  URL.revokeObjectURL(url);
  return "saved";
}

function cortar(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (ctx.measureText(clean).width <= max) return clean;
  let next = clean;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > max) next = next.slice(0, -1);
  return `${next}…`;
}
