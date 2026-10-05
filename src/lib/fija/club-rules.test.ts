import assert from "node:assert/strict";
import test from "node:test";
import {
  alertsDue,
  canAssignRoles,
  repairCreatedBy,
  allowedDrops,
  patchKeepsMenor,
  pushCopy,
  memberGetsPush,
  claimExistingName,
  decideClaim,
  equipmentHeading,
  mergePlayerAlerts,
  mergePlayerInbox,
  nextBannedAccounts,
  preferRsvp,
  readmitAccount,
  detachAccount,
  mergeAlumni,
  noticeFits,
  pickMemberIdentity,
  resultIsOpen,
  playerNoticeAllowed,
  removeMemberEverywhere,
  sanitizeSheet,
  sizeVerdict,
} from "./club-rules.ts";
import type { ClubBundle, ClubEvent, Member } from "./types.ts";
import { personLabel } from "./format.ts";

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

test("solo el creador designa; si ya no está, el mando pasa a un DT con cuenta", () => {
  const members = [
    person({ id: "viejo", name: "Viejo", role: "jugador" }),
    person({ id: "lucho", name: "Lucho", role: "dt", accountId: "acc-l" }),
    person({ id: "ayu", name: "Ayuda", role: "ayudante", accountId: "acc-a" }),
  ];
  assert.equal(canAssignRoles(members, "viejo", "acc-l"), false);
  assert.equal(canAssignRoles(members, "viejo", "acc-a"), false);
  assert.equal(canAssignRoles(members, "viejo", "viejo"), true);
  assert.equal(repairCreatedBy(members, "viejo"), "viejo");
  assert.equal(repairCreatedBy(members.filter((item) => item.id !== "viejo"), "viejo"), "lucho");
  assert.equal(
    repairCreatedBy(
      members.filter((item) => item.id !== "viejo" && item.id !== "lucho"),
      "viejo",
    ),
    "ayu",
  );
});

test("el ayudante no saca ni banea a un DT", () => {
  const members = [
    person({ id: "crea", name: "Lucho", role: "dt", accountId: "acc-l" }),
    person({ id: "ayu", name: "Ayuda", role: "ayudante", accountId: "acc-a" }),
    person({ id: "otro", name: "Otro", role: "dt", accountId: "acc-o" }),
    person({ id: "pibe", name: "Pibe", accountId: "acc-p" }),
  ];
  assert.deepEqual(allowedDrops(members, "crea", ["otro", "ayu", "pibe", "crea"], false), ["pibe"]);
  assert.deepEqual(allowedDrops(members, "crea", ["otro", "ayu", "pibe", "crea"], true), ["otro", "ayu", "pibe"]);
});

test("una cuenta menor no puede pasar a mayor por API", () => {
  assert.equal(patchKeepsMenor(true, { menor: false, name: "Nico" }).menor, true);
  assert.equal(patchKeepsMenor(false, { menor: false }).menor, false);
});

