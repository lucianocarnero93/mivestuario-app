// Agenda: lista de partidos, entrenamientos y reuniones.
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreateEventButton, EditEventButton } from "@/components/fija/event-editor";
import { EventCard } from "@/components/fija/event-card";
import { Button } from "@/components/ui/button";
import { resultIsOpen } from "@/lib/fija/club-rules";
import { clasificarAgenda } from "@/lib/fija/fecha";
import {
  matchSettled,
  sheetFor,
  useFija, useRespuestas,
  useIsStaff,
  useMe,
} from "@/lib/fija/store";
import type { ClubEvent } from "@/lib/fija/types";

export const Route = createFileRoute("/agenda")({ component: AgendaPage });

function AgendaPage() {
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const staff = useIsStaff();
  const now = Date.now();
  const grupos = clasificarAgenda(events, sheets, now);

  return (
    <main className="px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        {staff ? <CreateEventButton /> : null}
      </div>
      <p className="mt-1 text-sm text-muted">Próximos, entrenamientos y jugados, cada uno por su lado.</p>
      {grupos.proximos.length === 0 && grupos.jugados.length === 0 && grupos.falta.length === 0 && grupos.entrenamientos.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {staff
            ? "Todavía no hay fechas. Tocá Nuevo para cargar el próximo partido."
            : "Todavía no hay fechas. Cuando el DT cargue una, aparece acá."}
        </p>
      ) : null}
      {grupos.proximos.length > 0 ? (
        <ul className="mt-4 space-y-3 desk:grid desk:grid-cols-2 desk:gap-3 desk:space-y-0">
          {grupos.proximos.map((event) => (
            <li key={event.id}>
              <AgendaItem event={event} staff={staff} />
            </li>
          ))}
        </ul>
      ) : null}
      {grupos.falta.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-warning">Falta el resultado</h2>
          <ul className="mt-3 space-y-3 desk:grid desk:grid-cols-2 desk:gap-3 desk:space-y-0">
            {grupos.falta.map((event) => (
              <li key={event.id}>
                <AgendaItem event={event} staff={staff} needsResult />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {grupos.entrenamientos.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Entrenamientos</h2>
          <ul className="mt-3 space-y-3 desk:grid desk:grid-cols-2 desk:gap-3 desk:space-y-0">
            {grupos.entrenamientos.map((event) => (
              <li key={event.id}>
                <AgendaItem event={event} staff={staff} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {grupos.jugados.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Jugados</h2>
          <ul className="mt-3 space-y-3 desk:grid desk:grid-cols-2 desk:gap-3 desk:space-y-0">
            {grupos.jugados.map((event) => (
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
  const rsvps = useRespuestas();
  const me = useMe();
  const setRsvp = useFija((s) => s.setRsvp);
  const sheet = sheetFor(event.id, useFija((s) => s.matchSheets));
  const eventRsvps = rsvps.filter((row) => row.eventId === event.id);
  const mine = eventRsvps.find((row) => row.memberId === me.id);
  const plays = me.juega ?? me.role === "jugador";
  const open =
    plays &&
    +new Date(event.startsAt) >= Date.now() - 3_600_000 &&
    !(event.kind === "partido" && matchSettled(event, sheet));
  return (
    <EventCard
      event={event}
      rsvps={eventRsvps}
      result={sheet ? { gf: sheet.goalsFor, ga: sheet.goalsAgainst } : undefined}
    >
      {open ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            className="h-12"
            variant={mine?.status === "voy" ? "success" : "secondary"}
            onClick={() => setRsvp(event.id, "voy")}
          >
            {mine?.status === "voy" ? "Voy ✓" : "Voy"}
          </Button>
          <Button
            className="h-12"
            variant={mine?.status === "no" ? "danger" : "secondary"}
            onClick={() => setRsvp(event.id, "no")}
          >
            {mine?.status === "no" ? "No voy ✕" : "No voy"}
          </Button>
        </div>
      ) : null}
      {needsResult && staff ? (
        <p className="mt-2 text-sm font-medium text-warning">Falta cargar el resultado.</p>
      ) : null}
      {staff ? (
        <div className="mt-2 flex justify-end gap-2">
          {event.kind === "partido" ? (
            <Link to="/fecha" search={{ partido: event.id }} className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-accent">
              Ver fecha
            </Link>
          ) : null}
          {event.kind === "partido" && resultIsOpen(event.startsAt) ? (
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