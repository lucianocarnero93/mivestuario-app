// Inicio: pendientes del equipo, próximo partido y acceso a la pizarra.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Chalkboard } from "@/components/fija/chalkboard";
import { EventCard } from "@/components/fija/event-card";
import { InviteShareButton } from "@/components/fija/invite-share";
import { ConfirmGroups, StaffCallup } from "@/components/fija/staff-callup";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/fija/format";
import { teamRecord } from "@/lib/fija/stats";
import { nextEvent, sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";

export const Route = createFileRoute("/")({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => ({
    protocol: typeof search.protocol === "string" ? search.protocol : undefined,
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
});

function HomePage() {
  const me = useMe();
  const staff = useIsStaff();
  const events = useFija((s) => s.events);
  const rsvps = useFija((s) => s.rsvps);
  const members = useFija((s) => s.members);
  const setRsvp = useFija((s) => s.setRsvp);
  const savedMine = useFija((s) => s.savedMine);
  const cloudError = useFija((s) => s.cloudError);
  const flushCloud = useFija((s) => s.flushCloud);
  const sheets = useFija((s) => s.matchSheets);
  const tournaments = useFija((s) => s.tournaments);
  const club = useFija((s) => s.club);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const event = nextEvent(events, { tournaments, sheets });
  const players = members.filter((m) => m.juega ?? m.role === "jugador");
  const record = teamRecord(sheets);
  const inviteOk = Boolean(
    club && search.invite && search.invite.toUpperCase() === club.inviteCode,
  );

  if (!event) {
    return (
      <main className="px-4 py-6">
        <h1 className="text-3xl font-semibold">No hay un próximo partido</h1>
        <p className="mt-2 text-sm text-muted">
          {staff ? "Cargá la próxima fecha en la agenda." : "Cuando el DT cargue una fecha, aparece acá."}
        </p>
        {staff ? (
          <div className="mt-4 grid gap-2">
            <Button asChild className="h-14 w-full text-base">
              <Link to="/agenda">Crear fecha</Link>
            </Button>
            <Button asChild variant="secondary" className="h-12 w-full">
              <Link to="/equipo">Sumar jugadores</Link>
            </Button>
          </div>
        ) : null}
      </main>
    );
  }

  const eventRsvps = rsvps.filter((r) => r.eventId === event.id);
  const mine = eventRsvps.find((r) => r.memberId === me.id);
  const sheet = sheetFor(event.id, sheets);
  const alreadyPlayed = +new Date(event.startsAt) < Date.now() - 3_600_000;
  const saved = savedMine[event.id];
  function answerLabel(status: "voy" | "no", on: string, off: string) {
    if (mine?.status !== status) return off;
    if (saved === status) return on;
    return cloudError ? `${off} · no se guardó` : `${off} · guardando…`;
  }

  return (
    <main className="px-4 py-5">
      {inviteOk ? (
        <div className="mb-4 rounded-xl bg-surface px-4 py-3 shadow-card">
          <p className="text-sm font-medium">Entraste al vestuario de {club?.name}.</p>
          <Button
            variant="ghost"
            className="mt-1 h-11 px-0 text-accent"
            onClick={() => navigate({ to: "/", search: { invite: undefined, protocol: undefined }, replace: true })}
          >
            Listo
          </Button>
        </div>
      ) : null}

      <p className="text-sm text-muted">Hola, {me.nick}</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        {staff ? "Panel del vestuario" : "Tu próximo llamado"}
      </h1>
      {staff && players.length <= 1 ? (
        <Button asChild variant="secondary" className="mt-4 h-12 w-full">
          <Link to="/equipo">Sumar jugadores</Link>
        </Button>
      ) : null}

      {staff ? <div className="mt-4"><InviteShareButton /></div> : null}

      <Link
        to="/stats"
        className="mt-4 flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-card"
        search={{ partido: undefined, torneo: "general" }}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted">
            El equipo
          </span>
          <span className="text-sm">
            {record.won} ganados · {record.drawn} empatados · {record.lost} perdidos
          </span>
        </span>
        <span className="text-sm font-semibold text-accent">Stats</span>
      </Link>

      <div className="contents desk:grid desk:grid-cols-2 desk:items-start desk:gap-6">
      <EventCard
        className="mt-4"
        event={event}
        rsvps={eventRsvps}
        result={sheet ? { gf: sheet.goalsFor, ga: sheet.goalsAgainst } : undefined}
        showGear
      />

      {!staff ? (
        alreadyPlayed ? (
          <p className="mt-5 text-sm text-muted">
            Este partido ya se jugó. Cuando el DT cargue el resultado, sale de acá.
          </p>
        ) : (
        <div className="mt-5 grid gap-3">
          <Button
            className="h-16 text-base font-semibold"
            variant={mine?.status === "voy" ? "success" : "secondary"}
            onClick={() => setRsvp(event.id, "voy")}
          >
            {answerLabel("voy", "Voy ✓", "Voy")}
          </Button>
          <Button
            className="h-16 text-base font-semibold"
            variant={mine?.status === "no" ? "danger" : "secondary"}
            onClick={() => setRsvp(event.id, "no")}
          >
            {answerLabel("no", "No voy ✕", "No voy")}
          </Button>
          {mine?.status === "voy" || mine?.status === "no" ? (
            saved !== mine.status && cloudError ? (
              <p className="text-center text-xs text-muted">
                {cloudError}{" "}
                <button type="button" className="h-10 font-semibold text-accent" onClick={() => void flushCloud()}>
                  Reintentar
                </button>
              </p>
            ) : null
          ) : (
            <p className="rounded-lg bg-surface py-3 text-center text-sm font-medium text-muted">Pendiente</p>
          )}
          <Button asChild variant="ghost" className="h-12">
            <Link to="/cancha">Ver formación</Link>
          </Button>
        </div>
        )
      ) : (
        <>
          {event.kind === "partido" ? <StaffCallup event={event} /> : null}
          {(me.juega ?? me.role === "jugador") && !alreadyPlayed ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                className="h-12"
                variant={mine?.status === "voy" ? "success" : "secondary"}
                onClick={() => setRsvp(event.id, "voy")}
              >
                {answerLabel("voy", "Voy ✓", "Yo voy")}
              </Button>
              <Button
                className="h-12"
                variant={mine?.status === "no" ? "danger" : "secondary"}
                onClick={() => setRsvp(event.id, "no")}
              >
                {answerLabel("no", "No voy ✕", "Yo no voy")}
              </Button>
            </div>
          ) : null}
          {(me.juega ?? me.role === "jugador") &&
          !alreadyPlayed &&
          (mine?.status === "voy" || mine?.status === "no") &&
          saved !== mine.status &&
          cloudError ? (
            <p className="mt-2 text-center text-xs text-muted">
              {cloudError}{" "}
              <button type="button" className="h-10 font-semibold text-accent" onClick={() => void flushCloud()}>
                Reintentar
              </button>
            </p>
          ) : null}
          <section className="mt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                Control de confirmaciones
              </h2>
              <span className="text-xs text-muted">
                {eventRsvps.filter((r) => r.status === "pendiente").length} pendientes
              </span>
            </div>
            <ConfirmGroups players={players} eventRsvps={eventRsvps} eventId={event.id} staff />
            {event.kind === "partido" ? (
              <Button asChild className="mt-3 h-14 w-full text-base" variant="outline">
                <Link to="/stats" search={{ partido: event.id, torneo: "general" }}>
                  {sheet ? "Editar planilla" : "Cargar resultado y stats"}
                </Link>
              </Button>
            ) : null}
          </section>
        </>
      )}
      </div>

      {event.tactics ? (
        <Chalkboard title="Pauta del DT" className="mt-6">
          {event.tactics}
        </Chalkboard>
      ) : null}

      <p className="mt-6 text-xs text-subtle">
        Rol actual: {ROLE_LABEL[me.role]}. DT y ayudante editan por igual.
      </p>
    </main>
  );
}
