// Agenda: lista de partidos, entrenamientos y reuniones.
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreateEventButton, EditEventButton } from "@/components/fija/event-editor";
import { EventCard } from "@/components/fija/event-card";
import { sheetFor, useFija, useIsStaff } from "@/lib/fija/store";

export const Route = createFileRoute("/agenda")({ component: AgendaPage });

function AgendaPage() {
  const events = useFija((s) => s.events);
  const rsvps = useFija((s) => s.rsvps);
  const sheets = useFija((s) => s.matchSheets);
  const staff = useIsStaff();
  const sorted = [...events].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  return (
    <main className="px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        {staff ? <CreateEventButton /> : null}
      </div>
      <p className="mt-1 text-sm text-muted">Partidos, entrenos y reuniones del plantel.</p>
      <ul className="mt-4 space-y-3">
        {sorted.map((event) => {
          const sheet = sheetFor(event.id, sheets);
          return (
            <li key={event.id}>
              <EventCard
                event={event}
                rsvps={rsvps.filter((r) => r.eventId === event.id)}
                result={sheet ? { gf: sheet.goalsFor, ga: sheet.goalsAgainst } : undefined}
              >
                {staff ? (
                  <div className="mt-2 flex justify-end gap-2">
                    {event.kind === "partido" ? (
                      <Link
                        to="/stats"
                        search={{ partido: event.id, torneo: "general" }}
                        className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-accent"
                      >
                        {sheet ? "Editar planilla" : "Cargar planilla"}
                      </Link>
                    ) : null}
                    <EditEventButton event={event} />
                  </div>
                ) : null}
              </EventCard>
            </li>
          );
        })}
      </ul>
    </main>
  );
}