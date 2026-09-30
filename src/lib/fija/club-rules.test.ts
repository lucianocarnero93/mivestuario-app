import assert from "node:assert/strict";
import test from "node:test";
import {
  decideClaim,
  nextBannedAccounts,
  readmitAccount,
  removeMemberEverywhere,
} from "./club-rules.ts";
import type { ClubBundle, Member } from "./types.ts";

function person(partial: Partial<Member> & Pick<Member, "id" | "name">): Member {
  return {
    nick: partial.name,
    role: "jugador",
    number: null,
    ...partial,
  };
}

function bundle(members: Member[], extra: Partial<ClubBundle> = {}): ClubBundle {
  return {
    club: { id: "c1", name: "Proba", createdBy: members[0]?.id ?? "dt", inviteCode: "ABCDE", crest: null },
    members,
    events: [
      {
        id: "e1",
        kind: "partido",
        title: "Fecha",
        place: "Cancha",
        mapsQuery: "Cancha",
        lat: null,
        lng: null,
        startsAt: "2026-10-01T21:00:00.000Z",
        modality: "f5",
        lineup: { ARQ: members[1]?.id ?? "x" },
        tactics: "",
        lineupPublishedAt: null,
        tournamentId: null,
        convocados: members.map((item) => item.id),
        suplentes: [],
      },
    ],
    rsvps: members.map((item) => ({ eventId: "e1", memberId: item.id, status: "pendiente" as const })),
    messages: [],
    charla: [],
    matchSheets: [],
    invites: members.map((item) => ({ id: `i-${item.id}`, memberId: item.id, code: "ABCDE", createdAt: "2026-01-01T00:00:00.000Z" })),
    convocatorias: [],
    inbox: [],
    alertLog: [],
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: [],
    ...extra,
  };
}

test("una cuenta baneada no vuelve a entrar", () => {
  const result = decideClaim({
    members: [person({ id: "dt", name: "Lucho", role: "dt", accountId: "acc-dt" })],
    bannedAccounts: [{ accountId: "acc-p", name: "Pibe", at: "2026-01-01T00:00:00.000Z" }],
    accountId: "acc-p",
    mode: "join",
    draft: { name: "Pibe", nick: "Pibe", number: null, menor: false },
    freshId: "m-nuevo",
  });
  assert.equal(result.kind, "removed");
});

test("resume sin miembro avisa que ya no está", () => {
  const result = decideClaim({
    members: [person({ id: "dt", name: "Lucho", role: "dt" })],
    accountId: "acc-p",
    mode: "resume",
    draft: { name: "Pibe", nick: "Pibe", number: null, menor: false },
    freshId: "m-nuevo",
  });
  assert.equal(result.kind, "notMember");
});

test("join con el id tachado usa un id nuevo", () => {
  const result = decideClaim({
    members: [person({ id: "dt", name: "Lucho", role: "dt" })],
    droppedIds: ["acc-p"],
    accountId: "acc-p",
    mode: "join",
    draft: { name: "Pibe", nick: "Pibe", number: null, menor: false },
    freshId: "m-nuevo",
  });
  assert.equal(result.kind, "join");
  if (result.kind !== "join") return;
  const mine = result.members.find((item) => item.accountId === "acc-p");
  assert.equal(mine?.id, "m-nuevo");
});

test("join normal usa la cuenta como id", () => {
  const result = decideClaim({
    members: [person({ id: "dt", name: "Lucho", role: "dt" })],
    accountId: "acc-p",
    mode: "join",
    draft: { name: "Pibe", nick: "Pibe", number: null, menor: false },
    freshId: "m-nuevo",
  });
  assert.equal(result.kind, "join");
  if (result.kind !== "join") return;
  assert.equal(result.members.find((item) => item.accountId === "acc-p")?.id, "acc-p");
});

test("un miembro tachado no se reescribe", () => {
  const result = decideClaim({
    members: [person({ id: "j1", name: "Pibe", accountId: "acc-p" })],
    droppedIds: ["j1"],
    accountId: "acc-p",
    mode: "join",
    draft: { name: "Pibe", nick: "Pibe", number: null, menor: false },
    freshId: "m-nuevo",
  });
  assert.equal(result.kind, "keep");
});

test("sacar a alguien banea su cuenta y un jugador no banea", () => {
  const existing = bundle([
    person({ id: "dt", name: "Lucho", role: "dt", accountId: "acc-dt" }),
    person({ id: "j1", name: "Pibe", accountId: "acc-p" }),
  ]);
  const banned = nextBannedAccounts(existing, ["j1"], true, "2026-02-01T00:00:00.000Z");
  assert.equal(banned[0]?.accountId, "acc-p");
  const ignored = nextBannedAccounts(existing, ["dt"], false, "2026-02-01T00:00:00.000Z");
  assert.equal(ignored.length, 0);
});

test("sacar limpia cancha, banco y convocatoria, y pasa el mando", () => {
  const team = bundle([
    person({ id: "crea", name: "Lucho", role: "jugador", accountId: "acc-l" }),
    person({ id: "ayu", name: "Ayuda", role: "ayudante" }),
  ]);
  team.club.createdBy = "crea";
  team.events[0].suplentes = ["crea"];
  const removed = removeMemberEverywhere(team, "crea");
  assert.equal(removed.empty, false);
  assert.equal(removed.bundle.club.createdBy, "ayu");
  assert.equal(removed.bundle.members.some((item) => item.id === "crea"), false);
  assert.equal(Object.values(removed.bundle.events[0].lineup).includes("crea"), false);
  assert.equal((removed.bundle.events[0].suplentes ?? []).includes("crea"), false);
  assert.equal((removed.bundle.events[0].convocados ?? []).includes("crea"), false);
  assert.ok(removed.bundle.droppedIds?.includes("crea"));
  const alone = removeMemberEverywhere(removed.bundle, "ayu");
  assert.equal(alone.empty, true);
});

test("dejar volver saca la cuenta de la lista de sacados", () => {
  const team = bundle([person({ id: "dt", name: "Lucho", role: "dt" })], {
    bannedAccounts: [{ accountId: "acc-p", name: "Pibe", at: "2026-01-01T00:00:00.000Z" }],
  });
  const next = readmitAccount(team, "acc-p");
  assert.equal(next.bannedAccounts?.length, 0);
});
