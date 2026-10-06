import assert from "node:assert/strict";
import test from "node:test";
import { clasificarAgenda, contarConfirmaciones, enJuego, estaJugado, fechaVisible, ponerReaccion, recapSemana, votarEncuesta } from "./fecha.ts";
import type { ClubEvent, MatchSheet } from "./types.ts";

function partido(id: string, startsAt: string, extra: Partial<ClubEvent> = {}): ClubEvent {
  return {
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
  };
}

test("un entrenamiento no pide resultado", () => {
  const ahora = Date.parse("2026-10-05T22:00:00-03:00");
  const entreno: ClubEvent = {
    ...partido("e1", "2026-10-05T18:00:00-03:00"),
    kind: "entrenamiento",
  };
  const grupos = clasificarAgenda([entreno], [], ahora);
  assert.equal(grupos.falta.length, 0);
  assert.equal(grupos.entrenamientos.length, 1);
});

test("si la planilla está cerrada no queda como próximo", () => {
  const ahora = Date.parse("2026-10-05T22:00:00-03:00");
  const event = partido("p1", "2026-10-05T18:00:00-03:00", { resultClosedAt: "2026-10-05T20:00:00-03:00" });
  const sheet: MatchSheet = {
    eventId: "p1",
    opponent: "Rival",
    goalsFor: 2,
    goalsAgainst: 1,
    notes: "",
    recordedAt: "2026-10-05T20:00:00-03:00",
    players: [],
  };
  assert.equal(estaJugado(event, sheet), true);
  const grupos = clasificarAgenda([event], [sheet], ahora);
  assert.deepEqual(grupos.jugados.map((item) => item.id), ["p1"]);
  assert.equal(grupos.falta.length, 0);
  assert.equal(grupos.proximos.length, 0);
});

test("un partido de hace días no sigue en juego y la fecha muestra el de hoy", () => {
  const ahora = Date.parse("2026-10-06T15:00:00-03:00");
  const viejo = partido("olvidado", "2026-09-30T21:00:00-03:00", { title: "vs Olvidado" });
  const hoy = partido("hoy", "2026-10-06T21:00:00-03:00", { title: "vs Hoy" });
  assert.equal(enJuego(viejo, ahora), false);
  assert.equal(enJuego(partido("vivo", "2026-10-06T14:00:00-03:00"), ahora), true);
  assert.equal(enJuego(hoy, ahora), false);
  assert.equal(fechaVisible([viejo, hoy], undefined, true, ahora)?.id, "hoy");
});

test("una planilla sin terminar no cuenta como jugado", () => {
  const ahora = Date.parse("2026-10-05T22:00:00-03:00");
  const event = partido("p1", "2026-10-05T18:00:00-03:00");
  const sheet: MatchSheet = {
    eventId: "p1",
    opponent: "Rival",
    goalsFor: 1,
    goalsAgainst: 0,
    notes: "",
    recordedAt: "2026-10-05T20:00:00-03:00",
    players: [],
  };
  assert.equal(estaJugado(event, sheet), false);
  const grupos = clasificarAgenda([event], [sheet], ahora);
  assert.equal(grupos.jugados.length, 0);
  assert.equal(grupos.falta.length, 1);
});

test("las confirmaciones cuentan solo al que juega", () => {
  const cuentas = contarConfirmaciones(
    [{ id: "a" }, { id: "b" }, { id: "c" }],
    [
      { memberId: "a", status: "voy" },
      { memberId: "b", status: "no" },
      { memberId: "dt", status: "voy" },
    ],
  );
  assert.deepEqual(cuentas, { voy: 1, no: 1, pending: 1, total: 3 });
});

test("una reacción por persona y la encuesta no tiene texto libre", () => {
  const una = ponerReaccion([], "j1", "fuego", "t1");
  const otra = ponerReaccion(una, "j1", "aplauso", "t2");
  assert.equal(otra.length, 1);
  assert.equal(otra[0]?.emoji, "aplauso");
  const encuesta = votarEncuesta(
    { pregunta: "¿Cancha cubierta?", opciones: ["Sí", "No"], votos: [], at: "t" },
    "j1",
    0,
    "t3",
  );
  assert.equal(encuesta.votos.length, 1);
  assert.equal(votarEncuesta(encuesta, "j1", 9, "t4").votos[0]?.opcion, 0);
});

test("el recap mira la semana", () => {
  const ahora = Date.parse("2026-10-05T22:00:00-03:00");
  const event = partido("p1", "2026-10-04T18:00:00-03:00", { resultClosedAt: "2026-10-04T20:00:00-03:00" });
  const viejo = partido("p0", "2026-09-01T18:00:00-03:00", { resultClosedAt: "2026-09-01T20:00:00-03:00" });
  const recap = recapSemana(
    [event, viejo],
    [
      { eventId: "p1", opponent: "A", goalsFor: 3, goalsAgainst: 0, notes: "", recordedAt: "", players: [] },
      { eventId: "p0", opponent: "B", goalsFor: 1, goalsAgainst: 1, notes: "", recordedAt: "", players: [] },
    ],
    ahora,
  );
  assert.deepEqual(recap, { pj: 1, gf: 3 });
});
