#!/usr/bin/env node
/* Exporta cada parte del avatar como SVG suelto, parametrizado con variables CSS,
   y un catálogo JSON. Salida: avatar/svg/parts/<capa>/<opcion>.svg + avatar/catalog.json
   Las partes usan el mismo sistema de coordenadas (0–400) y el mismo encuadre (VIEWBOX),
   así que se apilan una encima de otra en el orden de LAYER_ORDER. */
const fs = require("fs");
const path = require("path");
const A = require("./avatar.js");
const OUT = path.join(__dirname, "svg", "parts");

// Paleta con variables CSS (con valor por defecto) en vez de colores fijos.
const VARS = {
  skin: "var(--mv-skin, #e0aa83)", skinShade: "var(--mv-skin-shade, #bb8968)", skinDeep: "var(--mv-skin-deep, #a27257)",
  lip: "var(--mv-lip, #ac6e5b)", mouth: "var(--mv-mouth, #6d3f32)", blush: "var(--mv-blush, rgba(224,90,72,.16))", eye: "var(--mv-eye, #1e1613)",
  hair: "var(--mv-hair, #3b2519)", hairDark: "var(--mv-hair-dark, #2a1b12)", hairLight: "var(--mv-hair-light, #574337)",
  brow: "var(--mv-brow, #352117)", stubble: "var(--mv-stubble, #b38668)",
  primary: "var(--mv-primary, #1f6f3f)", primaryDark: "var(--mv-primary-dark, #175430)",
  secondary: "var(--mv-secondary, #b8f25a)", secondaryDark: "var(--mv-secondary-dark, #93c248)", band: "var(--mv-band, #b8f25a)"
};
// Las mezclas que en avatar.js se calculan en vivo (rapado) quedan con su variable propia.
const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${A.VIEWBOX}">${inner}</svg>\n`;
const write = (layer, name, inner) => {
  if (!inner) return;
  const dir = path.join(OUT, layer);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + ".svg"), wrap(inner));
};
fs.rmSync(OUT, { recursive: true, force: true });

const base = A.normalize({});
const fixMix = (s) => s.replace(/#[0-9a-f]{6}/g, (m) => m); // los hex que quedan son fijos (blanco, marco de anteojos, cierre)

// cuello, cabeza, cara, boca
write("cuello", "cuello", A._layerNeck(VARS));
write("cabeza", "cabeza", A._layerHead(VARS));
write("cara", "cara", A._layerFace(base, VARS));
write("boca", "boca", A._layerMouth(base, VARS));
write("boca", "boca-con-barba", A._layerMouth(Object.assign({}, base, { facial: "barba" }), VARS));
// pelo (atrás / adelante)
A.HAIRS.forEach((h) => {
  const parts = A._hairParts(Object.assign({}, base, { hair: h }), Object.assign({}, VARS, { skin: "#e0aa83" }));
  // el rapado mezcla piel y pelo: lo dejamos con su variable
  const front = h === "rapado" ? parts.front.replace(/fill="#[0-9a-fA-FN]+"/g, 'fill="var(--mv-buzz, #7a5a45)"') : parts.front;
  write("pelo-atras", h, parts.back);
  write("pelo-adelante", h, front);
});
// barba
A.FACIALS.forEach((f) => write("barba", f, A._layerFacial(Object.assign({}, base, { facial: f }), VARS)));
// camiseta: un archivo por diseño × cuello (el diseño se recorta con la forma del cuello)
A.PATTERNS.forEach((p) => A.COLLARS.forEach((c) =>
  write("camiseta", p + "-" + c, A._layerShirt(Object.assign({}, base, { collar: c, shirtPattern: p }), VARS, "cam-" + p + "-" + c))));
// extras
const ex = A._layerExtras(Object.assign({}, base, { extras: ["vincha", "anteojos"] }), VARS);
write("vincha", "vincha", ex.band);
write("anteojos", "anteojos", ex.glasses);

// catálogo
const catalog = {
  version: 1,
  viewBox: A.VIEWBOX,
  canvas: "coordenadas 0–400; encuadre 20,24 → 380,384",
  layerOrder: A.LAYER_ORDER,
  options: {
    skin: A.SKINS, hairColor: A.HAIR_COLORS, hair: A.HAIRS, facial: A.FACIALS, extras: A.EXTRAS,
    shirtPattern: A.PATTERNS, collar: A.COLLARS
  },
  labels: A.LABELS,
  default: A.DEFAULT,
  defaultTeam: A.DEFAULT_TEAM,
  derivedColors: {
    skinShade: "mix(skin, #3b1a0e, .20)", skinDeep: "mix(skin, #3b1a0e, .34)",
    lip: "mix(skin, #5c1f1c, lum(skin) > .5 ? .42 : .50)", mouth: "mix(skin, #2a0c0a, .62)",
    hairDark: "mix(hair, #000, claro ? .20 : .28)", hairLight: "mix(hair, #fff, claro ? .28 : .16)",
    brow: "claro ? mix(hair, #2a1a10, .38) : mix(hair, #000, .10)", stubble: "mix(skin, hair, claro ? .30 : .24)",
    buzz: "mix(skin, hair, .72)", primaryDark: "mix(primary, #000, .24)", secondaryDark: "mix(secondary, #000, .20)",
    band: "secondary", note: "claro = luminancia(hair) > .45; mix(a,b,t) = a + (b-a)*t por canal RGB"
  }
};
fs.writeFileSync(path.join(__dirname, "catalog.json"), JSON.stringify(catalog, null, 2));
let n = 0; for (const d of fs.readdirSync(OUT)) n += fs.readdirSync(path.join(OUT, d)).length;
console.log("partes svg:", n);
