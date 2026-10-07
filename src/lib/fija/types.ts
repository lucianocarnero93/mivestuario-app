/*
  Diccionario de la app. Estos nombres son los que usa el resto del código.
  No los cambié para que todo siga funcionando igual.

  Role          = el puesto: dt, ayudante o jugador
  Member        = una persona del plantel (nombre, apodo, puesto, número)
  Club          = el equipo. inviteCode es el código para entrar
  Tournament    = un torneo. Puede estar activo o terminado
  ClubEvent     = un partido, un entrenamiento o una reunión
  Rsvp          = la respuesta de un jugador: pendiente, voy o no
  MatchSheet    = la planilla de un partido (goles y tarjetas)
  PlayerMatchStat = goles, asistencias, amarillas y rojas de un jugador
  lineup        = la formación: cada puesto de la cancha apunta a un jugador
*/

import type { Jugada } from "./jugada";

export type Role = "dt" | "ayudante" | "jugador";
export type Modality = "f5" | "f7" | "f8" | "f9" | "f11";
export type EventKind = "partido" | "entrenamiento" | "reunion";
export type RsvpStatus = "pendiente" | "voy" | "no";
export type InboxKind = "convocatoria" | "recordatorio" | "formacion" | "charla" | "equipamiento" | "caja";
export type InboxAudience = "all" | "pending" | "staff" | "miembro";
export type AlertKind = "first" | "second" | "equipment";
export type TournamentStatus = "active" | "finished";
export type GpsConsent = "unset" | "granted" | "denied";
export type ItemEquipamiento = "remeras" | "pelotas";

export type PlanId = "a" | "b" | "c";
export type Trazo = "flecha" | "pase" | "zona" | "circulo";

export type Dibujo = {
  id: string;
  trazo: Trazo;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PlanPizarra = {
  id: PlanId;
  idea: string;
  cambio: string;
  lineup: Record<string, string>;
  dibujos: Dibujo[];
  /** Esquema de este plan. Si falta, usa el del partido. */
  formacion?: string;
};

export type FichaPaso = { memberId: string; x: number; y: number };

export type CuadroPaso = {
  texto: string;
  fichas: FichaPaso[];
  pelota: { x: number; y: number };
};

export type TipoPelota = "jugada" | "corned" | "tiro" | "lateral" | "salida";

export type JugadaPaso = {
  id: string;
  nombre: string;
  tipo: TipoPelota;
  cuadros: CuadroPaso[];
};

export type JugadaGuardada = {
  id: string;
  nombre: string;
  tipo: string;
  cuadros: CuadroPaso[];
  /** Si es false, no aparece para armar la del partido. */
  visible?: boolean;
};

export type Member = {
  id: string;
  name: string;
  nick: string;
  role: Role;
  number: number | null;
  photo?: string | null;
  /** True si aparece en la cancha, la planilla y las convocatorias. */
  juega?: boolean;
  /** Cuenta con la que entró. El mismo mail no puede ser dos jugadores. */
  accountId?: string | null;
  /** True si al crear la cuenta dijo que es menor de 18. No guardamos la fecha. */
  menor?: boolean;
  /** Cuándo se cambió el apodo, el nombre o el número. Gana la copia más nueva. */
  profileAt?: string;
};

export type Club = {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  crest: string | null;
  /** Camiseta. Si falta, la card de la formación usa los colores de Mi Vestuario. */
  colores?: { primary: string; secondary: string } | null;
  /** Cuándo se cambiaron los colores. Una copia vieja no los pisa. */
  coloresAt?: string;
  /** Link público del equipo. No vence con el partido. */
  teamLiveToken?: string | null;
  /** Cuándo se prendió o se apagó ese link. Una copia vieja no lo revive. */
  teamLiveAt?: string | null;
  /** Cuándo se designó DT o ayudante. Una copia vieja no deshace el puesto. */
  rolesAt?: string;
  /** Preparado para sponsors. Apagado hasta que SPONSORS_ACTIVO sea true. */
  sponsors?: { id: string; nombre: string; logoUrl: string; link?: string; activo: boolean }[];
};

export type Tournament = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  status: TournamentStatus;
  /** Cuándo se cambió el nombre o el estado. Gana la copia más nueva. */
  updatedAt?: string;
};

export type Invite = {
  id: string;
  memberId: string;
  code: string;
  createdAt: string;
};

export type PlayerMatchStat = {
  memberId: string;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
};

