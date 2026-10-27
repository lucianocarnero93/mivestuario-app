import type {
  ClubBundle,
  ClubEvent,
  FiguraVote,
  MarcaVivo,
  MatchSheet,
  Member,
  PlayerMatchStat,
  ReaccionFecha,
  Rsvp,
} from "./types.ts";

/**
 * Equipo de ejemplo. Las fechas salen de `now`, así el próximo partido
 * siempre está a 4 días y el último fue ayer.
 *
 * falta prompt-pizarra: consignas por momento, entendido, quiz, cumplidas, origenGoles, cerebro
 */

const LUGAR = {
  potrero: {
    place: "El Potrero",
    mapsQuery: "El Potrero, Lanús, Buenos Aires, Argentina",
    lat: -34.706,
    lng: -58.391,
  },
  social: {
    place: "Club Social",
    mapsQuery: "Club Social, Lanús, Buenos Aires, Argentina",
    lat: -34.71,
    lng: -58.39,
  },
  cancha2: {
    place: "Cancha 2 de El Potrero",
    mapsQuery: "Cancha 2, El Potrero, Lanús, Buenos Aires, Argentina",
    lat: -34.707,
    lng: -58.392,
  },
};

export function fechaDemo(now: Date, dias: number, hora: number, minuto = 0): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const tomar = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((p) => p.type === tipo)?.value);
  const utc = new Date(Date.UTC(tomar("year"), tomar("month") - 1, tomar("day") + dias));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  const hh = String(hora).padStart(2, "0");
  const mm = String(minuto).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:00-03:00`;
}

const PLANTEL: Member[] = [
  { id: "profe", name: "Martín Díaz", nick: "Profe", role: "dt", number: null, juega: false },
  { id: "sofi", name: "Sofía Rivas", nick: "Sofi", role: "ayudante", number: null, juega: false },
  { id: "fede", name: "Federico Paz", nick: "Fede", role: "jugador", number: 1, juega: true },
  { id: "tincho", name: "Martín Benítez", nick: "Tincho", role: "jugador", number: 2, juega: true },
  { id: "polaco", name: "Pablo Gómez", nick: "Polaco", role: "jugador", number: 3, juega: true },
  { id: "nacho", name: "Ignacio Ferreyra", nick: "Nacho", role: "jugador", number: 4, juega: true },
  { id: "colo", name: "Nicolás Acosta", nick: "Colo", role: "jugador", number: 5, juega: true },
  { id: "lucas", name: "Lucas Vega", nick: "Lucas", role: "jugador", number: 6, juega: true },
  { id: "rama", name: "Ramiro Castillo", nick: "Rama", role: "jugador", number: 7, juega: true },
  { id: "juancito", name: "Juan Cruz Benítez", nick: "Juancito", role: "jugador", number: 8, juega: true },
  { id: "luqui", name: "Lucas Romero", nick: "Luqui", role: "jugador", number: 9, juega: true },
  { id: "mati", name: "Matías Pereyra", nick: "Mati", role: "jugador", number: 10, juega: true },
  { id: "bruno", name: "Bruno Sosa", nick: "Bruno", role: "jugador", number: 11, juega: true },
  { id: "pibe", name: "El Pibe", nick: "Pibe", role: "jugador", number: null, juega: true, menor: true },
];

const XI: Record<string, string> = {
  ARQ: "fede",
  LI: "tincho",
  LD: "nacho",
  MI: "juancito",
  MC: "colo",
  MD: "rama",
  DC: "luqui",
};

const BANCO = ["bruno", "polaco", "mati", "lucas"];
const CONVOCADOS = [...Object.values(XI), ...BANCO];

function stat(memberId: string, goals = 0, assists = 0, yellow = 0, red = 0): PlayerMatchStat {
  return { memberId, goals, assists, yellow, red };
}

function planilla(
  eventId: string,
  opponent: string,
  goalsFor: number,
  goalsAgainst: number,
  recordedAt: string,
  players: PlayerMatchStat[],
): MatchSheet {
  return { eventId, opponent, goalsFor, goalsAgainst, notes: "", recordedAt, players };
}

export function crearDemo(now: Date): ClubBundle {
  const cuando = (dias: number, hora: number, minuto = 0) => fechaDemo(now, dias, hora, minuto);
  const vistos = CONVOCADOS.filter((id) => id !== "lucas").map((memberId) => ({
    memberId,
    at: cuando(-1, 12),
  }));

  const proximo: ClubEvent = {
    id: "ev-racing",
    kind: "partido",
    title: "vs Racing del Bajo",
    ...LUGAR.potrero,
    startsAt: cuando(4, 17),
    modality: "f7",
    lineup: { ...XI },
    tactics: "Presión alta y salida corta",
    formacion: "1-2-3-1",
    lineupPublishedAt: cuando(-1, 19),
    tournamentId: "tor-apertura",
    convocados: [...CONVOCADOS],
    suplentes: [...BANCO],
    planActivo: "a",
    planes: [
      {
        id: "a",
        idea: "Presión alta y salida corta",
        cambio: "",
        lineup: { ...XI },
        dibujos: [],
        formacion: "1-2-3-1",
      },
    ],
    notas: {
      juancito:
        "Abrís por izquierda y llegás al 2º palo. Si la perdés cerca, vas vos. Vos cerrás el carril izquierdo. Vos picás por afuera.",
    },
    vistos,
    rival: "Racing del Bajo",
  };

  const academia: ClubEvent = {
    id: "ev-academia",
    kind: "partido",
    title: "vs La Academia",
    ...LUGAR.potrero,
    startsAt: cuando(-1, 21),
    modality: "f7",
    lineup: { ...XI, LI: "polaco" },
    tactics: "Presión alta y salida corta",
    formacion: "1-2-3-1",
    lineupPublishedAt: cuando(-2, 18),
    tournamentId: "tor-apertura",
    resultClosedAt: cuando(0, 0, 30),
    resultUpdatedAt: cuando(0, 0, 30),
    liveLog: marcasAcademia(cuando),
    reacciones: reacciones(cuando),
  };

  const viejos: ClubEvent[] = [
    partido("ev-1", "vs El Tala", -43),
    partido("ev-2", "vs Los Andes", -36),
    partido("ev-3", "vs Defensores", -29),
    partido("ev-4", "vs San Martín", -22),
    partido("ev-5", "vs Barracas", -15),
    partido("ev-6", "vs Temperley", -8),
  ].map((evento) => ({
    ...evento,
    resultClosedAt: cuando(diasDe(evento.startsAt, now) + 1, 22),
    resultUpdatedAt: cuando(diasDe(evento.startsAt, now) + 1, 22),
  }));

  const entreno1: ClubEvent = {
    id: "ev-entreno-1",
    kind: "entrenamiento",
    title: "Entrenamiento",
    ...LUGAR.social,
    startsAt: cuando(7, 20, 30),
    modality: "f7",
    lineup: {},
    tactics: "Pases y presión.",
    lineupPublishedAt: null,
    tournamentId: null,
  };
  const villa: ClubEvent = {
    id: "ev-villa",
    kind: "partido",
    title: "vs Villa Urquiza",
    ...LUGAR.cancha2,
    startsAt: cuando(11, 15),
    modality: "f7",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: "tor-apertura",
  };
  const entreno2: ClubEvent = {
    id: "ev-entreno-2",
    kind: "entrenamiento",
    title: "Entrenamiento",
    ...LUGAR.social,
    startsAt: cuando(14, 20, 30),
    modality: "f7",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
  };

  function partido(id: string, title: string, dias: number): ClubEvent {
    return {
      id,
      kind: "partido",
      title,
      ...LUGAR.potrero,
      startsAt: cuando(dias, 21),
      modality: "f7",
      lineup: { ...XI },
      tactics: "Presión alta y salida corta",
      formacion: "1-2-3-1",
      lineupPublishedAt: cuando(dias - 1, 18),
      tournamentId: "tor-apertura",
    };
  }

  const events = [...viejos, academia, proximo, entreno1, villa, entreno2];
  const sheets = planillas(cuando);
  const figuraVotes = votos(cuando);

  const van = ["fede", "tincho", "nacho", "colo", "juancito", "rama", "luqui", "bruno"];
  const duda = ["polaco", "mati", "lucas"];
  const rsvps: Rsvp[] = [
    ...van.map((memberId) => ({ eventId: "ev-racing", memberId, status: "voy" as const, at: cuando(-1, 20) })),
    ...duda.map((memberId) => ({ eventId: "ev-racing", memberId, status: "pendiente" as const, at: cuando(-1, 20) })),
    { eventId: "ev-racing", memberId: "pibe", status: "no", at: cuando(-1, 20) },
    { eventId: "ev-entreno-1", memberId: "juancito", status: "pendiente", at: cuando(0, 9) },
    { eventId: "ev-villa", memberId: "juancito", status: "pendiente", at: cuando(0, 9) },
    { eventId: "ev-entreno-2", memberId: "juancito", status: "no", at: cuando(0, 9) },
  ];

  return {
    club: {
      id: "club-pibes",
      name: "Los Pibes FC",
      createdBy: "profe",
      inviteCode: "PIBES",
      crest: null,
      colores: { primary: "#b8f25a", secondary: "#143322" },
      teamLiveToken: "pibes-demo",
    },
    members: PLANTEL.map((persona) => ({ ...persona })),
    events,
    rsvps,
    messages: [
      {
        id: "msg-1",
        memberId: "profe",
        text: "El sábado jugamos en El Potrero. La formación ya está.",
        at: cuando(-1, 19, 5),
      },
    ],
    charla: [
      {
        id: "charla-1",
        memberId: "profe",
        text: "Repasen la salida corta. Juancito abre por izquierda.",
        at: cuando(-1, 19, 10),
      },
    ],
    matchSheets: sheets,
    figuraVotes,
    invites: [],
    convocatorias: [{ eventId: "ev-racing", sentAt: cuando(-1, 19), sentBy: "profe" }],
    inbox: [
      {
        id: "in-1",
        kind: "formacion",
        title: "Salió la formación",
        body: "vs Racing del Bajo · sos titular",
        eventId: "ev-racing",
        audience: "all",
        at: cuando(-1, 19),
        readBy: [],
      },
    ],
    alertLog: [],
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: [
      {
        id: "tor-apertura",
        name: "Torneo Apertura",
        startedAt: cuando(-60, 0),
        endedAt: null,
        status: "active",
      },
    ],
    droppedIds: [],
    droppedEventIds: [],
    droppedCharlaIds: [],
    alumni: [],
    caja: cajaDemo(cuando),
    biblioteca: [],
  };
}

function diasDe(iso: string, now: Date): number {
  const hoy = fechaDemo(now, 0, 12).slice(0, 10);
  const dia = iso.slice(0, 10);
  const a = Date.parse(`${hoy}T12:00:00Z`);
  const b = Date.parse(`${dia}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function marcasAcademia(cuando: (dias: number, hora: number, minuto?: number) => string): MarcaVivo[] {
  return [
    { id: "lv-inicio", kind: "inicio", at: cuando(-1, 21) },
    { id: "lv-12", kind: "gol", memberId: "luqui", at: cuando(-1, 21, 12) },
    { id: "lv-entre", kind: "entretiempo", at: cuando(-1, 21, 25) },
    { id: "lv-segundo", kind: "segundo", at: cuando(-1, 21, 26) },
    { id: "lv-31", kind: "gol", memberId: "luqui", at: cuando(-1, 21, 31) },
    { id: "lv-38", kind: "gol-rival", at: cuando(-1, 21, 38) },
    { id: "lv-44", kind: "gol", memberId: "luqui", at: cuando(-1, 21, 44) },
  ];
}

