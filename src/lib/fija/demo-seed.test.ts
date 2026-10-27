import assert from "node:assert/strict";
import test from "node:test";
import { MAX_BYTES } from "./club-rules.ts";
import { crearDemo, fechaDemo } from "./demo-seed.ts";
import { validarPlanilla } from "./vista.ts";

const AHORA = new Date("2026-10-27T15:00:00.000Z");

test("la fecha del demo se calcula en Argentina", () => {
  assert.equal(fechaDemo(AHORA, 0, 17), "2026-10-27T17:00:00-03:00");
  assert.equal(fechaDemo(AHORA, 4, 17), "2026-10-31T17:00:00-03:00");
  assert.equal(fechaDemo(AHORA, -1, 21), "2026-10-26T21:00:00-03:00");
});

test("el mismo instante siempre arma el mismo equipo", () => {
  assert.deepEqual(crearDemo(AHORA), crearDemo(AHORA));
});

test("Los Pibes FC cierra las planillas y deja al menor sin foto", () => {
  const bundle = crearDemo(AHORA);
  assert.equal(bundle.club.name, "Los Pibes FC");
  assert.equal(bundle.members.find((persona) => persona.nick === "Juancito")?.id, "juancito");
  const menor = bundle.members.find((persona) => persona.menor);
  assert.equal(menor?.nick, "Pibe");
  assert.equal(menor?.photo ?? null, null);
  const ids = new Set(bundle.members.map((persona) => persona.id));
  for (const evento of bundle.events) {
    for (const id of Object.values(evento.lineup)) assert.ok(ids.has(id), id);
    for (const id of evento.suplentes ?? []) assert.ok(ids.has(id), id);
  }
  assert.equal(bundle.events.find((evento) => evento.id === "ev-racing")?.vistos?.length, 10);
  const abiertos = (bundle.figuraVotes ?? []).filter((voto) => voto.eventId === "ev-academia");
  assert.equal(abiertos.length, 7);
  for (const hoja of bundle.matchSheets) {
    const cierre = validarPlanilla(hoja);
    assert.equal(cierre.cierra, true, hoja.eventId);
  }
  const goles = bundle.matchSheets.reduce(
    (suma, hoja) => suma + hoja.goalsFor * 1000 + hoja.goalsAgainst,
    0,
  );
  const aFavor = bundle.matchSheets.reduce((suma, hoja) => suma + hoja.goalsFor, 0);
  const enContra = bundle.matchSheets.reduce((suma, hoja) => suma + hoja.goalsAgainst, 0);
  assert.equal(aFavor, 23);
  assert.equal(enContra, 9);
  assert.equal(goles > 0, true);
  assert.ok(Buffer.byteLength(JSON.stringify(bundle)) < MAX_BYTES);
});
