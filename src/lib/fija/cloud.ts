// Nube del vestuario. loadClubDoc trae el equipo. saveClubDoc lo guarda.
// La llave es el código del equipo, no el mail de una sola persona.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { sanitizeCode } from "./sanitize";
import type { ClubBundle, ClubEvent, Member, Rsvp } from "./types";

const COLLECTION = "clubs";
const MAX_BYTES = 350_000;

function asBundle(value: unknown): ClubBundle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ClubBundle;
  if (!row.club || typeof row.club.inviteCode !== "string") return null;
  if (!Array.isArray(row.members) || !Array.isArray(row.events)) return null;
  return row;
}

export const loadClubDoc = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code }): Promise<ClubBundle | null> => {
    if (!code) return null;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ data: ClubBundle | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [COLLECTION, code],
    );
    const raw = rows[0]?.data;
    if (raw == null) return null;
    if (typeof raw === "string") {
      try {
        return asBundle(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    return asBundle(raw);
  });

function unionById<T extends { id: string }>(kept: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of kept) map.set(item.id, item);
  for (const item of incoming) {
    const previous = map.get(item.id);
    map.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return [...map.values()];
}

function mergeEvents(kept: ClubEvent[], incoming: ClubEvent[]): ClubEvent[] {
  const map = new Map<string, ClubEvent>();
  for (const event of kept) map.set(event.id, event);
  for (const event of incoming) {
    const previous = map.get(event.id);
    if (!previous) {
      map.set(event.id, event);
      continue;
    }
    const previousSpots = Object.keys(previous.lineup ?? {}).length;
    const incomingSpots = Object.keys(event.lineup ?? {}).length;
    map.set(event.id, incomingSpots >= previousSpots ? { ...previous, ...event } : { ...event, ...previous, lineup: previous.lineup });
  }
  return [...map.values()];
}

function mergeRsvps(kept: Rsvp[], incoming: Rsvp[]): Rsvp[] {
  const map = new Map<string, Rsvp>();
  for (const row of kept) map.set(`${row.eventId}:${row.memberId}`, row);
  for (const row of incoming) map.set(`${row.eventId}:${row.memberId}`, row);
  return [...map.values()];
}

function mergeForSave(existing: ClubBundle | null, incoming: ClubBundle): ClubBundle {
  if (!existing) return incoming;
  const dropped = new Set([...(existing.droppedIds ?? []), ...(incoming.droppedIds ?? [])]);
  const members = unionById(existing.members, incoming.members).filter((person) => !dropped.has(person.id));
  const seenAccount = new Set<string>();
  const unique: Member[] = [];
  for (const person of members) {
    if (person.accountId) {
      if (seenAccount.has(person.accountId)) continue;
      seenAccount.add(person.accountId);
    }
    unique.push(person);
  }
  return {
    club: { ...existing.club, ...incoming.club, inviteCode: existing.club.inviteCode },
    members: unique,
    events: mergeEvents(existing.events, incoming.events),
    rsvps: mergeRsvps(existing.rsvps, incoming.rsvps).filter((row) => unique.some((person) => person.id === row.memberId)),
    messages: unionById(existing.messages, incoming.messages),
    charla: unionById(existing.charla, incoming.charla),
    matchSheets: unionById(
      existing.matchSheets.map((sheet) => ({ ...sheet, id: sheet.eventId })),
      incoming.matchSheets.map((sheet) => ({ ...sheet, id: sheet.eventId })),
    ).map(({ id: _id, ...sheet }) => sheet),
    invites: unionById(existing.invites, incoming.invites),
    convocatorias: unionById(
      (existing.convocatorias ?? []).map((item) => ({ ...item, id: item.eventId })),
      (incoming.convocatorias ?? []).map((item) => ({ ...item, id: item.eventId })),
    ).map(({ id: _id, ...item }) => item),
    inbox: unionById(existing.inbox, incoming.inbox),
    alertLog: unionById(existing.alertLog, incoming.alertLog),
    reminderPolicy: incoming.reminderPolicy ?? existing.reminderPolicy,
    tournaments: unionById(existing.tournaments, incoming.tournaments),
    droppedIds: [...dropped],
  };
}

export const saveClubDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; bundle: ClubBundle }) => ({
    code: sanitizeCode(input.code),
    bundle: input.bundle,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; bundle?: ClubBundle }> => {
    if (!data.code || !data.bundle?.club) return { ok: false, error: "El equipo está incompleto." };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      let merged: ClubBundle | null = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const rows = await sql.query<{ data: ClubBundle | string; updated_at: string | Date }>(
          "select data, updated_at from vestuario_docs where collection = $1 and id = $2",
          [COLLECTION, data.code],
        );
        const raw = rows[0]?.data;
        let existing: ClubBundle | null = null;
        if (typeof raw === "string") {
          try {
            existing = asBundle(JSON.parse(raw));
          } catch {
            existing = null;
          }
        } else if (raw) {
          existing = asBundle(raw);
        }
        merged = mergeForSave(existing, data.bundle);
        const payload = JSON.stringify(merged);
        if (payload.length > MAX_BYTES) return { ok: false, error: "El equipo pesa demasiado para subirlo." };
        if (!rows[0]) {
          const inserted = await sql.query<{ id: string }>(
            `insert into vestuario_docs (collection, id, data, updated_at)
             values ($1, $2, $3::jsonb, now())
             on conflict (collection, id) do nothing
             returning id`,
            [COLLECTION, data.code, payload],
          );
          if (inserted[0]) break;
          continue;
        }
        const stamp = rows[0].updated_at instanceof Date ? rows[0].updated_at.toISOString() : String(rows[0].updated_at);
        const updated = await sql.query<{ id: string }>(
          `update vestuario_docs
           set data = $3::jsonb, updated_at = now()
           where collection = $1 and id = $2 and updated_at = $4::timestamptz
           returning id`,
          [COLLECTION, data.code, payload, stamp],
        );
        if (updated[0]) break;
      }
      return { ok: true, bundle: merged ?? data.bundle };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      console.error("[club] no se pudo guardar", message);
      return { ok: false, error: "No se pudo guardar el equipo." };
    }
  });
