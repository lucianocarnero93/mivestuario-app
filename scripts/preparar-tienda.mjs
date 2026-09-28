#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const fails = [];

function check(name, ok, detail) {
  console.log(`${ok ? "ok" : "no"}   ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) fails.push(name);
}

const manifest = JSON.parse(read("public/manifest.json").toString());
check("nombre", manifest.name === "Mi Vestuario App" && manifest.short_name === "Vestuario");
check("inicio", manifest.start_url === "/" && manifest.display === "standalone");
check("ícono 512", manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
check("ícono maskable", manifest.icons.some((icon) => icon.purpose === "maskable"));
check("sin edad de ejemplo", !manifest.iarc_rating_id, manifest.iarc_rating_id ? "hay un código inventado" : "");
check("capturas", manifest.screenshots.filter((shot) => shot.form_factor === "narrow").length >= 2);

for (const file of [
  "public/icon-512.png",
  "public/icon-maskable-512.png",
  "public/apple-touch-icon.png",
  "public/screenshots/narrow-home.png",
  "public/screenshots/narrow-cancha.png",
  "public/screenshots/narrow-equipo.png",
  "store/icono-1024.png",
  "store/grafica-1024x500.png",
]) {
  try {
    check(file, read(file).length > 500);
  } catch {
    check(file, false, "no está");
  }
}

const linksPath = "public/.well-known/assetlinks.json";
const links = JSON.parse(read(linksPath).toString());
const fingerprint = links[0]?.target?.sha256_cert_fingerprints?.[0] ?? "";
const sha = process.env.ANDROID_SHA256?.trim();
if (sha) {
  links[0].target.sha256_cert_fingerprints = [sha];
  writeFileSync(new URL(linksPath, root), `${JSON.stringify(links, null, 2)}\n`);
  check("Android", true, "huella escrita");
} else {
  check(
    "Android",
    /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/i.test(fingerprint),
    "falta la huella SHA-256. Creala con Bubblewrap y corré ANDROID_SHA256='...' npm run tienda",
  );
}

const digest = createHash("sha256").update(read("public/manifest.json")).digest("hex").slice(0, 12);
console.log(`\nmanifest ${digest}`);
console.log(fails.length ? `${fails.length} pendiente${fails.length === 1 ? "" : "s"}.` : "El sitio está listo para empaquetar.");
process.exit(fails.length ? 1 : 0);
