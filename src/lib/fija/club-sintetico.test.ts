import assert from "node:assert/strict";
import test from "node:test";
import { clubSintetico } from "./club-sintetico.ts";
import { figuraDe } from "./figura.ts";
import { FIGURA_MIN_VOTOS } from "./premios.ts";
import { pruneBundle } from "./prune.ts";
import { vistaDelClub } from "./vista-club.ts";

const AHORA = Date.parse("2026-10-07T18:00:00.000Z");

function club18() {
  return clubSintetico({
    semanas: 18,
    partidosPorSemana: 1,
    entrenamientosPorSemana: 2,
    jugadores: 20,
    ahora: AHORA,
  });
}

test("el club de 18 semanas queda cerca del tope después de podar", () => {
  const { bundle } = club18();
  const podado = pruneBundle(bundle, AHORA);
  const bytes = Buffer.byteLength(JSON.stringify(podado));
  assert.ok(bytes > 350_000 && bytes < 370_000, `pesó ${bytes}`);
});

test("la foto del club no se mueve y la poda es idempotente", () => {
  const { bundle } = club18();
  const una = pruneBundle(bundle, AHORA);
  const dos = pruneBundle(una, AHORA);
  assert.deepEqual(dos, una);
  assert.deepEqual(vistaDelClub(una, AHORA), vistaDelClub(pruneBundle(structuredClone(bundle), AHORA), AHORA));
});

test("el club sintético trae los casos que leen las pantallas", () => {
  const { bundle, marcas } = club18();
  const falta = bundle.events.find((event) => event.id === marcas.faltaId);
  assert.equal(falta?.kind, "partido");
  assert.equal(falta?.resultClosedAt ?? null, null);
  assert.equal(bundle.matchSheets.some((sheet) => sheet.eventId === marcas.faltaId), false);

  const empate = figuraDe(bundle.figuraVotes, marcas.empateId);
  assert.equal(empate?.ids.length, 2);
  assert.ok((empate?.votos ?? 0) >= FIGURA_MIN_VOTOS);

  const uno = figuraDe(bundle.figuraVotes, marcas.unVotoId);
  assert.equal(uno?.votos, 1);
  assert.ok((uno?.votos ?? 0) < FIGURA_MIN_VOTOS);

  const hat = bundle.matchSheets.find((sheet) => sheet.eventId === marcas.hatTrickId);
  assert.ok(hat?.players.some((row) => row.goals >= 3));

  const valla = bundle.events.find((event) => event.id === marcas.vallaId);
  const planilla = bundle.matchSheets.find((sheet) => sheet.eventId === marcas.vallaId);
  assert.equal(planilla?.goalsAgainst, 0);
  assert.ok(valla?.lineup.ARQ);
  assert.equal("arqueroId" in (planilla ?? {}), false);

  const partido = bundle.events.find((event) => event.kind === "partido" && event.suplentes?.includes(marcas.suplenteId));
  assert.ok(partido);
  assert.equal(
    bundle.matchSheets.some((sheet) => sheet.players.some((row) => row.memberId === marcas.suplenteId)),
    false,
  );

  const torneos = new Set(
    bundle.events.filter((event) => event.kind === "partido").map((event) => event.tournamentId),
  );
  assert.ok(torneos.size >= 2);
  const racha = bundle.rsvps.filter((row) => row.memberId === marcas.rachaId && row.status === "voy");
  assert.ok(racha.length > 1);

  assert.equal(bundle.events.some((event) => event.id === marcas.reunionId && event.kind === "reunion"), true);
  assert.ok(bundle.members.every((person) => person.accountId && person.id.length === 32));
  assert.equal(bundle.rsvps.filter((row) => row.eventId === bundle.events[0]?.id).length, 20);
});
