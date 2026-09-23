// Equipo: plantel, invitar jugadores y cambiar el puesto de cada uno.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { InviteShareButton } from "@/components/fija/invite-share";
import { CrestPicker, TeamCrest } from "@/components/fija/team-crest";
import {
  CardRow,
  MyNumbers,
  PlayerAvatar,
  PlayerMarks,
  RankBlock,
  RankRow,
  RecordStrip,
} from "@/components/fija/stat-blocks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "@/lib/fija/format";
import { playerRows, rankedBy, teamRecord } from "@/lib/fija/stats";
import { useFija, useIsCreator, useIsStaff, useMe } from "@/lib/fija/store";
import type { Role } from "@/lib/fija/types";

export const Route = createFileRoute("/equipo")({ component: EquipoPage });

function EquipoPage() {
  const me = useMe();
  const staff = useIsStaff();
  const creator = useIsCreator();
  const club = useFija((s) => s.club);
  const setClubCrest = useFija((s) => s.setClubCrest);
  const setMyPhoto = useFija((s) => s.setMyPhoto);
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const record = teamRecord(sheets);
  const rows = playerRows(sheets, members);
  const scorers = rankedBy(rows, "goals").slice(0, 5);
  const assists = rankedBy(rows, "assists").slice(0, 5);
  const cards = rows.filter((row) => row.yellow > 0 || row.red > 0);
  const byId = new Map(members.map((m) => [m.id, m]));
  const byMember = new Map(rows.map((row) => [row.memberId, row]));
  const coaches = members.filter((m) => m.role !== "jugador");
  const players = members.filter((m) => m.role === "jugador");
  const mine = byMember.get(me.id);

  return (
    <main className="px-4 py-5">
      <div className="flex items-center gap-3">
        <TeamCrest src={club?.crest} name={club?.name} className="size-14 text-xl" />
        <div>
          <h1 className="text-3xl font-semibold">{club?.name ?? "Equipo"}</h1>
          <p className="text-sm text-muted">Cuerpo técnico, plantel y estadísticas.</p>
        </div>
      </div>
      {staff ? (
        <div className="mt-4">
          <CrestPicker src={club?.crest} name={club?.name} onChange={setClubCrest} />
        </div>
      ) : null}
      <div className="mt-4">
        <CrestPicker
          src={me.photo}
          name={me.name}
          onChange={setMyPhoto}
          chooseLabel="Elegir mi foto"
          emptyHint="Tu avatar. En la formación se ve en tu puesto."
        />
      </div>

      {staff || creator ? (
        <div className="mt-4">
          <InviteShareButton />
          <p className="mt-1 text-center text-xs text-muted">Código de vestuario: {club?.inviteCode}</p>
        </div>
      ) : null}

      <section className="mt-5 space-y-5">
        <RecordStrip record={record} />
        {me.role === "jugador" ? <MyNumbers member={me} row={mine} /> : null}
        <RankBlock title="Goleadores" empty="Todavía no hay goles cargados.">
          {scorers.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={byId.get(row.memberId)}
              value={row.goals}
              unit="goles"
            />
          ))}
        </RankBlock>
        <RankBlock title="Máximos asistentes" empty="Nadie cargó asistencias todavía.">
          {assists.map((row, i) => (
            <RankRow
              key={row.memberId}
              rank={i + 1}
              member={byId.get(row.memberId)}
              value={row.assists}
              unit="asistencias"
            />
          ))}
        </RankBlock>
        <RankBlock title="Tarjetas" empty="El equipo está limpio.">
          {cards
            .sort((a, b) => b.red - a.red || b.yellow - a.yellow)
            .map((row) => (
              <CardRow key={row.memberId} member={byId.get(row.memberId)} row={row} />
            ))}
        </RankBlock>
        <Link
          to="/stats"
          search={{ partido: undefined, torneo: "general" }}
          className="flex h-12 items-center justify-center rounded-xl bg-surface text-sm font-semibold text-accent shadow-card"
        >
          Ver historial y planillas
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Cuerpo técnico</h2>
        <ul className="mt-2 space-y-2">
          {coaches.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card">
              <PlayerAvatar name={m.name} photo={m.photo} accent={m.id === me.id} />
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted">{ROLE_LABEL[m.role]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Plantel</h2>
          <span className="text-xs text-subtle">{players.length} jugadores</span>
        </div>
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-card">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <PlayerAvatar name={p.name} photo={p.photo} accent={p.id === me.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.number != null ? (
                    <span className="mr-1 tabular-nums text-accent">{p.number}</span>
                  ) : null}
                  {p.nick}
                </p>
                <p className="text-xs text-muted">{p.name}</p>
              </div>
              <PlayerMarks row={byMember.get(p.id)} />
            </li>
          ))}
        </ul>
      </section>

      {creator ? (
        <div className="mt-6 grid gap-3">
          <CreateTeamDialog />
          <InviteDialog />
          <DesignateDialog />
        </div>
      ) : null}
      {staff ? <CederMando /> : null}
      <LeaveTeam />
    </main>
  );
}

