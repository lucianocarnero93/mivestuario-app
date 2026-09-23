import type { MatchSheet, Member, PlayerMatchStat } from "./types";

export type Outcome = "won" | "drawn" | "lost";

export type TeamRecord = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
};

export type PlayerRow = PlayerMatchStat & {
  matches: number;
};

export function outcome(gf: number, ga: number): Outcome {
  if (gf > ga) return "won";
  if (gf < ga) return "lost";
  return "drawn";
}

export function emptyStat(memberId: string): PlayerMatchStat {
  return { memberId, goals: 0, assists: 0, yellow: 0, red: 0 };
}

export function clampStat(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(20, Math.round(n)));
}

export function teamRecord(sheets: MatchSheet[]): TeamRecord {
  return sheets.reduce<TeamRecord>(
    (acc, sheet) => {
      const result = outcome(sheet.goalsFor, sheet.goalsAgainst);
      acc.played += 1;
      acc.gf += sheet.goalsFor;
      acc.ga += sheet.goalsAgainst;
      if (result === "won") acc.won += 1;
      else if (result === "drawn") acc.drawn += 1;
      else acc.lost += 1;
      return acc;
    },
    { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 },
  );
}

export function playerRows(sheets: MatchSheet[], members: Member[]): PlayerRow[] {
  const map = new Map<string, PlayerRow>();
  for (const member of members) {
    if (member.role !== "jugador") continue;
    map.set(member.id, { ...emptyStat(member.id), matches: 0 });
  }
  for (const sheet of sheets) {
    for (const row of sheet.players) {
      const current = map.get(row.memberId) ?? { ...emptyStat(row.memberId), matches: 0 };
      current.goals += row.goals;
      current.assists += row.assists;
      current.yellow += row.yellow;
      current.red += row.red;
      current.matches += 1;
      map.set(row.memberId, current);
    }
  }
  return [...map.values()];
}

export function rankedBy(
  rows: PlayerRow[],
  key: "goals" | "assists" | "yellow" | "red",
): PlayerRow[] {
  return rows
    .filter((row) => row[key] > 0)
    .sort((a, b) => b[key] - a[key] || b.goals - a.goals);
}

export function resultLabel(gf: number, ga: number): string {
  const result = outcome(gf, ga);
  if (result === "won") return "Ganado";
  if (result === "drawn") return "Empate";
  return "Perdido";
}
