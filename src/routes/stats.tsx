// Estadísticas: goleadores, asistencias, tarjetas y torneos.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MatchSheetForm, MatchSheetRead } from "@/components/fija/match-sheet";
import { PremioMini } from "@/components/fija/premio-card";
import { CardRow, MyNumbers, RankBlock, RankRow, RecordStrip } from "@/components/fija/stat-blocks";
import { useContextoPremios } from "@/components/fija/use-premios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resultIsOpen } from "@/lib/fija/club-rules";
import { formatDay, plural } from "@/lib/fija/format";
import { enJuego, rachaVoy } from "@/lib/fija/fecha";
import { figuraDe, mesDe, votacionAbierta, FIGURA_CIERRE_HORAS } from "@/lib/fija/figura";
import { FIGURA_MIN_VOTOS, mesAnterior, nombreMes, premiosDelMes, premiosDelPartido } from "@/lib/fija/premios";
import { alumniMember, outcome, playerRows, rankedBy, resultLabel, teamRecord, type PlayerRow } from "@/lib/fija/stats";
import { frasePuesto, posicionRanking, validarPlanilla, vitrina } from "@/lib/fija/vista";
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
import type { ClubEvent, FiguraVote, MatchSheet, Member, Tournament } from "@/lib/fija/types";

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
  const rsvps = useFija((s) => s.rsvps);
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
  const [ficha, setFicha] = useState<string | null>(null);
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
  const byId = new Map(members.map((m) => [m.id, m]));
  const personOf = (id: string) => byId.get(id) ?? alumniMember(alumni, id);
  const juega = me.juega ?? me.role === "jugador";
  const pending = staff
    ? partidos.filter(
        (e) =>
          !eventOfClosedTournament(e, tournaments) &&
          !matchSettled(e) &&
          !enJuego(e) &&
          +new Date(e.startsAt) < Date.now(),
      )
    : [];
  const figuras = vecesFigura(votes ?? [], events)
    .filter((row) => rows.some((item) => item.memberId === row.memberId))
    .sort((a, b) => b.veces - a.veces);
  const abrir = staff ? (id: string) => setFicha(id) : undefined;
  const currentLabel = scope === "general" ? "General del equipo" : tournaments.find((t) => t.id === scope)?.name;
  const mine = rows.find((row) => row.memberId === me.id);

  return (
    <main className="px-4 py-5">
      <p className="text-sm text-muted">{club?.name}</p>
      <h1 className="text-2xl font-semibold">Estadísticas</h1>
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
        {staff ? (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="h-11 shrink-0 rounded-full bg-surface px-4 text-sm font-semibold">Torneos</button>
            </DialogTrigger>
            <DialogContent title="Torneos">
              <Torneos
                scope={scope}
                tournaments={tournaments}
                selected={selected}
                live={live}
                newName={newName}
                setNewName={setNewName}
                nameDraft={nameDraft}
                setNameDraft={setNameDraft}
                events={events}
                sheets={sheets}
                currentLabel={currentLabel}
                onRename={renameTournament}
                onFinish={finishTournament}
                onReopen={reopenTournament}
                onCreate={createTournament}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <ParaHacer
        staff={staff}
        pending={pending}
        partidos={partidos}
        sheets={sheets}
        events={events}
        onOpen={(id) => navigate({ to: "/stats", search: { partido: id, torneo: scope } })}
      />
      {!staff && juega ? <TuLado me={me} rows={rows} events={events} members={members} /> : null}

      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent">{currentLabel}</p>
      <div className="mt-2">
        <RecordStrip record={record} />
      </div>
      {staff ? <PremiosMes /> : null}

      {!staff && juega ? (
        <div className="mt-4">
          <MyNumbers member={me} row={mine} figuras={vecesDe(votes ?? [], events, me.id)} racha={rachaVoy(events, rsvps, me.id, sheets)} />
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        <RankBlock title="Goleadores" empty="Todavía no hay goles cargados.">
          {scorers.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={personOf(row.memberId)}
              value={row.goals}
              unit={plural(row.goals, "gol", "goles").replace(/^\d+\s/, "")}
              onOpen={abrir ? () => abrir(row.memberId) : undefined}
            />
          ))}
        </RankBlock>
        <RankBlock title="Asistentes" empty="Nadie cargó asistencias todavía.">
          {assists.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={personOf(row.memberId)}
              value={row.assists}
              unit={plural(row.assists, "asistencia", "asistencias").replace(/^\d+\s/, "")}
              onOpen={abrir ? () => abrir(row.memberId) : undefined}
            />
          ))}
        </RankBlock>
        <RankBlock title="Figuras" empty="Todavía no hay figura votada.">
          {figuras.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={personOf(row.memberId)}
              value={row.veces}
              unit={plural(row.veces, "vez", "veces").replace(/^\d+\s/, "")}
              onOpen={abrir ? () => abrir(row.memberId) : undefined}
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
                        <span className="block truncate font-medium">
                          {resultLabel(sheet.goalsFor, sheet.goalsAgainst)} {sheet.goalsFor}–{sheet.goalsAgainst} vs {sheet.opponent.trim() || event.title}
                        </span>
                        <span className="text-xs text-muted">
                          {formatDay(event.startsAt)}
                          {staff && validarPlanilla(sheet).faltan > 0 ? ` · Faltan ${validarPlanilla(sheet).faltan} goleadores · Completar` : ""}
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
      <Dialog open={Boolean(ficha)} onOpenChange={(open) => { if (!open) setFicha(null); }}>
        <DialogContent title={ficha ? personOf(ficha).nick : "Vitrina"}>
          {ficha ? <Vitrina memberId={ficha} events={events} members={members} /> : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function vecesDe(votes: FiguraVote[], events: ClubEvent[], memberId: string): number {
  return vecesFigura(votes, events).find((row) => row.memberId === memberId)?.veces ?? 0;
}

function vecesFigura(votes: FiguraVote[], events: ClubEvent[]): { memberId: string; veces: number }[] {
  const cuenta = new Map<string, number>();
  for (const event of events) {
    if (!event.resultClosedAt || votacionAbierta(event, Date.now())) continue;
    const figura = figuraDe(votes, event.id);
    if (!figura || figura.votos < FIGURA_MIN_VOTOS) continue;
    for (const id of figura.ids) cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
  }
  return [...cuenta.entries()].map(([memberId, veces]) => ({ memberId, veces }));
}

function ParaHacer({
  staff,
  pending,
  partidos,
  sheets,
  events,
  onOpen,
}: {
  staff: boolean;
  pending: ClubEvent[];
  partidos: ClubEvent[];
  sheets: MatchSheet[];
  events: ClubEvent[];
  onOpen: (id: string) => void;
}) {
  if (!staff) return null;
  const incompletas = partidos.filter((event) => {
    const sheet = sheetFor(event.id, sheets);
    return Boolean(event.resultClosedAt && sheet && validarPlanilla(sheet).faltan > 0);
  });
  const abiertas = events.filter((event) => event.kind === "partido" && event.resultClosedAt && votacionAbierta(event, Date.now()));
  if (pending.length === 0 && incompletas.length === 0 && abiertas.length === 0) return null;
  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-warning">Para hacer</h2>
      <ul className="mt-3 space-y-2">
        {pending.map((event) => (
          <li key={event.id}>
            <Button variant="secondary" className="h-12 w-full justify-between" onClick={() => onOpen(event.id)}>
              <span className="truncate">{event.title}</span>
              <span className="text-xs">Falta resultado</span>
            </Button>
          </li>
        ))}
        {incompletas.map((event) => {
          const sheet = sheetFor(event.id, sheets);
          const faltan = sheet ? validarPlanilla(sheet).faltan : 0;
          return (
            <li key={`gol-${event.id}`}>
              <Button variant="outline" className="h-12 w-full justify-between" onClick={() => onOpen(event.id)}>
                <span className="truncate">{event.title}</span>
                <span className="text-xs">Faltan {faltan} goleadores · Completar</span>
              </Button>
            </li>
          );
        })}
        {abiertas.map((event) => {
          const cierra = Date.parse(event.resultClosedAt ?? "") + FIGURA_CIERRE_HORAS * 3_600_000;
          const horas = Math.max(1, Math.ceil((cierra - Date.now()) / 3_600_000));
          return (
            <li key={`voto-${event.id}`} className="rounded-lg bg-bg p-3">
              <p className="text-sm font-semibold">Votá la figura · {event.title}</p>
              <p className="text-xs text-muted">Cierra en {horas} h. Si no lo votaron, no es figura.</p>
              <Button
                variant="outline"
                className="mt-2 h-11 w-full"
                onClick={() => {
                  const link = `${window.location.origin}/fecha?partido=${event.id}#votar`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Votá la figura de anoche 👉 ${link}`)}`, "_blank", "noopener,noreferrer");
                }}
              >
                Mandar link de votación
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TuLado({
  me,
  rows,
  events,
  members,
}: {
  me: Member;
  rows: PlayerRow[];
  events: ClubEvent[];
  members: Member[];
}) {
  const ctx = useContextoPremios();
  const goles = posicionRanking(me.id, rows.map((row) => ({ memberId: row.memberId, valor: row.goals })));
  const asistencias = posicionRanking(me.id, rows.map((row) => ({ memberId: row.memberId, valor: row.assists })));
  const ultimo = ultimoPremio(me.id, events, ctx);
  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Tu última card</h2>
        {ultimo ? (
          <div className="mt-3 flex justify-center">
            <PremioMini premio={ultimo} ctx={ctx} />
          </div>
        ) : (
          <p className="mt-2 text-sm">Tu primera card se gana en la cancha. Votá la figura después de cada partido.</p>
        )}
      </section>
      {goles || asistencias ? (
        <section className="rounded-xl bg-surface p-4 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Tu posición</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {goles ? <li>{frasePuesto(goles, "gol", "goles", "goleador del mes")}</li> : null}
            {asistencias ? <li>{frasePuesto(asistencias, "asistencia", "asistencias")}</li> : null}
          </ul>
        </section>
      ) : null}
      <Vitrina memberId={me.id} events={events} members={members} />
    </div>
  );
}

function ultimoPremio(
  memberId: string,
  events: ClubEvent[],
  ctx: ReturnType<typeof useContextoPremios>,
) {
  const dePartido = events
    .filter((event) => event.resultClosedAt)
    .flatMap((event) => premiosDelPartido(event.id, ctx).filter((premio) => premio.memberId === memberId).map((premio) => ({
      premio,
      cuando: Date.parse(event.resultClosedAt ?? event.startsAt),
    })));
  const meses = [...new Set(events.map((event) => mesDe(event.startsAt)).filter(Boolean))];
  const deMes = meses.flatMap((mes) =>
    premiosDelMes(mes, ctx)
      .filter((premio) => premio.memberId === memberId)
      .map((premio) => ({ premio, cuando: Date.parse(`${mes}-01T12:00:00-03:00`) })),
  );
  return [...dePartido, ...deMes].sort((a, b) => b.cuando - a.cuando)[0]?.premio;
}

function Vitrina({
  memberId,
  events,
  members,
}: {
  memberId: string;
  events: ClubEvent[];
  members: Member[];
}) {
  const ctx = useContextoPremios();
  const todos = [
    ...events.filter((event) => event.resultClosedAt).flatMap((event) => premiosDelPartido(event.id, ctx)),
    ...[...new Set(events.map((event) => mesDe(event.startsAt)).filter(Boolean))].flatMap((mes) => premiosDelMes(mes, ctx)),
  ];
  const huecos = vitrina(todos, memberId);
  const person = members.find((item) => item.id === memberId);
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Completá la vitrina de la temporada.</h2>
      {person ? <p className="mt-1 text-sm text-muted">{person.nick}</p> : null}
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {huecos.map((item) => {
          const premio = todos.find((row) => row.memberId === memberId && row.tipo === item.tipo);
          return (
            <li key={item.tipo} className={`overflow-hidden ${item.ganada ? "rounded-xl bg-surface p-2 shadow-card" : "rounded-xl bg-bg p-3 opacity-80"} [&_img]:h-[150px] [&_img]:w-full [&_img]:object-cover`}>
              {item.ganada && premio ? (
                <PremioMini premio={premio} ctx={ctx} />
              ) : (
                <>
                  <p className="text-sm font-semibold">{item.ganada ? `${item.titulo} ×${item.cantidad}` : item.titulo}</p>
                  <p className="mt-1 text-xs text-muted">{item.pista}</p>
                </>
              )}
              {item.ganada && item.cantidad > 1 ? <p className="mt-1 text-xs font-semibold text-accent">×{item.cantidad}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PremiosMes() {
  const ctx = useContextoPremios();
  const mes = mesAnterior(mesDe(new Date().toISOString()));
  const premios = premiosDelMes(mes, ctx);
  if (premios.length === 0) return null;
  return (
    <section className="mt-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Premios de {nombreMes(mes)}</h2>
      <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {premios.map((premio) => (
          <PremioMini key={premio.id} premio={premio} ctx={ctx} />
        ))}
      </div>
    </section>
  );
}

function Torneos({
  scope,
  tournaments,
  selected,
  live,
  newName,
  setNewName,
  nameDraft,
  setNameDraft,
  events,
  sheets,
  currentLabel,
  onRename,
  onFinish,
  onReopen,
  onCreate,
}: {
  scope: string;
  tournaments: Tournament[];
  selected: Tournament | undefined;
  live: Tournament | undefined;
  newName: string;
  setNewName: (value: string) => void;
  nameDraft: string | null;
  setNameDraft: (value: string | null) => void;
  events: ClubEvent[];
  sheets: MatchSheet[];
  currentLabel: string | undefined;
  onRename: (id: string, name: string) => void;
  onFinish: (id: string) => void;
  onReopen: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  return (
    <div>
      {tournaments.length === 0 ? (
        <p className="text-sm text-muted">Un partido puede ser amistoso. Abrí un torneo si querés separar liga y copa.</p>
      ) : null}
      {scope !== "general" && selected ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = (nameDraft ?? selected.name).trim();
            if (!next || next === selected.name) return;
            onRename(selected.id, next);
            setNameDraft(null);
          }}
        >
          <p className="text-sm text-muted">Nombre del torneo.</p>
          <Input value={nameDraft ?? selected.name} onChange={(e) => setNameDraft(e.target.value)} required />
          <Button type="submit" variant="secondary" className="h-12 w-full">Guardar nombre</Button>
        </form>
      ) : null}
      {scope !== "general" && selected?.status === "active" ? (
        <FinishTournament
          name={selected.name}
          events={events.filter((event) => event.tournamentId === scope)}
          sheets={sheets}
          onFinish={() => onFinish(scope)}
        />
      ) : null}
      {scope !== "general" && selected?.status === "finished" ? (
        <div className="mt-2">
          <p className="text-sm text-muted">{currentLabel} está cerrado. Los partidos que todavía no se jugaron siguen en la agenda.</p>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={() => onReopen(scope)}>Reabrir torneo</Button>
        </div>
      ) : null}
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(newName);
          setNewName("");
        }}
      >
        <p className="text-sm text-muted">
          {live ? `También podés abrir otro torneo. ${live.name} sigue activo.` : "Nombre del torneo."}
        </p>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Clausura 2026" required />
        <Button type="submit" className="h-12 w-full">Empezar torneo</Button>
      </form>
    </div>
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
