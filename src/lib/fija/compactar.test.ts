import assert from "node:assert/strict";
import test from "node:test";
import { clubSintetico } from "./club-sintetico.ts";
import { asistenciasDelServer, compactarHistorial, respuestasDe } from "./compactar.ts";
import { pruneBundle } from "./prune.ts";
import { vistaDelClub } from "./vista-club.ts";

const AHORA = Date.parse("2026-10-07T18:00:00.000Z");

function clubDe(semanas: number) {
  return clubSintetico({
    semanas,
    partidosPorSemana: 1,
    entrenamientosPorSemana: 2,
    jugadores: 20,
    ahora: AHORA,
  }).bundle;
}

test("compactar no cambia lo que ven las pantallas", () => {
  for (const semanas of [18, 104]) {
    const bundle = pruneBundle(clubDe(semanas), AHORA);
    const compacto = compactarHistorial({ ...bundle, compactacion: { version: 1 } }, AHORA).bundle;
    assert.deepEqual(vistaDelClub(compacto, AHORA), vistaDelClub(bundle, AHORA));
  }
});

test("compactar es idempotente y un celular viejo no lo reinfla", () => {
  const bundle = pruneBundle(clubDe(18), AHORA);
  const primera = compactarHistorial({ ...bundle, compactacion: { version: 1 } }, AHORA).bundle;
  const segunda = compactarHistorial(primera, AHORA).bundle;
  assert.deepEqual(segunda, primera);
  const viejo = compactarHistorial(
    { ...primera, rsvps: bundle.rsvps, figuraVotes: bundle.figuraVotes, alertLog: bundle.alertLog, convocatorias: bundle.convocatorias },
    AHORA,
  ).bundle;
  assert.deepEqual(respuestasDe(viejo), respuestasDe(primera));
  assert.equal(viejo.figuraVotes?.length, primera.figuraVotes?.length);
});

test("un jugador no puede escribir la asistencia compacta", () => {
  const delServer = [{ eventId: "e", voy: ["a"] }];
  assert.deepEqual(asistenciasDelServer(delServer, [{ eventId: "e", voy: ["z"] }, { eventId: "otro", voy: ["z"] }]), delServer);
  assert.deepEqual(asistenciasDelServer(undefined, [{ eventId: "otro", voy: ["z"] }]), []);
});

test("el club de 18 semanas baja de peso y el modo sin marca no compacta", () => {
  const bundle = pruneBundle(clubDe(18), AHORA);
  const { bundle: compacto, informe } = compactarHistorial(bundle, AHORA);
  const ratio = informe.despues.total / informe.antes.total;
  console.log(`compactar 18 semanas ${informe.antes.total} -> ${informe.despues.total} (${Math.round(ratio * 100)}%)`);
  assert.ok(ratio < 0.8, `${informe.antes.total} -> ${informe.despues.total}`);
  assert.equal(pruneBundle(bundle, AHORA).rsvps.length, bundle.rsvps.length);
  assert.ok(compacto.asistencias && compacto.asistencias.length > 0);
  const entrenamientos = bundle.events.filter((event) => event.kind !== "partido").length;
  assert.equal(compacto.events.filter((event) => event.kind !== "partido").length, entrenamientos);
});
