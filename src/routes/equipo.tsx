// Equipo: plantel, invitar jugadores y cambiar el puesto de cada uno.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL, personLabel } from "@/lib/fija/format";
import { MAX_BYTES } from "@/lib/fija/club-rules";
import { alumniMember, playerRows, rankedBy, teamRecord } from "@/lib/fija/stats";
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
  const setJuega = useFija((s) => s.setJuega);
  const removeMember = useFija((s) => s.removeMember);
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const record = teamRecord(sheets);
  const rows = playerRows(sheets, members);
  const scorers = rankedBy(rows, "goals").slice(0, 5);
  const assists = rankedBy(rows, "assists").slice(0, 5);
  const cards = rows.filter((row) => row.yellow > 0 || row.red > 0);
  const syncFromCloud = useFija((s) => s.syncFromCloud);
  const hydrated = useFija((s) => s.hydrated);
  const cloudWeight = useFija((s) => s.cloudWeight);

  useEffect(() => {
    if (!hydrated) return;
    void syncFromCloud();
  }, [hydrated, syncFromCloud]);
  const byId = new Map(members.map((m) => [m.id, m]));
  const alumni = useFija((s) => s.alumni);
  const personOf = (id: string) => byId.get(id) ?? alumniMember(alumni, id);
  const byMember = new Map(rows.map((row) => [row.memberId, row]));
  const coaches = members.filter((m) => m.role !== "jugador");
  const players = members.filter((m) => m.role === "jugador");
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
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
      {staff && cloudWeight != null && cloudWeight > MAX_BYTES * 0.8 ? (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm">
          El equipo está cerca del límite de espacio. Sacá fotos que no uses o achicá el escudo.
        </p>
      ) : null}
      {staff ? (
        <div className="mt-4">
          <CrestPicker src={club?.crest} name={club?.name} onChange={setClubCrest} />
        </div>
      ) : null}
      <div className="mt-4">
        {me.menor ? (
          <p className="text-sm text-muted">No pedimos foto si sos menor de 18.</p>
        ) : (
          <CrestPicker
            src={me.photo}
            name={me.name}
            onChange={setMyPhoto}
            imageOptions={{ size: 128, quality: 0.7, maxChars: 30_000 }}
            chooseLabel="Elegir mi foto"
            emptyHint="Tu avatar. En la formación se ve en tu puesto."
          />
        )}
      </div>

      {staff || creator ? (
        <div className="mt-4">
          <InviteShareButton />
          <p className="mt-1 text-center text-xs text-muted">Código de vestuario: {club?.inviteCode}</p>
        </div>
      ) : null}

      <section className="mt-5 space-y-5 desk:grid desk:grid-cols-2 desk:items-start desk:gap-4 desk:space-y-0">
        <RecordStrip record={record} />
        {(me.juega ?? me.role === "jugador") ? <MyNumbers member={me} row={mine} /> : null}
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
          {cards
            .sort((a, b) => b.red - a.red || b.yellow - a.yellow)
            .map((row) => (
              <CardRow key={row.memberId} member={personOf(row.memberId)} row={row} />
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
              <PlayerAvatar name={m.name} photo={m.menor ? null : m.photo} accent={m.id === me.id} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted">
                  {ROLE_LABEL[m.role]}
                  {staff && m.menor ? " · Menor" : ""}
                </p>
              </div>
              {staff || creator ? (
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-muted">
                  <input
                    type="checkbox"
                    className="size-5 accent-accent"
                    checked={m.juega ?? false}
                    onChange={(e) => setJuega(m.id, e.target.checked)}
                  />
                  Juega
                </label>
              ) : null}
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
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={p.name} photo={p.menor ? null : p.photo} accent={p.id === me.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.number != null ? (
                      <span className="mr-1 tabular-nums text-accent">{p.number}</span>
                    ) : null}
                    {p.nick}
                    {staff && p.menor ? <span className="ml-2 text-xs font-semibold text-muted">Menor</span> : null}
                  </p>
                  <p className="text-xs text-muted">{p.name}</p>
                  {staff ? <MemberEdit memberId={p.id} nick={p.nick} number={p.number} /> : null}
                  {p.id === me.id && !staff ? <OwnNick memberId={p.id} nick={p.nick} /> : null}
                </div>
                <PlayerMarks row={byMember.get(p.id)} />
                {(creator || (staff && p.menor)) && p.id !== me.id && pendingRemoveId !== p.id ? (
                  <button
                    type="button"
                    className="h-11 shrink-0 px-2 text-xs font-semibold text-danger"
                    onClick={() => setPendingRemoveId(p.id)}
                  >
                    Sacar
                  </button>
                ) : null}
              </div>
              {pendingRemoveId === p.id ? (
                <div className="mt-3 rounded-lg bg-surface-2 p-3">
                  <p className="text-sm">¿Sacar a {p.nick} del equipo?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="danger" className="h-11" onClick={() => removeMember(p.id)}>
                      Sacar
                    </Button>
                    <Button variant="ghost" className="h-11" onClick={() => setPendingRemoveId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <SoyEste />
      {creator ? (
        <div className="mt-6 grid gap-3">
          <CreateTeamDialog />
          <InviteDialog />
          <DesignateDialog />
          <CederMando />
        </div>
      ) : null}
      <MisEquipos />
      <Sacados />
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
            <p className="text-sm text-muted">Ya está en el plantel. Para entrar usa el código del vestuario:</p>
            <p className="rounded-lg bg-bg py-4 text-center font-display text-2xl font-semibold tracking-widest text-accent">
              {code}
            </p>
            <DialogClose asChild>
              <Button className="h-12 w-full" type="button">
                Listo
              </Button>
            </DialogClose>
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
            <p className="text-sm text-muted">Entrá el nombre y el número. Después pasale el código del vestuario.</p>
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
          Si le das DT o ayudante, quien lo tenía pasa a jugador. Confirmá antes de cambiar.
        </p>
        <ul className="max-h-72 space-y-2 overflow-auto">
          {others.map((m) => (
            <li key={m.id} className="rounded-lg bg-bg px-3 py-2">
              <p className="text-sm font-medium">
                {etiqueta(m, members)}{" "}
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
                      const aviso =
                        role === "dt" || role === "ayudante"
                          ? `¿${etiqueta(m, members)} pasa a ${ROLE_LABEL[role]}? Quien lo era pasa a jugador.`
                          : `¿${etiqueta(m, members)} pasa a jugador?`;
                      if (!window.confirm(aviso)) return;
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

function OwnNick({ memberId, nick }: { memberId: string; nick: string }) {
  const updateMember = useFija((s) => s.updateMember);
  const [draftNick, setDraftNick] = useState(nick);
  return (
    <div className="mt-2">
      <label className="text-xs text-muted" htmlFor={`nick-${memberId}`}>
        Tu apodo en este equipo
      </label>
      <Input
        id={`nick-${memberId}`}
        className="mt-1 h-10"
        value={draftNick}
        onChange={(e) => setDraftNick(e.target.value)}
        onBlur={() => updateMember(memberId, { nick: draftNick })}
      />
    </div>
  );
}

function MemberEdit({
  memberId,
  nick,
  number,
}: {
  memberId: string;
  nick: string;
  number: number | null;
}) {
  const updateMember = useFija((s) => s.updateMember);
  const [draftNick, setDraftNick] = useState(nick);
  const [draftNumber, setDraftNumber] = useState(number == null ? "" : String(number));
  return (
    <div className="mt-2 flex gap-2">
      <Input
        aria-label="Apodo"
        className="h-10"
        value={draftNick}
        onChange={(e) => setDraftNick(e.target.value)}
        onBlur={() => updateMember(memberId, { nick: draftNick })}
      />
      <Input
        aria-label="Número"
        className="h-10 w-16"
        inputMode="numeric"
        value={draftNumber}
        onChange={(e) => setDraftNumber(e.target.value)}
        onBlur={() => {
          const parsed = draftNumber.trim() ? Number(draftNumber) : null;
          updateMember(memberId, { number: parsed != null && Number.isFinite(parsed) ? parsed : null });
        }}
      />
    </div>
  );
}

function SoyEste() {
  const me = useMe();
  const staff = useIsStaff();
  const members = useFija((s) => s.members);
  const claimName = useFija((s) => s.useThisName);
  const [error, setError] = useState("");
  const libres = members.filter((person) => !person.accountId && person.id !== me.id);
  if (staff || !me.accountId || libres.length === 0) return null;
  return (
    <section className="mt-5 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-sm">Si el DT ya te cargó a mano, elegí ese nombre para no quedar dos veces.</p>
      <ul className="mt-2 space-y-2">
        {libres.map((person) => (
          <li key={person.id}>
            <Button
              variant="secondary"
              className="h-11 w-full"
              onClick={() => {
                setError("");
                void claimName(person.id).then((ok) => {
                  if (!ok) setError("No se pudo unir ese nombre. Probá de nuevo.");
                });
              }}
            >
              Soy {etiqueta(person, members)}
            </Button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

function etiqueta(person: { id: string; nick: string; name: string; number: number | null }, members: { id: string; nick: string; name: string; number: number | null }[]) {
  return personLabel(person, members);
}

function CederMando() {
  const me = useMe();
  const members = useFija((s) => s.members);
  const cederMando = useFija((s) => s.cederMando);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const others = members.filter((m) => m.id !== me.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-14 w-full text-base">
          Ceder mando
        </Button>
      </DialogTrigger>
      <DialogContent title="Ceder mando">
        <p className="mb-3 text-sm text-muted">
          La otra persona queda como dueña del equipo y se queda con tu puesto. Vos te quedás con el de ella.
        </p>
        <ul className="max-h-72 space-y-1 overflow-auto">
          {others.map((m) => (
            <li key={m.id} className="rounded-md px-3 py-2">
              <p className="text-sm">{etiqueta(m, members)}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[m.role]}</p>
              {pendingId === m.id ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    variant="danger"
                    className="h-11"
                    onClick={() => {
                      cederMando(m.id);
                      setOpen(false);
                    }}
                  >
                    Confirmar
                  </Button>
                  <Button variant="ghost" className="h-11" onClick={() => setPendingId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" className="mt-2 h-11 w-full" onClick={() => setPendingId(m.id)}>
                  Cederle el mando
                </Button>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function LeaveTeam() {
  const club = useFija((s) => s.club);
  const members = useFija((s) => s.members);
  const leaveClub = useFija((s) => s.leaveClub);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!club) return null;
  const alone = members.length <= 1;
  return (
    <div className="mt-8">
      {open ? (
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <p className="text-sm">
            {alone
              ? "Sos el único del equipo: si salís, el equipo se borra."
              : `¿Salís de ${club.name}? Se va solo este equipo. Los otros, si tenés, quedan en el celular.`}
          </p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-3 grid gap-2">
            <Button
              variant="danger"
              className="h-12"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError("");
                void leaveClub().then((result) => {
                  setBusy(false);
                  if (!result.ok) setError(result.error || "No pudimos sacarte del equipo. Probá de nuevo.");
                });
              }}
            >
              {busy ? "Saliendo…" : "Salir del equipo"}
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="h-14 w-full text-base" onClick={() => setOpen(true)}>
          Salir de este equipo
        </Button>
      )}
    </div>
  );
}

function Sacados() {
  const creator = useIsCreator();
  const banned = useFija((s) => s.bannedAccounts);
  const readmitAccount = useFija((s) => s.readmitAccount);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (!creator || banned.length === 0) return null;
  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <button type="button" className="text-sm font-semibold" onClick={() => setOpen((value) => !value)}>
        Sacados ({banned.length})
      </button>
      {open ? (
        <ul className="mt-3 space-y-2">
          {banned.map((item) => (
            <li key={item.accountId} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm">{item.name}</span>
              <Button
                variant="outline"
                className="h-11 shrink-0"
                disabled={busy === item.accountId}
                onClick={() => {
                  setBusy(item.accountId);
                  void readmitAccount(item.accountId).finally(() => setBusy(null));
                }}
              >
                Dejar volver a entrar
              </Button>
            </li>
          ))}
          <p className="text-xs text-muted">Puede volver a entrar con el código.</p>
        </ul>
      ) : null}
    </section>
  );
}

function MisEquipos() {
  const club = useFija((s) => s.club);
  const otherClubs = useFija((s) => s.otherClubs);
  const setActiveClub = useFija((s) => s.setActiveClub);
  const removeClub = useFija((s) => s.removeClub);
  const joinClub = useFija((s) => s.joinClub);
  const createClub = useFija((s) => s.createClub);
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const saved = otherClubs.map((item) => item.bundle.club);

  return (
    <section id="equipos" className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Mis equipos</h2>
      <ul className="mt-2 space-y-2">
        {club ? (
          <li className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card">
            <TeamCrest src={club.crest} name={club.name} className="size-10 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{club.name}</p>
              <p className="text-xs text-accent">Equipo activo</p>
            </div>
          </li>
        ) : null}
        {saved.map((item) => (
          <li key={item.id} className="rounded-xl bg-surface px-4 py-3 shadow-card">
            <div className="flex items-center gap-3">
              <TeamCrest src={item.crest} name={item.name} className="size-10 text-sm" />
              <p className="min-w-0 flex-1 truncate font-medium">{item.name}</p>
            </div>
            <div className="mt-3 grid gap-2">
              <Button
                className="h-12 w-full"
                disabled={switchingId !== null}
                onClick={() => {
                  if (switchingId) return;
                  setSwitchingId(item.id);
                  void setActiveClub(item.id).finally(() => setSwitchingId(null));
                }}
              >
                {switchingId === item.id ? "Cambiando…" : "Cambiar a este equipo"}
              </Button>
              <Button variant="ghost" className="h-11 w-full text-muted" onClick={() => removeClub(item.id)}>
                Quitar de este celular
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid gap-2">
        <Button variant="secondary" className="h-14 w-full text-base" onClick={() => setJoinOpen(true)}>
          Unirme a otro equipo
        </Button>
        <Button variant="outline" className="h-14 w-full text-base" onClick={() => setCreateOpen(true)}>
          Crear un equipo nuevo
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Quitar un equipo de acá no lo borra para el resto. Sigue en la nube.
      </p>

      <Dialog
        open={joinOpen}
        onOpenChange={(next) => {
          setJoinOpen(next);
          if (!next) {
            setCode("");
            setError("");
            setBusy(false);
          }
        }}
      >
        <DialogContent title="Unirme a otro equipo">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              setError("");
              setBusy(true);
              void joinClub(code)
                .then((ok) => {
                  if (!ok) {
                    setError("Ese equipo no está en la nube. Pedile al DT que toque Invitar al equipo y te pase el código de nuevo.");
                    setBusy(false);
                    return;
                  }
                  setJoinOpen(false);
                })
                .catch(() => {
                  setError("No pudimos leer el equipo. Probá de nuevo en un momento.");
                  setBusy(false);
                });
            }}
          >
            <p className="text-sm text-muted">El equipo de ahora queda guardado. No salís de él.</p>
            <div>
              <Label htmlFor="otro-codigo">Código</Label>
              <Input
                id="otro-codigo"
                className="mt-1 uppercase tracking-widest"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                required
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="h-12 w-full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next) {
            setTeamName("");
            setError("");
          }
        }}
      >
        <DialogContent title="Crear un equipo nuevo">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (teamName.trim().length < 2) {
                setError("Ponele un nombre al equipo.");
                return;
              }
              void createClub(teamName);
              setCreateOpen(false);
            }}
          >
            <p className="text-sm text-muted">Vas a ser el DT de este equipo. El anterior queda en la lista.</p>
            <div>
              <Label htmlFor="otro-nombre">Nombre</Label>
              <Input
                id="otro-nombre"
                className="mt-1"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="h-12 w-full">
              Crear y cambiar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
