import assert from "node:assert/strict";
import test from "node:test";
import { nombreEnTarjeta, puestoEnTarjeta } from "./tarjeta.ts";

test("la tarjeta usa el apodo", () => {
  assert.equal(nombreEnTarjeta({ nick: "Tato", name: "Juan Pérez" }), "Tato");
});

test("un menor sin apodo no muestra el nombre real", () => {
  assert.equal(nombreEnTarjeta({ nick: "", name: "Juan Pérez", menor: true }), "Jugador");
});

test("sin apodo usa el nombre", () => {
  assert.equal(nombreEnTarjeta({ nick: "  ", name: "Juan Pérez" }), "Juan Pérez");
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
