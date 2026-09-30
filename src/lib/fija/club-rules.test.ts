import assert from "node:assert/strict";
import test from "node:test";
import {
  alertsDue,
  claimExistingName,
  decideClaim,
  equipmentHeading,
  mergePlayerAlerts,
  mergePlayerInbox,
  nextBannedAccounts,
  preferRsvp,
  readmitAccount,
  removeMemberEverywhere,
  sizeVerdict,
} from "./club-rules.ts";
import type { ClubBundle, ClubEvent, Member } from "./types.ts";

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

test("join usa el nombre cargado a mano si se lo pedís", () => {
  const result = decideClaim({
    members: [
      person({ id: "dt", name: "Lucho", role: "dt" }),
      person({ id: "j-enzo", name: "Enzo", nick: "8 Enzo", number: 8 }),
    ],
    accountId: "acc-p",
    mode: "join",
    draft: { name: "Enzo", nick: "Enzo", number: null, menor: false },
    freshId: "m-nuevo",
    claimId: "j-enzo",
  });
  assert.equal(result.kind, "join");
  if (result.kind !== "join") return;
  const mine = result.members.find((item) => item.accountId === "acc-p");
  assert.equal(mine?.id, "j-enzo");
  assert.equal(mine?.number, 8);
  assert.equal(result.members.filter((item) => item.name === "Enzo").length, 1);
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

test("el peso acepta, frena el crecimiento y corta el tope duro", () => {
  assert.equal(sizeVerdict(100, 200), "ok");
  assert.equal(sizeVerdict(360_000, 360_100), "ok");
  assert.equal(sizeVerdict(360_000, 362_000), "soft");
  assert.equal(sizeVerdict(10, 500_001), "hard");
});

test("dejar volver saca la cuenta de la lista de sacados", () => {
  const team = bundle([person({ id: "dt", name: "Lucho", role: "dt" })], {
    bannedAccounts: [{ accountId: "acc-p", name: "Pibe", at: "2026-01-01T00:00:00.000Z" }],
  });
  const next = readmitAccount(team, "acc-p");
  assert.equal(next.bannedAccounts?.length, 0);
});

test("unir la cuenta saca el duplicado y no banea", () => {
  const team = bundle([
    person({ id: "j-enzo", name: "Enzo", number: 8 }),
    person({ id: "acc-p", name: "Enzo", accountId: "acc-p" }),
  ]);
  const joined = claimExistingName(team, "acc-p", "j-enzo");
  assert.equal(joined.ok, true);
  if (!joined.ok) return;
  assert.equal(joined.bundle.members.length, 1);
  assert.equal(joined.bundle.members[0]?.id, "j-enzo");
  assert.equal(joined.bundle.members[0]?.accountId, "acc-p");
  assert.equal(joined.bundle.bannedAccounts?.length ?? 0, 0);
});

function match(id = "e1", startsAt = "2026-04-01T21:00:00.000Z"): ClubEvent {
  return {
    id,
    kind: "partido",
    title: "Fecha",
    place: "Cancha",
    mapsQuery: "Cancha",
    lat: null,
    lng: null,
    startsAt,
    modality: "f5",
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
  };
}

test("alertsDue dos veces no inventa otro aviso", () => {
  const sentAt = "2026-03-01T00:00:00.000Z";
  const now = Date.parse(sentAt) + 5 * 3_600_000;
  const state = {
    events: [match("e1", new Date(now + 30 * 60_000).toISOString())],
    rsvps: [{ eventId: "e1", memberId: "p", status: "pendiente" as const }],
    convocatorias: [{ eventId: "e1", sentAt }],
    inbox: [],
    alertLog: [],
    reminderPolicy: { firstHours: 1, secondHours: 0.01 },
    tournaments: [],
  };
  const first = alertsDue(state, now);
  const second = alertsDue({ ...state, inbox: first.inbox, alertLog: first.alertLog }, now);
  assert.equal(first.inbox.length, 1);
  assert.equal(first.inbox[0]?.title, "Falta tu confirmación");
  assert.equal(first.inbox[0]?.id.startsWith("in-r1-"), true);
  assert.equal(second.inbox, first.inbox);
  assert.equal(second.alertLog, first.alertLog);
  assert.equal(second.pushes.length, 0);
});

test("reenviar la convocatoria vuelve a avisar", () => {
  const sentAt = "2026-03-01T00:00:00.000Z";
  const now = Date.parse(sentAt) + 5 * 3_600_000;
  const state = {
    events: [match("e1", new Date(now + 10 * 3_600_000).toISOString())],
    rsvps: [{ eventId: "e1", memberId: "p", status: "pendiente" as const }],
    convocatorias: [{ eventId: "e1", sentAt }],
    inbox: [],
    alertLog: [],
    reminderPolicy: { firstHours: 24, secondHours: 0.01 },
    tournaments: [],
  };
  const first = alertsDue(state, now);
  const resentAt = new Date(now + 60_000).toISOString();
  const again = alertsDue(
    { ...state, inbox: first.inbox, alertLog: first.alertLog, convocatorias: [{ eventId: "e1", sentAt: resentAt }] },
    now + 2 * 3_600_000,
  );
  assert.equal(again.alertLog.length, first.alertLog.length + 1);
  assert.notEqual(again.inbox.at(-1)?.id, first.inbox[0]?.id);
});

test("un aviso viejo no se duplica", () => {
  const sentAt = "2026-03-01T00:00:00.000Z";
  const scope = Date.parse(sentAt);
  const now = scope + 5 * 3_600_000;
  const state = {
    events: [match("e1", new Date(now + 30 * 60_000).toISOString())],
    rsvps: [{ eventId: "e1", memberId: "p", status: "pendiente" as const }],
    convocatorias: [{ eventId: "e1", sentAt }],
    inbox: [],
    alertLog: [{ id: "viejo", eventId: "e1", kind: "first" as const, at: new Date(scope + 1000).toISOString() }],
    reminderPolicy: { firstHours: 1, secondHours: 0.01 },
    tournaments: [],
  };
  const due = alertsDue(state, now);
  assert.equal(due.alertLog, state.alertLog);
  assert.equal(due.inbox, state.inbox);
});

test("la respuesta más nueva gana, aunque el otro celular diga que va", () => {
  const viejo = { eventId: "e", memberId: "p", status: "voy" as const };
  const nuevo = { eventId: "e", memberId: "p", status: "no" as const, at: "2026-09-30T18:00:00.000Z" };
  assert.equal(preferRsvp(viejo, nuevo).status, "no");
  assert.equal(preferRsvp(nuevo, viejo).status, "no");
  assert.equal(preferRsvp(viejo, { ...viejo, status: "no" }).status, "voy");
});

test("el aviso de equipamiento nombra solo a quien lo lleva", () => {
  const now = Date.parse("2026-09-30T15:00:00.000Z");
  const starts = "2026-09-30T22:00:00.000Z";
  const state = {
    events: [{ ...match("e1", starts), equipamiento: { remeras: "a", pelotas: "b" } }],
    rsvps: [],
    convocatorias: [],
    inbox: [],
    alertLog: [],
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: [],
  };
  const due = alertsDue(state, now);
  const shirts = due.inbox.find((item) => item.memberId === "a");
  const balls = due.inbox.find((item) => item.memberId === "b");
  assert.equal(shirts?.body.includes("remeras"), true);
  assert.equal(shirts?.body.includes("pelotas"), false);
  assert.equal(balls?.body.includes("pelotas"), true);
  assert.equal(shirts?.title, "Hoy hay partido");
  const again = alertsDue({ ...state, inbox: due.inbox, alertLog: [] }, now);
  assert.equal(again.inbox.filter((item) => item.id === shirts?.id).length, 1);
  assert.equal(equipmentHeading("2026-10-01T22:00:00.000Z", now), "Mañana hay partido");
});

test("el jugador solo suma avisos fijos y su propia lectura", () => {
  const existing = [
    {
      id: "in-r1-e1-1",
      kind: "recordatorio" as const,
      title: "Aviso",
      body: "Falta",
      eventId: "e1",
      audience: "pending" as const,
      at: "2026-03-01T00:00:00.000Z",
      readBy: [] as string[],
    },
  ];
  const merged = mergePlayerInbox(
    existing,
    [
      { ...existing[0], title: "Cambiado", readBy: ["me", "otro"] },
      {
        id: "azar",
        kind: "recordatorio",
        title: "X",
        body: "Y",
        eventId: "e1",
        audience: "all",
        at: "2026-03-01T00:00:00.000Z",
        readBy: [],
      },
      {
        id: "in-r2-e1-2",
        kind: "recordatorio",
        title: "Segundo",
        body: "Bien",
        eventId: "e1",
        audience: "staff",
        at: "2026-03-01T01:00:00.000Z",
        readBy: ["otro"],
      },
      {
        id: "in-r2-e1-3",
        kind: "recordatorio",
        title: "x".repeat(121),
        body: "largo",
        eventId: "e1",
        audience: "pending",
        at: "2026-03-01T01:00:00.000Z",
        readBy: [],
      },
    ],
    "me",
    new Set(["e1"]),
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.title, "Aviso");
  assert.deepEqual(merged[0]?.readBy, ["me"]);
  assert.equal(merged[1]?.id, "in-r2-e1-2");

  const alerts = mergePlayerAlerts(
    [{ id: "al-first-e1-1", eventId: "e1", kind: "first", at: "original" }],
    [
      { id: "al-first-e1-1", eventId: "e1", kind: "first", at: "pisado" },
      { id: "azar", eventId: "e1", kind: "first", at: "x" },
      { id: "al-second-e1-1", eventId: "e1", kind: "second", at: "nuevo" },
      { id: "al-eq-no", eventId: "no", kind: "equipment", at: "x" },
    ],
    new Set(["e1"]),
  );
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0]?.at, "original");
  assert.equal(alerts[1]?.id, "al-second-e1-1");
});
