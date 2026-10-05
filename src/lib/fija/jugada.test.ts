import assert from "node:assert/strict";
import test from "node:test";
import { notasVisibles, preferirJugada, sanitizeJugada } from "./jugada.ts";

test("una jugada guarda el texto y si tiene audio", () => {
  const jugada = sanitizeJugada({
    updatedAt: "2026-10-05T12:00:00-03:00",
    notas: [
      { id: "n1", texto: "  Salimos cortos por abajo  ", audio: true },
      { id: "!!!", texto: "no", audio: false },
    ],
  });
  assert.equal(jugada?.notas.length, 1);
  assert.equal(jugada?.notas[0]?.texto, "Salimos cortos por abajo");
  assert.equal(jugada?.notas[0]?.audio, true);
});

test("gana la copia más nueva, aunque borre las jugadas", () => {
  const vieja = sanitizeJugada({
    updatedAt: "2026-10-05T12:00:00-03:00",
    notas: [{ id: "n1", texto: "vieja", audio: false }],
  });
  const nueva = sanitizeJugada({ updatedAt: "2026-10-05T12:05:00-03:00", notas: [] });
  assert.deepEqual(preferirJugada(vieja, nueva), nueva);
  assert.equal(notasVisibles(nueva).length, 0);
  assert.equal(notasVisibles(vieja)[0]?.texto, "vieja");
});
