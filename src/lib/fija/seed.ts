import type {
  AlertLog,
  AppState,
  CharlaPost,
  ClubBundle,
  ClubEvent,
  Convocatoria,
  InboxItem,
  MatchSheet,
  Member,
  Rsvp,
  Tournament,
} from "./types";

export const TEAM_NAME = "Los Fijos";
export const APP_NAME = "Mi Vestuario App";
export const GUEST_ID = "self";

const MEMBERS: Member[] = [
  { id: "dt", name: "Martín Díaz", nick: "Profe", role: "dt", number: null },
  { id: "ayu", name: "Sofía Rivas", nick: "Sofi", role: "ayudante", number: null },
  { id: "j1", name: "Joaquín Herrera", nick: "Joaco", role: "jugador", number: 9 },
  { id: "j2", name: "Luca Benítez", nick: "Luca", role: "jugador", number: 1 },
  { id: "j3", name: "Facundo Ibarra", nick: "Facu", role: "jugador", number: 8 },
  { id: "j4", name: "Bruno Sosa", nick: "Bru", role: "jugador", number: 7 },
  { id: "j5", name: "Ramiro Castillo", nick: "Rama", role: "jugador", number: 4 },
  { id: "j6", name: "Ezequiel Martínez", nick: "Chelo", role: "jugador", number: 5 },
  { id: "j7", name: "Mía Pereyra", nick: "Mía", role: "jugador", number: 10 },
  { id: "j8", name: "Tomás Aguilar", nick: "Tomi", role: "jugador", number: 3 },
  { id: "j9", name: "Valen Gómez", nick: "Valen", role: "jugador", number: 11 },
  { id: "j10", name: "Nacho Ferreyra", nick: "Nacho", role: "jugador", number: 6 },
  { id: "j11", name: "Cami Torres", nick: "Cami", role: "jugador", number: 2 },
  { id: "j12", name: "Nicolás Acosta", nick: "Nico", role: "jugador", number: 14 },
  { id: "j13", name: "Luis Romero", nick: "Lucho", role: "jugador", number: 17 },
  { id: "j14", name: "Agustín Vega", nick: "Agus", role: "jugador", number: 15 },
  { id: "j15", name: "Federico Paz", nick: "Fede", role: "jugador", number: 18 },
];

const F8: Record<string, string> = {
  ARQ: "j2",
  LI: "j8",
  DF: "j5",
  LD: "j11",
  MI: "j6",
  MC: "j3",
  MD: "j4",
  DC: "j1",
};

const UNION = {
  mapsQuery: "Club Atlético Unión, Avenida López y Planes 3501, Santa Fe, Argentina",
  lat: -31.6435,
  lng: -60.712,
};

const PREDIO_SUR = {
  mapsQuery: "Predio Sur, Avenida Gorriti, Santa Fe, Argentina",
  lat: -31.6652,
  lng: -60.7098,
};

const PREDIO_NORTE = {
  mapsQuery: "Predio Norte, Avenida Blas Parera, Santa Fe, Argentina",
  lat: -31.6054,
  lng: -60.6895,
};

const TORNEOS: Tournament[] = [
  {
    id: "tor-apertura",
    name: "Apertura 2026",
    startedAt: "2026-08-01T00:00:00-03:00",
    endedAt: "2026-09-20T23:00:00-03:00",
    status: "finished",
  },
  {
    id: "tor-clausura",
    name: "Clausura 2026",
    startedAt: "2026-09-21T00:00:00-03:00",
    endedAt: null,
    status: "active",
  },
];

