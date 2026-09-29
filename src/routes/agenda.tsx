// Agenda: lista de partidos, entrenamientos y reuniones.
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreateEventButton, EditEventButton } from "@/components/fija/event-editor";
import { EventCard } from "@/components/fija/event-card";
import {
  eventOfClosedTournament,
  matchSettled,
  sheetFor,
  useFija,
  useIsStaff,
} from "@/lib/fija/store";
import type { ClubEvent, MatchSheet } from "@/lib/fija/types";

export const Route = createFileRoute("/agenda")({ component: AgendaPage });

function AgendaPage() {
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const tournaments = useFija((s) => s.tournaments);
  const staff = useIsStaff();
  const now = Date.now();
  const active = events.filter((event) => !eventOfClosedTournament(event, tournaments));
  const upcoming = active
    .filter((event) => isUpcoming(event, sheetFor(event.id, sheets), now))
    .sort(bySoonest);
  const played = active
    .filter((event) => event.kind === "partido" && matchSettled(event, sheetFor(event.id, sheets)))
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  return (
    <main className="px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        {staff ? <CreateEventButton /> : null}
      </div>
      <p className="mt-1 text-sm text-muted">Lo próximo arriba. Lo ya jugado, abajo.</p>
      {upcoming.length === 0 && played.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {staff
            ? "Todavía no hay fechas. Tocá Nuevo para cargar el próximo partido."
            : "Todavía no hay fechas. Cuando el DT cargue una, aparece acá."}
        </p>
      ) : null}
      {upcoming.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {upcoming.map((event) => (
            <li key={event.id}>
              <AgendaItem event={event} staff={staff} needsResult={needsResult(event, sheetFor(event.id, sheets), now)} />
            </li>
          ))}
        </ul>
      ) : null}
      {played.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Ya jugados</h2>
          <ul className="mt-3 space-y-3">
            {played.map((event) => (
              <li key={event.id}>
                <AgendaItem event={event} staff={staff} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function AgendaItem({
  event,
  staff,
  needsResult,
}: {
  event: ClubEvent;
  staff: boolean;
  needsResult?: boolean;
}) {
  const rsvps = useFija((s) => s.rsvps);
  const sheet = sheetFor(event.id, useFija((s) => s.matchSheets));
  return (
    <EventCard
      event={event}
      rsvps={rsvps.filter((row) => row.eventId === event.id)}
      result={sheet ? { gf: sheet.goalsFor, ga: sheet.goalsAgainst } : undefined}
    >
      {needsResult && staff ? (
        <p className="mt-2 text-sm font-medium text-warning">Falta cargar el resultado.</p>
      ) : null}
      {staff ? (
        <div className="mt-2 flex justify-end gap-2">
          {event.kind === "partido" ? (
            <Link
              to="/stats"
              search={{ partido: event.id, torneo: event.tournamentId ?? "general" }}
              className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-accent"
            >
              {sheet ? "Editar planilla" : "Cargar planilla"}
            </Link>
          ) : null}
          <EditEventButton event={event} />
        </div>
      ) : null}
    </EventCard>
  );
}

function isUpcoming(event: ClubEvent, sheet: MatchSheet | undefined, now: number) {
  if (event.kind === "partido") return !matchSettled(event, sheet);
  return +new Date(event.startsAt) >= now - 2 * 3_600_000;
}

function needsResult(event: ClubEvent, sheet: MatchSheet | undefined, now: number) {
  return event.kind === "partido" && !matchSettled(event, sheet) && +new Date(event.startsAt) < now;
}

function bySoonest(a: ClubEvent, b: ClubEvent) {
  const now = Date.now();
  const aPast = +new Date(a.startsAt) < now;
  const bPast = +new Date(b.startsAt) < now;
  if (aPast !== bPast) return aPast ? -1 : 1;
  if (aPast) return +new Date(b.startsAt) - +new Date(a.startsAt);
  return +new Date(a.startsAt) - +new Date(b.startsAt);
}