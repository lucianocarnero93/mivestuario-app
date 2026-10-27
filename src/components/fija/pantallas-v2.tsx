import { Link } from "@tanstack/react-router";
import { Bell, CalendarCheck, Shield, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { avisarDemo } from "@/lib/fija/demo-aviso";
import { DEMO } from "@/lib/fija/demo-flag";
import { miImpacto, miPuesto } from "@/lib/fija/datos-jugador";
import { contarConfirmaciones } from "@/lib/fija/fecha";
import { saldosDe } from "@/lib/fija/caja";
import { useFija, useMe } from "@/lib/fija/store";
import type { ClubEvent, MatchSheet, Member, Rsvp } from "@/lib/fija/types";
import { MiniCard } from "./mini-card";

function cuando(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function dias(iso: string) {
  const hoy = new Date();
  const alla = new Date(iso);
  const a = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const b = Date.parse(iso.slice(0, 10) + "T12:00:00Z");
  void alla;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

const CANCHA = { partido: undefined, tab: undefined, carta: undefined };

export function InicioV2({
  event,
  ultima,
  sheet,
  rsvps,
  members,
  staff,
  mine,
  onRsvp,
}: {
  event: ClubEvent;
  ultima?: ClubEvent;
  sheet?: MatchSheet;
  rsvps: Rsvp[];
  members: Member[];
  staff: boolean;
  mine?: Rsvp["status"];
  onRsvp: (status: "voy" | "no") => void;
}) {
  const cuentas = contarConfirmaciones(
    members.filter((persona) => persona.juega ?? persona.role === "jugador"),
    rsvps.filter((fila) => fila.eventId === event.id),
  );
  const me = useMe();
  const titular = Object.values(event.lineup).includes(me.id);
  return (
    <div className="grid gap-3">
      <section className="rounded-3xl bg-gradient-to-br from-accent/25 to-surface px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tu próximo llamado</p>
        <h2 className="font-display text-4xl font-semibold leading-none">{event.title}</h2>
        <p className="mt-1 text-sm">{cuando(event.startsAt)} · {event.place} · {event.modality.toUpperCase()}</p>
        <p className="mt-2 font-display text-3xl text-accent">{dias(event.startsAt)} días</p>
        <p className="text-sm text-muted">{cuentas.voy} van · {cuentas.pending} en duda · {cuentas.no} no va</p>
        {!staff && event.lineupPublishedAt ? (
          <p className="mt-2 text-sm">Formación publicada · {titular ? "sos titular" : "mirá el banco"}</p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {staff ? (
            <>
              <Link to="/cancha" search={CANCHA} className="grid h-12 place-items-center rounded-2xl bg-accent text-sm font-semibold text-accent-fg">Ver el plan</Link>
              <button type="button" className="h-12 rounded-2xl bg-[#25d366] text-sm font-semibold text-[#06210f]" onClick={() => avisarDemo(`Faltan respuestas para ${event.title}. Mirá la agenda.`)}>Recordar</button>
            </>
          ) : (
            <>
              <button type="button" className={`h-12 rounded-2xl text-sm font-semibold ${mine === "voy" ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => onRsvp("voy")}>Voy</button>
              <button type="button" className={`h-12 rounded-2xl text-sm font-semibold ${mine === "no" ? "bg-danger text-white" : "bg-surface"}`} onClick={() => onRsvp("no")}>No voy</button>
            </>
          )}
        </div>
        {!staff ? (
          <Link to="/cancha" search={{ ...CANCHA, tab: "rol" }} className="mt-2 block text-sm font-semibold text-accent">Ver formación ›</Link>
        ) : null}
      </section>
      <section>
        <p className="text-xs font-semibold uppercase text-muted">Pendientes</p>
        <div className="mt-2 grid gap-2">
          <Fila icono={<Shield className="size-4" />} titulo="Mirá tu card" sub="La formación ya está" to="/cancha" search={{ ...CANCHA, tab: "rol" }} />
          <Fila icono={<CalendarCheck className="size-4" />} titulo="Votá la figura" sub="La última fecha sigue abierta" to="/fecha" search={{ partido: ultima?.id }} />
          <Fila icono={<Wallet className="size-4" />} titulo="La caja del equipo" sub="Mirá si hay algo pendiente" to="/caja" search={{ mp: undefined }} />
          <Fila icono={<Bell className="size-4" />} titulo="¿Qué harías vos?" sub="3 preguntas antes del partido" to="/cancha" search={{ ...CANCHA, tab: "rol", carta: "quiz" }} />
        </div>
      </section>
      <section>
        <p className="text-xs font-semibold uppercase text-muted">Accesos</p>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
          <Link to="/cancha" search={CANCHA} className="rounded-2xl bg-surface py-3">Pizarra</Link>
          <Link to="/fecha" search={{ partido: undefined }} className="rounded-2xl bg-surface py-3">Fecha</Link>
          <Link to="/stats" search={{ partido: undefined, torneo: "general" }} className="rounded-2xl bg-surface py-3">Stats</Link>
          <Link to="/vivo" search={{ t: "", e: "" }} className="rounded-2xl bg-surface py-3">Vivo</Link>
        </div>
      </section>
      {ultima && sheet ? (
        <Link to="/fecha" search={{ partido: ultima.id }} className="rounded-2xl bg-surface px-3 py-3 text-sm">
          Última fecha: {sheet.goalsFor > sheet.goalsAgainst ? "Ganamos" : sheet.goalsFor === sheet.goalsAgainst ? "Empatamos" : "Perdimos"} {sheet.goalsFor}–{sheet.goalsAgainst} {ultima.title} · Fecha ›
        </Link>
      ) : null}
    </div>
  );
}

function Fila({
  icono,
  titulo,
  sub,
  to,
  search,
}: {
  icono: ReactNode;
  titulo: string;
  sub: string;
  to: "/cancha" | "/fecha" | "/caja";
  search: Record<string, string | undefined>;
}) {
  return (
    <Link to={to} search={search as never} className="flex h-14 items-center gap-3 rounded-2xl bg-surface px-3">
      <span className="text-accent">{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
      <span className="text-muted">›</span>
    </Link>
  );
}

export function AgendaV2({
  proximos,
  entrenamientos,
  jugados,
  sheets,
  rsvps,
  meId,
  onRsvp,
}: {
  proximos: ClubEvent[];
  entrenamientos: ClubEvent[];
  jugados: ClubEvent[];
  sheets: MatchSheet[];
  rsvps: Rsvp[];
  meId: string;
  onRsvp: (eventId: string, status: "voy" | "no") => void;
}) {
  const [modo, setModo] = useState<"proximos" | "entrenamientos" | "jugados">("proximos");
  const lista = modo === "proximos" ? proximos : modo === "entrenamientos" ? entrenamientos : jugados;
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Agenda</h1>
      <p className="text-sm text-muted">Lo que viene, los entrenamientos y lo ya jugado.</p>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
        {([
          ["proximos", "Próximos"],
          ["entrenamientos", "Entrenamientos"],
          ["jugados", "Jugados"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setModo(id)} className={`h-10 rounded-xl text-xs font-semibold ${modo === id ? "bg-accent text-accent-fg" : ""}`}>{label}</button>
        ))}
      </div>
      <ul className="mt-3 grid gap-2">
        {lista.map((evento, index) => {
          const mia = rsvps.find((fila) => fila.eventId === evento.id && fila.memberId === meId);
          const hoja = sheets.find((item) => item.eventId === evento.id);
          return (
            <li key={evento.id} className={`rounded-2xl px-3 py-3 ${index === 0 && modo === "proximos" ? "border border-accent" : "bg-surface"}`}>
              <p className="text-xs text-muted">{cuando(evento.startsAt)}</p>
              <p className="font-semibold">{evento.title}</p>
              <p className="text-xs text-muted">{evento.place}{hoja ? ` · ${hoja.goalsFor}–${hoja.goalsAgainst}` : ""}</p>
              {evento.lineupPublishedAt ? <p className="text-xs text-accent">Formación publicada</p> : null}
              {modo !== "jugados" ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`h-10 rounded-xl text-xs font-semibold ${mia?.status === "voy" ? "bg-accent text-accent-fg" : "bg-void"}`} onClick={() => onRsvp(evento.id, "voy")}>Voy</button>
                  <button type="button" className={`h-10 rounded-xl text-xs font-semibold ${mia?.status === "no" ? "bg-danger text-white" : "bg-void"}`} onClick={() => onRsvp(evento.id, "no")}>No voy</button>
                </div>
              ) : null}
              {modo !== "jugados" && mia?.status !== "voy" && mia?.status !== "no" ? <p className="mt-1 text-xs text-warning">Falta tu respuesta</p> : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">Sumalo a tu calendario desde el partido, cuando el DT lo deje fijo.</p>
    </div>
  );
}

export function StatsV2({ staff }: { staff: boolean }) {
  const me = useMe();
  const members = useFija((s) => s.members);
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const impacto = miImpacto(me.id, events, sheets);
  const puesto = miPuesto(me.id, events, sheets, members);
  const fila = sheets.reduce(
    (total, hoja) => {
      const mia = hoja.players.find((item) => item.memberId === me.id);
      return {
        goles: total.goles + (mia?.goals ?? 0),
        asistencias: total.asistencias + (mia?.assists ?? 0),
        amarillas: total.amarillas + (mia?.yellow ?? 0),
      };
    },
    { goles: 0, asistencias: 0, amarillas: 0 },
  );
  const aFavor = sheets.reduce((n, hoja) => n + hoja.goalsFor, 0);
  const enContra = sheets.reduce((n, hoja) => n + hoja.goalsAgainst, 0);
  const ganados = sheets.filter((hoja) => hoja.goalsFor > hoja.goalsAgainst).length;
  if (staff) {
    const goleador = members
      .map((persona) => ({
        persona,
        goles: sheets.reduce((n, hoja) => n + (hoja.players.find((item) => item.memberId === persona.id)?.goals ?? 0), 0),
      }))
      .filter((item) => item.goles > 0)
      .sort((a, b) => b.goles - a.goles)[0];
    return (
      <div className="grid gap-3">
        <h1 className="font-display text-3xl font-semibold">Stats</h1>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["PJ", String(sheets.length)],
            ["PG", String(ganados)],
            ["GF", String(aFavor)],
            ["GC", String(enContra)],
            ["Dif", String(aFavor - enContra)],
            ["Vallas", String(sheets.filter((hoja) => hoja.goalsAgainst === 0).length)],
          ].map(([label, valor]) => (
            <div key={label} className="rounded-2xl bg-surface px-2 py-3 text-center">
              <p className="font-display text-3xl text-accent">{valor}</p>
              <p className="text-[11px] text-muted">{label}</p>
            </div>
          ))}
        </div>
        {goleador ? (
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
            <MiniCard apodo={goleador.persona.nick} dorsal={goleador.persona.menor ? null : goleador.persona.number} puesto="DEL" ancho={52} />
            <p className="text-sm">{goleador.persona.nick} · {goleador.goles} goles</p>
          </div>
        ) : null}
        <Link to="/cancha" search={{ ...CANCHA, carta: "datos", tab: "plan" }} className="grid h-12 place-items-center rounded-2xl border border-accent text-sm font-semibold text-accent">
          Armar con datos
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <h1 className="font-display text-3xl font-semibold">Stats</h1>
      <section className="rounded-3xl bg-surface px-4 py-4">
        <p className="text-xs uppercase text-muted">Tu última card</p>
        <p className="font-display text-3xl font-semibold">En la cancha</p>
        <p className="text-sm text-muted">{me.nick} · lo que ya sumaste con el equipo</p>
        {me.menor ? null : (
          <button type="button" className="mt-3 h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg" onClick={() => avisarDemo(`${me.nick} comparte su card del equipo.`)}>Compartir</button>
        )}
      </section>
      <p className="text-xs font-semibold uppercase text-muted">Tus números</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["PJ", String(impacto.titular.n)],
          ["Goles", String(fila.goles)],
          ["Asist.", String(fila.asistencias)],
          ["PG", String(impacto.titular.g)],
          ["PE", String(impacto.titular.e)],
          ["Amarillas", String(fila.amarillas)],
        ].map(([label, valor]) => (
          <div key={label} className="rounded-2xl bg-surface px-2 py-3 text-center">
            <p className="font-display text-3xl text-accent">{valor}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="rounded-2xl bg-surface px-3 py-3 text-sm">{puesto ?? "Tu posición sale de los partidos en los que fuiste titular."}</p>
      <section className="rounded-2xl bg-surface px-3 py-3">
        <p className="text-sm font-semibold">Vitrina · 5 de 8</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {["Figura", "Goleador", "Asistidor", "Valla", "Presente"].map((item) => (
            <div key={item} className="rounded-xl border border-border px-1 py-2 text-center text-[10px]">{item}</div>
          ))}
          {["Hat-trick", "Debut", "DT"].map((item) => (
            <div key={item} className="rounded-xl border border-dashed border-border px-1 py-2 text-center text-[10px] text-muted">🔒 {item}</div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Te falta: Hat-trick · 3 goles en un partido</p>
      </section>
    </div>
  );
}

export function FechaHero({
  event,
  sheet,
  votaron,
  de,
}: {
  event: ClubEvent;
  sheet?: MatchSheet;
  votaron: number;
  de: number;
}) {
  return (
    <section className="mb-4 grid gap-3">
      <p className="text-sm text-muted">{event.title} · {cuando(event.startsAt)}</p>
      <p className="font-display text-6xl font-semibold">{sheet ? `${sheet.goalsFor}–${sheet.goalsAgainst}` : "–"}</p>
      <div className="rounded-3xl bg-gradient-to-br from-[#f0b429] to-[#8a6412] px-4 py-4 text-[#1a1203]">
        <p className="text-xs font-semibold uppercase">Votá la figura</p>
        <p className="text-sm">Cierra al día siguiente, a las 17:00. Votaron {votaron} de {de}.</p>
        <a href="#figura" className="mt-2 inline-flex h-11 items-center rounded-xl bg-[#1a1203] px-4 text-sm font-semibold text-[#f0b429]">Votar</a>
      </div>
      <div className="rounded-2xl border border-dashed border-accent px-3 py-3 text-sm">Tenés una card nueva · Abrí el sobre más abajo</div>
      <p className="text-xs font-semibold uppercase text-muted">Premios de la fecha</p>
      <div className="flex gap-2 overflow-x-auto">
        <MiniCard apodo="Luqui" dorsal={9} puesto="HT" ancho={64} />
        <MiniCard apodo="?" dorsal={null} puesto="Figura" ancho={64} bocaAbajo />
        <MiniCard apodo="Polaco" dorsal={3} puesto="Debut" ancho={64} />
      </div>
      <p className="text-xs font-semibold uppercase text-muted">Resumen de la semana</p>
    </section>
  );
}

export function CajaHero({ staff }: { staff: boolean }) {
  const me = useMe();
  const members = useFija((s) => s.members);
  const caja = useFija((s) => s.caja);
  const saldos = saldosDe(caja ?? { tesoreroId: "", gastos: [], cobros: [] });
  const deben = saldos.filter((fila) => fila.saldo < 0).sort((a, b) => a.saldo - b.saldo);
  const porCobrar = deben.reduce((n, fila) => n + Math.abs(fila.saldo), 0);
  const gastado = (caja?.gastos ?? []).reduce((n, gasto) => n + gasto.monto, 0);
  const mio = saldos.find((fila) => fila.memberId === me.id)?.saldo ?? 0;
  const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
  if (!staff) {
    return (
      <section className="mb-4 rounded-3xl bg-surface px-4 py-4">
        <p className="text-xs uppercase text-muted">Tu pago</p>
        <p className="font-display text-4xl font-semibold">{mio < 0 ? `Tenés un pago pendiente de ${pesos(Math.abs(mio))}` : "Estás al día"}</p>
      </section>
    );
  }
  return (
    <section className="mb-4 grid gap-3">
      <span className="w-fit rounded-full bg-[#009ee3] px-3 py-1 text-xs font-semibold text-white">{DEMO ? "Mercado Pago · demo" : "Mercado Pago"}</span>
      <div>
        <p className="text-xs uppercase text-muted">Saldo del equipo</p>
        <p className="font-display text-6xl font-semibold text-accent">{pesos(porCobrar)}</p>
        <p className="text-sm text-muted">Por cobrar {pesos(porCobrar)} · Gastado {pesos(gastado)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href="#pedido" className="grid h-12 place-items-center rounded-2xl bg-surface text-sm font-semibold">Copiar pedido</a>
        <a href="#nuevo-gasto" className="grid h-12 place-items-center rounded-2xl bg-surface text-sm font-semibold">Nuevo gasto</a>
      </div>
      <p className="text-sm font-semibold">Quién debe {deben.length}</p>
      <ul className="grid gap-2">
        {deben.map((fila) => {
          const persona = members.find((item) => item.id === fila.memberId);
          return (
            <li key={fila.memberId} className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2 text-sm">
              <span>{persona?.number ?? "·"} {persona?.menor ? persona.nick : persona?.nick}</span>
              <span className="font-semibold text-danger">{pesos(Math.abs(fila.saldo))}</span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="h-12 rounded-2xl bg-[#009ee3] text-sm font-semibold text-white" onClick={() => avisarDemo("Link de pago de Mercado Pago del equipo.")}>Mandar link de pago de Mercado Pago</button>
      <button type="button" className="h-12 rounded-2xl bg-[#25d366] text-sm font-semibold text-[#06210f]" onClick={() => avisarDemo(`Hay ${deben.length} pagos pendientes en la caja. Sin nombres.`)}>Avisar por WhatsApp (sin nombres)</button>
    </section>
  );
}

export function EquipoLista() {
  const club = useFija((s) => s.club);
  const members = useFija((s) => s.members);
  const me = useMe();
  const jugadores = members.filter((persona) => persona.role === "jugador");
  return (
    <section className="mb-4">
      <h1 className="font-display text-3xl font-semibold">{club?.name}</h1>
      <p className="text-sm text-muted">F7 · {jugadores.length} jugadores</p>
      <ul className="mt-3 grid gap-2">
        {jugadores.map((persona) => (
          <li key={persona.id} className="flex h-12 items-center justify-between rounded-2xl bg-surface px-3 text-sm">
            <span className="font-display text-lg text-accent">{persona.menor ? "·" : persona.number ?? "·"}</span>
            <span className="flex-1 px-3">{persona.nick}</span>
            <span className="text-xs text-muted">{persona.role === "jugador" ? "Jugador" : ""}</span>
          </li>
        ))}
      </ul>
      {me.role !== "jugador" ? (
        <button type="button" className="mt-3 h-12 w-full rounded-2xl bg-[#25d366] text-sm font-semibold text-[#06210f]" onClick={() => avisarDemo(`Sumate a ${club?.name ?? "el equipo"}. Código ${club?.inviteCode ?? ""}.`)}>
          Invitar por WhatsApp
        </button>
      ) : null}
    </section>
  );
}

export function VivoDemo() {
  const events = useFija((s) => s.events);
  const members = useFija((s) => s.members);
  const [reacciones, setReacciones] = useState({ pelota: 0, palmas: 0, fuego: 0 });
  const partido = events.find((evento) => evento.id === "ev-academia") ?? events.find((evento) => evento.liveLog?.length);
  const goles = (partido?.liveLog ?? []).filter((marca) => marca.kind === "gol" || marca.kind === "gol-rival");
  const nick = (id?: string) => {
    const persona = members.find((item) => item.id === id);
    if (!persona || persona.menor) return null;
    return persona.nick;
  };
  return (
    <main className="min-h-dvh bg-bg px-4 py-6 text-fg">
      <p className="text-center text-xs uppercase tracking-widest text-muted">Mi Vestuario · Para la familia</p>
      <h1 className="mt-2 text-center font-display text-3xl font-semibold">{partido?.title ?? "Partido"}</h1>
      <p className="mt-3 text-center font-display text-7xl font-semibold">3–1</p>
      <p className="text-center text-sm text-muted">Cerrado · {partido ? cuando(partido.startsAt) : ""} · {partido?.place}</p>
      <p className="mt-4 text-xs font-semibold uppercase text-muted">Goles</p>
      <ul className="mt-2 grid gap-2">
        {goles.map((gol) => (
          <li key={gol.id} className="flex justify-between rounded-2xl bg-surface px-3 py-2 text-sm">
            <span>{gol.kind === "gol-rival" ? "Ellos" : nick(gol.memberId) ?? "El equipo"}</span>
            <span className="text-muted">{gol.kind === "gol-rival" ? "rival" : "nuestro"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-semibold uppercase text-muted">Alentá desde acá</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {([
          ["pelota", "⚽"],
          ["palmas", "👏"],
          ["fuego", "🔥"],
        ] as const).map(([clave, emoji]) => (
          <button key={clave} type="button" className="h-14 rounded-2xl bg-surface text-lg" onClick={() => setReacciones((actual) => ({ ...actual, [clave]: actual[clave] + 1 }))}>
            {emoji} {reacciones[clave]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Ver la formación (solo apodos)</p>
        <div className="flex gap-2 overflow-x-auto">
          {Object.entries(partido?.lineup ?? {}).map(([puesto, id]) => {
            const persona = members.find((item) => item.id === id);
            if (persona?.menor) return null;
            return <MiniCard key={puesto} apodo={persona?.nick ?? "Jugador"} dorsal={null} puesto={puesto} ancho={52} />;
          })}
        </div>
      </div>
      <p className="mt-6 text-center text-sm">¿Tu equipo no lo tiene? Armá el tuyo en mivestuario.com.ar</p>
      <p className="mt-1 text-center text-xs text-muted">Se ven el resultado y la formación con apodos. No hay fotos ni nombres.</p>
    </main>
  );
}

