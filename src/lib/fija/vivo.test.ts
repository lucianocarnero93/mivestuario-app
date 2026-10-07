import assert from "node:assert/strict";
import test from "node:test";
import { aplicarReaccionesJugador } from "./pizarra.ts";
import { hashIp } from "./vivo-ip.ts";
import {
  aplicarReaccionFamiliar,
  aplicarMarcasDeJugador,
  armarFormacionPublica,
  cspVivo,
  combinarMarcasVivo,
  elegirPartidoEquipo,
  escaparXml,
  estadoMarcador,
  cercaDelSaque,
  guardarCache,
  intervaloVivo,
  invalidarCache,
  JUEGO_TOPE_MS,
  conservarFotos,
  marcadorDeDatos,
  marcadorSinFotos,
  marcaTiempo,
  minutoAproximado,
  planillasDeMarcas,
  POLL_ESPERA,
  POLL_FINAL,
  POLL_JUEGO,
  punteroHuerfano,
  registraIntento,
  sanitizeLiveToken,
  tituloCompartido,
  tomarCache,
  VIVO_READ_LIMIT,
  vivoAttemptKey,
  vivoBotKey,
  vivoPointerAllows,
  vivoReadLimited,
  type PersonaVivo,
} from "./vivo.ts";
import type { ClubEvent, MarcaVivo, MatchSheet } from "./types.ts";

const kick = "2026-10-04T15:00:00-03:00";
const token = "a".repeat(32);

function partido(partial: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: "ev-1",
    kind: "partido",
    title: "vs Racing del Bajo",
    place: "Predio",
    mapsQuery: "Predio",
    lat: null,
    lng: null,
    startsAt: kick,
    modality: "f8",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
    ...partial,
  };
}

test("antes del partido el marcador espera", () => {
  assert.equal(estadoMarcador({ startsAt: kick }, Date.parse("2026-10-04T14:00:00-03:00")), "espera");
});

test("en el horario queda en juego hasta que el DT cierra la planilla", () => {
  assert.equal(estadoMarcador({ startsAt: kick }, Date.parse("2026-10-04T15:10:00-03:00")), "juego");
  assert.equal(
    estadoMarcador({ startsAt: kick, resultClosedAt: "2026-10-04T17:00:00-03:00" }, Date.parse("2026-10-04T18:00:00-03:00")),
    "final",
  );
});

test("a las 3 horas sin resultado oficial deja de figurar en juego", () => {
  const ahora = Date.parse(kick) + JUEGO_TOPE_MS;
  assert.equal(estadoMarcador({ startsAt: kick }, ahora - 60_000), "juego");
  assert.equal(estadoMarcador({ startsAt: kick }, ahora), "oficial");
});

test("otro equipo no puede pisar ni borrar el link en vivo", () => {
  assert.equal(vivoPointerAllows(null, "SIETE"), true);
  assert.equal(vivoPointerAllows("SIETE", "SIETE"), true);
  assert.equal(vivoPointerAllows("SIETE", "OTRO"), false);
});

test("el link público solo acepta un token largo", () => {
  assert.equal(sanitizeLiveToken("abc"), "");
  assert.equal(sanitizeLiveToken(token), token);
});

test("el cupo del marcador es por IP y por token", () => {
  assert.equal(vivoAttemptKey("peek:10.0.0.8", token), `vivo:10.0.0.8:${token}`);
  assert.notEqual(vivoAttemptKey("peek:10.0.0.8", token), vivoAttemptKey("peek:10.0.0.8", "b".repeat(32)));
  assert.notEqual(vivoAttemptKey("peek:10.0.0.8", token), vivoAttemptKey("peek:10.0.0.9", token));
  assert.equal(vivoAttemptKey(null, ""), "vivo:comun:sueltos");
  assert.equal(vivoBotKey(token), `vivo-bot:${token}`);
  assert.equal(vivoReadLimited(VIVO_READ_LIMIT), false);
  assert.equal(vivoReadLimited(VIVO_READ_LIMIT + 1), true);
});

test("veinte celulares en la misma red siguen el partido sin caer en limited", () => {
  const lecturas = 20 * Math.ceil((15 * 60) / 12);
  assert.equal(vivoReadLimited(lecturas), false);
});

