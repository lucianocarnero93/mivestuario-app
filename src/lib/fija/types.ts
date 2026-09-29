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

export type Role = "dt" | "ayudante" | "jugador";
export type Modality = "f5" | "f8" | "f9" | "f11";
export type EventKind = "partido" | "entrenamiento" | "reunion";
export type RsvpStatus = "pendiente" | "voy" | "no";
export type InboxKind = "convocatoria" | "recordatorio" | "formacion" | "charla" | "equipamiento";
export type InboxAudience = "all" | "pending" | "staff" | "miembro";
export type AlertKind = "first" | "second" | "equipment";
export type TournamentStatus = "active" | "finished";
export type GpsConsent = "unset" | "granted" | "denied";
export type ItemEquipamiento = "remeras" | "pelotas";

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
};

export type Club = {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  crest: string | null;
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
  notes: string;
  recordedAt: string;
  players: PlayerMatchStat[];
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
  lineupPublishedAt: string | null;
  tournamentId: string | null;
  /** Quién lleva qué, solo para partidos. */
  equipamiento?: Partial<Record<ItemEquipamiento, string>>;
  /** ID de la formación elegida (ej: "4-4-2", "clasica"). */
  formacion?: string;
  /** Cuándo se armó la formación. Gana la copia más nueva, aunque tenga menos jugadores. */
  lineupUpdatedAt?: string;
  /** Cuándo el DT confirmó que la planilla está completa. */
  resultClosedAt?: string | null;
  /** La planilla se guardó, pero el DT dijo que todavía falta. */
  resultPending?: boolean;
  /** Para que al mezclar gane la respuesta más nueva. */
  resultUpdatedAt?: string;
};


export type Rsvp = {
  eventId: string;
  memberId: string;
  status: RsvpStatus;
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
  invites: Invite[];
  convocatorias: Convocatoria[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  reminderPolicy: ReminderPolicy;
  tournaments: Tournament[];
  /** Jugadores que el DT sacó. No vuelven a aparecer al mezclar. */
  droppedIds?: string[];
  /** Partidos que el DT sacó de la agenda. No vuelven al mezclar. */
  droppedEventIds?: string[];
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
  messages: ChatMessage[];
  charla: CharlaPost[];
  matchSheets: MatchSheet[];
  invites: Invite[];
  convocatorias: Convocatoria[];
  inbox: InboxItem[];
  alertLog: AlertLog[];
  reminderPolicy: ReminderPolicy;
  tournaments: Tournament[];
  droppedIds?: string[];
  droppedEventIds?: string[];
  archivedClubs: ClubBundle[];
  profile: Profile;
  gpsConsent: GpsConsent;
  activeId: string;
  reminder: Reminder;
  hydrated: boolean;
};
