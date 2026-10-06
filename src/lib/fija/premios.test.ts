import assert from "node:assert/strict";
import test from "node:test";
import {
  datosCard,
  estadoFigura,
  puedeCompartirPremio,
  premiosDelMes,
  premiosDelPartido,
} from "./premios.ts";
import type { ContextoPremios } from "./premios.ts";
import type { ClubEvent as Evento, MatchSheet as Planilla, Member as Persona } from "./types.ts";

function evento(partial: Partial<Evento> & { id: string; startsAt: string }): Evento {
  const cerrado = new Date(Date.parse(partial.startsAt) + 2 * 3_600_000).toISOString();
  return {
    kind: "partido",
    title: "Fecha",
    place: "",
    mapsQuery: "",
    lat: null,
    lng: null,
    modality: "f5",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
    resultClosedAt: cerrado,
    ...partial,
  };
}

function planilla(eventId: string, players: Planilla["players"], extra?: Partial<Planilla> & { arqueroId?: string }): Planilla & { arqueroId?: string } {
  return {
    eventId,
    opponent: "Rival",
    goalsFor: 3,
    goalsAgainst: 1,
    notes: "",
    recordedAt: "2026-10-03T22:00:00-03:00",
    players,
    ...extra,
  };
}

function jugador(id: string, extra?: Partial<Persona>): Persona {
  return { id, name: id, nick: id, role: "jugador", number: 10, ...extra };
}

function ctx(partial: Partial<ContextoPremios> & { events: Evento[]; sheets: Planilla[] }): ContextoPremios {
  return {
    members: [],
    votes: [],
    rsvps: [],
    now: Date.parse("2026-10-20T12:00:00-03:00"),
    ...partial,
  };
}

const CIERRE = "2026-10-01T22:00:00-03:00";
const BASE = Date.parse(CIERRE);

test("la figura empatada da una card por jugador, y un solo voto no", () => {
  const event = evento({ id: "p1", startsAt: "2026-10-01T20:00:00-03:00", resultClosedAt: CIERRE });
  const sheet = planilla("p1", [
    { memberId: "a", goals: 1, assists: 0, yellow: 0, red: 0 },
    { memberId: "b", goals: 0, assists: 1, yellow: 0, red: 0 },
  ]);
  const votos = [
    { eventId: "p1", voterId: "c", pickId: "a", at: CIERRE },
    { eventId: "p1", voterId: "d", pickId: "a", at: CIERRE },
    { eventId: "p1", voterId: "e", pickId: "b", at: CIERRE },
    { eventId: "p1", voterId: "f", pickId: "b", at: CIERRE },
  ];
  const cerrado = ctx({
    events: [event],
    sheets: [sheet],
    members: [jugador("a"), jugador("b")],
    votes: votos,
    now: BASE + 48 * 3_600_000,
  });
  const figuras = premiosDelPartido("p1", cerrado).filter((premio) => premio.tipo === "figura");
  assert.equal(figuras.length, 2);
  assert.deepEqual(figuras.map((premio) => premio.memberId).sort(), ["a", "b"]);

  const uno = premiosDelPartido("p1", { ...cerrado, votes: votos.slice(0, 1) }).filter((premio) => premio.tipo === "figura");
  assert.equal(uno.length, 0);
});

test("a las 47 horas la figura sigue abierta y a las 48 ya hay card", () => {
  const event = evento({ id: "p1", startsAt: "2026-10-01T20:00:00-03:00", resultClosedAt: CIERRE });
  const sheet = planilla("p1", [{ memberId: "a", goals: 1, assists: 0, yellow: 0, red: 0 }]);
  const votes = [
    { eventId: "p1", voterId: "c", pickId: "a", at: CIERRE },
    { eventId: "p1", voterId: "d", pickId: "a", at: CIERRE },
  ];
  const abierto = BASE + 47 * 3_600_000;
  assert.equal(estadoFigura(event, votes, abierto), "abierta");
  assert.equal(
    premiosDelPartido("p1", ctx({ events: [event], sheets: [sheet], members: [jugador("a")], votes, now: abierto })).filter(
      (premio) => premio.tipo === "figura",
    ).length,
    0,
  );
  const justo = BASE + 48 * 3_600_000;
  assert.equal(estadoFigura(event, votes, justo), "cerrada");
  assert.equal(
    premiosDelPartido("p1", ctx({ events: [event], sheets: [sheet], members: [jugador("a")], votes, now: justo })).filter(
      (premio) => premio.tipo === "figura",
    ).length,
    1,
  );
});

