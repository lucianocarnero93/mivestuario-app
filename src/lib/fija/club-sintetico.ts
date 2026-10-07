import type {
  AlertLog,
  ClubBundle,
  ClubEvent,
  Convocatoria,
  FiguraVote,
  InboxItem,
  MatchSheet,
  Member,
  Rsvp,
  Tournament,
} from "./types.ts";

const DIA = 24 * 60 * 60 * 1000;
const PUESTOS = ["ARQ", "LI", "DFI", "DFD", "LD", "MI", "MC1", "MC2", "MD", "DC1", "DC2"] as const;
const TACTICA =
  "Salimos cortos por abajo, el 6 cae entre centrales y los extremos fijan. Si nos presionan, pelotazo al 9 y segunda jugada. Sin regalar la banda.";
const RIVAL = `${"Presionan arriba, cierran el medio y dejan el carril. ".repeat(64)}No regalan la segunda pelota.`;

export type ClubSinteticoInput = {
  semanas: number;
  partidosPorSemana: number;
  entrenamientosPorSemana: number;
  jugadores: number;
  ahora: number;
};

export type MarcasSinteticas = {
  faltaId: string;
  empateId: string;
  unVotoId: string;
  hatTrickId: string;
  vallaId: string;
  reunionId: string;
  suplenteId: string;
  rachaId: string;
  presenteId: string;
};

function id32(n: number): string {
  return n.toString(16).padStart(32, "0");
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function eventoBase(input: {
  id: string;
  kind: ClubEvent["kind"];
  title: string;
  startsAt: number;
  tournamentId: string | null;
}): ClubEvent {
  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    place: "Cancha 3",
    mapsQuery: "Cancha 3",
    lat: null,
    lng: null,
    startsAt: iso(input.startsAt),
    modality: "f11",
    lineup: {},
    tactics: "",
    lineupPublishedAt: iso(input.startsAt - DIA),
    tournamentId: input.tournamentId,
  };
}

