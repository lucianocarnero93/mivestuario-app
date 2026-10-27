// Pizarra: el plan, el rol y el resto de las pestañas.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PizarraV2, type TabPizarra } from "@/components/fija/pizarra-v2";
import { matchSettled, nextEvent, sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";

const TABS = ["plan", "rol", "momentos", "pelota", "despues", "equipo"] as const;

function tabDe(valor: unknown, staff: boolean): TabPizarra {
  if (typeof valor === "string" && (TABS as readonly string[]).includes(valor)) return valor as TabPizarra;
  return staff ? "plan" : "rol";
}

export const Route = createFileRoute("/cancha")({
  validateSearch: (search: Record<string, unknown>) => ({
    partido: typeof search.partido === "string" ? search.partido : undefined,
    tab: typeof search.tab === "string" && (TABS as readonly string[]).includes(search.tab) ? (search.tab as TabPizarra) : undefined,
    carta: typeof search.carta === "string" ? search.carta : undefined,
  }),
  component: CanchaPage,
});

function CanchaPage() {
  const staff = useIsStaff();
  const me = useMe();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const events = useFija((s) => s.events);
  const members = useFija((s) => s.members);
  const tournaments = useFija((s) => s.tournaments);
  const sheets = useFija((s) => s.matchSheets);
  const matchEvents = events
    .filter((event) => event.kind === "partido")
    .filter((event) => {
      const closed = tournaments.some((tournament) => tournament.id === event.tournamentId && tournament.status === "finished");
      if (!closed) return true;
      return !matchSettled(event, sheetFor(event.id, sheets));
    })
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const fallback = nextEvent(matchEvents, { tournaments, sheets }) ?? matchEvents[matchEvents.length - 1];
  const [elegido, setElegido] = useState(search.partido || fallback?.id || "");
  const event = events.find((item) => item.id === elegido) ?? fallback;
  const tab = tabDe(search.tab, staff);

  if (!event) {
    return (
      <main className="px-4 py-6">
        <h1 className="text-3xl font-semibold">Sin pizarra</h1>
        <p className="mt-2 text-sm text-muted">Agendá un partido para armar la formación.</p>
      </main>
    );
  }

  function ir(siguiente: { tab?: TabPizarra; carta?: string; partido?: string }) {
    const partido = siguiente.partido ?? event?.id;
    void navigate({
      to: "/cancha",
      search: { partido, tab: siguiente.tab ?? tab, carta: siguiente.carta },
      replace: true,
    });
  }

  return (
    <PizarraV2
      event={event}
      events={matchEvents}
      sheets={sheets}
      members={members}
      staff={staff}
      meId={me.id}
      tab={tab}
      carta={search.carta}
      onTab={(id) => ir({ tab: id })}
      onCarta={(carta) => ir({ carta })}
      onEvento={(id) => {
        setElegido(id);
        ir({ partido: id });
      }}
    />
  );
}
