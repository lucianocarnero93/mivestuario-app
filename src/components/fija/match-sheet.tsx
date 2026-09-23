import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWhen } from "@/lib/fija/format";
import { clampStat, outcome, resultLabel } from "@/lib/fija/stats";
import { defaultSheetPlayers, sheetFor, useFija } from "@/lib/fija/store";
import type { ClubEvent, PlayerMatchStat } from "@/lib/fija/types";
import { cn } from "@/lib/utils";

export function MatchSheetForm({
  event,
  onDone,
}: {
  event: ClubEvent;
  onDone: () => void;
}) {
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const saveMatchSheet = useFija((s) => s.saveMatchSheet);
  const existing = sheetFor(event.id, sheets);
  const [opponent, setOpponent] = useState(
    existing?.opponent ?? event.title.replace(/^vs\s+/i, ""),
  );
  const [gf, setGf] = useState(existing?.goalsFor ?? 0);
  const [ga, setGa] = useState(existing?.goalsAgainst ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [rows, setRows] = useState<PlayerMatchStat[]>(() =>
    defaultSheetPlayers(event, members, existing),
  );
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const sumGoals = rows.reduce((n, row) => n + row.goals, 0);
  const result = outcome(gf, ga);

  function patch(memberId: string, key: keyof Omit<PlayerMatchStat, "memberId">, delta: number) {
    setRows((list) =>
      list.map((row) =>
        row.memberId === memberId ? { ...row, [key]: clampStat(row[key] + delta) } : row,
      ),
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        saveMatchSheet({
          eventId: event.id,
          opponent,
          goalsFor: gf,
          goalsAgainst: ga,
          notes,
          players: rows.filter((row) => {
            const used = Object.values(event.lineup).includes(row.memberId);
            return used || row.goals + row.assists + row.yellow + row.red > 0;
          }),
        });
        onDone();
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {formatWhen(event.startsAt)}
        </p>
        <h2 className="text-xl font-semibold">{event.title}</h2>
      </div>

      <div>
        <Label htmlFor="rival">Rival</Label>
        <Input
          id="rival"
          className="mt-1"
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreBox label="Goles a favor" value={gf} onChange={setGf} accent />
        <ScoreBox label="Goles en contra" value={ga} onChange={setGa} />
      </div>

      <p
        className={cn(
          "rounded-lg px-3 py-2 text-center text-sm font-semibold",
          result === "won" && "bg-accent text-accent-fg",
          result === "drawn" && "bg-surface-2 text-warning",
          result === "lost" && "bg-surface-2 text-danger",
        )}
      >
        {gf}–{ga} · {resultLabel(gf, ga)}
      </p>

      {sumGoals !== gf ? (
        <p className="text-xs text-warning">
          La suma de goles individuales ({sumGoals}) no coincide con el resultado.
        </p>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
          Estadísticas individuales
        </h3>
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-card">
          {rows.map((row) => {
            const player = byId.get(row.memberId);
            if (!player) return null;
            return (
              <li key={row.memberId} className="px-3 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {player.number != null ? (
                      <span className="mr-1 tabular-nums text-accent">{player.number}</span>
                    ) : null}
                    {player.nick}
                  </p>
                  <p className="text-xs text-subtle">{player.name}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <MiniStat label="Goles" value={row.goals} onChange={(d) => patch(row.memberId, "goals", d)} />
                  <MiniStat
                    label="Asistencias"
                    value={row.assists}
                    onChange={(d) => patch(row.memberId, "assists", d)}
                  />
                  <MiniStat
                    label="Amarillas"
                    value={row.yellow}
                    onChange={(d) => patch(row.memberId, "yellow", d)}
                    warn
                  />
                  <MiniStat
                    label="Rojas"
                    value={row.red}
                    onChange={(d) => patch(row.memberId, "red", d)}
                    danger
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <Label htmlFor="notes">Nota del partido</Label>
        <Input
          id="notes"
          className="mt-1"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Penal, clima, lesiones…"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-14 flex-1" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" className="h-14 flex-1">
          Guardar planilla
        </Button>
      </div>
    </form>
  );
}

export function MatchSheetRead({
  event,
  onBack,
}: {
  event: ClubEvent;
  onBack: () => void;
}) {
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const sheet = sheetFor(event.id, sheets);
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  if (!sheet) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">El DT todavía no cargó la planilla de este partido.</p>
        <Button variant="outline" className="h-12 w-full" onClick={onBack}>
          Volver
        </Button>
      </div>
    );
  }

  const result = outcome(sheet.goalsFor, sheet.goalsAgainst);
  const marked = sheet.players.filter(
    (row) => row.goals + row.assists + row.yellow + row.red > 0,
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {formatWhen(event.startsAt)}
        </p>
        <h2 className="text-xl font-semibold">{event.title}</h2>
        <p className="text-sm text-muted">vs {sheet.opponent}</p>
      </div>

      <p
        className={cn(
          "rounded-lg px-3 py-4 text-center text-lg font-semibold",
          result === "won" && "bg-accent text-accent-fg",
          result === "drawn" && "bg-surface-2 text-warning",
          result === "lost" && "bg-surface-2 text-danger",
        )}
      >
        {sheet.goalsFor}–{sheet.goalsAgainst} · {resultLabel(sheet.goalsFor, sheet.goalsAgainst)}
      </p>

      {marked.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-card">
          {marked.map((row) => {
            const player = byId.get(row.memberId);
            if (!player) return null;
            return (
              <li key={row.memberId} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{player.nick}</span>
                  <span className="text-xs text-muted">{player.name}</span>
                </span>
                <span className="text-right text-xs tabular-nums text-muted">
                  {row.goals > 0 ? <span className="block font-semibold text-accent">{row.goals} goles</span> : null}
                  {row.assists > 0 ? <span className="block">{row.assists} asist.</span> : null}
                  {row.yellow > 0 ? <span className="block text-warning">{row.yellow} amarilla</span> : null}
                  {row.red > 0 ? <span className="block text-danger">{row.red} roja</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Sin goles, asistencias ni tarjetas individuales.</p>
      )}

      {sheet.notes ? (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm shadow-card">{sheet.notes}</p>
      ) : null}

      <Button variant="outline" className="h-12 w-full" onClick={onBack}>
        Volver a estadísticas
      </Button>
    </div>
  );
}

function ScoreBox({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <StepperButton onClick={() => onChange(clampStat(value - 1))}>−</StepperButton>
        <span className={cn("text-3xl font-semibold tabular-nums", accent && "text-accent")}>
          {value}
        </span>
        <StepperButton onClick={() => onChange(clampStat(value + 1))}>+</StepperButton>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  onChange,
  warn,
  danger,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md bg-bg px-2 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-xl text-muted"
          onClick={() => onChange(-1)}
        >
          −
        </button>
        <span
          className={cn(
            "w-6 text-center text-base font-semibold tabular-nums",
            warn && value > 0 && "text-warning",
            danger && value > 0 && "text-danger",
          )}
        >
          {value}
        </span>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-xl text-muted"
          onClick={() => onChange(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function StepperButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-11 place-items-center rounded-md bg-surface-2 text-xl text-fg"
    >
      {children}
    </button>
  );
}
