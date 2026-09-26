// Nube del vestuario. loadClubDoc trae el equipo. saveClubDoc lo guarda.
// La llave es el código del equipo, no el mail de una sola persona.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { withTransaction } from "@/lib/db";
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
      const merged = await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
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
        const next = mergeForSave(existing, data.bundle);
        const payload = JSON.stringify(next);
        if (payload.length > MAX_BYTES) throw new Error("El equipo pesa demasiado para subirlo.");
        if (!rows[0]) {
          await query(
            `insert into vestuario_docs (collection, id, data, updated_at)
             values ($1, $2, $3::jsonb, now())`,
            [COLLECTION, data.code, payload],
          );
        } else {
          await query(
            `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
            [COLLECTION, data.code, payload],
          );
        }
        return next;
      });
      return { ok: true, bundle: merged };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      console.error("[club] no se pudo guardar", message);
      if (message.includes("pesa demasiado")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo guardar el equipo." };
    }
  });

export const claimMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      code: string;
      member: { id: string; name: string; nick: string; role?: string; number?: number | null };
    }) => ({
      code: sanitizeCode(input.code),
      id: String(input.member?.id ?? "").slice(0, 80),
      name: String(input.member?.name ?? "").slice(0, 80),
      nick: String(input.member?.nick ?? "").slice(0, 40),
      number: typeof input.member?.number === "number" ? input.member.number : null,
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; members?: Member[] }> => {
    if (!data.code || !data.name) return { ok: false, error: "Falta el jugador." };
    const accountId = String((context as { userId?: string }).userId ?? "");
    if (!accountId) return { ok: false, error: "No hay sesión." };
    try {
      const members = await withTransaction(async (query) => {
        const rows = await query<{ data: ClubBundle | string }>(
          "select data from vestuario_docs where collection = $1 and id = $2 for update",
          [COLLECTION, data.code],
        );
        if (!rows[0]) throw new Error("Ese equipo no está en la nube.");
        const raw = rows[0].data;
        let existing: ClubBundle | null = null;
        if (typeof raw === "string") {
          try {
            existing = asBundle(JSON.parse(raw));
          } catch {
            existing = null;
          }
        } else {
          existing = asBundle(raw);
        }
        if (!existing) throw new Error("Ese equipo no está en la nube.");
        const dropped = new Set(existing.droppedIds ?? []);
        const byAccount = existing.members.find(
          (person) => person.accountId === accountId || person.id === accountId,
        );
        const byId = existing.members.find((person) => person.id === data.id);
        const sessionName = data.name.trim().toLowerCase();
        const canTake = (person: Member | undefined) =>
          Boolean(person && (!person.accountId || person.accountId === accountId));
        let current = byAccount;
        if (
          byAccount &&
          byId &&
          byId.id !== byAccount.id &&
          canTake(byId) &&
          sessionName.length >= 2 &&
          byAccount.name.trim().toLowerCase() !== sessionName &&
          byId.name.trim().toLowerCase() === sessionName
        ) {
          current = byId;
        }
        if (!current && canTake(byId)) current = byId;
        if ((current && (dropped.has(current.id) || dropped.has(accountId))) || dropped.has(data.id)) {
          return existing.members;
        }
        const next = current
          ? {
              ...current,
              name:
                current.name.trim().toLowerCase() === sessionName || !current.accountId
                  ? data.name || current.name
                  : current.name,
              nick: data.nick || current.nick,
              accountId,
              number: current.number ?? data.number,
            }
          : {
              id: accountId,
              name: data.name,
              nick: data.nick || data.name.split(" ")[0] || "Jugador",
              role: "jugador" as const,
              number: data.number,
              accountId,
              juega: true,
            };
        const stripped = existing.members.map((person) =>
          person.accountId === accountId && person.id !== next.id ? { ...person, accountId: null } : person,
        );
        const without = stripped.filter(
          (person) => person.id !== next.id && person.id !== accountId,
        );
        const list = [...without, next];
        await query(
          `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
          [COLLECTION, data.code, JSON.stringify({ ...existing, members: list })],
        );
        return list;
      });
      return { ok: true, members };
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      console.error("[club] no se pudo anotar", message);
      if (message.includes("no está")) return { ok: false, error: message };
      return { ok: false, error: "No se pudo anotar en el plantel." };
    }
  });