const EVENTS: ClubEvent[] = [
  {
    id: "ev-past-1",
    kind: "partido",
    title: "vs Villa del Parque",
    place: "Predio Sur, cancha 1",
    ...PREDIO_SUR,
    startsAt: "2026-09-06T20:00:00-03:00",
    modality: "f8",
    lineup: { ...F8, DC: "j1", MD: "j7" },
    tactics: "Ya jugado. Joaco al área, Mía por derecha.",
    lineupPublishedAt: "2026-09-05T19:00:00-03:00",
    tournamentId: "tor-apertura",
  },
  {
    id: "ev-past-2",
    kind: "partido",
    title: "vs Los Pibes",
    place: "Cancha 5 — Club Unión",
    ...UNION,
    startsAt: "2026-09-13T21:00:00-03:00",
    modality: "f8",
    lineup: F8,
    tactics: "Ya jugado. Empate justo.",
    lineupPublishedAt: "2026-09-12T18:00:00-03:00",
    tournamentId: "tor-apertura",
  },
  {
    id: "ev-past-3",
    kind: "partido",
    title: "vs Central Norte",
    place: "Predio Norte",
    ...PREDIO_NORTE,
    startsAt: "2026-09-20T18:30:00-03:00",
    modality: "f8",
    lineup: F8,
    tactics: "Ya jugado. Nos ganaron de contra.",
    lineupPublishedAt: "2026-09-19T17:00:00-03:00",
    tournamentId: "tor-apertura",
  },
  {
    id: "ev-reunion",
    kind: "reunion",
    title: "Charla previa",
    place: "Quincho del predio",
    ...PREDIO_SUR,
    startsAt: "2026-09-23T20:00:00-03:00",
    modality: "f5",
    lineup: {},
    tactics: "Confirmamos horarios de la semana y quién trae pelotas.",
    lineupPublishedAt: null,
    tournamentId: null,
  },
  {
    id: "ev-entreno",
    kind: "entrenamiento",
    title: "Entrenamiento de pases",
    place: "Cancha 5 — Club Unión",
    ...UNION,
    startsAt: "2026-09-25T21:00:00-03:00",
    modality: "f5",
    lineup: { ARQ: "j2", LI: "j5", LD: "j11", EI: "j4", ED: "j1" },
    tactics: "Ritmo alto. Si llegás tarde, entras de a poco. Hidratate.",
    lineupPublishedAt: "2026-09-24T12:00:00-03:00",
    tournamentId: null,
  },
  {
    id: "ev-partido",
    kind: "partido",
    title: "vs Los del Bajo",
    place: "Predio Sur, cancha 2",
    ...PREDIO_SUR,
    startsAt: "2026-09-26T20:30:00-03:00",
    modality: "f8",
    lineup: F8,
    tactics:
      "Presión en la salida de ellos. Joaco se queda al área. Si empatamos, no abrir el fondo.",
    lineupPublishedAt: "2026-09-22T10:00:00-03:00",
    tournamentId: "tor-clausura",
  },
  {
    id: "ev-f11",
    kind: "partido",
    title: "vs Racing del Barrio",
    place: "Cancha 11 — Club Unión",
    ...UNION,
    startsAt: "2026-09-28T17:00:00-03:00",
    modality: "f11",
    lineup: {
      ARQ: "j2",
      LI: "j8",
      DFI: "j5",
      DFD: "j10",
      LD: "j11",
      MI: "j6",
      MC: "j3",
      MD: "j4",
      EI: "j9",
      DC: "j1",
      ED: "j7",
    },
    tactics: "4-3-3. Mía y Valen abren. Joaco no baje a recibir: que le llegue de frente.",
    lineupPublishedAt: null,
    tournamentId: "tor-clausura",
  },
];

