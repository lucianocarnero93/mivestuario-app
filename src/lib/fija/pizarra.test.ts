import assert from "node:assert/strict";
import test from "node:test";
import {
  aplicarVistosJugador,
  deshacerDibujo,
  duplicarJugada,
  editarPlan,
  faltanVer,
  guardarPasos,
  marcarVisto,
  planVisible,
  plantillaPelota,
  ponerEnPlan,
  sumarDibujo,
  videoLimpio,
} from "./pizarra.ts";
import type { ClubEvent } from "./types.ts";

function partido(): ClubEvent {
  return {
    id: "p1",
    kind: "partido",
    title: "vs Huracán",
    place: "",
    mapsQuery: "",
    lat: null,
    lng: null,
    startsAt: "2026-10-08T21:00:00-03:00",
    modality: "f8",
    lineup: { mc: "mati", dc: "tobi" },
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
  };
}

test("el plan A es la formación y el B no la pisa", () => {
  const base = partido();
  assert.equal(planVisible(base, "a").lineup.mc, "mati");
  const conB = ponerEnPlan(base, "b", "mc", "fran");
  assert.equal(conB.lineup.mc, "mati");
  assert.equal(planVisible(conB, "b").lineup.mc, "fran");
  assert.equal(planVisible(conB, "b").idea, "");
  assert.equal(planVisible(base, "a").cambio, "");
});

test("un dibujo se puede deshacer", () => {
  const con = sumarDibujo(partido(), "a", { id: "d1", trazo: "flecha", x1: 10, y1: 10, x2: 40, y2: 20 });
  assert.equal(planVisible(con, "a").dibujos.length, 1);
  assert.equal(planVisible(deshacerDibujo(con, "a"), "a").dibujos.length, 0);
});

test("el visto no se repite y el jugador no marca a otro", () => {
  const visto = marcarVisto(partido(), "mati", "2026-10-08T18:00:00-03:00");
  assert.equal(marcarVisto(visto, "mati", "2026-10-08T19:00:00-03:00").vistos?.length, 1);
  assert.deepEqual(faltanVer(visto, ["mati", "tobi"]), ["tobi"]);
  const ajenos = aplicarVistosJugador([partido()], [{ ...partido(), vistos: [{ memberId: "tobi", at: "2026-10-08T18:00:00-03:00" }] }], "mati");
  assert.equal(ajenos[0]?.vistos?.length ?? 0, 0);
});

test("la jugada pide dos cuadros y el video tiene que ser un link", () => {
  const corta = guardarPasos(partido(), plantillaPelota("corned", []));
  assert.ok((corta.pasos?.cuadros.length ?? 0) >= 2);
  assert.match(corta.pasos?.cuadros[0]?.texto ?? "", /primer palo/i);
  assert.equal(guardarPasos(partido(), { id: "x", nombre: "x", tipo: "jugada", cuadros: [] }).pasos, undefined);
  assert.equal(videoLimpio("https://youtube.com/watch?v=1"), "https://youtube.com/watch?v=1");
  assert.equal(videoLimpio("nota.mp4"), "");
});

test("duplicar deja la original", () => {
  const lista = duplicarJugada([{ id: "c1", nombre: "Córner", tipo: "Córner", cuadros: [] }], "c1", "c2");
  assert.equal(lista.length, 2);
  assert.equal(lista[1]?.nombre, "Córner (copia)");
  const igual = editarPlan(partido(), "c", { cambio: "Entra Ale." });
  assert.equal(planVisible(igual, "c").cambio, "Entra Ale.");
});
