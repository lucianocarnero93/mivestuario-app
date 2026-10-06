import assert from "node:assert/strict";
import test from "node:test";
import {
  aplicarVistosJugador,
  cambiarEsquema,
  camposDePizarra,
  deshacerDibujo,
  duplicarJugada,
  editarPlan,
  faltanVer,
  guardarPasos,
  marcarVisto,
  moverEnCuadro,
  planVisible,
  plantillaPelota,
  ponerEnPlan,
  recortarParaJugador,
  sacarPaso,
  sumarDibujo,
  sumarPaso,
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

test("cada plan tiene su esquema", () => {
  const base = { ...partido(), formacion: "clasica" };
  const soloB = cambiarEsquema(base, "b", "ofensiva");
  assert.equal(soloB.formacion, "clasica");
  assert.equal(planVisible(soloB, "a").formacion, "clasica");
  assert.equal(planVisible(soloB, "b").formacion, "ofensiva");
  const soloA = cambiarEsquema(base, "a", "ofensiva");
  assert.equal(soloA.formacion, "ofensiva");
  assert.equal(planVisible(soloA, "b").formacion, "clasica");
});

test("el dt mueve una ficha y puede sumar un paso", () => {
  const base = plantillaPelota("jugada", [{ memberId: "mati", x: 40, y: 50 }]);
  const movida = moverEnCuadro(base, 0, "mati", 70, 30);
  assert.equal(movida.cuadros[0]?.fichas[0]?.x, 70);
  assert.equal(sumarPaso(movida).cuadros.length, base.cuadros.length + 1);
  assert.equal(sacarPaso(sumarPaso(movida), 0).cuadros.length, base.cuadros.length);
  assert.equal(sacarPaso(base, 0).cuadros.length, base.cuadros.length);
});

test("borrar la jugada no la revive y el jugador no recibe lo oculto", () => {
  const base = partido();
  const vieja = { ...base, pasos: plantillaPelota("jugada", []), pizarraUpdatedAt: "2026-10-01T00:00:00Z", notas: { mati: "Quedate", fran: "Subí" } };
  const nueva = { ...base, pasos: null, pizarraUpdatedAt: "2026-10-02T00:00:00Z", notas: { mati: "Quedate", fran: "Subí" } };
  assert.equal(camposDePizarra(vieja, nueva).pasos, null);
  assert.equal(camposDePizarra(nueva, vieja).pasos, null);
  const recortado = recortarParaJugador(
    {
      club: { id: "c", name: "A", createdBy: "dt", inviteCode: "ABC123", crest: null },
      members: [],
      events: [{ ...vieja, jugadaVisible: false }],
      rsvps: [],
      messages: [],
      charla: [],
      matchSheets: [],
      invites: [],
      convocatorias: [],
      inbox: [],
      alertLog: [],
      reminderPolicy: { firstHours: 24, secondHours: 48 },
      tournaments: [],
      biblioteca: [{ id: "p", nombre: "Pared", tipo: "jugada", cuadros: [] }],
    },
    "mati",
  );
  assert.equal(recortado.events[0]?.pasos, null);
  assert.deepEqual(recortado.events[0]?.notas, { mati: "Quedate" });
  assert.deepEqual(recortado.biblioteca, []);
});

test("duplicar deja la original", () => {
  const lista = duplicarJugada([{ id: "c1", nombre: "Córner", tipo: "Córner", cuadros: [] }], "c1", "c2");
  assert.equal(lista.length, 2);
  assert.equal(lista[1]?.nombre, "Córner (copia)");
  const igual = editarPlan(partido(), "c", { cambio: "Entra Ale." });
  assert.equal(planVisible(igual, "c").cambio, "Entra Ale.");
});
