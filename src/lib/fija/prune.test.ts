import assert from "node:assert/strict";
import test from "node:test";
import { aligerarPizarraVieja, clubSinImagenes, pruneBundle } from "./prune.ts";
import type { ClubBundle, InboxItem } from "./types.ts";

function bundle(inbox: InboxItem[]): ClubBundle {
  return {
    club: { id: "c", name: "P", createdBy: "a", inviteCode: "ABCDE", crest: null },
    members: [],
    events: [],
    rsvps: [{ eventId: "e", memberId: "a", status: "voy" }],
    messages: Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      memberId: "a",
      text: "hola",
      at: new Date(2026, 0, i + 1).toISOString(),
    })),
    charla: [],
    matchSheets: [],
    invites: [],
    convocatorias: [{ eventId: "gone", sentAt: "2026-01-01T00:00:00.000Z", sentBy: "a" }],
    inbox,
    alertLog: [],
    reminderPolicy: { firstHours: 24, secondHours: 48 },
    tournaments: [],
  };
}

test("deduplica recordatorios y une leídos", () => {
  const now = Date.parse("2026-03-01T00:00:00.000Z");
  const at = "2026-02-01T00:00:00.000Z";
  const next = pruneBundle(
    bundle([
      { id: "a", kind: "recordatorio", title: "Aviso", body: "Falta", eventId: "e", audience: "pending", at, readBy: ["p1"] },
      { id: "b", kind: "recordatorio", title: "Aviso", body: "Falta", eventId: "e", audience: "pending", at, readBy: ["p2"] },
    ]),
    now,
  );
  assert.equal(next.inbox.length, 1);
  assert.deepEqual(next.inbox[0]?.readBy.sort(), ["p1", "p2"]);
  assert.equal(next.rsvps.length, 1);
  assert.equal(next.convocatorias.length, 0);
});

test("podar dos veces deja lo mismo", () => {
  const now = Date.parse("2026-03-01T00:00:00.000Z");
  const once = pruneBundle(bundle([]), now);
  const twice = pruneBundle(once, now);
  assert.equal(twice.messages.length, once.messages.length);
  assert.equal(twice.inbox.length, once.inbox.length);
});

test("respeta los topes y no toca plantel ni respuestas", () => {
  const now = Date.parse("2026-03-01T00:00:00.000Z");
  const team = bundle([]);
  team.members = [{ id: "a", name: "Ana", nick: "Ana", role: "jugador", number: null }];
  team.events = [
    {
      id: "e",
      kind: "partido",
      title: "Fecha",
      place: "Cancha",
      mapsQuery: "Cancha",
      lat: null,
      lng: null,
      startsAt: "2026-04-01T21:00:00.000Z",
      modality: "f5",
      lineup: {},
      tactics: "",
      lineupPublishedAt: null,
      tournamentId: null,
    },
  ];
  team.messages = Array.from({ length: 350 }, (_, i) => ({
    id: `m${i}`,
    memberId: "a",
    text: "hola",
    at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  }));
  team.inbox = [
    {
      id: "viejo",
      kind: "recordatorio",
      title: "Viejo",
      body: "Ayer",
      eventId: "e",
      audience: "all",
      at: "2020-01-01T00:00:00.000Z",
      readBy: [],
    },
    ...Array.from({ length: 210 }, (_, i) => ({
      id: `n${i}`,
      kind: "charla" as const,
      title: `Aviso ${i}`,
      body: "hoy",
      audience: "all" as const,
      at: new Date(Date.parse("2026-02-01T00:00:00.000Z") + i * 1000).toISOString(),
      readBy: [] as string[],
    })),
  ];
  const next = pruneBundle(team, now);
  assert.equal(next.messages.length, 300);
  assert.equal(next.messages[0]?.id, "m50");
  assert.equal(next.inbox.length, 200);
  assert.equal(next.inbox.some((item) => item.id === "viejo"), false);
  assert.equal(next.inbox.some((item) => item.id === "n209"), true);
  assert.equal(next.rsvps, team.rsvps);
  assert.equal(next.events, team.events);
  assert.equal(next.members, team.members);
  const again = pruneBundle(next, now);
  assert.equal(again.messages.length, 300);
  assert.equal(again.inbox.length, 200);
});

test("a los 21 días se va la pizarra y quedan el equipo y el resultado", () => {
  const ahora = Date.parse("2026-10-06T12:00:00.000Z");
  const viejo = new Date(ahora - 22 * 24 * 60 * 60 * 1000).toISOString();
  const fresco = new Date(ahora - 2 * 24 * 60 * 60 * 1000).toISOString();
  const base = bundle([]);
  const next = aligerarPizarraVieja(
    {
      ...base,
      events: [
        {
          id: "viejo",
          kind: "partido",
          title: "vs Viejo",
          startsAt: viejo,
          place: "Cancha",
          modality: "f5",
          lineup: { ARQ: "a" },
          tactics: "Presionar",
          planes: [{ id: "a", idea: "", cambio: "", lineup: {}, dibujos: [{ id: "d", trazo: "flecha", x1: 1, y1: 1, x2: 2, y2: 2 }] }],
          pasos: { id: "p", nombre: "Pared", tipo: "jugada", cuadros: [] },
          videoUrl: "https://youtu.be/abc",
          resultClosedAt: viejo,
        },
        {
          id: "fresco",
          kind: "partido",
          title: "vs Fresco",
          startsAt: fresco,
          place: "Cancha",
          modality: "f5",
          lineup: { ARQ: "a" },
          pasos: { id: "q", nombre: "Pared", tipo: "jugada", cuadros: [] },
        },
      ],
    },
    ahora,
  );
  const pasado = next.events.find((event) => event.id === "viejo");
  assert.equal(pasado?.pasos, null);
  assert.equal(pasado?.planes, undefined);
  assert.equal(pasado?.videoUrl, undefined);
  assert.equal(pasado?.lineup.ARQ, "a");
  assert.equal(pasado?.tactics, "Presionar");
  assert.equal(pasado?.resultClosedAt, viejo);
  assert.ok(next.events.find((event) => event.id === "fresco")?.pasos);
});

test("el archivo del equipo no guarda fotos ni escudo", () => {
  const next = clubSinImagenes({
    ...bundle([]),
    club: { id: "c", name: "P", createdBy: "a", inviteCode: "ABCDE", crest: "data:image/png;base64,abc" },
    members: [{ id: "a", name: "Ana", nick: "Ana", role: "dt", photo: "data:image/png;base64,zzz" }],
  });
  assert.equal(next.club.crest, null);
  assert.equal(next.members[0]?.photo, null);
  assert.equal(next.members[0]?.nick, "Ana");
});
