import type { AlertLog, ClubBundle, InboxItem } from "./types.ts";

export const MAX_MESSAGES = 300;
export const MAX_CHARLA = 100;
export const INBOX_MAX_AGE_DAYS = 60;
export const MAX_INBOX = 200;
export const PIZARRA_DIAS = 21;

function byTime(a: { at: string }, b: { at: string }): number {
  return Date.parse(a.at) - Date.parse(b.at);
}

function newest<T extends { at: string }>(list: T[], limit: number): T[] {
  return [...list].sort(byTime).slice(-limit);
}

function dedupeInbox(list: InboxItem[]): InboxItem[] {
  const map = new Map<string, InboxItem>();
  const rest: InboxItem[] = [];
  for (const item of [...list].sort(byTime)) {
    if (item.kind !== "recordatorio" && item.kind !== "equipamiento") {
      rest.push(item);
      continue;
    }
    const key = `${item.kind}|${item.eventId ?? ""}|${item.title}|${item.body}|${item.audience}`;
    const previous = map.get(key);
    if (!previous) {
      map.set(key, item);
      continue;
    }
    map.set(key, {
      ...previous,
      readBy: [...new Set([...previous.readBy, ...item.readBy])],
    });
  }
  return [...rest, ...map.values()];
}

export function aligerarPizarraVieja(bundle: ClubBundle, now = Date.now()): ClubBundle {
  const corte = now - PIZARRA_DIAS * 24 * 60 * 60 * 1000;
  let changed = false;
  const events = (bundle.events ?? []).map((event) => {
    const start = Date.parse(event.startsAt);
    if (!Number.isFinite(start) || start >= corte) return event;
    if (!event.planes && !event.pasos && !event.pelotaParada && !event.videoUrl) return event;
    changed = true;
    return {
      ...event,
      planes: undefined,
      pasos: null,
      pelotaParada: null,
      videoUrl: undefined,
      vistos: undefined,
    };
  });
  return changed ? { ...bundle, events } : bundle;
}

/** El archivo del equipo no lleva fotos. El escudo y los retratos viven aparte. */
export function clubSinImagenes(bundle: ClubBundle): ClubBundle {
  return {
    ...bundle,
    club: { ...bundle.club, crest: null },
    members: (bundle.members ?? []).map((person) => (person.photo ? { ...person, photo: null } : person)),
  };
}

export function pruneBundle(bundle: ClubBundle, now = Date.now()): ClubBundle {
  const eventIds = new Set(bundle.events.map((event) => event.id));
  const age = INBOX_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const inbox = newest(
    dedupeInbox(bundle.inbox ?? []).filter((item) => now - Date.parse(item.at) <= age),
    MAX_INBOX,
  );
  const seenAlert = new Set<string>();
  const seenKind = new Set<string>();
  const alertLog: AlertLog[] = [];
  for (const item of bundle.alertLog ?? []) {
    if (!eventIds.has(item.eventId) || seenAlert.has(item.id)) continue;
    const kindKey = `${item.eventId}|${item.kind}`;
    if (seenKind.has(kindKey) && !item.id.startsWith("al-")) continue;
    seenAlert.add(item.id);
    seenKind.add(kindKey);
    alertLog.push(item);
  }
  return aligerarPizarraVieja(
    {
      ...bundle,
      messages: newest(bundle.messages ?? [], MAX_MESSAGES),
      charla: newest(bundle.charla ?? [], MAX_CHARLA),
      inbox,
      alertLog,
      convocatorias: (bundle.convocatorias ?? []).filter((item) => eventIds.has(item.eventId)),
    },
    now,
  );
}