test("una lectura que salió bien no se anota; un rechazo sí", () => {
  assert.equal(registraIntento(false), false);
  assert.equal(registraIntento(true), true);
});

test("el cache del marcador dura 5 segundos y se invalida al publicar", () => {
  const cache = new Map<string, { at: number; value: string }>();
  guardarCache(cache, `t:${token}`, "armado", 1_000);
  assert.equal(tomarCache(cache, `t:${token}`, 5_000), "armado");
  assert.equal(tomarCache(cache, `t:${token}`, 6_000), null);
  guardarCache(cache, `t:${token}`, "armado", 10_000);
  invalidarCache(cache, `t:${token}`);
  assert.equal(tomarCache(cache, `t:${token}`, 10_100), null);
});

test("el polling cambia según el momento y se corta después de la figura", () => {
  const ahora = Date.parse("2026-10-04T20:00:00-03:00");
  assert.equal(intervaloVivo({ estado: "espera", ahora, figuraLista: false }), POLL_ESPERA);
  assert.equal(intervaloVivo({ estado: "oficial", ahora, figuraLista: false }), POLL_ESPERA);
  assert.equal(intervaloVivo({ estado: "juego", ahora, figuraLista: false }), POLL_JUEGO);
  assert.equal(
    intervaloVivo({ estado: "final", ahora, cerrado: "2026-10-04T18:00:00-03:00", figuraLista: false }),
    POLL_FINAL,
  );
  assert.equal(
    intervaloVivo({ estado: "final", ahora, cerrado: "2026-10-04T18:00:00-03:00", figuraLista: true }),
    0,
  );
  assert.equal(
    intervaloVivo({
      estado: "final",
      ahora: Date.parse("2026-10-07T19:00:00-03:00"),
      cerrado: "2026-10-04T18:00:00-03:00",
      figuraLista: false,
    }),
    0,
  );
  const primero = intervaloVivo({ estado: "limited", ahora, figuraLista: false, intentoLimited: 1 });
  const tercero = intervaloVivo({ estado: "limited", ahora, figuraLista: false, intentoLimited: 3 });
  assert.ok(tercero > primero);
});

test("la formación pública no sale si el DT no la publicó", () => {
  const armada = armarFormacionPublica(
    [{ key: "ARQ", label: "ARQ", x: 50, y: 80 }],
    { ARQ: "juan" },
    ["enzo"],
    adultos(),
    false,
  );
  assert.deepEqual(armada, { titulares: [], banco: [] });
});

test("la formación pública lleva puesto, número y apodo", () => {
  const armada = armarFormacionPublica(
    [{ key: "ARQ", label: "ARQ", x: 50, y: 80 }],
    { ARQ: "juan" },
    ["enzo"],
    adultos(),
    true,
  );
  assert.deepEqual(armada.titulares, [{ puesto: "ARQ", nick: "Juan", numero: "1", x: 50, y: 80 }]);
  assert.deepEqual(armada.banco, ["9 Enzo"]);
});

test("dos apodos iguales sin número no muestran el nombre real", () => {
  const armada = armarFormacionPublica(
    [
      { key: "DEF", label: "DEF", x: 30, y: 60 },
      { key: "MED", label: "MED", x: 70, y: 40 },
    ],
    { DEF: "a", MED: "b" },
    [],
    [
      { id: "a", nick: "Luqui", name: "Lucas Gómez", number: null, menor: false },
      { id: "b", nick: "Luqui", name: "Luciano Pérez", number: null, menor: false },
    ],
    true,
  );
  assert.deepEqual(
    armada.titulares.map((puesto) => puesto.nick),
    ["Luqui · DEF", "Luqui · MED"],
  );
  assert.equal(JSON.stringify(armada).includes("Gómez"), false);
});

