#!/usr/bin/env node
// Recorre la demo de modelos como DT, ayudante y jugador.
// No toca la base. Hace falta `npm run demo` en el 8080.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.MODELOS_URL || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const SHOTS = process.env.MODELOS_SHOTS || "/workspace/screenshots";
mkdirSync(SHOTS, { recursive: true });

const fallos = [];
function ok(cond, mensaje) {
  if (!cond) fallos.push(mensaje);
}

async function entrar(browser, como) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const js = [];
  page.on("pageerror", (err) => js.push(String(err)));
  const popups = [];
  page.on("popup", () => popups.push("popup"));
  await page.goto(`${BASE}/demo?como=${como}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const nick = como === "dt" ? "Profe" : como === "ayudante" ? "Sofi" : "Juancito";
  await page.getByText(`Hola, ${nick}`).waitFor({ timeout: 20000 });
  return { context, page, js, popups };
}

async function estilo(locator) {
  return (await locator.getAttribute("style")) ?? "";
}

async function abrirPresion(page) {
  await page.goto(`${BASE}/cancha?ver=modelos&partido=ev-racing`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("biblioteca-modelos").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Presión alta tras pérdida", exact: true }).click();
  await page.getByTestId("detalle-modelo").waitFor();
}

async function contarFichas(page) {
  return page.locator("[data-testid^='ficha-']").count();
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const dt = await entrar(browser, "dt");
  ok((await dt.page.locator("body").innerText()).includes("Los Pibes FC"), "el DT no ve Los Pibes FC");
  ok(await dt.page.getByTestId("modelos-inicio").isVisible(), "el DT no ve la tarjeta de modelos en Inicio");
  await dt.page.screenshot({ path: `${SHOTS}/dt-inicio.png`, fullPage: true });

  await dt.page.goto(`${BASE}/cancha`, { waitUntil: "domcontentloaded" });
  await dt.page.getByRole("button", { name: "Tu puesto" }).waitFor();
  ok(await dt.page.getByTestId("entrada-modelos").isVisible(), "falta el botón de modelos en Tu puesto");
  ok(await dt.page.getByTestId("claves-equipo").isVisible(), "el DT no ve las claves");
  ok((await dt.page.locator("body").innerText()).includes("Presionar arriba"), "falta la clave Presionar arriba");
  ok(await dt.page.getByText("Cambios planeados").isVisible(), "el DT no ve los cambios planeados");
  await dt.page.screenshot({ path: `${SHOTS}/dt-tu-puesto.png`, fullPage: true });

  await dt.page.getByRole("button", { name: "Pelota parada" }).click();
  await dt.page.getByTestId("pelota-quien").waitFor();
  ok((await dt.page.locator("body").innerText()).includes("Córners"), "el DT no asigna los córners");
  await dt.page.screenshot({ path: `${SHOTS}/dt-pelota.png`, fullPage: false });

  await dt.page.getByRole("button", { name: "Jugada", exact: true }).click();
  await dt.page.getByRole("heading", { name: "Pizarra" }).waitFor();
  await dt.page.getByRole("button", { name: "Planes" }).click();
  ok(await dt.page.getByRole("button", { name: "F5", exact: true }).isVisible(), "Planes no deja cambiar el formato");

  await dt.page.goto(`${BASE}/cancha?ver=modelos&partido=ev-racing`, { waitUntil: "domcontentloaded" });
  await dt.page.getByTestId("biblioteca-modelos").waitFor();
  const biblio = (await dt.page.locator("body").innerText()).toLowerCase();
  ok(biblio.includes("salida corta desde el fondo"), "falta la biblioteca");
  ok(biblio.includes("en este partido (3/3)"), "no hay 3 modelos cargados");
  ok(!biblio.includes("tiempo real"), "el copy dice tiempo real");
  await dt.page.screenshot({ path: `${SHOTS}/dt-biblioteca.png`, fullPage: true });

  await abrirPresion(dt.page);
  await dt.page.getByRole("button", { name: "Ver el movimiento" }).click();
  await dt.page.getByText("2. Los de al lado tapan los pases").waitFor({ timeout: 4000 });
  await dt.page.getByRole("button", { name: "Pausa" }).click();
  await dt.page.screenshot({ path: `${SHOTS}/dt-movimiento.png`, fullPage: false });

  await dt.page.getByTestId("detalle-modelo").getByRole("button", { name: "1", exact: true }).click();
  const antesJuancito = await estilo(dt.page.getByTestId("ficha-juancito"));
  const antesLuqui = await estilo(dt.page.getByTestId("ficha-luqui"));
  ok(antesJuancito && antesJuancito !== antesLuqui, "las fichas de Juancito y Luqui no se distinguen");
  await dt.page.getByTestId("ficha-juancito").click();
  await dt.page.getByTestId("ficha-luqui").click();
  await dt.page.waitForFunction(
    ([a, b]) => {
      const ja = document.querySelector("[data-testid='ficha-juancito']")?.getAttribute("style");
      const lu = document.querySelector("[data-testid='ficha-luqui']")?.getAttribute("style");
      return ja === b && lu === a;
    },
    [antesJuancito, antesLuqui],
  );
  await dt.page.reload({ waitUntil: "domcontentloaded" });
  await abrirPresion(dt.page);
  ok((await estilo(dt.page.getByTestId("ficha-juancito"))) === antesLuqui, "el cruce no se guardó al recargar");
  ok((await estilo(dt.page.getByTestId("ficha-luqui"))) === antesJuancito, "el cruce no movió a Luqui");
  await dt.page.getByTestId("ficha-juancito").click();
  await dt.page.getByTestId("ficha-luqui").click();
  await dt.page.waitForFunction(
    (estiloInicial) => document.querySelector("[data-testid='ficha-juancito']")?.getAttribute("style") === estiloInicial,
    antesJuancito,
  );

  await dt.page.getByRole("button", { name: "Avisar al grupo por WhatsApp" }).click();
  await dt.page.getByText("En la demo no se manda nada.").waitFor();
  ok(dt.popups.length === 0, "la demo abrió WhatsApp");

  await dt.page.getByRole("button", { name: "Tu puesto" }).click();
  const puesto = await dt.page.locator("body").innerText();
  ok(puesto.includes("Juancito") && puesto.includes("VOL"), "el cruce cambió el puesto real de Juancito");
  ok(puesto.includes("Luqui") && puesto.includes("DEL"), "el cruce cambió el puesto real de Luqui");

  for (const [formato, cantidad] of [["F5", 5], ["F8", 8], ["F11", 11]]) {
    await dt.page.getByRole("button", { name: "Planes" }).click();
    await dt.page.getByRole("button", { name: formato, exact: true }).click();
    await abrirPresion(dt.page);
    const n = await contarFichas(dt.page);
    ok(n === cantidad, `${formato} armó ${n} fichas, se esperaban ${cantidad}`);
  }

  await dt.page.goto(`${BASE}/equipo`, { waitUntil: "domcontentloaded" });
  await dt.page.getByRole("heading", { name: "Plantel" }).waitFor();
  const equipo = await dt.page.locator("body").innerText();
  ok(equipo.includes("Pibe"), "no aparece el apodo del menor");
  ok(equipo.includes("Solo el apodo"), "el menor no está marcado como solo apodo");
  ok(!equipo.includes("Benjamín"), "se ve el nombre legal del menor");

  const ayuda = await entrar(browser, "ayudante");
  ok((await ayuda.page.locator("body").innerText()).includes("Los Pibes FC"), "la ayudante no ve Los Pibes");
  await ayuda.page.goto(`${BASE}/cancha?ver=modelos&partido=ev-racing`, { waitUntil: "domcontentloaded" });
  await ayuda.page.getByTestId("biblioteca-modelos").waitFor();
  ok(await ayuda.page.getByRole("button", { name: "Usar en el partido" }).first().isVisible(), "la ayudante no puede usar un modelo");
  await ayuda.page.goto(`${BASE}/cancha`, { waitUntil: "domcontentloaded" });
  await ayuda.page.getByText("Cambios planeados").waitFor();
  await ayuda.page.getByRole("button", { name: "Pelota parada" }).click();
  ok(await ayuda.page.getByTestId("pelota-quien").isVisible(), "la ayudante no asigna la pelota parada");

  const jugador = await entrar(browser, "jugador");
  await jugador.page.getByTestId("tu-partido").waitFor();
  const inicio = (await jugador.page.locator("body").innerText()).toLowerCase();
  ok(inicio.includes("salís de vol"), "Juancito no ve su puesto");
  ok(inicio.includes("pedila siempre"), "falta la frase");
  ok(inicio.includes("pateás los córners."), "falta la tarea del córner");
  ok(inicio.includes("salís a los 2t 10'. entra 16 mati."), "falta el cambio planeado");
  ok(inicio.includes("el dt cargó 3 modelos"), "el jugador no ve los 3 modelos");
  ok(inicio.includes("vos, volante:"), "falta la línea del volante");
  await jugador.page.screenshot({ path: `${SHOTS}/jugador-inicio.png`, fullPage: true });

  await jugador.page.getByText("Verlo animado").click();
  await jugador.page.getByTestId("detalle-modelo").waitFor();
  await jugador.page.getByTestId("vos").waitFor();
  const linea = await jugador.page.getByTestId("linea-vos").innerText();
  ok(linea.startsWith("Vos, volante:"), `la línea no es de volante: ${linea}`);
  ok((await jugador.page.getByTestId("vos").innerText()) === "Vos", "Vos no es el nombre de la ficha");
  const circulo = jugador.page.getByTestId("ficha-juancito");
  ok(!(await circulo.innerText()).includes("Vos\nVos") && (await circulo.innerText()).includes("MI"), "la ficha no muestra el puesto MI");
  ok((await circulo.innerText()).includes("8"), "la ficha no muestra el número");
  ok((await jugador.page.locator("body").innerText()).includes("Ver el movimiento"), "el jugador no puede animar");
  ok((await jugador.page.getByRole("button", { name: "Usar en el partido" }).count()) === 0, "el jugador puede cargar un modelo");
  ok((await jugador.page.getByRole("button", { name: "Avisar al grupo por WhatsApp" }).count()) === 1, "el jugador no puede avisar");
  await jugador.page.screenshot({ path: `${SHOTS}/jugador-modelo.png`, fullPage: false });

  await jugador.page.getByRole("button", { name: "Tu puesto" }).click();
  ok((await jugador.page.getByRole("button", { name: "+ Sumar clave" }).count()) === 0, "el jugador edita las claves");
  ok((await jugador.page.getByRole("button", { name: /Quitar / }).count()) === 0, "el jugador borra claves");
  ok((await jugador.page.locator("body").innerText()).includes("Presionar arriba"), "el jugador no lee las claves");
  ok((await jugador.page.getByText("Cambios planeados").count()) === 0, "el jugador ve el editor de cambios");
  await jugador.page.getByRole("button", { name: "Pelota parada" }).click();
  ok((await jugador.page.getByText("quién hace qué").count()) === 0, "el jugador ve el editor de pelota parada");
  await jugador.page.getByRole("button", { name: "Jugada", exact: true }).click();
  await jugador.page.getByRole("heading", { name: "Pizarra" }).waitFor();
  await jugador.page.getByRole("button", { name: "Planes" }).click();
  ok((await jugador.page.getByRole("button", { name: "F11", exact: true }).count()) === 0, "el jugador cambia el formato");

  const todos = [...dt.js, ...ayuda.js, ...jugador.js];
  ok(todos.length === 0, `errores de JS: ${todos.join(" | ")}`);

  await Promise.all([dt.context.close(), ayuda.context.close(), jugador.context.close()]);
} finally {
  await browser.close();
}

if (fallos.length) {
  console.error(fallos.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("modelos e2e ok");