export function clubSintetico(input: ClubSinteticoInput): { bundle: ClubBundle; marcas: MarcasSinteticas } {
  const jugadores = Math.max(1, input.jugadores);
  const semanas = Math.max(1, input.semanas);
  const dt = id32(1);
  const ayudante = id32(2);
  const plantel: Member[] = [
    { id: dt, name: "Diego Luna", nick: "Profe", role: "dt", number: null, accountId: dt, juega: false },
    { id: ayudante, name: "Ivan Ruiz", nick: "Ivan", role: "ayudante", number: null, accountId: ayudante, juega: false },
  ];
  const jugadoresIds: string[] = [];
  for (let i = 0; i < jugadores; i += 1) {
    const id = id32(100 + i);
    jugadoresIds.push(id);
    plantel.push({
      id,
      name: `Jugador ${i + 1}`,
      nick: `J${i + 1}`,
      role: "jugador",
      number: i + 1,
      accountId: id,
      juega: true,
    });
  }
  const rachaId = jugadoresIds[0];
  const presenteId = jugadoresIds[Math.min(4, jugadoresIds.length - 1)];
  const suplenteId = jugadoresIds[Math.min(16, jugadoresIds.length - 1)];
  const goleadorId = jugadoresIds[Math.min(2, jugadoresIds.length - 1)];

  const inicio = input.ahora - semanas * 7 * DIA;
  const torneos = torneosDe(semanas, inicio);
  const events: ClubEvent[] = [];
  const rsvps: Rsvp[] = [];
  const sheets: MatchSheet[] = [];
  const votes: FiguraVote[] = [];
  const convocatorias: Convocatoria[] = [];
  const alertLog: AlertLog[] = [];
  const inbox: InboxItem[] = [];

  let empateId = "";
  let unVotoId = "";
  let hatTrickId = "";
  let vallaId = "";
  let faltaId = "";
  let partidos = 0;

  for (let semana = 0; semana < semanas; semana += 1) {
    const base = inicio + semana * 7 * DIA;
    const torneo = torneos.find((item) => semana >= item.desde && semana < item.hasta);
    for (let n = 0; n < input.partidosPorSemana; n += 1) {
      const starts = base + n * DIA;
      const id = `p-${String(semana).padStart(3, "0")}-${n}`;
      const cerrado = starts < input.ahora - 3 * DIA;
      const event = partidoDe(id, starts, torneo?.id ?? null, jugadoresIds, suplenteId);
      events.push(event);
      sumarAsistencia(rsvps, id, starts, jugadoresIds, rachaId, presenteId);
      sumarPapeles(convocatorias, alertLog, inbox, id, starts, dt, input.ahora, jugadoresIds);
      if (cerrado) {
        event.resultClosedAt = iso(starts + 2 * 60 * 60 * 1000);
        const especial = !hatTrickId
          ? "hat"
          : !vallaId
            ? "valla"
            : !empateId
              ? "empate"
              : !unVotoId
                ? "unvoto"
                : "normal";
        if (especial === "hat") hatTrickId = id;
        if (especial === "valla") vallaId = id;
        if (especial === "empate") empateId = id;
        if (especial === "unvoto") unVotoId = id;
        sheets.push(planillaDe(id, starts, jugadoresIds, suplenteId, goleadorId, especial === "hat", especial === "valla"));
        votes.push(...votosDe(id, event.resultClosedAt, jugadoresIds, especial));
        if (starts >= input.ahora - 21 * DIA) pizarraReciente(event, jugadoresIds);
      } else if (!faltaId && starts < input.ahora) {
        faltaId = id;
        event.title = "Falta resultado";
      }
      partidos += 1;
    }
    for (let n = 0; n < input.entrenamientosPorSemana; n += 1) {
      const starts = base + (2 + n) * DIA + 21 * 60 * 60 * 1000;
      const id = `e-${String(semana).padStart(3, "0")}-${n}`;
      events.push(eventoBase({ id, kind: "entrenamiento", title: "Entrenamiento", startsAt: starts, tournamentId: null }));
      sumarAsistencia(rsvps, id, starts, jugadoresIds, rachaId, presenteId);
      sumarPapeles(convocatorias, alertLog, inbox, id, starts, dt, input.ahora, jugadoresIds);
    }
  }

  const reunionAt = inicio + 3 * DIA;
  const reunionId = "reunion-vieja";
  events.push(eventoBase({ id: reunionId, kind: "reunion", title: "Reunión vieja", startsAt: reunionAt, tournamentId: null }));
  sumarAsistencia(rsvps, reunionId, reunionAt, jugadoresIds, rachaId, presenteId);
  sumarPapeles(convocatorias, alertLog, inbox, reunionId, reunionAt, dt, input.ahora, jugadoresIds);

  if (!faltaId && partidos > 0) {
    const ultimo = [...events].reverse().find((event) => event.kind === "partido" && event.resultClosedAt);
    if (ultimo) {
      faltaId = ultimo.id;
      ultimo.title = "Falta resultado";
      ultimo.resultClosedAt = null;
      const sheetAt = sheets.findIndex((sheet) => sheet.eventId === ultimo.id);
      if (sheetAt >= 0) sheets.splice(sheetAt, 1);
      for (let i = votes.length - 1; i >= 0; i -= 1) if (votes[i].eventId === ultimo.id) votes.splice(i, 1);
    }
  }

  const bundle: ClubBundle = {
    club: { id: "club-sintetico", name: "Sintético", createdBy: dt, inviteCode: "SINTETICO", crest: null },
    members: plantel,
    events,
    rsvps,
    messages: [],
    charla: [],
    matchSheets: sheets,
    figuraVotes: votes,
    invites: [],
    convocatorias,
    inbox,
    alertLog,
    reminderPolicy: { firstHours: 24, secondHours: 3 },
    tournaments: torneos.map((item) => ({
      id: item.id,
      name: item.nombre,
      startedAt: iso(item.inicio),
      endedAt: item.status === "finished" ? iso(item.fin) : null,
      status: item.status,
    })),
  };

  return {
    bundle,
    marcas: { faltaId, empateId, unVotoId, hatTrickId, vallaId, reunionId, suplenteId, rachaId, presenteId },
  };
}

