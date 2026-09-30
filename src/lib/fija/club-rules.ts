import type { ClubBundle, ClubEvent, Member } from "./types.ts";

export type BannedAccount = { accountId: string; name: string; at: string };

export function guardMember(person: Member, previous?: Member): Member {
  const menor = Boolean(person.menor || previous?.menor);
  if (!menor) return person;
  return { ...person, menor: true, photo: null };
}

export function dedupeBanned(list: BannedAccount[]): BannedAccount[] {
  const map = new Map<string, BannedAccount>();
  for (const item of list) {
    if (!item.accountId || map.has(item.accountId)) continue;
    map.set(item.accountId, item);
  }
  return [...map.values()];
}

export function nextBannedAccounts(
  existing: ClubBundle,
  incomingDroppedIds: string[] | undefined,
  staff: boolean,
  nowIso: string,
): BannedAccount[] {
  if (!staff) return existing.bannedAccounts ?? [];
  const already = new Set(existing.droppedIds ?? []);
  const nuevos: BannedAccount[] = [];
  for (const id of incomingDroppedIds ?? []) {
    if (already.has(id)) continue;
    const person = existing.members.find((item) => item.id === id);
    const account = person?.accountId ?? null;
    if (!account || !person) continue;
    nuevos.push({ accountId: account, name: person.name, at: nowIso });
  }
  return dedupeBanned([...(existing.bannedAccounts ?? []), ...nuevos]);
}

export function withoutBanned(members: Member[], banned: BannedAccount[]): Member[] {
  const ids = new Set(banned.map((item) => item.accountId));
  return members.filter((person) => !person.accountId || !ids.has(person.accountId));
}

export type ClaimMode = "join" | "resume";

export type ClaimOutcome =
  | { kind: "removed"; error: string }
  | { kind: "keep"; members: Member[] }
  | { kind: "notMember"; error: string }
  | { kind: "join"; members: Member[] };

export function decideClaim(input: {
  members: Member[];
  droppedIds?: string[];
  bannedAccounts?: BannedAccount[];
  accountId: string;
  mode: ClaimMode;
  draft: { name: string; nick: string; number: number | null; menor: boolean };
  freshId: string;
}): ClaimOutcome {
  const banned = new Set((input.bannedAccounts ?? []).map((item) => item.accountId));
  if (banned.has(input.accountId)) {
    return { kind: "removed", error: "El DT te sacó de este equipo." };
  }
  const dropped = new Set(input.droppedIds ?? []);
  const current = input.members.find(
    (person) => person.accountId === input.accountId || person.id === input.accountId,
  );
  if (current && (dropped.has(current.id) || dropped.has(input.accountId))) {
    return { kind: "keep", members: input.members };
  }
  if (!current && input.mode === "resume") {
    return { kind: "notMember", error: "Ya no estás en el plantel de este equipo." };
  }
  const id = current ? current.id : dropped.has(input.accountId) ? input.freshId : input.accountId;
  const next = guardMember(
    current
      ? {
          ...current,
          accountId: input.accountId,
          number: current.number ?? input.draft.number,
          menor: input.draft.menor || current.menor,
        }
      : {
          id,
          name: input.draft.name,
          nick: input.draft.nick || input.draft.name.split(" ")[0] || "Jugador",
          role: "jugador",
          number: input.draft.number,
          accountId: input.accountId,
          juega: true,
          menor: input.draft.menor,
        },
    current,
  );
  const stripped = input.members.map((person) =>
    person.accountId === input.accountId && person.id !== next.id ? { ...person, accountId: null } : person,
  );
  return { kind: "join", members: [...stripped.filter((person) => person.id !== next.id), next] };
}

export function freshMemberId(): string {
  const bytes = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `m-${bytes}`;
}

function stripFromEvent(event: ClubEvent, memberId: string): ClubEvent {
  const lineup = Object.fromEntries(Object.entries(event.lineup).filter(([, id]) => id !== memberId));
  return {
    ...event,
    lineup,
    convocados: (event.convocados ?? []).filter((id) => id !== memberId),
    suplentes: (event.suplentes ?? []).filter((id) => id !== memberId),
  };
}

export function removeMemberEverywhere(
  bundle: ClubBundle,
  memberId: string,
): { bundle: ClubBundle; empty: boolean } {
  let members = bundle.members.filter((person) => person.id !== memberId);
  let club = bundle.club;
  if (club.createdBy === memberId && members[0]) {
    const nextOwner =
      members.find((person) => person.role === "dt") ??
      members.find((person) => person.role === "ayudante") ??
      members[0];
    club = { ...club, createdBy: nextOwner.id };
    members = members.map((person) =>
      person.id === nextOwner.id && person.role === "jugador" ? { ...person, role: "dt" } : person,
    );
  }
  const next: ClubBundle = {
    ...bundle,
    club,
    members,
    droppedIds: [...new Set([...(bundle.droppedIds ?? []), memberId])],
    rsvps: bundle.rsvps.filter((row) => row.memberId !== memberId),
    invites: bundle.invites.filter((invite) => invite.memberId !== memberId),
    events: bundle.events.map((event) => stripFromEvent(event, memberId)),
  };
  return { bundle: next, empty: members.length === 0 };
}

export function readmitAccount(bundle: ClubBundle, accountId: string): ClubBundle {
  return {
    ...bundle,
    bannedAccounts: (bundle.bannedAccounts ?? []).filter((item) => item.accountId !== accountId),
  };
}
