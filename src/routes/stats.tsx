// Estadísticas: goleadores, asistencias, tarjetas y torneos.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MatchSheetForm, MatchSheetRead } from "@/components/fija/match-sheet";
import { CardRow, MyNumbers, RankBlock, RankRow, RecordStrip } from "@/components/fija/stat-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resultIsOpen } from "@/lib/fija/club-rules";
import { formatDay } from "@/lib/fija/format";
import { figuraDe, goleadorDelMes } from "@/lib/fija/figura";
import { alumniMember, outcome, playerRows, rankedBy, resultLabel, teamRecord } from "@/lib/fija/stats";
import {
  activeTournament,
  eventOfClosedTournament,
  matchSettled,
  sheetFor,
  sheetsForScope,
  useFija,
  useIsStaff,
  useMe,
} from "@/lib/fija/store";
import { cn } from "@/lib/utils";
import type { ClubEvent, MatchSheet } from "@/lib/fija/types";

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    partido: typeof search.partido === "string" ? search.partido : undefined,
    torneo: typeof search.torneo === "string" ? search.torneo : "general",
  }),
});

function StatsPage() {
  const me = useMe();
  const staff = useIsStaff();
  const navigate = useNavigate();
  const { partido, torneo } = Route.useSearch();
  const club = useFija((s) => s.club);
  const events = useFija((s) => s.events);
  const members = useFija((s) => s.members);
  const alumni = useFija((s) => s.alumni);
  const sheets = useFija((s) => s.matchSheets);
  const votes = useFija((s) => s.figuraVotes);
  const tournaments = useFija((s) => s.tournaments);
  const createTournament = useFija((s) => s.createTournament);
  const renameTournament = useFija((s) => s.renameTournament);
  const finishTournament = useFija((s) => s.finishTournament);
  const reopenTournament = useFija((s) => s.reopenTournament);
  const scope = torneo || "general";
  const scopedSheets = sheetsForScope(sheets, events, scope);
  const partidos = events
    .filter((e) => e.kind === "partido")
    .filter((e) => scope === "general" || e.tournamentId === scope)
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const focused = partidos.find((e) => e.id === partido) ?? events.find((e) => e.id === partido);
  const live = activeTournament(tournaments);
  const [newName, setNewName] = useState("");
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const selected = tournaments.find((t) => t.id === scope);

  useEffect(() => {
    setNameDraft(null);
  }, [scope]);

  if (focused) {
    const back = () =>
      navigate({ to: "/stats", search: { partido: undefined, torneo: scope }, replace: true });
    return (
      <main className="px-4 py-5">
        <p className="text-sm text-muted">{staff ? "Planilla del DT" : club?.name}</p>
        <h1 className="text-2xl font-semibold">{staff ? "Cargar partido" : "Ficha del partido"}</h1>
        <div className="mt-4">
          {staff && resultIsOpen(focused.startsAt) ? (
            <MatchSheetForm event={focused} onDone={back} />
          ) : staff ? (
            <div>
              <p className="text-sm text-muted">El resultado se carga cuando llega el horario del partido.</p>
              <Button type="button" variant="outline" className="mt-4 h-12 w-full" onClick={back}>
                Volver
              </Button>
            </div>
          ) : (
            <MatchSheetRead event={focused} onBack={back} />
          )}
        </div>
      </main>
    );
  }

  const record = teamRecord(scopedSheets);
  const rows = playerRows(scopedSheets, members);
  const scorers = rankedBy(rows, "goals");
  const assists = rankedBy(rows, "assists");
  const cardRows = rows.filter((row) => row.yellow > 0 || row.red > 0);
  const ultimoConResultado = partidos.find((item) => matchSettled(item) && sheetFor(item.id, sheets));
  const figura = ultimoConResultado ? figuraDe(votes, ultimoConResultado.id) : null;
  const delMes = goleadorDelMes(scopedSheets, events);
  const byId = new Map(members.map((m) => [m.id, m]));
  const nombreDe = (id: string) => byId.get(id)?.nick ?? alumniMember(alumni, id).nick;
  const personOf = (id: string) => byId.get(id) ?? alumniMember(alumni, id);
  const mine = rows.find((row) => row.memberId === me.id);
  const pending = staff
    ? partidos.filter(
        (e) =>
          !eventOfClosedTournament(e, tournaments) &&
          !matchSettled(e) &&
          +new Date(e.startsAt) < Date.now(),
      )
    : [];
  const currentLabel = scope === "general" ? "General del equipo" : tournaments.find((t) => t.id === scope)?.name;

  return (
    <main className="px-4 py-5">
      <p className="text-sm text-muted">{club?.name}</p>
      <h1 className="text-2xl font-semibold">Estadísticas</h1>
      <section className="mt-4 grid gap-2">
        <div className="rounded-xl bg-surface px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Figura del partido</p>
          <p className="mt-1 text-sm">
            {figura
              ? `${figura.ids.map(nombreDe).join(" y ")} · ${ultimoConResultado?.title ?? ""}`
              : "Cuando voten después del partido, aparece acá."}
          </p>
        </div>
        <div className="rounded-xl bg-surface px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Goleador del mes</p>
          <p className="mt-1 text-sm">
            {delMes
              ? `${delMes.ids.map(nombreDe).join(" y ")} · ${delMes.goles} ${delMes.goles === 1 ? "gol" : "goles"}`
              : "Este mes todavía no hay goles cargados."}
          </p>
        </div>
      </section>
      <p className="mt-1 text-sm text-muted">
        Elegí un torneo para ver solo esos partidos. General suma todos los torneos que ya jugaron.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <ScopeChip
          active={scope === "general"}
          onClick={() => navigate({ to: "/stats", search: { torneo: "general", partido: undefined } })}
        >
          General · todos
        </ScopeChip>
        {tournaments.map((t) => (
          <ScopeChip
            key={t.id}
            active={scope === t.id}
            onClick={() => navigate({ to: "/stats", search: { torneo: t.id, partido: undefined } })}
          >
            {t.name}
            {t.status === "active" ? " · activo" : ""}
          </ScopeChip>
        ))}
      </div>

      {staff ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Gestión de torneo</p>
          {tournaments.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Un partido puede ser amistoso. Abrí un torneo si querés separar liga y copa.
            </p>
          ) : null}
          {scope !== "general" && selected ? (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const next = (nameDraft ?? selected.name).trim();
                if (!next || next === selected.name) return;
                renameTournament(selected.id, next);
                setNameDraft(null);
              }}
            >
              <p className="text-sm text-muted">Nombre del torneo.</p>
              <Input
                value={nameDraft ?? selected.name}
                onChange={(e) => setNameDraft(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" className="h-12 w-full">
                Guardar nombre
              </Button>
            </form>
          ) : null}
          {scope !== "general" && selected?.status === "active" ? (
            <FinishTournament
              name={selected?.name ?? "Este torneo"}
              events={events.filter((event) => event.tournamentId === scope)}
              sheets={sheets}
              onFinish={() => finishTournament(scope)}
            />
          ) : null}
          {scope !== "general" && tournaments.find((t) => t.id === scope)?.status === "finished" ? (
            <div className="mt-2">
              <p className="text-sm text-muted">
                {currentLabel} está cerrado. Los partidos que todavía no se jugaron siguen en la agenda.
              </p>
              <Button variant="secondary" className="mt-3 h-12 w-full" onClick={() => reopenTournament(scope)}>
                Reabrir torneo
              </Button>
            </div>
          ) : null}
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              createTournament(newName);
              setNewName("");
            }}
          >
            <p className="text-sm text-muted">
              {live
                ? `También podés abrir otro torneo. ${live.name} sigue activo.`
                : tournaments.length === 0
                  ? "Nombre del torneo."
                  : "Nombre del próximo torneo."}
            </p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Clausura 2026"
              required
            />
            <Button type="submit" className="h-12 w-full">
              Empezar torneo
            </Button>
          </form>
        </section>
      ) : null}

      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent">{currentLabel}</p>
      <div className="mt-2">
        <RecordStrip record={record} />
      </div>

      {(me.juega ?? me.role === "jugador") ? (
        <div className="mt-4">
          <MyNumbers member={me} row={mine} />
        </div>
      ) : null}

      {staff && pending.length > 0 ? (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-warning">
            Planillas pendientes
          </h2>
          <ul className="mt-2 space-y-2">
            {pending.map((event) => (
              <li key={event.id}>
                <Button
                  variant="secondary"
                  className="h-14 w-full justify-between"
                  onClick={() => navigate({ to: "/stats", search: { partido: event.id, torneo: scope } })}
                >
                  <span className="truncate">{event.title}</span>
                  <span className="text-xs text-muted">{formatDay(event.startsAt)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-5 space-y-5">
        <RankBlock title="Goleadores" empty="Todavía no hay goles cargados.">
          {scorers.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={personOf(row.memberId)}
              value={row.goals}
              unit={row.goals === 1 ? "gol" : "goles"}
            />
          ))}
        </RankBlock>
        <RankBlock title="Máximos asistentes" empty="Nadie cargó asistencias todavía.">
          {assists.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={personOf(row.memberId)}
              value={row.assists}
              unit="asistencias"
            />
          ))}
        </RankBlock>
        <RankBlock title="Tarjetas" empty="El equipo está limpio.">
          {cardRows
            .sort((a, b) => b.red - a.red || b.yellow - a.yellow)
            .map((row) => (
              <CardRow key={row.memberId} member={personOf(row.memberId)} row={row} />
            ))}
        </RankBlock>
      </div>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Historial</h2>
        {scopedSheets.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Cuando el DT cargue un partido, aparece acá.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {partidos
              .filter((e) => matchSettled(e) && sheetFor(e.id, sheets))
              .map((event) => {
                const sheet = sheetFor(event.id, sheets)!;
                const result = outcome(sheet.goalsFor, sheet.goalsAgainst);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({ to: "/stats", search: { partido: event.id, torneo: scope } })
                      }
                      className="flex w-full items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card"
                    >
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                          result === "won" && "bg-accent text-accent-fg",
                          result === "drawn" && "bg-surface-2 text-warning",
                          result === "lost" && "bg-surface-2 text-danger",
                        )}
                      >
                        {sheet.goalsFor}–{sheet.goalsAgainst}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{event.title}</span>
                        <span className="text-xs text-muted">
                          {formatDay(event.startsAt)}
                          {scope === "general"
                            ? ` · ${tournaments.find((t) => t.id === event.tournamentId)?.name ?? "Sin torneo"}`
                            : ""}
                          {" · "}
                          {resultLabel(sheet.goalsFor, sheet.goalsAgainst)}
                          {staff ? " · Editar" : " · Ver ficha"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </main>
  );
}

function ScopeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-full px-4 text-sm font-semibold",
        active ? "bg-accent text-accent-fg" : "bg-surface text-muted",
      )}
    >
      {children}
    </button>
  );
}

