#!/usr/bin/env node
// Capturas del demo a 390×844. Requiere el server de `npm run demo`.
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const etapa = process.argv[2] || "0";
const salida = join(root, "artifacts", "capturas", etapa);
const base = process.env.DEMO_URL || "http://127.0.0.1:8080";
const chrome =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";

const pantallas = [
  ["a1-inicio", "jugador", "inicio"],
  ["a2-agenda", "jugador", "agenda"],
  ["a3-stats-jugador", "jugador", "stats"],
  ["a4-fecha-despues", "jugador", "fecha"],
  ["a5-vivo-familia", "jugador", "vivo"],
  ["a6-caja", "dt", "caja"],
  ["p1-plan-dt", "dt", "plan"],
  ["p2-salio-la-formacion", "jugador", "revelacion"],
  ["p3-mi-rol-jugador", "jugador", "rol"],
  ["p4-armar-con-datos", "dt", "datos"],
  ["p5-que-harias-vos", "jugador", "quiz"],
  ["p6a-despues-dt", "dt", "despues"],
  ["p6b-despues-jugador", "jugador", "despues"],
];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    console.error("Falta Playwright. Instalá Chromium con: npx playwright install chromium");
    process.exit(1);
  }
}

mkdirSync(salida, { recursive: true });

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(chrome) ? chrome : undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
} catch (error) {
  console.error("No pude abrir Chromium. Instalá Chromium con: npx playwright install chromium");
  console.error(String(error?.message || error));
  process.exit(1);
}

try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  for (const [nombre, como, ir] of pantallas) {
    const url = `${base}/demo?como=${como}&ir=${ir}`;
    const destino = join(salida, `${nombre}.png`);
    let status = 0;
    let ultimo = "";
    for (let intento = 0; intento < 3; intento += 1) {
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        status = resp?.status() ?? 0;
        await page.waitForFunction(
          (destino) => {
            const ruta = window.location.pathname;
            if (destino === "inicio") return ruta === "/";
            if (destino === "agenda") return ruta.startsWith("/agenda");
            if (destino === "equipo") return ruta.startsWith("/equipo");
            if (destino === "stats") return ruta.startsWith("/stats");
            if (destino === "fecha") return ruta.startsWith("/fecha");
            if (destino === "caja") return ruta.startsWith("/caja");
            if (destino === "vivo") return ruta.startsWith("/vivo");
            return ruta.startsWith("/cancha");
          },
          ir,
          { timeout: 20000 },
        );
        await page.waitForTimeout(1200);
        await page.screenshot({ path: destino, fullPage: false });
        ultimo = "";
        break;
      } catch (error) {
        ultimo = String(error?.message || error);
        await page.waitForTimeout(800);
      }
    }
    if (ultimo) {
      console.error(`${nombre} falló: ${ultimo}`);
      process.exitCode = 1;
    } else {
      console.log(`${nombre} ${status} ${destino}`);
    }
  }
} catch (error) {
  console.error(String(error?.message || error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
