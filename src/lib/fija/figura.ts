import { resultIsOpen } from "./club-rules.ts";
import type { ClubEvent, FiguraVote, MatchSheet, Member } from "./types.ts";

const TZ = "America/Argentina/Buenos_Aires";
export const FIGURA_CIERRE_HORAS = 48;
const CIERRE_FIGURA_MS = FIGURA_CIERRE_HORAS * 3_600_000;

export function mesDe(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(date);
}

export function votacionAbierta(event: ClubEvent, now: number): boolean {
  if (!event.resultClosedAt) return true;
  const base = Date.parse(event.resultClosedAt);
  return Number.isFinite(base) && now < base + CIERRE_FIGURA_MS;
}

export function votosAceptables(
  existing: FiguraVote[] | undefined,
  incoming: FiguraVote[] | undefined,
  events: ClubEvent[],
  now: number,
): FiguraVote[] {
  const previos = existing ?? [];
  return (incoming ?? []).filter((vote) => {
    const yaEstaba = previos.some(
      (row) =>
        row.eventId === vote.eventId &&
        row.voterId === vote.voterId &&
        row.pickId === vote.pickId &&
        row.at === vote.at,
    );
    if (yaEstaba) return true;
    const event = events.find((item) => item.id === vote.eventId);
    if (!event) return false;
    return votacionAbierta(event, now);
  });
}

export function liderDelMes(
  sheets: MatchSheet[],
  events: ClubEvent[],
  mes: string,
  key: "goals" | "assists",
): { ids: string[]; total: number } | null {
  const tally = new Map<string, number>();
  for (const sheet of sheets) {
    const event = events.find((item) => item.id === sheet.eventId);
    const when = event?.startsAt ?? sheet.recordedAt;
    if (mesDe(when) !== mes) continue;
    for (const row of sheet.players) {
      const value = row[key];
      if (value <= 0) continue;
      tally.set(row.memberId, (tally.get(row.memberId) ?? 0) + value);
    }
  }
  let top = 0;
  for (const count of tally.values()) top = Math.max(top, count);
  if (top <= 0) return null;
  return {
    ids: [...tally.entries()].filter(([, count]) => count === top).map(([id]) => id),
    total: top,
  };
}

export function goleadorDelMes(
  sheets: MatchSheet[],
  events: ClubEvent[],
  now = new Date(),
): { ids: string[]; goles: number } | null {
  const result = liderDelMes(sheets, events, mesDe(now.toISOString()), "goals");
  if (!result) return null;
  return { ids: result.ids, goles: result.total };
}

export function figuraPermitida(vote: FiguraVote, events: ClubEvent[]): boolean {
  if (!vote?.eventId || !vote.voterId || !vote.pickId || vote.voterId === vote.pickId) return false;
  const event = events.find((item) => item.id === vote.eventId);
  if (!event || event.kind !== "partido") return false;
  return resultIsOpen(event.startsAt);
}

export function mergeFiguraVotes(
  kept: FiguraVote[] | undefined,
  incoming: FiguraVote[] | undefined,
): FiguraVote[] {
  const map = new Map<string, FiguraVote>();
  for (const row of [...(kept ?? []), ...(incoming ?? [])]) {
    if (!row || row.voterId === row.pickId) continue;
    if (!row.eventId || !row.voterId || !row.pickId) continue;
    const key = `${row.eventId}:${row.voterId}`;
    const previous = map.get(key);
    const nextAt = Date.parse(row.at);
    const prevAt = previous ? Date.parse(previous.at) : Number.NaN;
    if (!previous || (Number.isFinite(nextAt) && (!Number.isFinite(prevAt) || nextAt >= prevAt))) {
      map.set(key, row);
    }
  }
  return [...map.values()].slice(-400);
}

export function figuraDe(votes: FiguraVote[] | undefined, eventId: string): { ids: string[]; votos: number } | null {
  const tally = new Map<string, number>();
  for (const row of votes ?? []) {
    if (row.eventId !== eventId) continue;
    tally.set(row.pickId, (tally.get(row.pickId) ?? 0) + 1);
  }
  let top = 0;
  for (const count of tally.values()) top = Math.max(top, count);
  if (top <= 0) return null;
  return {
    ids: [...tally.entries()].filter(([, count]) => count === top).map(([id]) => id),
    votos: top,
  };
}

export function candidatosFigura(event: ClubEvent, members: Member[]): Member[] {
  const lineup = new Set(Object.values(event.lineup));
  const bench = new Set(event.suplentes ?? []);
  const called = new Set(event.convocados ?? []);
  const pool = members.filter((person) => person.juega ?? person.role === "jugador");
  const picked = pool.filter((person) => lineup.has(person.id) || bench.has(person.id) || called.has(person.id));
  return picked.length > 0 ? picked : pool;
}