function torneosDe(semanas: number, inicio: number): {
  id: string;
  nombre: string;
  desde: number;
  hasta: number;
  inicio: number;
  fin: number;
  status: Tournament["status"];
}[] {
  const cortes: { desde: number; hasta: number; status: Tournament["status"] }[] = [];
  if (semanas <= 20) {
    const corte = Math.min(3, semanas - 1);
    if (corte > 0) cortes.push({ desde: 0, hasta: corte, status: "finished" });
    cortes.push({ desde: corte, hasta: semanas, status: "active" });
  } else {
    for (let desde = 0; desde < semanas; desde += 20) {
      const hasta = Math.min(semanas, desde + 20);
      const ultimo = hasta === semanas;
      cortes.push({ desde, hasta, status: ultimo ? "active" : "finished" });
    }
  }
  return cortes.map((item, index) => ({
    id: `torneo-${index}`,
    nombre: item.status === "active" ? "Actual" : `Temporada ${index + 1}`,
    desde: item.desde,
    hasta: item.hasta,
    inicio: inicio + item.desde * 7 * DIA,
    fin: inicio + item.hasta * 7 * DIA,
    status: item.status,
  }));
}

function partidoDe(id: string, starts: number, tournamentId: string | null, jugadores: string[], suplenteId: string): ClubEvent {
  const titulares = jugadores.slice(0, PUESTOS.length);
  const lineup: Record<string, string> = {};
  PUESTOS.forEach((puesto, index) => {
    lineup[puesto] = titulares[index] ?? titulares[0];
  });
  const convocados = jugadores.slice(0, Math.min(18, jugadores.length));
  if (!convocados.includes(suplenteId)) convocados.push(suplenteId);
  const suplentes = convocados.filter((item) => !Object.values(lineup).includes(item));
  const event = eventoBase({ id, kind: "partido", title: "Partido", startsAt: starts, tournamentId });
  event.lineup = lineup;
  event.tactics = TACTICA;
  event.rival = RIVAL;
  event.notas = Object.fromEntries(titulares.slice(0, 4).map((item, index) => [item, `Indicación ${index + 1} del partido`]));
  event.convocados = convocados;
  event.suplentes = suplentes;
  event.formacion = "4-4-2";
  event.equipamiento = { remeras: titulares[0], pelotas: titulares[1] };
  event.liveLog = [
    { id: `${id}-ini`, kind: "inicio", at: iso(starts) },
    { id: `${id}-g1`, kind: "gol", memberId: titulares[9], at: iso(starts + 10 * 60 * 1000) },
    { id: `${id}-g2`, kind: "gol", memberId: titulares[10], at: iso(starts + 20 * 60 * 1000) },
    { id: `${id}-g3`, kind: "gol", memberId: titulares[9], at: iso(starts + 30 * 60 * 1000) },
    { id: `${id}-t`, kind: "tarjeta", memberId: titulares[2], card: "amarilla", at: iso(starts + 40 * 60 * 1000) },
  ];
  event.reacciones = titulares.slice(0, 8).map((item, index) => ({
    memberId: item,
    emoji: index % 2 === 0 ? "aplauso" : "fuego",
    at: iso(starts + 50 * 60 * 1000),
  }));
  return event;
}

