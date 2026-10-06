import assert from "node:assert/strict";
import test from "node:test";
import { figuraDe, figuraPermitida, goleadorDelMes, liderDelMes, mergeFiguraVotes, votosAceptables } from "./figura.ts";
import type { ClubEvent, MatchSheet } from "./types.ts";

test("la figura más nueva pisa el voto viejo del mismo jugador", () => {
  const votes = mergeFiguraVotes(
    [{ eventId: "p1", voterId: "a", pickId: "b", at: "2026-10-01T18:00:00Z" }],
    [{ eventId: "p1", voterId: "a", pickId: "c", at: "2026-10-01T19:00:00Z" }],
  );
  assert.equal(votes.length, 1);
  assert.equal(votes[0]?.pickId, "c");
});

test("nadie se vota a sí mismo", () => {
  const votes = mergeFiguraVotes([], [{ eventId: "p1", voterId: "a", pickId: "a", at: "2026-10-01T19:00:00Z" }]);
  assert.equal(votes.length, 0);
});

test("la figura no vale en un entrenamiento ni antes del partido", () => {
  const pasado = { id: "p1", kind: "partido", startsAt: "2020-01-01T20:00:00-03:00" } as ClubEvent;
  const futuro = { id: "p2", kind: "partido", startsAt: "2099-01-01T20:00:00-03:00" } as ClubEvent;
  const entreno = { id: "e1", kind: "entrenamiento", startsAt: "2020-01-01T20:00:00-03:00" } as ClubEvent;
  const voto = { eventId: "p1", voterId: "a", pickId: "b", at: "2026-10-01T19:00:00Z" };
  assert.equal(figuraPermitida(voto, [pasado]), true);
  assert.equal(figuraPermitida({ ...voto, eventId: "p2" }, [futuro]), false);
  assert.equal(figuraPermitida({ ...voto, eventId: "e1" }, [entreno]), false);
  assert.equal(figuraPermitida({ ...voto, eventId: "no" }, [pasado]), false);
});

test("si empatan la figura, quedan los dos", () => {
  const result = figuraDe(
    [
      { eventId: "p1", voterId: "a", pickId: "b", at: "2026-10-01T19:00:00Z" },
      { eventId: "p1", voterId: "c", pickId: "d", at: "2026-10-01T19:01:00Z" },
    ],
    "p1",
  );
  assert.deepEqual(result?.ids.sort(), ["b", "d"]);
  assert.equal(result?.votos, 1);
});

test("el goleador del mes solo cuenta los partidos de ese mes", () => {
  const event = { id: "p1", startsAt: "2026-10-03T20:00:00-03:00" } as ClubEvent;
  const old = { id: "p0", startsAt: "2026-09-20T20:00:00-03:00" } as ClubEvent;
  const sheets: MatchSheet[] = [
    {
      eventId: "p1",
      opponent: "X",
      goalsFor: 2,
      goalsAgainst: 0,
      notes: "",
      recordedAt: "2026-10-03T22:00:00-03:00",
      players: [{ memberId: "enzo", goals: 2, assists: 0, yellow: 0, red: 0 }],
    },
    {
      eventId: "p0",
      opponent: "Y",
      goalsFor: 3,
      goalsAgainst: 0,
      notes: "",
      recordedAt: "2026-09-20T22:00:00-03:00",
      players: [{ memberId: "juan", goals: 3, assists: 0, yellow: 0, red: 0 }],
    },
  ];
  const result = goleadorDelMes(sheets, [event, old], new Date("2026-10-05T12:00:00-03:00"));
  assert.deepEqual(result, { ids: ["enzo"], goles: 2 });
});

test("liderDelMes cuenta asistencias y el goleador sigue igual", () => {
  const event = { id: "p1", startsAt: "2026-10-03T20:00:00-03:00" } as ClubEvent;
  const sheets: MatchSheet[] = [
    {
      eventId: "p1",
      opponent: "X",
      goalsFor: 2,
      goalsAgainst: 0,
      notes: "",
      recordedAt: "2026-10-03T22:00:00-03:00",
      players: [
        { memberId: "enzo", goals: 2, assists: 1, yellow: 0, red: 0 },
        { memberId: "ana", goals: 0, assists: 4, yellow: 0, red: 0 },
      ],
    },
  ];
  assert.deepEqual(liderDelMes(sheets, [event], "2026-10", "assists"), { ids: ["ana"], total: 4 });
  const ahora = new Date("2026-10-05T12:00:00-03:00");
  const goles = goleadorDelMes(sheets, [event], ahora);
  const lider = liderDelMes(sheets, [event], "2026-10", "goals");
  assert.deepEqual(goles, lider ? { ids: lider.ids, goles: lider.total } : null);
});

test("votosAceptables rechaza los votos después del cierre", () => {
  const event = {
    id: "p1",
    kind: "partido",
    startsAt: "2026-10-01T20:00:00-03:00",
    resultClosedAt: "2026-10-01T22:00:00-03:00",
  } as ClubEvent;
  const voto = { eventId: "p1", voterId: "a", pickId: "b", at: "2026-10-04T19:00:00Z" };
  const tarde = Date.parse(event.resultClosedAt ?? event.startsAt) + 49 * 3_600_000;
  const temprano = Date.parse(event.resultClosedAt ?? event.startsAt) + 3_600_000;
  assert.equal(votosAceptables([], [voto], [event], tarde).length, 0);
  assert.equal(votosAceptables([], [voto], [event], temprano).length, 1);
  assert.equal(votosAceptables([voto], [voto], [event], tarde).length, 1);
  const cambio = { ...voto, pickId: "c", at: "2026-10-05T19:00:00Z" };
  assert.equal(votosAceptables([voto], [cambio], [event], tarde).length, 0);
  const abierto = { ...event, resultClosedAt: undefined };
  assert.equal(votosAceptables([], [voto], [abierto], tarde).length, 1);
});