export type MatchSheet = {
  eventId: string;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  /** Goles a favor sin jugador: en contra o sin autor. */
  sinAutor?: number;
  notes: string;
  recordedAt: string;
  players: PlayerMatchStat[];
};

export type FiguraVote = {
  eventId: string;
  voterId: string;
  pickId: string;
  at: string;
};

export type EquipmentItem = "remeras" | "pelotas";

export type ClubEvent = {
  id: string;
  kind: EventKind;
  title: string;
  place: string;
  mapsQuery: string;
  lat: number | null;
  lng: number | null;
  startsAt: string;
  modality: Modality;
  lineup: Record<string, string>;
  tactics: string;
  /** Cómo juega el rival, en la historia del partido. */
  rival?: string;
  /** Una frase por jugador. La ve todo el equipo. */
  notas?: Record<string, string>;
  /** La jugada dibujada sobre la formación. */
  jugada?: Jugada;
  lineupPublishedAt: string | null;
  tournamentId: string | null;
  /** Quién lleva qué, solo para partidos. */
  equipamiento?: Partial<Record<ItemEquipamiento, string>>;
  /** ID de la formación elegida (ej: "4-4-2", "clasica"). */
  formacion?: string;
  /** Convocados a este partido. Si falta, vale la formación que ya estaba armada. */
  convocados?: string[];
  /** Banco. Tienen que estar convocados y no pueden ser titulares. */
  suplentes?: string[];
  /** Cuándo se cambió el título, la hora o la cancha. Gana la copia más nueva. */
  detailsUpdatedAt?: string;
  /** Cuándo se armó la formación. Gana la copia más nueva, aunque tenga menos jugadores. */
  lineupUpdatedAt?: string;
  /** Cuándo se cambió la jugada, la pelota parada, el video o las indicaciones. */
  pizarraUpdatedAt?: string;
  /** Cuándo el DT confirmó que la planilla está completa. */
  resultClosedAt?: string | null;
  /** La planilla se guardó, pero el DT dijo que todavía falta. */
  resultPending?: boolean;
  /** Para que al mezclar gane la respuesta más nueva. */
  resultUpdatedAt?: string;
  /** Link público del marcador. No muestra el plantel. */
  liveToken?: string | null;
  /** Cuándo se abrió o se cerró ese link. Gana el más nuevo. */
  liveUpdatedAt?: string;
  /** Goles y tarjetas cargados en la fecha, para poder deshacer el último. */
  liveLog?: MarcaVivo[];
  /** La card no se muestra al plantel. */
  fechaOculta?: boolean;
  reacciones?: ReaccionFecha[];
  encuesta?: Encuesta;
  /** Gana la copia más nueva de la card. */
  fechaUpdatedAt?: string;
  /** Planes B y C. El A es la formación publicada. */
  planes?: PlanPizarra[];
  /** El plan que está mirando el plantel. */
  planActivo?: "a" | "b" | "c";
  /** Jugada en cuadros. null significa que el DT la borró. */
  pasos?: JugadaPaso | null;
  /** Pelota parada de este partido. null significa que el DT la borró. */
  pelotaParada?: JugadaPaso | null;
  /** Si es false, el jugador no ve la jugada aunque esté guardada. */
  jugadaVisible?: boolean;
  /** Si es false, el jugador no ve la pelota parada. */
  pelotaVisible?: boolean;
  /** Link de un video. No se sube el archivo. */
  videoUrl?: string;
  /** Quién abrió la pizarra. */
  vistos?: { memberId: string; at: string }[];
  /** Jugadores que tienen un audio propio. */
  audioDe?: string[];
};


export type Rsvp = {
  eventId: string;
  memberId: string;
  status: RsvpStatus;
  /** Cuándo se contestó. Gana la más nueva, en cualquier celular. */
  at?: string;
};

export type ChatMessage = {
  id: string;
  memberId: string;
  text: string;
  at: string;
};

export type CharlaPost = {
  id: string;
  memberId: string;
  text: string;
  at: string;
};

export type Reminder = {
  eventId: string;
  sentAt: string;
} | null;

export type ReminderPolicy = {
  firstHours: number;
  secondHours: number;
};

export type Convocatoria = {
  eventId: string;
  sentAt: string;
  sentBy: string;
};

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  eventId?: string;
  /** Si el aviso es para una sola persona (equipamiento). */
  memberId?: string;
  audience: InboxAudience;
  at: string;
  readBy: string[];
};

