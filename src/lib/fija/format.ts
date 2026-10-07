const TZ = "America/Argentina/Buenos_Aires";

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(d);
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function fromDatetimeLocal(value: string): string {
  if (!value) return new Date().toISOString();
  const v = value.length === 16 ? `${value}:00` : value;
  return `${v}-03:00`;
}

export function defaultKickoff(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(tomorrow);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T21:00`;
}

export function personLabel(
  person: { id: string; nick: string; name: string; number: number | null },
  people: { id: string; nick: string; name: string; number: number | null }[],
): string {
  const nick = person.nick || person.name || "Jugador";
  const number = person.number != null ? `${person.number} ` : "";
  const sameNick = people.filter((item) => (item.nick || item.name) === (person.nick || person.name));
  if (sameNick.length <= 1) return `${number}${nick}`;
  const sameName = sameNick.filter((item) => item.name === person.name);
  if (sameName.length <= 1 && person.name && person.name !== nick) return `${number}${nick} (${person.name})`;
  if (person.number != null) return `${person.number} ${nick}`;
  const index = sameName.findIndex((item) => item.id === person.id);
  return `${nick} · ${index + 1}`;
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const KIND_LABEL = {
  partido: "Partido",
  entrenamiento: "Entrenamiento",
  reunion: "Reunión",
} as const;

export const ROLE_LABEL = {
  dt: "DT",
  ayudante: "Ayudante de Campo",
  jugador: "Jugador",
} as const;

export const ROLE_TAB = {
  dt: "DT",
  ayudante: "Ayudante",
  jugador: "Jugador",
} as const;

export const RSVP_LABEL = {
  voy: "Va",
  no: "No",
  pendiente: "Pendiente",
} as const;