function CreateTeamDialog() {
  const club = useFija((s) => s.club);
  const setClubName = useFija((s) => s.setClubName);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(club?.name ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-14 w-full text-base">
          Crear / editar equipo
        </Button>
      </DialogTrigger>
      <DialogContent title="Equipo">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setClubName(name);
            setOpen(false);
          }}
        >
          <p className="text-sm text-muted">
            El creador nombra al equipo. Después invitá jugadores y designá DT y ayudante.
          </p>
          <div>
            <Label htmlFor="club-name">Nombre</Label>
            <Input
              id="club-name"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full">
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog() {
  const invitePlayer = useFija((s) => s.invitePlayer);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nick, setNick] = useState("");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setNick("");
          setNumber("");
          setCode(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-14 w-full text-base">
          Invitar jugador
        </Button>
      </DialogTrigger>
      <DialogContent title="Invitar jugador">
        {code ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Ya está en el plantel. Compartí este código:</p>
            <p className="rounded-lg bg-bg py-4 text-center font-display text-2xl font-semibold tracking-widest text-accent">
              {code}
            </p>
            <Button className="h-12 w-full" onClick={() => setOpen(false)}>
              Listo
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = number.trim() ? Number(number) : null;
              const next = invitePlayer({
                name,
                nick,
                number: parsed != null && Number.isFinite(parsed) ? parsed : null,
              });
              if (next) setCode(next);
            }}
          >
            <p className="text-sm text-muted">Entrá el nombre. El código se genera para pasárselo.</p>
            <div>
              <Label htmlFor="inv-name">Nombre</Label>
              <Input id="inv-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="inv-nick">Apodo</Label>
              <Input id="inv-nick" className="mt-1" value={nick} onChange={(e) => setNick(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="inv-num">Número</Label>
              <Input
                id="inv-num"
                className="mt-1"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-12 w-full">
              Generar invitación
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DesignateDialog() {
  const me = useMe();
  const members = useFija((s) => s.members);
  const assignRole = useFija((s) => s.assignRole);
  const [open, setOpen] = useState(false);
  const others = members.filter((m) => m.id !== me.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-14 w-full text-base">
          Designar DT o ayudante
        </Button>
      </DialogTrigger>
      <DialogContent title="Designar roles">
        <p className="mb-3 text-sm text-muted">
          El rol anterior de esa persona pasa a jugador. Solo el creador del equipo puede hacerlo.
        </p>
        <ul className="max-h-72 space-y-2 overflow-auto">
          {others.map((m) => (
            <li key={m.id} className="rounded-lg bg-bg px-3 py-2">
              <p className="text-sm font-medium">
                {m.nick}{" "}
                <span className="text-xs font-normal text-muted">{ROLE_LABEL[m.role]}</span>
              </p>
              <div className="mt-2 flex gap-2">
                {(["dt", "ayudante", "jugador"] as Role[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={m.role === role}
                    className="h-11 flex-1 rounded-md bg-surface-2 text-xs font-semibold disabled:opacity-40"
                    onClick={() => {
                      assignRole(m.id, role);
                      setOpen(false);
                    }}
                  >
                    {ROLE_LABEL[role]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function CederMando() {
  const me = useMe();
  const members = useFija((s) => s.members);
  const cederMando = useFija((s) => s.cederMando);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const others = members.filter((m) => m.id !== me.id);

  return (
    <>
      {note ? <p className="mt-4 text-sm text-accent">{note}</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-3 h-14 w-full text-base">
            Ceder mando
          </Button>
        </DialogTrigger>
        <DialogContent title="Ceder mando">
          <p className="mb-3 text-sm text-muted">
            Tu rol de {ROLE_LABEL[me.role]} pasa a otra persona. Vos te quedás con el rol de esa persona.
          </p>
          <ul className="max-h-72 space-y-1 overflow-auto">
            {others.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-md px-3 text-sm hover:bg-surface-2"
                  onClick={() => {
                    cederMando(m.id);
                    setNote(`${m.nick} queda como ${ROLE_LABEL[me.role]}.`);
                    setOpen(false);
                  }}
                >
                  <span>{m.name}</span>
                  <span className="text-xs text-muted">{ROLE_LABEL[m.role]}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeaveTeam() {
  const club = useFija((s) => s.club);
  const leaveClub = useFija((s) => s.leaveClub);
  const [open, setOpen] = useState(false);
  if (!club) return null;
  return (
    <div className="mt-8">
      {open ? (
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <p className="text-sm">¿Salís de {club.name}? Después podés entrar a otro con un código.</p>
          <div className="mt-3 grid gap-2">
            <Button variant="danger" className="h-12" onClick={() => leaveClub()}>
              Salir del equipo
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="h-14 w-full text-base" onClick={() => setOpen(true)}>
          Salir del equipo
        </Button>
      )}
    </div>
  );
}