test("un menor sale en la formación pública con el apodo, sin el nombre", () => {
  const armada = armarFormacionPublica(
    [{ key: "ARQ", label: "ARQ", x: 50, y: 80 }],
    { ARQ: "nino" },
    ["nino"],
    [
      { id: "nino", nick: "Nino", name: "Nino Real", number: 1, menor: true },
      { id: "grande", nick: "Grande", name: "Grande Real", number: 9, menor: false },
    ],
    true,
  );
  assert.deepEqual(armada.titulares, [{ puesto: "ARQ", nick: "Nino", numero: "1", x: 50, y: 80 }]);
  assert.deepEqual(armada.banco, []);
  assert.equal(JSON.stringify(armada).includes("Nino Real"), false);
  assert.equal(JSON.stringify(armada).includes("Grande Real"), false);
});

test("un jugador sin cuenta y sin dato de edad no aparece en el vivo", () => {
  const gente: PersonaVivo[] = [
    { id: "x", nick: "Sombra", name: "Nombre Real Largo", number: 7 },
    { id: "y", nick: "Tato", name: "Mateo", number: 10, menor: false },
  ];
  const armada = armarFormacionPublica(
    [
      { key: "DEL", label: "DEL", x: 40, y: 20 },
      { key: "MED", label: "MED", x: 60, y: 40 },
    ],
    { DEL: "x", MED: "y" },
    [],
    gente,
    true,
  );
  assert.deepEqual(armada.titulares.map((puesto) => puesto.nick), ["Tato"]);
  assert.equal(JSON.stringify(armada).includes("Nombre Real"), false);
});

test("sin apodo y marcado como mayor, el link dice Jugador", () => {
  const armada = armarFormacionPublica(
    [{ key: "DEL", label: "DEL", x: 50, y: 20 }],
    { DEL: "x" },
    [],
    [{ id: "x", nick: "", name: "Juan Carlos", number: null, menor: false }],
    true,
  );
  assert.equal(armada.titulares[0]?.nick, "Jugador");
  assert.equal(JSON.stringify(armada).includes("Juan"), false);
});

test("una cuenta sin marca de menor sí puede salir", () => {
  const armada = armarFormacionPublica(
    [{ key: "DEL", label: "DEL", x: 50, y: 20 }],
    { DEL: "x" },
    [],
    [{ id: "x", nick: "Tato", name: "Mateo Díaz", number: 9, accountId: "cuenta-1" }],
    true,
  );
  assert.equal(armada.titulares[0]?.nick, "Tato");
});

test("el link del equipo elige el partido según el momento", () => {
  const pasado = partido({ id: "viejo", startsAt: "2026-10-01T15:00:00-03:00", resultClosedAt: "2026-10-01T17:00:00-03:00" });
  const hoy = partido({ id: "hoy", startsAt: "2026-10-04T15:00:00-03:00" });
  const proximo = partido({ id: "prox", startsAt: "2026-10-11T15:00:00-03:00" });
  const ahora = Date.parse("2026-10-04T15:20:00-03:00");
  assert.equal(elegirPartidoEquipo([pasado, hoy, proximo], ahora)?.id, "hoy");
  const despues = Date.parse("2026-10-04T19:30:00-03:00");
  const cerrado = partido({ id: "hoy", startsAt: hoy.startsAt, resultClosedAt: "2026-10-04T17:10:00-03:00" });
  assert.equal(elegirPartidoEquipo([pasado, cerrado, proximo], despues)?.id, "hoy");
  const lejos = Date.parse("2026-10-08T12:00:00-03:00");
  assert.equal(elegirPartidoEquipo([pasado, cerrado, proximo], lejos)?.id, "prox");
});

test("una hora antes el link del equipo ya pasa a ese partido", () => {
  const viejo = partido({ id: "viejo", startsAt: "2026-10-03T15:00:00-03:00", resultClosedAt: "2026-10-03T17:00:00-03:00" });
  const hoy = partido({ id: "hoy", startsAt: "2026-10-04T15:00:00-03:00" });
  assert.equal(cercaDelSaque(hoy.startsAt, Date.parse("2026-10-04T14:00:00-03:00")), true);
  assert.equal(cercaDelSaque(hoy.startsAt, Date.parse("2026-10-04T13:00:00-03:00")), false);
  assert.equal(elegirPartidoEquipo([viejo, hoy], Date.parse("2026-10-04T14:10:00-03:00"))?.id, "hoy");
  assert.equal(elegirPartidoEquipo([viejo, hoy], Date.parse("2026-10-04T13:00:00-03:00"))?.id, "viejo");
});

