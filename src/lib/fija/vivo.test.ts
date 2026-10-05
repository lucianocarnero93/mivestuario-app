import assert from "node:assert/strict";
import test from "node:test";
import { estadoMarcador, sanitizeLiveToken } from "./vivo.ts";

const kick = "2026-10-04T15:00:00-03:00";

test("antes del partido el marcador espera", () => {
  assert.equal(estadoMarcador({ startsAt: kick }, Date.parse("2026-10-04T14:00:00-03:00")), "espera");
});

test("en el horario queda en juego hasta que el DT cierra la planilla", () => {
  assert.equal(estadoMarcador({ startsAt: kick }, Date.parse("2026-10-04T15:10:00-03:00")), "juego");
  assert.equal(
    estadoMarcador({ startsAt: kick, resultClosedAt: "2026-10-04T17:00:00-03:00" }, Date.parse("2026-10-04T18:00:00-03:00")),
    "final",
  );
});

test("el link público solo acepta un token largo", () => {
  assert.equal(sanitizeLiveToken("abc"), "");
  assert.equal(sanitizeLiveToken("a".repeat(32)), "a".repeat(32));
});