export type AlertLog = {
  id: string;
  eventId: string;
  kind: AlertKind;
  at: string;
};

export type ClubBundle = {
  club: Club;
  members: Member[];
  events: ClubEvent[];
  rsvps: Rsvp[];
  messages: ChatMessage[];
  charla: CharlaPost[];
  matchSheets: MatchSheet[];
  figuraVotes?: FiguraVote[];
  /** Asistencia vieja, sin las filas sueltas. La escribe el server. */
  asistencias?: { eventId: string; voy: string[]; no?: string[] }[];
  /** Si está, el celular también compacta. Lo pone el server. */
  compactacion?: { version: 1 };
  invites: Invite[];
  convocatorias: Convocatoria[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  reminderPolicy: ReminderPolicy;
  /** Cuándo se cambiaron los recordatorios. Una copia vieja no los pisa. */
  reminderAt?: string;
  tournaments: Tournament[];
  /** Jugadores que el DT sacó. No vuelven a aparecer al mezclar. */
  droppedIds?: string[];
  /** Partidos que el DT sacó de la agenda. No vuelven al mezclar. */
  droppedEventIds?: string[];
  /** Charlas que el cuerpo técnico borró. No vuelven al mezclar. */
  droppedCharlaIds?: string[];
  /** Nombres que ya no están en el plantel, para que el ranking no los pierda. */
  alumni?: Alumni[];
  /** Cuentas que el DT sacó. No las manda el celular: las escribe el servidor. */
  bannedAccounts?: { accountId: string; name: string; at: string }[];
  caja?: Caja;
  /** Jugadas que el DT guarda para otro partido. */
  biblioteca?: JugadaGuardada[];
  /** Cuándo se cambió Mis jugadas. Una copia vieja no pisa una nueva. */
  bibliotecaAt?: string;
};

export type Alumni = {
  id: string;
  name: string;
  nick: string;
};

export type MarcaVivo = {
  id: string;
  kind: "gol" | "gol-rival" | "tarjeta" | "inicio" | "entretiempo" | "segundo";
  memberId?: string;
  card?: "amarilla" | "roja";
  at: string;
};

export type ReaccionFecha = {
  memberId: string;
  emoji: "fuego" | "aplauso" | "risa";
  at: string;
};

export type Encuesta = {
  pregunta: string;
  opciones: string[];
  votos: { memberId: string; opcion: number; at: string }[];
  at: string;
};

export type CategoriaGasto = "cancha" | "arbitro" | "indumentaria" | "social" | "otro";

export type Cupon = {
  id: string;
  nombre?: string;
  monto: number;
  exento?: boolean;
};

export type Gasto = {
  id: string;
  titulo: string;
  monto: number;
  categoria: CategoriaGasto;
  fecha: string;
  pagadoPor: string;
  personas: string[];
  cupones?: Cupon[];
  cerrado?: boolean;
  anulado?: boolean;
  at: string;
};

export type Cobro = {
  id: string;
  gastoId: string;
  memberId: string;
  monto: number;
  medio: "manual" | "mp";
  estado: "marcado" | "confirmado";
  paymentId?: string;
  at: string;
};

export type Caja = {
  tesoreroId: string;
  alias?: string;
  gastos: Gasto[];
  cobros: Cobro[];
};

export type Profile = {
  name: string;
  nick: string;
};

export type AppState = {
  club: Club | null;
  members: Member[];
  events: ClubEvent[];
  rsvps: Rsvp[];
  asistencias?: { eventId: string; voy: string[]; no?: string[] }[];
  compactacion?: { version: 1 };
  messages: ChatMessage[];
  charla: CharlaPost[];
  matchSheets: MatchSheet[];
  figuraVotes?: FiguraVote[];
  invites: Invite[];
  convocatorias: Convocatoria[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  reminderPolicy: ReminderPolicy;
  reminderAt?: string;
  tournaments: Tournament[];
  droppedIds?: string[];
  droppedEventIds?: string[];
  droppedCharlaIds?: string[];
  alumni?: Alumni[];
  caja?: Caja;
  biblioteca?: JugadaGuardada[];
  /** Cuándo se cambió Mis jugadas. Una copia vieja no pisa una nueva. */
  bibliotecaAt?: string;
  archivedClubs: ClubBundle[];
  profile: Profile;
  gpsConsent: GpsConsent;
  activeId: string;
  reminder: Reminder;
  hydrated: boolean;
};