function reacciones(cuando: (dias: number, hora: number, minuto?: number) => string): ReaccionFecha[] {
  const lista: ReaccionFecha[] = [
    { memberId: "juancito", emoji: "fuego", at: cuando(0, 8) },
    { memberId: "colo", emoji: "aplauso", at: cuando(0, 8, 1) },
    { memberId: "rama", emoji: "risa", at: cuando(0, 8, 2) },
    { memberId: "fede", emoji: "fuego", at: cuando(0, 8, 3) },
    { memberId: "tincho", emoji: "aplauso", at: cuando(0, 8, 4) },
  ];
  return lista;
}

function planillas(cuando: (dias: number, hora: number, minuto?: number) => string): MatchSheet[] {
  return [
    planilla("ev-1", "El Tala", 4, 0, cuando(-43, 22), [
      stat("luqui", 3),
      stat("colo", 1),
      stat("fede"),
    ]),
    planilla("ev-2", "Los Andes", 3, 0, cuando(-36, 22), [
      stat("luqui", 2),
      stat("rama", 1),
      stat("fede"),
    ]),
    planilla("ev-3", "Defensores", 3, 0, cuando(-29, 22), [
      stat("luqui", 1),
      stat("juancito", 2, 2),
      stat("fede"),
    ]),
    planilla("ev-4", "San Martín", 5, 2, cuando(-22, 22), [
      stat("luqui", 2),
      stat("juancito", 2, 2),
      stat("bruno", 1),
      stat("fede"),
    ]),
    planilla("ev-5", "Barracas", 2, 2, cuando(-15, 22), [
      stat("juancito", 1, 1),
      stat("mati", 1),
      stat("fede"),
    ]),
    planilla("ev-6", "Temperley", 3, 4, cuando(-8, 22), [
      stat("juancito", 1, 2, 1),
      stat("tincho", 1),
      stat("nacho", 1),
      stat("fede"),
    ]),
    planilla("ev-academia", "La Academia", 3, 1, cuando(-1, 22, 30), [
      stat("luqui", 3),
      stat("juancito", 0, 2),
      stat("colo", 0, 1),
      stat("polaco"),
      stat("fede"),
    ]),
  ];
}

