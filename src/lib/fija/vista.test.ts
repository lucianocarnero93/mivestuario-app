import assert from "node:assert/strict";
import test from "node:test";
import { momentoFecha } from "./fecha.ts";
import { posicionRanking, rangoSemana, resumenSemana, validarPlanilla, vitrina } from "./vista.ts";
import type { ClubEvent } from "./types.ts";

test("validarPlanilla pide los goles que no tienen autor", () => {
  assert.deepEqual(validarPlanilla({ goalsFor: 3, players: [{ goals: 2 }, { goals: 1 }] }), { cierra: true, faltan: 0 });
  assert.deepEqual(validarPlanilla({ goalsFor: 6, players: [{ goals: 3 }] }), { cierra: false, faltan: 3 });
  assert.deepEqual(validarPlanilla({ goalsFor: 0, players: [] }), { cierra: true, faltan: 0 });
  assert.deepEqual(validarPlanilla({ goalsFor: 3, sinAutor: 1, players: [{ goals: 2 }] }), { cierra: true, faltan: 0 });
  assert.deepEqual(validarPlanilla({ goalsFor: 3, sinAutor: 1, players: [{ goals: 3 }] }), { cierra: false, faltan: 0 });
});

test("posicionRanking dice el puesto y cuánto falta", () => {
  const filas = [
    { memberId: "a", valor: 4 },
    { memberId: "b", valor: 3 },
  ];
  assert.deepEqual(posicionRanking("a", filas), { puesto: 1, falta: 0, lider: 4 });
  assert.deepEqual(posicionRanking("b", filas), { puesto: 2, falta: 1, lider: 4 });
  assert.equal(posicionRanking("c", [{ memberId: "a", valor: 0 }]), null);
});

test("momentoFecha no mezcla en juego con un partido viejo", () => {
  const ahora = Date.parse("2026-10-06T18:00:00-03:00");
  const partido = (id: string, startsAt: string, extra: Partial<ClubEvent> = {}): ClubEvent => ({
    id,
    kind: "partido",
    title: id,
    place: "",
    mapsQuery: "",
    lat: null,
    lng: null,
    startsAt,
    modality: "f8",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
    ...extra,
  });
  assert.equal(momentoFecha([], ahora), "sin_partido");
  assert.equal(momentoFecha([partido("vivo", "2026-10-06T16:00:00-03:00")], ahora), "en_juego");
  assert.equal(momentoFecha([partido("tarde", "2026-10-06T21:00:00-03:00")], ahora), "antes");
  assert.equal(
    momentoFecha([partido("listo", "2026-10-06T12:00:00-03:00", { resultClosedAt: "2026-10-06T14:00:00-03:00" })], ahora),
    "despues",
  );
  assert.equal(momentoFecha([partido("olvidado", "2026-09-01T21:00:00-03:00")], ahora), "sin_partido");
});

test("la vitrina esconde al capitán y cuenta las ganadas", () => {
  const huecos = vitrina([{ tipo: "hat-trick", memberId: "mati" }, { tipo: "hat-trick", memberId: "mati" }], "mati");
  assert.equal(huecos.some((item) => item.titulo === "Capitán/a"), false);
  assert.equal(huecos.length, 8);
  const hat = huecos.find((item) => item.tipo === "hat-trick");
  assert.equal(hat?.ganada, true);
  assert.equal(hat?.cantidad, 2);
  assert.equal(huecos.find((item) => item.tipo === "figura")?.ganada, false);
});

test("el lunes muestra la semana pasada en horario de Buenos Aires", () => {
  const lunes = Date.parse("2026-10-05T10:00:00-03:00");
  const rango = rangoSemana(lunes);
  assert.equal(rango.pasada, true);
  const event: ClubEvent = {
    id: "p1",
    kind: "partido",
    title: "vs Academia",
    place: "",
    mapsQuery: "",
    lat: null,
    lng: null,
    startsAt: "2026-10-04T21:00:00-03:00",
    modality: "f8",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
    resultClosedAt: "2026-10-04T22:00:00-03:00",
  };
  const resumen = resumenSemana([event], [{ eventId: "p1", opponent: "Academia", goalsFor: 2, goalsAgainst: 1, notes: "", recordedAt: "", players: [{ memberId: "mati", goals: 2, assists: 0, yellow: 0, red: 0 }] }], (id) => id, lunes);
  assert.equal(resumen.titulo, "Resumen de la semana pasada");
  assert.equal(resumen.partidos.length, 1);
  assert.equal(resumen.partidos[0]?.goleador, "mati");
});