test("el aviso nombra al club y no le llega a quien no corresponde", () => {
  const item = {
    id: "n1",
    kind: "convocatoria" as const,
    title: "Hoy hay partido",
    body: "Confirmá",
    audience: "pending" as const,
    at: "",
    readBy: [],
  };
  assert.equal(pushCopy("Siete", item).title, "Siete: Hoy hay partido");
  const dt = person({ id: "d", name: "DT", role: "dt" });
  const pibe = person({ id: "p", name: "Pibe" });
  assert.equal(memberGetsPush(item, pibe, "pendiente"), true);
  assert.equal(memberGetsPush(item, pibe, "voy"), false);
  assert.equal(memberGetsPush({ ...item, audience: "staff" }, pibe, null), false);
  assert.equal(memberGetsPush({ ...item, audience: "staff" }, dt, null), true);
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

test("el DT no se puede convertir en un jugador cargado a mano", () => {
  const team = bundle([
    person({ id: "dt", name: "Lucho", role: "dt", accountId: "acc-dt" }),
    person({ id: "j-pivi", name: "PivitA" }),
  ]);
  const claimed = claimExistingName(team, "acc-dt", "j-pivi");
  assert.equal(claimed.ok, false);
  if (claimed.ok) return;
  assert.match(claimed.error, /otro jugador/);
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
  const event = {
    id: "e1",
    kind: "partido" as const,
    title: "Fecha",
    place: "Cancha",
    mapsQuery: "Cancha",
    lat: null,
    lng: null,
    startsAt: "2026-10-01T21:00:00.000Z",
    modality: "f5" as const,
    lineup: {},
    tactics: "",
    lineupPublishedAt: null,
    tournamentId: null,
  };
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
  const legit = {
    id: "in-r1-e1-9",
    kind: "recordatorio" as const,
    title: "Falta tu confirmación",
    body: "Todavía no confirmaste Fecha.",
    eventId: "e1",
    audience: "pending" as const,
    at: "2026-03-01T01:00:00.000Z",
    readBy: [] as string[],
  };
  const merged = mergePlayerInbox(
    existing,
    [
      { ...existing[0], title: "PARTIDO SUSPENDIDO", body: "No vengan", readBy: ["me", "otro"] },
      {
        id: "azar",
        kind: "recordatorio",
        title: "PARTIDO SUSPENDIDO",
        body: "No vengan",
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
      legit,
    ],
    "me",
    [event],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.title, "Aviso");
  assert.deepEqual(merged[0]?.readBy, ["me"]);
  assert.equal(merged[1]?.id, legit.id);
  assert.equal(playerNoticeAllowed(legit, [event]), true);

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

test("sacar a alguien deja el nombre para el ranking", () => {
  const team = bundle([
    person({ id: "dt", name: "Lucho", role: "dt" }),
    person({ id: "j1", name: "Enzo Pérez", nick: "Enzo" }),
  ]);
  const removed = removeMemberEverywhere(team, "j1");
  assert.equal(removed.bundle.alumni?.[0]?.name, "Enzo Pérez");
  assert.equal(removed.bundle.alumni?.[0]?.nick, "Enzo");
  const again = mergeAlumni(removed.bundle.alumni, [{ id: "j1", name: "Otro", nick: "Otro" }]);
  assert.equal(again[0]?.name, "Enzo Pérez");
});

test("borrar la cuenta suelta el nombre y no lo borra", () => {
  const team = bundle([
    person({ id: "dt", name: "Lucho", role: "dt", accountId: "acc-dt" }),
    person({ id: "j1", name: "Pibe", accountId: "acc-p" }),
  ]);
  const next = detachAccount(team, "acc-p");
  const pibe = next.members.find((item) => item.id === "j1");
  assert.equal(pibe?.name, "Pibe");
  assert.equal(pibe?.accountId, null);
});

test("un aviso inventado no sale si no está en el equipo", () => {
  const team = bundle([
    person({ id: "j1", name: "Pibe", nick: "Pibe", accountId: "acc-p" }),
  ]);
  const now = Date.parse("2026-04-01T18:00:00.000Z");
  team.messages = [{ id: "m1", memberId: "j1", text: "Llego tarde", at: "2026-04-01T17:58:00.000Z" }];
  const chat = noticeFits(team, "j1", false, "PARTIDO SUSPENDIDO", "Llego tarde", now);
  assert.equal(chat?.title, "Pibe");
  assert.equal(chat?.url, "/chat");
  const fake = noticeFits(team, "j1", false, "PARTIDO SUSPENDIDO", "No vengan", now);
  assert.equal(fake, null);
});

test("la planilla no deja más goles individuales que el resultado", () => {
  const sheet = sanitizeSheet({
    eventId: "e1",
    opponent: "Rival",
    goalsFor: 1,
    goalsAgainst: 0,
    notes: "",
    recordedAt: "2026-04-01T18:00:00.000Z",
    players: [
      { memberId: "a", goals: 4, assists: 0, yellow: 0, red: 0 },
      { memberId: "b", goals: 2, assists: 0, yellow: 0, red: 0 },
    ],
  });
  assert.equal(sheet.goalsFor, 1);
  assert.equal(sheet.players.reduce((sum, row) => sum + row.goals, 0), 1);
});

test("el apodo del DT no lo pisa el celular del jugador", () => {
  const existing = person({ id: "j", name: "Juan Pérez", nick: "Juancito", profileAt: "2026-09-30T12:00:00.000Z" });
  const incoming = person({ id: "j", name: "Juan Pérez", nick: "Juan" });
  assert.equal(pickMemberIdentity(existing, incoming, false).nick, "Juancito");
  const edited = person({
    id: "j",
    name: "Juan Pérez",
    nick: "Juancho",
    profileAt: "2026-09-30T15:00:00.000Z",
  });
  assert.equal(pickMemberIdentity(existing, edited, false).nick, "Juancho");
  const future = person({
    id: "j",
    name: "Juan Pérez",
    nick: "Juan",
    profileAt: "2099-01-01T00:00:00.000Z",
  });
  const now = Date.parse("2026-09-30T16:00:00.000Z");
  assert.equal(pickMemberIdentity(edited, future, false, now).nick, "Juancho");
  const byStaff = person({
    id: "j",
    name: "Juan Pérez",
    nick: "Juancito",
    profileAt: "2026-09-30T16:00:00.000Z",
  });
  assert.equal(pickMemberIdentity(future, byStaff, true, now).nick, "Juancito");
});

test("el resultado no se carga antes del horario", () => {
  const kickoff = "2026-10-02T21:00:00.000Z";
  assert.equal(resultIsOpen(kickoff, Date.parse("2026-10-02T20:00:00.000Z")), false);
  assert.equal(resultIsOpen(kickoff, Date.parse("2026-10-02T21:00:00.000Z")), true);
});

test("dos Enzo no se confunden", () => {
  const people = [
    { id: "a", nick: "Enzo", name: "Enzo Pérez", number: null },
    { id: "b", nick: "Enzo", name: "Enzo Fernández", number: null },
    { id: "c", nick: "Enzo", name: "Enzo", number: null },
    { id: "d", nick: "Enzo", name: "Enzo", number: 9 },
  ];
  assert.equal(personLabel(people[0], people), "Enzo (Enzo Pérez)");
  assert.equal(personLabel(people[1], people), "Enzo (Enzo Fernández)");
  assert.equal(personLabel(people[2], people), "Enzo · 1");
  assert.equal(personLabel(people[3], people), "9 Enzo");
});


