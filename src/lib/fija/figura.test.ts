import assert from "node:assert/strict";
import test from "node:test";
import { figuraDe, goleadorDelMes, mergeFiguraVotes } from "./figura.ts";
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
