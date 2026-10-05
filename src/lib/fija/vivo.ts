import { overAttempt } from "./club-rules.ts";

export type EstadoMarcador = "espera" | "juego" | "final";

export type PuestoPublico = {
  puesto: string;
  nick: string;
  x: number;
  y: number;
};

type PersonaPublica = { id: string; nick: string; name: string; number: number | null; menor?: boolean };

export const VIVO_READ_LIMIT = 180;

export function estadoMarcador(
  event: { startsAt: string; resultClosedAt?: string | null },
  now = Date.now(),
): EstadoMarcador {
  if (event.resultClosedAt) return "final";
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start) || start > now) return "espera";
  return "juego";
}

export function vivoPointerAllows(existingCode: string | null, requestedCode: string): boolean {
  if (!existingCode) return true;
  return existingCode === requestedCode;
}

export function sanitizeLiveToken(value: unknown): string {
  const token = String(value ?? "");
  return /^[a-f0-9]{32}$/.test(token) ? token : "";
}

export function vivoAttemptKey(bucket: string | null | undefined): string {
  const raw = String(bucket ?? "").trim();
  const ip = raw.startsWith("peek:") ? raw.slice(5) : raw;
  const safe = ip.replace(/[^a-zA-Z0-9.:_-]/g, "").slice(0, 64);
  return `vivo:${safe || "comun"}`;
}

export function vivoReadLimited(count: number): boolean {
  return overAttempt(count, VIVO_READ_LIMIT);
}

function apodo(person: PersonaPublica, grupo: PersonaPublica[], puesto = ""): string {
  const nick = (person.nick || "Jugador").slice(0, 22);
  const mismo = grupo.filter((item) => (item.nick || "") === (person.nick || ""));
  if (person.number != null) return `${person.number} ${nick}`;
  if (mismo.length > 1 && puesto) return `${nick} · ${puesto}`.slice(0, 28);
  return nick;
}

export function armarFormacionPublica(
  slots: { key: string; label: string; x: number; y: number }[],
  lineup: Record<string, string> | undefined,
  suplentes: string[] | undefined,
  people: PersonaPublica[],
  published: boolean,
): { titulares: PuestoPublico[]; banco: string[] } {
  if (!published) return { titulares: [], banco: [] };
  const publishedPeople = people.filter((person) => person.menor !== true);
  const byId = new Map(publishedPeople.map((person) => [person.id, person]));
  const titulares: PuestoPublico[] = [];
  for (const slot of slots) {
    const person = byId.get(lineup?.[slot.key] ?? "");
    if (!person) continue;
    titulares.push({
      puesto: slot.label.slice(0, 8),
      nick: apodo(person, publishedPeople, slot.label.slice(0, 8)),
      x: slot.x,
      y: slot.y,
    });
  }
  const enCancha = new Set(Object.values(lineup ?? {}));
  const banco = (suplentes ?? [])
    .filter((id) => !enCancha.has(id))
    .map((id) => byId.get(id))
    .filter((person): person is PersonaPublica => Boolean(person))
    .map((person) => apodo(person, publishedPeople));
  return { titulares, banco };
}