test("un jugador suma un gol y no puede borrar uno del medio", () => {
  const roster = new Set(["tato"]);
  const base: MarcaVivo[] = [{ id: "lv-1", kind: "gol", memberId: "tato", at: "2026-10-04T15:10:00-03:00" }];
  const suma = combinarMarcasVivo(
    base,
    [...base, { id: "lv-2", kind: "gol-rival", at: "2026-10-04T15:20:00-03:00" }],
    roster,
  );
  assert.deepEqual(suma.map((marca) => marca.id), ["lv-1", "lv-2"]);
  const trucho = combinarMarcasVivo(base, [{ id: "lv-9", kind: "gol", memberId: "otro", at: "2026-10-04T15:21:00-03:00" }], roster);
  assert.deepEqual(trucho.map((marca) => marca.id), ["lv-1"]);
  const deshace = combinarMarcasVivo(suma, suma.slice(0, -1), roster);
  assert.deepEqual(deshace.map((marca) => marca.id), ["lv-1"]);
});

test("la card del vivo lleva foto y nombre, y al menor no", () => {
  const foto = "data:image/jpeg;base64,AAAA";
  const event = partido({
    lineupPublishedAt: kick,
    lineup: { DC: "nino", MC: "tato", ARQ: "pepe" },
    suplentes: ["banco"],
  });
  const people: PersonaVivo[] = [
    { id: "nino", nick: "Nino", name: "Nombre Secreto", number: 9, menor: true, role: "jugador", photo: foto },
    { id: "tato", nick: "Tato", name: "Mateo Díaz", number: 10, menor: false, role: "jugador", photo: foto },
    { id: "pepe", nick: "PepeOculto", name: "José Gómez", number: 1, photo: foto },
    { id: "banco", nick: "Banco", name: "Luis Banco", number: 7, menor: false, role: "jugador", photo: foto },
    { id: "profe", nick: "Profe", name: "Carlos Gómez", number: null, menor: false, role: "dt", photo: foto },
  ];
  const publico = marcadorDeDatos({
    modo: "partido",
    clubName: "Los Pibes FC",
    crest: "data:image/png;base64,AAAA",
    event,
    sheet: null,
    slots: [],
    people,
    votes: [],
    events: [event],
    sheets: [],
    familia: { pelota: 0, aplauso: 0, fuego: 0 },
    now: Date.parse("2026-10-04T15:30:00-03:00"),
    token,
  });
  assert.equal(publico.ok, true);
  if (!publico.ok || !publico.card) {
    assert.fail("la formación publicada tiene que salir en la card");
    return;
  }
  const json = JSON.stringify(publico.card);
  assert.equal(publico.card.formato, "whatsapp");
  assert.equal(publico.card.escudo, null);
  assert.equal(json.includes("Nombre Secreto"), false);
  assert.equal(json.includes("José"), false);
  assert.equal(json.includes("PepeOculto"), false);
  assert.equal(publico.card.titulares.some((ficha) => ficha.nombre === "Nino" && ficha.imagen?.tipo !== "foto"), true);
  assert.equal(publico.card.titulares.some((ficha) => ficha.nombre === "Mateo Díaz" && ficha.imagen?.tipo === "foto"), true);
  assert.equal(publico.card.banco.some((ficha) => ficha.nombre === "Luis Banco" && ficha.imagen?.tipo === "foto"), true);
  assert.equal(publico.card.dt.some((ficha) => ficha.nombre === "Carlos Gómez" && ficha.imagen?.tipo === "foto"), true);
  const liviano = marcadorSinFotos(publico);
  assert.equal(liviano.ok && liviano.card?.titulares.some((ficha) => ficha.imagen?.tipo === "foto" && ficha.imagen.src === ""), true);
  const pegada = liviano.ok && liviano.card ? conservarFotos(liviano.card, publico.card) : null;
  assert.equal(pegada?.falta, false);
  assert.equal(pegada?.card.titulares.some((ficha) => ficha.nombre === "Mateo Díaz" && ficha.imagen?.tipo === "foto" && ficha.imagen.src === foto), true);
  const sinPublicar = marcadorDeDatos({
    modo: "partido",
    clubName: "Los Pibes FC",
    crest: null,
    event: partido({ lineup: { DC: "tato" } }),
    sheet: null,
    slots: [],
    people,
    votes: [],
    events: [],
    sheets: [],
    familia: { pelota: 0, aplauso: 0, fuego: 0 },
    token,
  });
  assert.equal(sinPublicar.ok && sinPublicar.card, null);
});

