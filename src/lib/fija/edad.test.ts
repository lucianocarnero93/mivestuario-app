import assert from "node:assert/strict";
import test from "node:test";
import { edadEnAnios, esMenor } from "./edad.ts";

const hoy = new Date(2026, 8, 28);

test("todavía no cumplió y sigue siendo menor", () => {
  assert.equal(edadEnAnios("2008-10-01", hoy), 17);
  assert.equal(esMenor("2008-10-01", hoy), true);
});

test("ya cumplió los 18", () => {
  assert.equal(edadEnAnios("2008-09-28", hoy), 18);
  assert.equal(esMenor("2008-09-01", hoy), false);
});

test("rechaza una fecha futura o imposible", () => {
  assert.equal(esMenor("2027-01-01", hoy), null);
  assert.equal(esMenor("2026-02-31", hoy), null);
});