function votos(cuando: (dias: number, hora: number, minuto?: number) => string): FiguraVote[] {
  const cerrados: FiguraVote[] = [
    { eventId: "ev-3", voterId: "fede", pickId: "juancito", at: cuando(-28, 18) },
    { eventId: "ev-3", voterId: "tincho", pickId: "juancito", at: cuando(-28, 18) },
    { eventId: "ev-3", voterId: "luqui", pickId: "juancito", at: cuando(-28, 18) },
    { eventId: "ev-4", voterId: "fede", pickId: "juancito", at: cuando(-21, 18) },
    { eventId: "ev-4", voterId: "colo", pickId: "juancito", at: cuando(-21, 18) },
    { eventId: "ev-4", voterId: "rama", pickId: "luqui", at: cuando(-21, 18) },
  ];
  const abiertos = ["fede", "tincho", "nacho", "colo", "rama", "bruno", "luqui"].map((voterId, index) => ({
    eventId: "ev-academia",
    voterId,
    pickId: index < 4 ? "luqui" : "juancito",
    at: cuando(0, 9, index),
  }));
  return [...cerrados, ...abiertos];
}

function cajaDemo(cuando: (dias: number, hora: number, minuto?: number) => string) {
  const pagan = ["bruno", "polaco", "mati", "rama", "fede", "tincho", "nacho", "colo", "juancito", "luqui", "lucas", "pibe"];
  const montos: Record<string, number> = {
    bruno: 7000,
    polaco: 3500,
    mati: 3500,
    rama: 3500,
    fede: 1313,
    tincho: 1313,
    nacho: 1313,
    colo: 1313,
    juancito: 1312,
    luqui: 1312,
    lucas: 1312,
    pibe: 1312,
  };
  const cupones = pagan.map((id) => ({ id, monto: montos[id] ?? 0 }));
  const alDia = ["fede", "tincho", "nacho", "colo", "juancito", "luqui", "lucas", "pibe"];
  return {
    tesoreroId: "profe",
    alias: "pibes.fc",
    gastos: [
      {
        id: "gas-cancha",
        titulo: "Cancha",
        monto: 28000,
        categoria: "cancha" as const,
        fecha: cuando(-1, 21),
        pagadoPor: "profe",
        personas: pagan,
        cupones,
        at: cuando(-1, 21),
      },
      {
        id: "gas-pelotas",
        titulo: "Pelotas",
        monto: 28000,
        categoria: "indumentaria" as const,
        fecha: cuando(-20, 12),
        pagadoPor: "profe",
        personas: ["profe"],
        cupones: [{ id: "profe", monto: 28000 }],
        cerrado: true,
        at: cuando(-20, 12),
      },
    ],
    cobros: alDia.map((memberId) => ({
      id: `cob-${memberId}`,
      gastoId: "gas-cancha",
      memberId,
      monto: montos[memberId] ?? 0,
      medio: "manual" as const,
      estado: "confirmado" as const,
      at: cuando(0, 10),
    })),
  };
}