test("un jugador suma un gol y un guardado viejo no borra el último", () => {
  const members = [{ id: "tato" }];
  const base = partido({
    liveLog: [{ id: "lv-1", kind: "gol", memberId: "tato", at: "2026-10-04T15:10:00-03:00" }],
    fechaUpdatedAt: "2026-10-04T15:10:00-03:00",
    liveUpdatedAt: "2026-10-04T15:10:00-03:00",
  });
  const suma = aplicarMarcasDeJugador(
    [base],
    [
      {
        ...base,
        liveLog: [...(base.liveLog ?? []), { id: "lv-2", kind: "gol-rival", at: "2026-10-04T15:20:00-03:00" }],
        fechaUpdatedAt: "2026-10-04T15:20:00-03:00",
        resultClosedAt: "2026-10-04T15:21:00-03:00",
      },
    ],
    members,
  );
  assert.deepEqual(suma[0]?.liveLog?.map((marca) => marca.id), ["lv-1", "lv-2"]);
  assert.equal(suma[0]?.resultClosedAt ?? null, null);
  const viejo = aplicarMarcasDeJugador(suma, [base], members);
  assert.deepEqual(viejo[0]?.liveLog?.map((marca) => marca.id), ["lv-1", "lv-2"]);
  const deshace = aplicarMarcasDeJugador(
    suma,
    [{ ...suma[0], liveLog: suma[0]?.liveLog?.slice(0, -1), fechaUpdatedAt: "2026-10-04T15:25:00-03:00" }],
    members,
  );
  assert.deepEqual(deshace[0]?.liveLog?.map((marca) => marca.id), ["lv-1"]);
  const cerrado = partido({
    liveLog: base.liveLog,
    fechaUpdatedAt: "2026-10-04T17:00:00-03:00",
    resultClosedAt: "2026-10-04T17:00:00-03:00",
  });
  const no = aplicarMarcasDeJugador(
    [cerrado],
    [
      {
        ...cerrado,
        resultClosedAt: null,
        liveLog: [...(cerrado.liveLog ?? []), { id: "lv-9", kind: "gol", memberId: "tato", at: "2026-10-04T18:00:00-03:00" }],
        fechaUpdatedAt: "2026-10-04T18:00:00-03:00",
      },
    ],
    members,
  );
  assert.equal(no[0]?.resultClosedAt, cerrado.resultClosedAt);
  assert.equal(no[0]?.liveLog?.length, 1);
  const vacio = partido({ liveLog: [], fechaUpdatedAt: kick });
  const conGol = partido({
    liveLog: [{ id: "lv-1", kind: "gol", memberId: "tato", at: "2026-10-04T15:10:00-03:00" }],
    fechaUpdatedAt: "2026-10-04T15:10:00-03:00",
  });
  const sheets = planillasDeMarcas([], [vacio], [conGol]);
  assert.equal(sheets[0]?.goalsFor, 1);
  assert.equal(sheets[0]?.players[0]?.memberId, "tato");
  const sinGol = planillasDeMarcas(sheets, [conGol], [vacio]);
  assert.equal(sinGol[0]?.goalsFor, 0);
});

test("sin pitazo inicial no se inventan minutos", () => {
  const log: MarcaVivo[] = [{ id: "1", kind: "gol", memberId: "a", at: "2026-10-04T17:23:00-03:00" }];
  assert.equal(minutoAproximado(log, log[0].at), null);
  assert.equal(marcaTiempo(log, log[0].at), "17:23");
  const conPitazo: MarcaVivo[] = [
    { id: "0", kind: "inicio", at: "2026-10-04T17:00:00-03:00" },
    { id: "1", kind: "gol", at: "2026-10-04T17:23:00-03:00" },
  ];
  assert.equal(minutoAproximado(conPitazo, conPitazo[1].at), 23);
  assert.equal(marcaTiempo(conPitazo, conPitazo[1].at), "23'");
});