test("una planilla sin terminar no tiene premios", () => {
  const sheet = planilla("p1", [{ memberId: "a", goals: 4, assists: 0, yellow: 0, red: 0 }], { goalsAgainst: 0 });
  const members = [jugador("a")];
  const sinCierre = premiosDelPartido(
    "p1",
    ctx({
      events: [evento({ id: "p1", startsAt: "2026-10-01T20:00:00-03:00", resultClosedAt: undefined })],
      sheets: [sheet],
      members,
    }),
  );
  assert.equal(sinCierre.length, 0);
  const pendiente = premiosDelPartido(
    "p1",
    ctx({
      events: [evento({ id: "p1", startsAt: "2026-10-01T20:00:00-03:00", resultPending: true, resultClosedAt: undefined })],
      sheets: [sheet],
      members,
    }),
  );
  assert.equal(pendiente.length, 0);
});

test("hat-trick desde 3 goles y las pelotas no pasan de 5", () => {
  const event = evento({ id: "p1", startsAt: "2026-10-03T20:00:00-03:00", resultClosedAt: CIERRE });
  const dos = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [{ memberId: "a", goals: 2, assists: 0, yellow: 0, red: 0 }])],
      members: [jugador("a")],
    }),
  ).filter((premio) => premio.tipo === "hat-trick");
  assert.equal(dos.length, 0);
  const tres = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [{ memberId: "a", goals: 3, assists: 1, yellow: 0, red: 0 }])],
      members: [jugador("a")],
    }),
  ).find((premio) => premio.tipo === "hat-trick");
  assert.equal(tres?.deco?.tipo === "pelotas" ? tres.deco.n : 0, 3);
  const seis = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [{ memberId: "a", goals: 6, assists: 0, yellow: 0, red: 0 }])],
      members: [jugador("a")],
    }),
  ).find((premio) => premio.tipo === "hat-trick");
  assert.equal(seis?.deco?.tipo === "pelotas" ? seis.deco.n : 0, 5);
});

test("valla invicta solo con arquero y el arquero de la planilla gana", () => {
  const event = evento({
    id: "p1",
    startsAt: "2026-10-03T20:00:00-03:00",
    resultClosedAt: CIERRE,
    lineup: { ARQ: "arquero" },
  });
  const si = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [], { goalsFor: 2, goalsAgainst: 0 })],
      members: [jugador("arquero")],
    }),
  ).filter((premio) => premio.tipo === "valla");
  assert.equal(si.length, 1);
  assert.equal(si[0]?.memberId, "arquero");
  const no = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [], { goalsFor: 2, goalsAgainst: 1 })],
      members: [jugador("arquero")],
    }),
  ).filter((premio) => premio.tipo === "valla");
  assert.equal(no.length, 0);
  const sinArco = premiosDelPartido(
    "p1",
    ctx({
      events: [{ ...event, lineup: {} }],
      sheets: [planilla("p1", [], { goalsFor: 2, goalsAgainst: 0 })],
      members: [jugador("arquero")],
    }),
  ).filter((premio) => premio.tipo === "valla");
  assert.equal(sinArco.length, 0);
  const marcado = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [], { goalsFor: 2, goalsAgainst: 0, arqueroId: "titular" })],
      members: [jugador("arquero"), jugador("titular")],
    }),
  ).find((premio) => premio.tipo === "valla");
  assert.equal(marcado?.memberId, "titular");
});

test("el debut no existe en el primer partido, el suplente debuta y no se repite", () => {
  const primero = evento({ id: "p1", startsAt: "2026-09-01T20:00:00-03:00", resultClosedAt: "2026-09-01T22:00:00-03:00" });
  const segundo = evento({
    id: "p2",
    startsAt: "2026-09-08T20:00:00-03:00",
    resultClosedAt: "2026-09-08T22:00:00-03:00",
    suplentes: ["suplente"],
  });
  const tercero = evento({
    id: "p3",
    startsAt: "2026-09-15T20:00:00-03:00",
    resultClosedAt: "2026-09-15T22:00:00-03:00",
    suplentes: ["suplente"],
  });
  const sheets = [
    planilla("p1", [{ memberId: "titular", goals: 1, assists: 0, yellow: 0, red: 0 }]),
    planilla("p2", [{ memberId: "titular", goals: 0, assists: 0, yellow: 0, red: 0 }]),
    planilla("p3", [
      { memberId: "titular", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "suplente", goals: 0, assists: 0, yellow: 0, red: 0 },
    ]),
  ];
  const base = ctx({
    events: [primero, segundo, tercero],
    sheets,
    members: [jugador("titular"), jugador("suplente", { nick: "Suplente" })],
  });
  assert.equal(premiosDelPartido("p1", { ...base, events: [primero], sheets: sheets.slice(0, 1) }).some((premio) => premio.tipo === "debut"), false);
  const debut = premiosDelPartido("p2", base).filter((premio) => premio.tipo === "debut");
  assert.deepEqual(debut.map((premio) => premio.memberId), ["suplente"]);
  assert.equal(premiosDelPartido("p3", base).some((premio) => premio.tipo === "debut" && premio.memberId === "suplente"), false);
});

