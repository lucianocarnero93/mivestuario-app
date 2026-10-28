import type { ClubBundle, Member, Rsvp } from "./types.ts";

function sabadoQueViene(ahora: Date): string {
  const copia = new Date(ahora.getTime());
  const dia = copia.getDay();
  let sumar = (6 - dia + 7) % 7;
  if (sumar === 0) sumar = 7;
  copia.setDate(copia.getDate() + sumar);
  const y = copia.getFullYear();
  const m = String(copia.getMonth() + 1).padStart(2, "0");
  const d = String(copia.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T20:30:00-03:00`;
}

const PLANTEL: Member[] = [
  { id: "profe", name: "Martín Díaz", nick: "Profe", role: "dt", number: null, juega: false },
  { id: "sofi", name: "Sofía Rivas", nick: "Sofi", role: "ayudante", number: null, juega: false },
  { id: "fede", name: "Federico Paz", nick: "Fede", role: "jugador", number: 1, juega: true },
  { id: "tincho", name: "Martín Etcheverry", nick: "Tincho", role: "jugador", number: 3, juega: true },
  { id: "nacho", name: "Ignacio Ferreyra", nick: "Nacho", role: "jugador", number: 2, juega: true },
  { id: "juancito", name: "Juan Cruz Gómez", nick: "Juancito", role: "jugador", number: 8, juega: true },
  { id: "colo", name: "Nicolás Colombo", nick: "Colo", role: "jugador", number: 5, juega: true },
  { id: "rama", name: "Ramiro Castillo", nick: "Rama", role: "jugador", number: 4, juega: true },
  { id: "luqui", name: "Lucas Quiroga", nick: "Luqui", role: "jugador", number: 9, juega: true },
  { id: "bruno", name: "Bruno Sosa", nick: "Bruno", role: "jugador", number: 7, juega: true },
  { id: "polaco", name: "Pedro Gómez", nick: "Polaco", role: "jugador", number: 14, juega: true },
  { id: "mati", name: "Matías López", nick: "Mati", role: "jugador", number: 16, juega: true },
  { id: "lucas", name: "Lucas Benítez", nick: "Lucas", role: "jugador", number: 12, juega: true },
  { id: "pibe", name: "Benjamín", nick: "Pibe", role: "jugador", number: null, juega: true, menor: true, photo: null },
];

const TITULARES: Record<string, string> = {
  ARQ: "fede",
  LI: "tincho",
  LD: "nacho",
  MI: "juancito",
  MC: "colo",
  MD: "rama",
  DC: "luqui",
};

export function crearDemo(ahora = new Date()): ClubBundle {
  const empieza = sabadoQueViene(ahora);
  const publicado = new Date(ahora.getTime() - 86_400_000).toISOString();
  const rsvps: Rsvp[] = PLANTEL.filter((person) => person.juega).map((person) => ({
    eventId: "ev-racing",
    memberId: person.id,
    status: person.id === "lucas" ? "no" : "voy",
    at: publicado,
  }));
  return {
    club: {
      id: "club-pibes",
      name: "Los Pibes FC",
      createdBy: "profe",
      inviteCode: "PIBES",
      crest: null,
      colores: { primary: "#b8f25a", secondary: "#143322" },
      coloresAt: publicado,
    },
    members: PLANTEL,
    events: [
      {
        id: "ev-racing",
        kind: "partido",
        title: "vs Racing del Bajo",
        place: "Predio Sur, cancha 2",
        mapsQuery: "Predio Sur, Santa Fe, Argentina",
        lat: -31.6652,
        lng: -60.7098,
        startsAt: empieza,
        modality: "f7",
        formacion: "1-2-3-1",
        lineup: { ...TITULARES },
        suplentes: ["bruno", "polaco", "mati", "lucas"],
        convocados: ["fede", "tincho", "nacho", "juancito", "colo", "rama", "luqui", "bruno", "polaco", "mati", "lucas", "pibe"],
        tactics: "Salimos cortos si nos presionan con pocos. Si no, pelota al 9.",
        lineupPublishedAt: publicado,
        lineupUpdatedAt: publicado,
        tournamentId: null,
        tactica: {
          claves: ["Presionar arriba", "Juntos y cortos", "Hablar siempre"],
          frases: { juancito: "Pedila siempre" },
          pelota: {
            corners: "juancito",
            tiros: "luqui",
            penales: "luqui",
            contra: { primer: "rama", segundo: "tincho", arriba: "luqui" },
            favor: { atras: "colo" },
          },
          cambios: [{ sale: "juancito", entra: "mati", cuando: "2T 10'" }],
          modelos: [
            { id: "presion-perdida", cruces: [] },
            { id: "contraataque", cruces: [] },
            { id: "tercer-hombre", cruces: [] },
          ],
        },
        tacticaPartidoAt: publicado,
      },
    ],
    rsvps,
    messages: [],
    charla: [],
    matchSheets: [],
    figuraVotes: [],
    invites: [],
    convocatorias: [],
    inbox: [
      {
        id: "in-form-pibes",
        kind: "formacion",
        title: "Formación publicada",
        body: "El DT colgó la pizarra para vs Racing del Bajo.",
        eventId: "ev-racing",
        audience: "all",
        at: publicado,
        readBy: ["profe", "sofi"],
      },
    ],
    alertLog: [],
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: [],
    droppedIds: [],
    droppedEventIds: [],
    droppedCharlaIds: [],
    alumni: [],
    caja: { tesoreroId: "profe", gastos: [], cobros: [] },
    biblioteca: [],
  };
}
