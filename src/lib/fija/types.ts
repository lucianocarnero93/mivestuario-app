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
export type InboxKind = "convocatoria" | "recordatorio" | "formacion" | "charla";
export type InboxAudience = "all" | "pending" | "staff";
export type AlertKind = "first" | "second";
export type TournamentStatus = "active" | "finished";
export type GpsConsent = "unset" | "granted" | "denied";

export type Member = {
  id: string;
  name: string;
  nick: string;
  role: Role;
  number: number | null;
  photo?: string | null;
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
  archivedClubs: ClubBundle[];
  profile: Profile;
  gpsConsent: GpsConsent;
  activeId: string;
  reminder: Reminder;
  hydrated: boolean;
};
