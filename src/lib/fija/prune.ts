import type { AlertLog, ClubBundle, InboxItem } from "./types.ts";

export const MAX_MESSAGES = 300;
export const MAX_CHARLA = 100;
export const INBOX_MAX_AGE_DAYS = 60;
export const MAX_INBOX = 200;

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
  return {
    ...bundle,
    messages: newest(bundle.messages ?? [], MAX_MESSAGES),
    charla: newest(bundle.charla ?? [], MAX_CHARLA),
    inbox,
    alertLog,
    convocatorias: (bundle.convocatorias ?? []).filter((item) => eventIds.has(item.eventId)),
  };
}
