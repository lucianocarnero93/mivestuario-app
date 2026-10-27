import assert from "node:assert/strict";
import test from "node:test";
import { crearDemo } from "./demo-seed.ts";
import { miImpacto, miTendencia } from "./datos-jugador.ts";
import { metaPlantel, responderQuiz } from "./quiz.ts";
import { cumplidasDe, origenesOk, textoFaltan } from "./pizarra-modelo.ts";

const AHORA = new Date("2026-10-27T15:00:00.000Z");

test("el plan del demo tiene consignas y el aviso no nombra a nadie", () => {
  const bundle = crearDemo(AHORA);
  const racing = bundle.events.find((evento) => evento.id === "ev-racing");
  assert.ok((racing?.consignas?.length ?? 0) >= 3);
  assert.equal(racing?.vistos?.filter((item) => item.entendido).length, 9);
  const texto = textoFaltan(3, "sábado", "https://ejemplo.test/cancha");
  assert.equal(texto.includes("Juancito"), false);
  assert.equal(texto.includes("Faltan 3"), true);
});

test("el quiz no se responde dos veces y la meta cuenta al plantel", () => {
  const bundle = crearDemo(AHORA);
  const racing = bundle.events.find((evento) => evento.id === "ev-racing");
  assert.ok(racing?.quiz);
  const primera = responderQuiz(racing!, "juancito", racing!.quiz!.preguntas[0]!.id, 0, "2026-10-30T12:00:00-03:00");
  assert.ok(primera);
  const segunda = responderQuiz({ ...racing!, quizRespuestas: primera! }, "juancito", racing!.quiz!.preguntas[0]!.id, 1, "2026-10-30T12:00:00-03:00");
  assert.equal(segunda, null);
  const meta = metaPlantel(racing!, racing!.convocados?.length ?? 0);
  assert.equal(meta.total, 11);
  assert.equal(meta.entendieron, 9);
});

test("después no se rompe sin frases negativas y los orígenes no pasan los goles", () => {
  const bundle = crearDemo(AHORA);
  const academia = bundle.events.find((evento) => evento.id === "ev-academia");
  const hoja = bundle.matchSheets.find((item) => item.eventId === "ev-academia");
  assert.equal(cumplidasDe(academia).si, 4);
  assert.equal(origenesOk(academia?.origenGoles, hoja?.goalsFor ?? 0), true);
  const impacto = miImpacto("juancito", bundle.events, bundle.matchSheets);
  assert.ok(impacto.titular.n >= 1);
  const frase = miTendencia("juancito", bundle.matchSheets);
  assert.equal(frase?.toLowerCase().includes("bajada"), false);
});
