export type EstadoMarcador = "espera" | "juego" | "final";

export type PuestoPublico = {
  puesto: string;
  nick: string;
  x: number;
  y: number;
  etiqueta?: string;
};

type PersonaPublica = { id: string; nick: string; name: string; number: number | null };

export function estadoMarcador(
  event: { startsAt: string; resultClosedAt?: string | null },
  now = Date.now(),
): EstadoMarcador {
  if (event.resultClosedAt) return "final";
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start) || start > now) return "espera";
  return "juego";
}

export function sanitizeLiveToken(value: unknown): string {
  const token = String(value ?? "");
  return /^[a-f0-9]{32}$/.test(token) ? token : "";
}

function apodo(person: PersonaPublica, grupo: PersonaPublica[]): string {
  const nick = (person.nick || person.name || "Jugador").slice(0, 22);
  const mismo = grupo.filter((item) => (item.nick || item.name) === (person.nick || person.name));
  if (person.number != null && mismo.length > 1) return `${person.number} ${nick}`;
  if (mismo.length > 1 && person.name && person.name !== nick) return `${nick} (${person.name.slice(0, 16)})`;
  return person.number != null ? `${person.number} ${nick}` : nick;
}

export function armarFormacionPublica(
  slots: { key: string; label: string; x: number; y: number }[],
  lineup: Record<string, string> | undefined,
  suplentes: string[] | undefined,
  people: PersonaPublica[],
  published: boolean,
  marcas?: Record<string, { etiqueta?: string }>,
): { titulares: PuestoPublico[]; banco: string[] } {
  if (!published) return { titulares: [], banco: [] };
  const byId = new Map(people.map((person) => [person.id, person]));
  const titulares: PuestoPublico[] = [];
  for (const slot of slots) {
    const person = byId.get(lineup?.[slot.key] ?? "");
    if (!person) continue;
    const etiqueta = marcas?.[person.id]?.etiqueta?.slice(0, 24) ?? "";
    const row: PuestoPublico = { puesto: slot.label.slice(0, 8), nick: apodo(person, people), x: slot.x, y: slot.y };
    if (etiqueta) row.etiqueta = etiqueta;
    titulares.push(row);
  }
  const enCancha = new Set(Object.values(lineup ?? {}));
  const banco = (suplentes ?? [])
    .filter((id) => !enCancha.has(id))
    .map((id) => byId.get(id))
    .filter((person): person is PersonaPublica => Boolean(person))
    .map((person) => apodo(person, people));
  return { titulares, banco };
}