test("un gol de un menor se cuenta para el equipo, sin el apodo", () => {
  const event = partido({
    lineupPublishedAt: kick,
    lineup: { DEL: "nino", MED: "tato" },
    liveLog: [
      { id: "g1", kind: "gol", memberId: "nino", at: "2026-10-04T17:10:00-03:00" },
      { id: "g2", kind: "gol", memberId: "tato", at: "2026-10-04T17:20:00-03:00" },
    ],
    liveUpdatedAt: "2026-10-04T17:20:00-03:00",
  });
  const sheet: MatchSheet = {
    eventId: event.id,
    opponent: "Racing del Bajo",
    goalsFor: 2,
    goalsAgainst: 0,
    notes: "",
    recordedAt: kick,
    players: [
      { memberId: "nino", goals: 1, assists: 0, yellow: 0, red: 0 },
      { memberId: "tato", goals: 1, assists: 0, yellow: 0, red: 0 },
    ],
  };
  const publico = marcadorDeDatos({
    modo: "partido",
    clubName: "Los Pibes FC",
    crest: null,
    event,
    sheet,
    slots: [
      { key: "DEL", label: "DEL", x: 40, y: 20 },
      { key: "MED", label: "MED", x: 60, y: 40 },
    ],
    people: [
      { id: "nino", nick: "Nino", name: "Nombre Secreto", number: 9 },
      { id: "tato", nick: "Tato", name: "Mateo Díaz", number: 10, menor: false },
    ],
    votes: [],
    events: [event],
    sheets: [sheet],
    familia: { pelota: 0, aplauso: 0, fuego: 0 },
    now: Date.parse("2026-10-04T17:30:00-03:00"),
    token,
  });
  assert.equal(publico.ok, true);
  if (!publico.ok) return;
  assert.equal(publico.lineas[0]?.texto, "Gol de Los Pibes FC");
  assert.equal(publico.lineas[1]?.texto, "Gol de Tato");
  assert.deepEqual(publico.goleadores, ["Tato"]);
  assert.equal(JSON.stringify(publico).includes("Secreto"), false);
  assert.equal(JSON.stringify(publico).includes("Mateo"), false);
  assert.equal(publico.estado, "juego");
});

test("la figura pública espera el cierre y no lleva el nombre real", () => {
  const cerrado = "2026-10-04T17:00:00-03:00";
  const event = partido({ resultClosedAt: cerrado, lineupPublishedAt: kick });
  const sheet: MatchSheet = {
    eventId: event.id,
    opponent: "Racing del Bajo",
    goalsFor: 3,
    goalsAgainst: 1,
    notes: "",
    recordedAt: cerrado,
    players: [{ memberId: "tato", goals: 2, assists: 0, yellow: 0, red: 0 }],
  };
  const people: PersonaVivo[] = [{ id: "tato", nick: "Tato", name: "Mateo Díaz", number: 10, menor: false }];
  const abierta = marcadorDeDatos({
    modo: "partido",
    clubName: "Los Pibes FC",
    crest: null,
    event,
    sheet,
    slots: [],
    people,
    votes: [
      { eventId: event.id, voterId: "a", pickId: "tato", at: cerrado },
      { eventId: event.id, voterId: "b", pickId: "tato", at: cerrado },
    ],
    events: [event],
    sheets: [sheet],
    familia: { pelota: 1, aplauso: 0, fuego: 2 },
    now: Date.parse("2026-10-05T10:00:00-03:00"),
    token,
  });
  assert.equal(abierta.ok && abierta.figura.estado, "abierta");
  const lista = marcadorDeDatos({
    modo: "partido",
    clubName: "Los Pibes FC",
    crest: null,
    event,
    sheet,
    slots: [],
    people,
    votes: [
      { eventId: event.id, voterId: "a", pickId: "tato", at: cerrado },
      { eventId: event.id, voterId: "b", pickId: "tato", at: cerrado },
    ],
    events: [event],
    sheets: [sheet],
    familia: { pelota: 0, aplauso: 0, fuego: 0 },
    now: Date.parse("2026-10-07T18:00:00-03:00"),
    token,
  });
  assert.equal(lista.ok && lista.figura.estado, "lista");
  if (lista.ok && lista.figura.estado === "lista") assert.equal(lista.figura.apodo, "Tato");
  assert.equal(JSON.stringify(lista).includes("Mateo"), false);
});

