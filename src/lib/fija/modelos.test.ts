import assert from "node:assert/strict";
import test from "node:test";
import { FORMATIONS, MODALITIES } from "./formations.ts";
import { aplicarCruces, alternarCruce, asignarActores, FICHA_MAX, FICHA_MIN, resolverCuadros } from "./modelos-evento.ts";
import { aplicaEn, MODELOS, modeloDeLaSemana } from "./modelos.ts";
import { normalizarTactica, puedeCargarTactica, tareasDe, textoWhatsapp } from "./tactica.ts";
import type { Modality } from "./types.ts";

test("cada modelo tiene claves, roles y una fuente con link", () => {
  assert.equal(MODELOS.length, 11);
  const ids = new Set<string>();
  for (const modelo of MODELOS) {
    assert.equal(ids.has(modelo.id), false);
    ids.add(modelo.id);
    assert.equal(modelo.claves.length, 3);
    assert.equal(modelo.cuadros.length, 3);
    assert.match(modelo.lineas.ARQ, /^Vos, /);
    assert.match(modelo.lineas.DEF, /^Vos, /);
    assert.match(modelo.lineas.VOL, /^Vos, /);
    assert.match(modelo.lineas.DEL, /^Vos, /);
    assert.ok(modelo.fuentes.length >= 1);
    for (const fuente of modelo.fuentes) assert.match(fuente.url, /^https:\/\//);
    const texto = JSON.stringify(modelo);
    assert.equal(texto.includes("tiempo real"), false);
    assert.equal(texto.includes("$"), false);
  }
});

test("la semana ISO elige un modelo de la biblioteca", () => {
  const modelo = modeloDeLaSemana(new Date("2026-10-27T12:00:00-03:00"));
  assert.ok(MODELOS.some((item) => item.id === modelo.id));
});

test("en cada formación las fichas quedan en la cancha y no se repiten", () => {
  for (const modalidad of MODALITIES) {
    for (const forma of FORMATIONS[modalidad]) {
      const lineup: Record<string, string> = {};
      forma.slots.forEach((slot, index) => {
        lineup[slot.key] = `j${index}`;
      });
      for (const modelo of MODELOS) {
        const cuadros = resolverCuadros(modelo, forma.slots, lineup, modalidad);
        if (!aplicaEn(modelo, modalidad)) {
          assert.equal(cuadros, null, `${modelo.id} no debería armarse en ${modalidad}`);
          continue;
        }
        assert.ok(cuadros, `${modelo.id} ${modalidad} ${forma.id}`);
        const actores = asignarActores(forma.slots, modelo);
        for (const slot of actores.values()) assert.notEqual(slot, "ARQ");
        for (const cuadro of cuadros) {
          const ids = cuadro.fichas.map((ficha) => ficha.id);
          assert.equal(new Set(ids).size, ids.length, `${modelo.id} ${forma.id}`);
          for (const ficha of cuadro.fichas) {
            assert.ok(ficha.x >= FICHA_MIN && ficha.x <= FICHA_MAX, `${modelo.id} ${forma.id} ${ficha.id} x ${ficha.x}`);
            assert.ok(ficha.y >= FICHA_MIN && ficha.y <= FICHA_MAX, `${modelo.id} ${forma.id} ${ficha.id} y ${ficha.y}`);
          }
          assert.ok(cuadro.pelota.x >= FICHA_MIN && cuadro.pelota.x <= FICHA_MAX);
          assert.ok(cuadro.pelota.y >= FICHA_MIN && cuadro.pelota.y <= FICHA_MAX);
        }
      }
    }
  }
});

test("repetir el mismo par deshace el cruce y no pasa de 12", () => {
  const lineup = { ARQ: "fede", LI: "tincho", DC: "luqui" };
  const una = alternarCruce([], "tincho", "luqui");
  assert.deepEqual(aplicarCruces(lineup, una), { ARQ: "fede", LI: "luqui", DC: "tincho" });
  assert.deepEqual(aplicarCruces(lineup, alternarCruce(una, "luqui", "tincho")), lineup);
  let cruces: [string, string][] = [];
  for (let i = 0; i < 20; i += 1) cruces = alternarCruce(cruces, `a${i}`, `b${i}`);
  assert.equal(cruces.length, 12);
});

test("el partido guarda hasta 3 modelos y el jugador no carga la táctica", () => {
  const tactica = normalizarTactica({
    claves: ["Presionar arriba", "Juntos y cortos", "Hablar siempre", "Pase al libre", "inventada"],
    frases: { juancito: "Pedila siempre", "fede": "no existe" },
    modelos: [
      { id: "presion-perdida", cruces: [["juancito", "colo"]] },
      { id: "contraataque", cruces: [] },
      { id: "tercer-hombre", cruces: [] },
      { id: "salida-corta", cruces: [] },
      { id: "no-existe", cruces: [] },
    ],
    cambios: [{ sale: "juancito", entra: "mati", cuando: "2T 10'" }],
    pelota: { corners: "juancito" },
  });
  assert.deepEqual(tactica.claves, ["Presionar arriba", "Juntos y cortos", "Hablar siempre"]);
  assert.deepEqual(tactica.frases, { juancito: "Pedila siempre" });
  assert.equal(tactica.modelos?.length, 3);
  assert.equal(puedeCargarTactica("dt"), true);
  assert.equal(puedeCargarTactica("ayudante"), true);
  assert.equal(puedeCargarTactica("jugador"), false);
  const tareas = tareasDe(tactica, "juancito", [{ id: "mati", nick: "Mati", number: 16 }]);
  assert.deepEqual(tareas, ["Pateás los córners.", "Salís a los 2T 10'. Entra 16 Mati."]);
});

test("el texto para avisar no lleva nombres", () => {
  const modelo = MODELOS.find((item) => item.id === "presion-perdida");
  assert.ok(modelo);
  const texto = textoWhatsapp(modelo);
  assert.match(texto, /Presión alta tras pérdida/);
  assert.equal(texto.includes("Juancito"), false);
  assert.equal(texto.includes("Facu"), false);
  for (const modalidad of ["f5", "f7", "f8", "f9", "f11"] as Modality[]) {
    if (modelo.noAplica[modalidad]) assert.equal(aplicaEn(modelo, modalidad), false);
  }
});
