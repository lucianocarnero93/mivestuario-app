import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EnCancha, FiguraPartido, ParaLaFamilia } from "@/components/fija/partido";
import { Button } from "@/components/ui/button";
import { enJuego, rachaGoles, rachaInvicto, rachaVoy, recapSemana } from "@/lib/fija/fecha";
import { leerFamilia } from "@/lib/fija/familia";
import { sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";
import type { ClubEvent, ReaccionFecha } from "@/lib/fija/types";

export const Route = createFileRoute("/fecha")({
  component: FechaPage,
  validateSearch: (search: Record<string, unknown>) => ({
    partido: typeof search.partido === "string" ? search.partido : undefined,
  }),
});

const EMOJIS: { id: ReaccionFecha["emoji"]; label: string }[] = [
  { id: "fuego", label: "🔥" },
  { id: "aplauso", label: "👏" },
  { id: "risa", label: "😂" },
];

function FechaPage() {
  const { partido } = Route.useSearch();
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const staff = useIsStaff();
  const elegido = events.find((event) => event.id === partido && event.kind === "partido");
  const vivo = events.find((event) => event.kind === "partido" && enJuego(event) && !event.fechaOculta);
  const actual = elegido ?? vivo;
  const recap = recapSemana(events, sheets);

  return (
    <main className="px-4 py-5">
      <h1 className="text-2xl font-semibold">Fecha</h1>
      <p className="mt-1 text-sm text-muted">El partido. Sin chat.</p>
      {recap.pj > 0 ? (
        <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm shadow-card">
          Esta semana: {recap.pj} {recap.pj === 1 ? "partido" : "partidos"} · {recap.gf} goles a favor.
        </p>
      ) : null}
      {actual ? <FechaViva event={actual} /> : null}
      <Historial actualId={actual?.id} staff={staff} />
    </main>
  );
}

function FechaViva({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const me = useMe();
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const rsvps = useFija((s) => s.rsvps);
  const markMatchResult = useFija((s) => s.markMatchResult);
  const reaccionarFecha = useFija((s) => s.reaccionarFecha);
  const ocultarFecha = useFija((s) => s.ocultarFecha);
  const flushCloud = useFija((s) => s.flushCloud);
  const [familias, setFamilias] = useState(0);
  const [nota, setNota] = useState("");
  const sheet = sheetFor(event.id, sheets);
  const cerrado = Boolean(event.resultClosedAt);
  const byId = new Map(members.map((person) => [person.id, person]));
  const goleadores = (sheet?.players ?? [])
    .filter((row) => row.goals > 0)
    .map((row) => `${byId.get(row.memberId)?.nick ?? "Jugador"} ${row.goals}`)
    .join(", ");
  const mia = event.reacciones?.find((item) => item.memberId === me.id);
  const racha = rachaVoy(useFija.getState().events, rsvps, me.id, sheets);
  const rachaGoleador = rachaGoles(sheets, useFija.getState().events, me.id);

  useEffect(() => {
    if (!event.liveToken) return;
    void leerFamilia({ data: event.liveToken }).then((result) => setFamilias(result.n)).catch(() => setFamilias(0));
  }, [event.liveToken, event.resultClosedAt]);
  const invicto = rachaInvicto(sheets, useFija.getState().events);

  return (
    <section className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {cerrado ? "Final" : enJuego(event) ? "En juego" : "Próximo"}
      </p>
      <h2 className="mt-1 text-3xl font-semibold">{event.title}</h2>
      <p className="text-sm text-muted">
        {event.place || "Sin cancha"}
        {racha > 1 ? ` · ${racha} voy seguidos` : ""}
        {invicto > 1 ? ` · ${invicto} sin perder` : ""}
        {rachaGoleador > 1 ? ` · ${rachaGoleador} con gol` : ""}
        {familias > 0 ? ` · ${familias} familias` : ""}
      </p>
      {sheet ? (
        <p className="mt-3 text-6xl font-semibold tracking-tight">
          {sheet.goalsFor}–{sheet.goalsAgainst}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Todavía no hay marcador.</p>
      )}
      {goleadores ? <p className="mt-2 text-sm">Goles: {goleadores}</p> : null}
      {staff && !cerrado ? <EnCancha event={event} /> : null}
      {staff ? <ParaLaFamilia event={event} /> : null}
      <div className="mt-3 grid gap-2">
        {staff && !cerrado ? (
          <Button
            className="h-14"
            onClick={() => {
              markMatchResult(event.id, true);
              void flushCloud();
              setNota("Partido terminado. La familia ve el final si el link sigue abierto.");
            }}
          >
            Terminar partido
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-12">
          <Link to="/stats" search={{ partido: event.id, torneo: event.tournamentId ?? "general" }}>
            {sheet ? "Ver planilla" : "Cargar planilla"}
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-12">
          <Link to="/cancha">Indicaciones en la pizarra</Link>
        </Button>
      </div>
      {cerrado ? <FiguraPartido event={event} /> : null}
      <div className="mt-4 flex gap-2">
        {EMOJIS.map((emoji) => {
          const cuenta = event.reacciones?.filter((item) => item.emoji === emoji.id).length ?? 0;
          return (
            <button
              key={emoji.id}
              type="button"
              className={`h-12 flex-1 rounded-md text-sm font-semibold ${mia?.emoji === emoji.id ? "bg-accent text-accent-fg" : "bg-surface"}`}
              onClick={() => reaccionarFecha(event.id, emoji.id)}
            >
              {emoji.label} {cuenta || ""}
            </button>
          );
        })}
      </div>
      {staff ? (
        <Button variant="ghost" className="mt-3 h-12" onClick={() => ocultarFecha(event.id, !event.fechaOculta)}>
          {event.fechaOculta ? "Mostrar fecha" : "Ocultar fecha"}
        </Button>
      ) : null}
      {nota ? <p className="mt-2 text-sm text-accent">{nota}</p> : null}
    </section>
  );
}

function Historial({ actualId, staff }: { actualId?: string; staff: boolean }) {
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const members = useFija((s) => s.members);
  const pasados = events
    .filter((event) => event.kind === "partido" && event.id !== actualId && (staff || !event.fechaOculta))
    .filter((event) => event.resultClosedAt || sheetFor(event.id, sheets))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  if (pasados.length === 0) {
    return <p className="mt-8 text-sm text-muted">Todavía no hay fechas. Cuando carguen el primer resultado, aparece acá.</p>;
  }
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Fechas</h2>
      <ul className="mt-3 space-y-3">
        {pasados.map((event) => {
          const sheet = sheetFor(event.id, sheets);
          const goles = (sheet?.players ?? [])
            .filter((row) => row.goals > 0)
            .map((row) => members.find((person) => person.id === row.memberId)?.nick ?? "Jugador");
          return (
            <li key={event.id}>
              <Link
                to="/fecha"
                search={{ partido: event.id }}
                className="block rounded-xl bg-surface p-4 shadow-card"
              >
                <p className="text-sm text-muted">{event.title}</p>
                <p className="text-2xl font-semibold">{sheet ? `${sheet.goalsFor}–${sheet.goalsAgainst}` : "Sin cargar"}</p>
                {goles.length > 0 ? <p className="mt-1 text-sm text-muted">{goles.join(", ")}</p> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