function FinishTournament({
  name,
  events,
  sheets,
  onFinish,
}: {
  name: string;
  events: ClubEvent[];
  sheets: MatchSheet[];
  onFinish: () => void;
}) {
  const [ask, setAsk] = useState(false);
  const pending = events.filter(
    (event) => +new Date(event.startsAt) >= Date.now() - 3_600_000 && !matchSettled(event, sheetFor(event.id, sheets)),
  );
  return (
    <div className="mt-2">
      <p className="text-sm">
        Estás viendo <span className="font-semibold">{name}</span>. Cerrar las estadísticas no borra los
        partidos que todavía no se jugaron: siguen en la agenda y en la pizarra.
      </p>
      {ask ? (
        <div className="mt-3 rounded-xl bg-surface p-4">
          <p className="text-sm">
            {pending.length > 0
              ? `Todavía hay ${pending.length} partido${pending.length === 1 ? "" : "s"} por jugar (${pending
                  .map((event) => event.title)
                  .slice(0, 3)
                  .join(", ")}). ¿Cerrar igual las estadísticas?`
              : "¿Cerrar las estadísticas de este torneo? Después podés reabrirlo."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="h-12"
              onClick={() => {
                onFinish();
                setAsk(false);
              }}
            >
              Cerrar
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => setAsk(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" className="mt-3 h-12 w-full" onClick={() => setAsk(true)}>
          Finalizar estadísticas de este torneo
        </Button>
      )}
    </div>
  );
}