function pizarraReciente(event: ClubEvent, jugadores: string[]) {
  const dibujo = (n: number) => ({ id: `${event.id}-d${n}`, trazo: "flecha" as const, x1: 10, y1: 20, x2: 40, y2: 60 });
  event.planes = (["b", "c"] as const).map((plan) => ({
    id: plan,
    idea: "Cambio de frente si nos cierran el medio.",
    cambio: "Entra el extremo y el 9 fija.",
    lineup: event.lineup,
    dibujos: [dibujo(1), dibujo(2)],
  }));
  event.pasos = {
    id: `${event.id}-pasos`,
    nombre: "Salida",
    tipo: "jugada",
    cuadros: [0, 1, 2, 3].map((n) => ({
      texto: `Cuadro ${n}`,
      fichas: jugadores.slice(0, 4).map((memberId, index) => ({ memberId, x: 10 + index * 15, y: 20 + n * 10 })),
      pelota: { x: 50, y: 40 + n },
    })),
  };
  event.vistos = jugadores.slice(0, 4).map((memberId) => ({ memberId, at: event.startsAt }));
  event.videoUrl = "https://example.com/jugada";
}

function planillaDe(
  id: string,
  starts: number,
  jugadores: string[],
  suplenteId: string,
  goleadorId: string,
  hat: boolean,
  valla: boolean,
): MatchSheet {
  const filas = jugadores.slice(0, 16).filter((item) => item !== suplenteId);
  return {
    eventId: id,
    opponent: "Rival",
    goalsFor: hat ? 3 : valla ? 1 : 2,
    goalsAgainst: valla ? 0 : 1,
    notes: "",
    recordedAt: iso(starts + 2 * 60 * 60 * 1000),
    players: filas.map((memberId) => ({
      memberId,
      goals: hat && memberId === goleadorId ? 3 : 0,
      assists: 0,
      yellow: 0,
      red: 0,
    })),
  };
}

function votosDe(id: string, cerrado: string, jugadores: string[], especial: string): FiguraVote[] {
  if (especial === "unvoto") {
    return [{ eventId: id, voterId: jugadores[3], pickId: jugadores[4], at: cerrado }];
  }
  if (especial === "empate") {
    const votos: FiguraVote[] = [];
    for (let i = 0; i < 6; i += 1) {
      votos.push({ eventId: id, voterId: jugadores[i + 2], pickId: jugadores[0], at: cerrado });
      votos.push({ eventId: id, voterId: jugadores[i + 8], pickId: jugadores[1], at: cerrado });
    }
    return votos;
  }
  return jugadores.slice(0, 12).map((voterId, index) => ({
    eventId: id,
    voterId,
    pickId: jugadores[index === 0 ? 1 : 0],
    at: cerrado,
  }));
}

function sumarAsistencia(rsvps: Rsvp[], eventId: string, starts: number, jugadores: string[], rachaId: string, presenteId: string) {
  jugadores.forEach((memberId, index) => {
    const forzado = memberId === rachaId || memberId === presenteId;
    const status = !forzado && index % 6 === 5 ? "no" : "voy";
    rsvps.push({ eventId, memberId, status, at: iso(starts - 60 * 60 * 1000) });
  });
}

function sumarPapeles(
  convocatorias: Convocatoria[],
  alertLog: AlertLog[],
  inbox: InboxItem[],
  eventId: string,
  starts: number,
  dt: string,
  ahora: number,
  jugadores: string[],
) {
  convocatorias.push({ eventId, sentAt: iso(starts - 2 * DIA), sentBy: dt });
  alertLog.push(
    { id: `${eventId}-a1`, eventId, kind: "first", at: iso(starts - 2 * DIA) },
    { id: `${eventId}-a2`, eventId, kind: "second", at: iso(starts - DIA) },
  );
  if (ahora - starts > 60 * DIA || starts > ahora) return;
  const avisos = 2 + (eventId.length % 2);
  for (let n = 0; n < avisos; n += 1) {
    inbox.push({
      id: `${eventId}-in${n}`,
      kind: n === 0 ? "convocatoria" : "recordatorio",
      title: "Aviso",
      body: "Confirmá si vas.",
      eventId,
      audience: "all",
      at: iso(starts - DIA),
      readBy: jugadores.slice(0, 4),
    });
  }
}
