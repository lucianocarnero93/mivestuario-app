import assert from "node:assert/strict";
import test from "node:test";
import { etiquetaValida, leyendaDe } from "./pizarra.ts";

test("solo acepta las etiquetas del vestuario", () => {
  assert.equal(etiquetaValida("Presionar"), "Presionar");
  assert.equal(etiquetaValida("flecha roja"), "");
});

test("la leyenda deja afuera a quien no está en la cancha", () => {
  const lista = leyendaDe(
    {
      juan: { etiqueta: "Presionar", nota: "al 10" },
      pepe: { etiqueta: "Cubrir", nota: "" },
    },
    ["juan"],
    [
      { id: "juan", nick: "Juan", name: "Juan" },
      { id: "pepe", nick: "Pepe", name: "Pepe" },
    ],
  );
  assert.deepEqual(lista, [{ id: "juan", nick: "Juan", etiqueta: "Presionar", nota: "al 10" }]);
});
