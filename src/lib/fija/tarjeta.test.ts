import assert from "node:assert/strict";
import test from "node:test";
import { fotoEnTarjeta, lineasDelPartido, nombreEnTarjeta, puestoEnTarjeta } from "./tarjeta.ts";

test("la tarjeta usa el apodo", () => {
  assert.equal(nombreEnTarjeta({ nick: "Tato", name: "Juan Pérez" }), "Tato");
});

test("un menor sin apodo no muestra el nombre real", () => {
  assert.equal(nombreEnTarjeta({ nick: "", name: "Juan Pérez", menor: true }), "Jugador");
});

test("sin apodo usa el nombre", () => {
  assert.equal(nombreEnTarjeta({ nick: "  ", name: "Juan Pérez" }), "Juan Pérez");
});

test("en un contexto público, sin apodo no usa el nombre real", () => {
  assert.equal(nombreEnTarjeta({ nick: "", name: "Juan Pérez" }, { publico: true }), "Jugador");
  assert.equal(nombreEnTarjeta({ name: "Juan Pérez" }, { publico: true }).includes("Juan"), false);
});

test("un menor no lleva foto propia ni la del equipo", () => {
  assert.equal(fotoEnTarjeta({ photo: "data:image/jpeg,abc", menor: true }, "data:image/jpeg,eq"), null);
});

test("sin foto propia usa la del equipo", () => {
  assert.equal(fotoEnTarjeta({ photo: null }, "data:image/jpeg,eq"), "data:image/jpeg,eq");
});

test("la tarjeta del equipo lista nombres y no la formación", () => {
  const lineas = lineasDelPartido([
    { nick: "Tato", goals: 2, assists: 1, yellow: 0, red: 0 },
    { nick: "Juancito", goals: 0, assists: 0, yellow: 1, red: 0 },
  ]);
  assert.deepEqual(
    lineas.map((linea) => linea.etiqueta),
    ["GOLES", "ASISTENCIAS", "TARJETAS"],
  );
  assert.equal(lineas[0]?.texto, "Tato 2");
});
test("el puesto sale de la formación, no de un texto libre", () => {
  const puesto = puestoEnTarjeta(
    {
      modality: "f5",
      formacion: "diamante",
      lineup: { ED: "p1" },
      suplentes: ["p2"],
    },
    "p1",
  );
  assert.equal(puesto, "DEL");
  assert.equal(
    puestoEnTarjeta({ modality: "f5", formacion: "diamante", lineup: {}, suplentes: ["p2"] }, "p2"),
    "SUP",
  );
});
