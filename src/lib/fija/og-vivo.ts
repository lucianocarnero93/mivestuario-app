import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { escaparXml, horaCorta, inicialesDe, textoResultado, type MarcadorOk } from "./vivo.ts";

function escudoSeguro(crest: string | null | undefined): string {
  if (!crest || !crest.startsWith("data:image/")) return "";
  if (crest.length > 180_000) return "";
  return crest.replace(/["<>]/g, "");
}

export function svgVivo(m: MarcadorOk, crest: string | null = null): string {
  const detalle =
    m.estado === "espera"
      ? horaCorta(m.startsAt) || "Hora a confirmar"
      : m.estado === "oficial"
        ? "Esperando"
        : `${m.goalsFor}–${m.goalsAgainst}`;
  const linea =
    m.estado === "final"
      ? textoResultado(m.goalsFor, m.goalsAgainst).replace("Terminó: ", "")
      : m.estado === "juego"
        ? "En juego"
        : m.estado === "espera"
          ? "Antes del partido"
          : "Terminó";
  const sponsor = m.sponsors[0]?.nombre ? `Auspicia: ${m.sponsors[0].nombre}` : "";
  const club = escaparXml(m.club.slice(0, 22));
  const rival = escaparXml((m.rival || "Rival").slice(0, 22));
  const logo = escudoSeguro(crest);
  const clubMarca = logo
    ? `<clipPath id="escudo"><circle cx="250" cy="360" r="78"/></clipPath><image href="${logo}" x="172" y="282" width="156" height="156" clip-path="url(#escudo)"/>`
    : `<circle cx="250" cy="360" r="78" fill="#163326"/><text x="250" y="378" text-anchor="middle" fill="#b8f25a" font-family="Barlow, sans-serif" font-size="48" font-weight="700">${escaparXml(inicialesDe(m.club))}</text>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b1c12"/>
  <rect x="72" y="56" width="28" height="56" rx="6" fill="#b8f25a"/>
  <rect x="110" y="56" width="28" height="56" rx="6" fill="#b8f25a"/>
  <circle cx="105" cy="84" r="13" fill="#eef6ef"/>
  <text x="160" y="98" fill="#eef6ef" font-family="Barlow, sans-serif" font-size="34" font-weight="700">Mi Vestuario</text>
  <text x="600" y="180" text-anchor="middle" fill="#9bb5a4" font-family="Barlow, sans-serif" font-size="36" font-weight="700">${escaparXml(linea)}</text>
  ${clubMarca}
  <text x="250" y="490" text-anchor="middle" fill="#eef6ef" font-family="Barlow, sans-serif" font-size="32" font-weight="700">${club}</text>
  <text x="600" y="390" text-anchor="middle" fill="#b8f25a" font-family="Barlow, sans-serif" font-size="108" font-weight="700">${escaparXml(detalle)}</text>
  <circle cx="950" cy="360" r="78" fill="#163326"/>
  <text x="950" y="378" text-anchor="middle" fill="#eef6ef" font-family="Barlow, sans-serif" font-size="48" font-weight="700">${escaparXml(inicialesDe(m.rival || "VS"))}</text>
  <text x="950" y="490" text-anchor="middle" fill="#eef6ef" font-family="Barlow, sans-serif" font-size="32" font-weight="700">${rival}</text>
  <text x="600" y="575" text-anchor="middle" fill="#9bb5a4" font-family="Barlow, sans-serif" font-size="28">${escaparXml(sponsor)}</text>
</svg>`;
}

export function pngVivo(m: MarcadorOk, crest: string | null = null): Uint8Array {
  const font = join(dirname(fileURLToPath(import.meta.url)), "fonts", "barlow-700.ttf");
  let fontFiles: string[] = [];
  try {
    readFileSync(font);
    fontFiles = [font];
  } catch {
    fontFiles = [];
  }
  const resvg = new Resvg(svgVivo(m, crest), {
    fitTo: { mode: "width", value: 1200 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: "Barlow" },
  });
  return resvg.render().asPng();
}
