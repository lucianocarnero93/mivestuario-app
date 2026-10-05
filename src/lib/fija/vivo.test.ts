import assert from "node:assert/strict";
import test from "node:test";
import { armarFormacionPublica, estadoMarcador, sanitizeLiveToken, vivoPointerAllows } from "./vivo.ts";

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

test("otro equipo no puede pisar ni borrar el link en vivo", () => {
  assert.equal(vivoPointerAllows(null, "SIETE"), true);
  assert.equal(vivoPointerAllows("SIETE", "SIETE"), true);
  assert.equal(vivoPointerAllows("SIETE", "OTRO"), false);
});

test("el link público solo acepta un token largo", () => {
  assert.equal(sanitizeLiveToken("abc"), "");
  assert.equal(sanitizeLiveToken("a".repeat(32)), "a".repeat(32));
});

test("la formación pública no sale si el DT no la publicó", () => {
  const armada = armarFormacionPublica(
    [{ key: "ARQ", label: "ARQ", x: 50, y: 80 }],
    { ARQ: "juan" },
    ["enzo"],
    [
      { id: "juan", nick: "Juan", name: "Juan Pérez", number: 1 },
      { id: "enzo", nick: "Enzo", name: "Enzo Díaz", number: 9 },
    ],
    false,
  );
  assert.deepEqual(armada, { titulares: [], banco: [] });
});

test("la formación pública lleva puesto y apodo, sin el resto del plantel", () => {
  const armada = armarFormacionPublica(
    [{ key: "ARQ", label: "ARQ", x: 50, y: 80 }],
    { ARQ: "juan" },
    ["enzo"],
    [
      { id: "juan", nick: "Juan", name: "Juan Pérez", number: 1 },
      { id: "enzo", nick: "Enzo", name: "Enzo Díaz", number: 9 },
      { id: "pepe", nick: "Pepe", name: "Pepe", number: 4 },
    ],
    true,
  );
  assert.deepEqual(armada.titulares, [{ puesto: "ARQ", nick: "1 Juan", x: 50, y: 80 }]);
  assert.deepEqual(armada.banco, ["9 Enzo"]);
});

test("dos apodos iguales sin número no muestran el nombre real", () => {
  const armada = armarFormacionPublica(
    [
      { key: "DEF", label: "DEF", x: 30, y: 60 },
      { key: "MED", label: "MED", x: 70, y: 40 },
    ],
    { DEF: "a", MED: "b" },
    [],
    [
      { id: "a", nick: "Luqui", name: "Lucas Gómez", number: null },
      { id: "b", nick: "Luqui", name: "Luciano Pérez", number: null },
    ],
    true,
  );
  assert.deepEqual(
    armada.titulares.map((puesto) => puesto.nick),
    ["Luqui · DEF", "Luqui · MED"],
  );
  assert.equal(JSON.stringify(armada).includes("Gómez"), false);
  assert.equal(JSON.stringify(armada).includes("Pérez"), false);
});

test("un menor no sale en la formación pública", () => {
  const armada = armarFormacionPublica(
    [{ key: "ARQ", label: "ARQ", x: 50, y: 80 }],
    { ARQ: "nino" },
    ["nino"],
    [
      { id: "nino", nick: "Nino", name: "Nino Real", number: 1, menor: true },
      { id: "grande", nick: "Grande", name: "Grande Real", number: 9 },
    ],
    true,
  );
  assert.deepEqual(armada, { titulares: [], banco: [] });
  assert.equal(JSON.stringify(armada).includes("Real"), false);
});

test("sin apodo el link no usa el nombre de pila", () => {
  const armada = armarFormacionPublica(
    [{ key: "DEL", label: "DEL", x: 50, y: 20 }],
    { DEL: "x" },
    [],
    [{ id: "x", nick: "", name: "Juan Carlos", number: null }],
    true,
  );
  assert.equal(armada.titulares[0]?.nick, "Jugador");
  assert.equal(JSON.stringify(armada).includes("Juan"), false);
});