const MATCH_SHEETS: MatchSheet[] = [
  {
    eventId: "ev-past-1",
    opponent: "Villa del Parque",
    goalsFor: 3,
    goalsAgainst: 1,
    notes: "Primer tiempo 2-0. Ellos descontaron de penal.",
    recordedAt: "2026-09-06T22:10:00-03:00",
    players: [
      { memberId: "j1", goals: 2, assists: 0, yellow: 0, red: 0 },
      { memberId: "j7", goals: 1, assists: 1, yellow: 0, red: 0 },
      { memberId: "j3", goals: 0, assists: 1, yellow: 0, red: 0 },
      { memberId: "j4", goals: 0, assists: 1, yellow: 1, red: 0 },
      { memberId: "j2", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j5", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j6", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j8", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j11", goals: 0, assists: 0, yellow: 0, red: 0 },
    ],
  },
  {
    eventId: "ev-past-2",
    opponent: "Los Pibes",
    goalsFor: 2,
    goalsAgainst: 2,
    notes: "Empate con gol de Valen a los 38.",
    recordedAt: "2026-09-13T23:05:00-03:00",
    players: [
      { memberId: "j1", goals: 1, assists: 0, yellow: 0, red: 0 },
      { memberId: "j9", goals: 1, assists: 0, yellow: 0, red: 0 },
      { memberId: "j6", goals: 0, assists: 1, yellow: 0, red: 0 },
      { memberId: "j3", goals: 0, assists: 1, yellow: 0, red: 0 },
      { memberId: "j10", goals: 0, assists: 0, yellow: 1, red: 0 },
      { memberId: "j5", goals: 0, assists: 0, yellow: 1, red: 0 },
      { memberId: "j2", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j4", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j8", goals: 0, assists: 0, yellow: 0, red: 0 },
    ],
  },
  {
    eventId: "ev-past-3",
    opponent: "Central Norte",
    goalsFor: 0,
    goalsAgainst: 1,
    notes: "Nos ganaron de contra. Lucho se fue expulsado.",
    recordedAt: "2026-09-20T20:15:00-03:00",
    players: [
      { memberId: "j13", goals: 0, assists: 0, yellow: 0, red: 1 },
      { memberId: "j8", goals: 0, assists: 0, yellow: 1, red: 0 },
      { memberId: "j1", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j7", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j2", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j5", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j3", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j6", goals: 0, assists: 0, yellow: 0, red: 0 },
      { memberId: "j11", goals: 0, assists: 0, yellow: 0, red: 0 },
    ],
  },
];

function seedRsvps(): Rsvp[] {
  const players = MEMBERS.filter((m) => m.role === "jugador");
  const out: Rsvp[] = [];
  for (const event of EVENTS) {
    players.forEach((p, i) => {
      let status: Rsvp["status"] = "pendiente";
      if (event.id.startsWith("ev-past-")) {
        status = i === 14 ? "no" : "voy";
      } else if (event.id === "ev-partido") {
        if (i === 8 || i === 9) status = "no";
        else if (i === 6 || i === 7) status = "pendiente";
        else status = "voy";
      } else if (event.id === "ev-f11") {
        if (i >= 13) status = "pendiente";
        else if (i === 12) status = "no";
        else status = "voy";
      } else if (event.id === "ev-entreno") {
        status = i % 4 === 0 ? "pendiente" : i === 9 ? "no" : "voy";
      } else {
        status = i < 6 ? "voy" : "pendiente";
      }
      out.push({ eventId: event.id, memberId: p.id, status });
    });
  }
  return out;
}

function seedCallups(): {
  convocatorias: Convocatoria[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  charla: CharlaPost[];
} {
  const convAt = new Date(Date.now() - 50 * 3_600_000).toISOString();
  const firstAt = new Date(Date.now() - 26 * 3_600_000).toISOString();
  const secondAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
  const formAt = "2026-09-22T10:00:00-03:00";
  return {
    convocatorias: [{ eventId: "ev-partido", sentAt: convAt, sentBy: "dt" }],
    alertLog: [
      { id: "al-1", eventId: "ev-partido", kind: "first", at: firstAt },
      { id: "al-2", eventId: "ev-partido", kind: "second", at: secondAt },
    ],
    inbox: [
      {
        id: "in-call",
        kind: "convocatoria",
        title: "Convocatoria: vs Los del Bajo",
        body: "Sábado 20:30 en Predio Sur. Confirmá si vas.",
        eventId: "ev-partido",
        audience: "all",
        at: convAt,
        readBy: ["dt", "ayu"],
      },
      {
        id: "in-r1",
        kind: "recordatorio",
        title: "Segunda alerta de convocatoria",
        body: "Pasaron 24 h y todavía no confirmaste vs Los del Bajo.",
        eventId: "ev-partido",
        audience: "pending",
        at: firstAt,
        readBy: [],
      },
      {
        id: "in-wa",
        kind: "recordatorio",
        title: "Pendientes para WhatsApp",
        body: "Mía y Tomi llevan más de 48 h sin responder. Mandales el reclamo.",
        eventId: "ev-partido",
        audience: "staff",
        at: secondAt,
        readBy: [],
      },
      {
        id: "in-form",
        kind: "formacion",
        title: "Formación publicada",
        body: "El DT colgó la pizarra para vs Los del Bajo.",
        eventId: "ev-partido",
        audience: "all",
        at: formAt,
        readBy: ["dt", "ayu"],
      },
      {
        id: "in-charla",
        kind: "charla",
        title: "Charla técnica",
        body: "Sábado 20:30 contra Los del Bajo. El domingo es F11 vs Racing. Confirmen hoy.",
        audience: "all",
        at: "2026-09-21T11:20:00-03:00",
        readBy: ["dt"],
      },
    ],
    charla: [
      {
        id: "ch-1",
        memberId: "dt",
        text: "Sábado 20:30 contra Los del Bajo. El domingo es F11 vs Racing. Confirmen hoy, no mañana.",
        at: "2026-09-21T11:20:00-03:00",
      },
      {
        id: "ch-2",
        memberId: "ayu",
        text: "Llego 20:10 con las pecheras. El que pueda, una botella extra.",
        at: "2026-09-21T18:04:00-03:00",
      },
    ],
  };
}

export function emptyClubState() {
  return {
    club: null as AppState["club"],
    members: [] as Member[],
    events: [] as ClubEvent[],
    rsvps: [] as Rsvp[],
    messages: [] as AppState["messages"],
    charla: [] as CharlaPost[],
    matchSheets: [] as MatchSheet[],
    invites: [] as AppState["invites"],
    convocatorias: [] as Convocatoria[],
    inbox: [] as InboxItem[],
    alertLog: [] as AlertLog[],
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: [] as Tournament[],
    reminder: null as AppState["reminder"],
  };
}

export function openClubs(): ClubBundle[] {
  return [
    {
      club: { id: "club-bajo", name: "Los del Bajo", createdBy: "b-dt", inviteCode: "BAJO", crest: null },
      members: [
        { id: "b-dt", name: "Diego Luna", nick: "Diegote", role: "dt", number: null },
        { id: "b-ayu", name: "Lara Pérez", nick: "Lara", role: "ayudante", number: null },
        { id: "b-j1", name: "Pablo Ríos", nick: "Pablito", role: "jugador", number: 10 },
        { id: "b-j2", name: "Enzo Díaz", nick: "Enzo", role: "jugador", number: 9 },
      ],
      events: [],
      rsvps: [],
      messages: [
        {
          id: "bm1",
          memberId: "b-dt",
          text: "Bienvenido al vestuario de Los del Bajo. Confirmá y listo.",
          at: "2026-09-21T12:00:00-03:00",
        },
      ],
      charla: [],
      matchSheets: [
        {
          eventId: "b-ev1",
          opponent: "Central",
          goalsFor: 2,
          goalsAgainst: 0,
          notes: "Apertura cerrado.",
          recordedAt: "2026-09-10T22:00:00-03:00",
          players: [
            { memberId: "b-j2", goals: 2, assists: 0, yellow: 0, red: 0 },
            { memberId: "b-j1", goals: 0, assists: 2, yellow: 0, red: 0 },
          ],
        },
      ],
      invites: [],
      convocatorias: [],
      inbox: [],
      alertLog: [],
      reminderPolicy: { firstHours: 24, secondHours: 48 },
      tournaments: [
        {
          id: "b-tor-1",
          name: "Apertura barrio",
          startedAt: "2026-08-01T00:00:00-03:00",
          endedAt: "2026-09-12T00:00:00-03:00",
          status: "finished",
        },
        {
          id: "b-tor-2",
          name: "Clausura barrio",
          startedAt: "2026-09-13T00:00:00-03:00",
          endedAt: null,
          status: "active",
        },
      ],
    },
  ];
}

export function createSeed(): Omit<AppState, "hydrated"> {
  const callups = seedCallups();
  return {
    club: { id: "club-1", name: TEAM_NAME, createdBy: "dt", inviteCode: "FIJOS", crest: null },
    members: MEMBERS,
    events: EVENTS,
    rsvps: seedRsvps(),
    matchSheets: MATCH_SHEETS,
    invites: [],
    convocatorias: callups.convocatorias,
    inbox: callups.inbox,
    alertLog: callups.alertLog,
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: TORNEOS,
    archivedClubs: openClubs(),
    profile: { name: "Martín Díaz", nick: "Profe" },
    gpsConsent: "unset",
    charla: callups.charla,
    messages: [
      {
        id: "m1",
        memberId: "dt",
        text: "Sábado 20:30 contra Los del Bajo. El domingo es F11 vs Racing. Confirmá en la app, no en el grupo.",
        at: "2026-09-21T11:20:00-03:00",
      },
      {
        id: "m2",
        memberId: "j1",
        text: "Yo estoy los dos. Si falta 1 aviso y busco un 9.",
        at: "2026-09-21T11:32:00-03:00",
      },
      {
        id: "m3",
        memberId: "ayu",
        text: "Llego 20:10 con las pecheras. El que pueda, una botella extra.",
        at: "2026-09-21T18:04:00-03:00",
      },
      {
        id: "m4",
        memberId: "j7",
        text: "Puedo, pero salgo a las 19:40 del laburo. No me dejen afuera.",
        at: "2026-09-21T18:40:00-03:00",
      },
    ],
    activeId: "dt",
    reminder: null,
  };
}
