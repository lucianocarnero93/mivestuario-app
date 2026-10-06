// Pizarra: el DT arma el plan y el jugador ve primero su puesto.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PizarraViva } from "@/components/fija/pizarra-viva";
import { formatWhen } from "@/lib/fija/format";
import { matchSettled, nextEvent, sheetFor, useFija, useIsStaff } from "@/lib/fija/store";

export const Route = createFileRoute("/cancha")({ component: CanchaPage });

function CanchaPage() {
  const staff = useIsStaff();
  const events = useFija((s) => s.events);
  const tournaments = useFija((s) => s.tournaments);
  const sheets = useFija((s) => s.matchSheets);
  const matchEvents = events
    .filter((event) => event.kind === "partido")
    .filter((event) => {
      const closed = tournaments.some(
        (tournament) => tournament.id === event.tournamentId && tournament.status === "finished",
      );
      if (!closed) return true;
      return !matchSettled(event, sheetFor(event.id, sheets));
    })
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const fallback = nextEvent(matchEvents, { tournaments, sheets }) ?? matchEvents[matchEvents.length - 1];
  const [eventId, setEventId] = useState(fallback?.id ?? "");
  const event = matchEvents.find((e) => e.id === eventId) ?? fallback;

  if (!event) {
    return (
      <main className="px-4 py-6">
        <h1 className="text-3xl font-semibold">Sin pizarra</h1>
        <p className="mt-2 text-sm text-muted">Agendá un partido para armar la formación.</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-5">
      <h1 className="text-3xl font-semibold">Pizarra</h1>
      <p className="text-sm text-muted">{event.title} · {formatWhen(event.startsAt)}</p>
      {matchEvents.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {matchEvents.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setEventId(item.id)}
              className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${item.id === event.id ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      ) : null}
      {staff || event.lineupPublishedAt ? (
        <PizarraViva key={event.id} event={event} />
      ) : (
        <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">
          El DT todavía no publicó la formación.
        </p>
      )}
    </main>
  );
}
