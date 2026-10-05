import assert from "node:assert/strict";
import test from "node:test";
import { jugadaVisible, preferirJugada, sanitizeJugada } from "./jugada.ts";

test("la jugada corta el texto a tres palabras y descarta flechas raras", () => {
  const jugada = sanitizeJugada({
    updatedAt: "2026-10-05T12:00:00-03:00",
    pasos: [
      {
        id: "p1",
        nota: "salir jugando",
        trazos: [
          { id: "a", tipo: "flecha", clase: "pase", x1: -4, y1: 10, x2: 140, y2: 40 },
          { id: "b", tipo: "flecha", clase: "cualquier", x1: 1, y1: 1, x2: 2, y2: 2 },
          { id: "c", tipo: "texto", x: 20, y: 30, texto: "no lo persigas más" },
        ],
      },
    ],
  });
  assert.equal(jugada?.pasos[0]?.trazos.length, 2);
  assert.deepEqual(jugada?.pasos[0]?.trazos[0], {
    id: "a",
    tipo: "flecha",
    clase: "pase",
    x1: 0,
    y1: 10,
    x2: 100,
    y2: 40,
  });
  assert.equal(jugada?.pasos[0]?.trazos[1]?.tipo === "texto" && jugada.pasos[0].trazos[1].texto, "no lo persigas");
});

test("gana la jugada más nueva, aunque la otra tenga más trazos", () => {
  const vieja = sanitizeJugada({
    updatedAt: "2026-10-05T12:00:00-03:00",
    pasos: [{ id: "p1", nota: "vieja", trazos: [{ id: "a", tipo: "zona", x: 10, y: 10 }] }],
  });
  const nueva = sanitizeJugada({ updatedAt: "2026-10-05T12:05:00-03:00", pasos: [] });
  assert.deepEqual(preferirJugada(vieja, nueva), nueva);
  assert.equal(jugadaVisible(nueva).length, 0);
  assert.equal(jugadaVisible(vieja)[0]?.nota, "vieja");
});
