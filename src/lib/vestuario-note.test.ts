import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNote } from "./vestuario-log.ts";

test("deja una acción corta y saca el mail", () => {
  const note = sanitizeNote(" Guardar ", "falló para lucho@gmail.com ahora");
  assert.deepEqual(note, { action: "guardar", detail: "falló para [mail] ahora" });
});

test("rechaza una acción vacía", () => {
  assert.equal(sanitizeNote("***", "nada"), null);
});