test("un partido anterior sin terminar no cuenta como previo", () => {
  const abierto = evento({ id: "p0", startsAt: "2026-09-01T20:00:00-03:00", resultClosedAt: undefined });
  const debut = evento({
    id: "p1",
    startsAt: "2026-09-08T20:00:00-03:00",
    resultClosedAt: "2026-09-08T22:00:00-03:00",
    suplentes: ["nuevo"],
  });
  const premios = premiosDelPartido(
    "p1",
    ctx({
      events: [abierto, debut],
      sheets: [
        planilla("p0", [{ memberId: "viejo", goals: 1, assists: 0, yellow: 0, red: 0 }]),
        planilla("p1", [{ memberId: "viejo", goals: 0, assists: 0, yellow: 0, red: 0 }]),
      ],
      members: [jugador("viejo"), jugador("nuevo")],
    }),
  );
  assert.equal(premios.some((premio) => premio.tipo === "debut"), false);
});

test("los premios del mes solo salen cuando el mes cerró", () => {
  const septiembre = evento({ id: "s1", startsAt: "2026-09-10T20:00:00-03:00" });
  const sheets = [
    planilla("s1", [
      { memberId: "ana", goals: 2, assists: 0, yellow: 0, red: 0 },
      { memberId: "luz", goals: 2, assists: 0, yellow: 0, red: 0 },
    ]),
  ];
  const members = [jugador("ana"), jugador("luz")];
  const enCurso = premiosDelMes("2026-09", ctx({ events: [septiembre], sheets, members, now: Date.parse("2026-09-20T12:00:00-03:00") }));
  assert.equal(enCurso.length, 0);
  const cerrado = premiosDelMes("2026-09", ctx({ events: [septiembre], sheets, members, now: Date.parse("2026-10-02T12:00:00-03:00") }));
  const goleadores = cerrado.filter((premio) => premio.tipo === "goleador");
  assert.equal(goleadores.length, 2);
  assert.equal(goleadores[0]?.titulo, "MÁS GOLES DEL MES");
});

test("el promedio del mes usa coma y el 31 a la noche sigue siendo octubre", () => {
  const a = evento({ id: "a", startsAt: "2026-10-03T20:00:00-03:00" });
  const b = evento({ id: "b", startsAt: "2026-10-31T23:30:00-03:00" });
  const sheets = [
    planilla("a", [{ memberId: "enzo", goals: 2, assists: 0, yellow: 0, red: 0 }]),
    planilla("b", [{ memberId: "enzo", goals: 1, assists: 0, yellow: 0, red: 0 }]),
  ];
  const premios = premiosDelMes(
    "2026-10",
    ctx({
      events: [a, b],
      sheets,
      members: [jugador("enzo")],
      now: Date.parse("2026-11-15T12:00:00-03:00"),
    }),
  );
  const goleador = premios.find((premio) => premio.tipo === "goleador");
  assert.equal(goleador?.n, 3);
  assert.equal(goleador?.stats.find((stat) => stat.etiqueta === "PROM.")?.valor, "1,5");
  const sinTerminar = premiosDelMes(
    "2026-10",
    ctx({
      events: [a, b, evento({ id: "c", startsAt: "2026-10-20T20:00:00-03:00", resultClosedAt: undefined })],
      sheets: [...sheets, planilla("c", [{ memberId: "enzo", goals: 9, assists: 0, yellow: 0, red: 0 }])],
      members: [jugador("enzo")],
      now: Date.parse("2026-11-15T12:00:00-03:00"),
    }),
  ).find((premio) => premio.tipo === "goleador");
  assert.equal(sinTerminar?.n, 3);
  assert.equal(
    premiosDelMes("2026-11", ctx({ events: [a, b], sheets, members: [jugador("enzo")], now: Date.parse("2026-12-01T12:00:00-03:00") })).some(
      (premio) => premio.tipo === "goleador" && premio.memberId === "enzo",
    ),
    false,
  );
});