test("la reacción guarda un hash y no la IP, una vez por tipo", () => {
  const ip = "203.0.113.50";
  const hash = hashIp(ip);
  assert.notEqual(hash, ip);
  assert.equal(hash.includes(ip), false);
  assert.equal(hash, hashIp(ip));
  const primera = aplicarReaccionFamiliar(null, hash, "fuego");
  assert.equal(primera.por.fuego, 1);
  assert.equal(primera.marcas[0]?.includes(ip), false);
  const repetida = aplicarReaccionFamiliar(primera, hash, "fuego");
  assert.equal(repetida.por.fuego, 1);
  assert.equal(repetida.nueva, false);
  const otra = aplicarReaccionFamiliar(primera, hash, "pelota");
  assert.equal(otra.por.pelota, 1);
  assert.equal(otra.por.fuego, 1);
});

test("la reacción de un jugador se guarda y no pisa el partido", () => {
  const base = [partido({ reacciones: [] })];
  const incoming = [
    partido({
      reacciones: [{ memberId: "j", emoji: "fuego", at: "2026-10-04T18:00:00-03:00" }],
      lineup: { ARQ: "intruso" },
    }),
  ];
  const out = aplicarReaccionesJugador(base, incoming, "j");
  assert.equal(out[0]?.reacciones?.[0]?.emoji, "fuego");
  assert.deepEqual(out[0]?.lineup, {});
  const ajena = aplicarReaccionesJugador(base, incoming, "otro");
  assert.equal(ajena[0]?.reacciones?.length ?? 0, 0);
});

test("un puntero sin partido o de otro tipo es huérfano", () => {
  assert.equal(punteroHuerfano(token, null), true);
  assert.equal(punteroHuerfano(token, { kind: "entrenamiento", liveToken: token }), true);
  assert.equal(punteroHuerfano(token, { kind: "partido", liveToken: "b".repeat(32) }), true);
  assert.equal(punteroHuerfano(token, { kind: "partido", liveToken: token }), false);
});

test("el título para WhatsApp cambia con el momento", () => {
  const base = {
    club: "Los Pibes FC",
    rival: "Racing del Bajo",
    startsAt: kick,
    goalsFor: 1,
    goalsAgainst: 0,
  };
  assert.equal(
    tituloCompartido({ ...base, estado: "espera" }, Date.parse("2026-10-04T12:00:00-03:00")),
    "Hoy 15:00 · Los Pibes FC vs Racing del Bajo",
  );
  assert.equal(tituloCompartido({ ...base, estado: "juego" }), "En juego · Los Pibes FC 1–0 Racing del Bajo");
  assert.equal(
    tituloCompartido({ ...base, estado: "final", goalsFor: 3, goalsAgainst: 1 }),
    "Terminó · Ganamos 3–1",
  );
});

test("el texto público no deja pasar marcas", () => {
  assert.equal(escaparXml(`A & B <script>"x"`), "A \u0026amp; B \u0026lt;script\u0026gt;\u0026quot;x\u0026quot;");
});

test("la CSP del vivo no abre redes de anuncios", () => {
  const csp = cspVivo();
  assert.equal(csp.includes("default-src 'self'"), true);
  assert.equal(csp.includes("fonts.googleapis.com"), true);
  assert.equal(/doubleclick|googlesyndication|facebook\.net/i.test(csp), false);
});

function adultos(): PersonaVivo[] {
  return [
    { id: "juan", nick: "Juan", name: "Juan Pérez", number: 1, menor: false },
    { id: "enzo", nick: "Enzo", name: "Enzo Díaz", number: 9, menor: false },
    { id: "pepe", nick: "Pepe", name: "Pepe", number: 4, menor: false },
  ];
}