test("presente siempre pide tres de tres y un no lo saca", () => {
  const fechas = [1, 8, 15].map((dia) =>
    evento({
      id: `p${dia}`,
      startsAt: `2026-09-${String(dia).padStart(2, "0")}T20:00:00-03:00`,
      convocados: ["mati"],
    }),
  );
  const sheets = fechas.map((event) => planilla(event.id, [{ memberId: "mati", goals: 0, assists: 0, yellow: 0, red: 0 }]));
  const voy = fechas.map((event) => ({ eventId: event.id, memberId: "mati", status: "voy" as const }));
  const base = {
    events: fechas,
    sheets,
    members: [jugador("mati")],
    now: Date.parse("2026-10-02T12:00:00-03:00"),
  };
  assert.equal(premiosDelMes("2026-09", ctx({ ...base, events: fechas.slice(0, 2), sheets: sheets.slice(0, 2), rsvps: voy.slice(0, 2) })).some((premio) => premio.tipo === "presente"), false);
  assert.equal(premiosDelMes("2026-09", ctx({ ...base, rsvps: voy })).some((premio) => premio.tipo === "presente" && premio.memberId === "mati"), true);
  const conNo = voy.map((row, index) => (index === 1 ? { ...row, status: "no" as const } : row));
  assert.equal(premiosDelMes("2026-09", ctx({ ...base, rsvps: conNo })).some((premio) => premio.tipo === "presente"), false);
});

test("el DT del mes necesita dos partidos y no perder, o la mitad ganada", () => {
  const dt = jugador("profe", { role: "dt", nick: "Profe", number: null });
  const uno = premiosDelMes(
    "2026-09",
    ctx({
      events: [evento({ id: "p1", startsAt: "2026-09-03T20:00:00-03:00" })],
      sheets: [planilla("p1", [], { goalsFor: 2, goalsAgainst: 0 })],
      members: [dt],
      now: Date.parse("2026-10-02T12:00:00-03:00"),
    }),
  ).filter((premio) => premio.tipo === "dt");
  assert.equal(uno.length, 0);
  const mitad = premiosDelMes(
    "2026-09",
    ctx({
      events: [
        evento({ id: "p1", startsAt: "2026-09-03T20:00:00-03:00" }),
        evento({ id: "p2", startsAt: "2026-09-10T20:00:00-03:00" }),
      ],
      sheets: [
        planilla("p1", [], { goalsFor: 2, goalsAgainst: 0 }),
        planilla("p2", [], { goalsFor: 0, goalsAgainst: 1 }),
      ],
      members: [dt],
      now: Date.parse("2026-10-02T12:00:00-03:00"),
    }),
  );
  assert.equal(mitad.some((premio) => premio.tipo === "dt"), true);
  const empates = premiosDelMes(
    "2026-09",
    ctx({
      events: [3, 10, 17].map((dia) => evento({ id: `e${dia}`, startsAt: `2026-09-${String(dia).padStart(2, "0")}T20:00:00-03:00` })),
      sheets: [3, 10, 17].map((dia) => planilla(`e${dia}`, [], { goalsFor: 1, goalsAgainst: 1 })),
      members: [dt],
      now: Date.parse("2026-10-02T12:00:00-03:00"),
    }),
  );
  assert.equal(empates.some((premio) => premio.tipo === "dt"), true);
});

test("un menor no puede compartir y la card no inventa dorsal ni rival", () => {
  assert.equal(puedeCompartirPremio({ menor: true }), false);
  assert.equal(puedeCompartirPremio({}), true);
  const event = evento({
    id: "p1",
    title: "Clásico del barrio",
    startsAt: "2026-10-03T20:00:00-03:00",
    resultClosedAt: CIERRE,
  });
  const premio = premiosDelPartido(
    "p1",
    ctx({
      events: [event],
      sheets: [planilla("p1", [{ memberId: "mati", goals: 3, assists: 0, yellow: 0, red: 0 }], { opponent: "   " })],
      members: [jugador("mati", { number: null, nick: "Mati" })],
    }),
  ).find((item) => item.tipo === "hat-trick");
  assert.ok(premio);
  const datos = datosCard(premio, ctx({
    events: [event],
    sheets: [planilla("p1", [{ memberId: "mati", goals: 3, assists: 0, yellow: 0, red: 0 }], { opponent: "   " })],
    members: [jugador("mati", { number: null, nick: "Mati" })],
  }));
  assert.equal(datos.dorsal, null);
  assert.match(datos.contexto, /Clásico del barrio/);
});
