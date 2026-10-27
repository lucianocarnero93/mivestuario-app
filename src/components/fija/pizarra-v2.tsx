import { useMemo, useState } from "react";
import { PizarraViva } from "@/components/fija/pizarra-viva";
import { avisarDemo } from "@/lib/fija/demo-aviso";
import { DEMO } from "@/lib/fija/demo-flag";
import {
  miImpacto,
  miPuesto,
  miTendencia,
  misSociedades,
  porQueCard,
} from "@/lib/fija/datos-jugador";
import {
  COLOR_MOMENTO,
  MOMENTOS,
  consignasDelSlot,
  cumplidasDe,
  delMomento,
  metaPlan,
  quienFalta,
  slotDe,
  textoDespues,
  textoFaltan,
  textoWhatsappPlan,
} from "@/lib/fija/pizarra-modelo";
import { metaPlantel } from "@/lib/fija/quiz";
import {
  entendiPlan,
  guardarRespuestaQuiz,
  marcarCumplida,
  usarOnce,
} from "@/lib/fija/store";
import type { ClubEvent, MatchSheet, Member, Momento } from "@/lib/fija/types";
import { BancoChips, CanchaCards } from "./cancha-cards";
import { MiniCard } from "./mini-card";

export type TabPizarra = "plan" | "rol" | "momentos" | "pelota" | "despues" | "equipo";

const TABS: { id: TabPizarra; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "rol", label: "Mi rol" },
  { id: "momentos", label: "Momentos" },
  { id: "pelota", label: "Pelota parada" },
  { id: "despues", label: "Después" },
  { id: "equipo", label: "Mi equipo" },
];

function dia(iso: string) {
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

function rivalDe(event: ClubEvent) {
  return event.rival || event.title.replace(/^vs\s+/i, "");
}

export function PizarraV2({
  event,
  events,
  sheets,
  members,
  staff,
  meId,
  tab,
  carta,
  onTab,
  onCarta,
  onEvento,
}: {
  event: ClubEvent;
  events: ClubEvent[];
  sheets: MatchSheet[];
  members: Member[];
  staff: boolean;
  meId: string;
  tab: TabPizarra;
  carta?: string;
  onTab: (tab: TabPizarra) => void;
  onCarta: (carta?: string) => void;
  onEvento: (id: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const convocados = event.convocados ?? [...Object.values(event.lineup), ...(event.suplentes ?? [])];
  const meta = metaPlan(event, convocados.length);
  const plantel = metaPlantel(event, convocados.length);
  const slot = slotDe(event, meId);
  const yo = members.find((persona) => persona.id === meId);
  const nick = (id: string) => members.find((persona) => persona.id === id)?.nick ?? "Jugador";

  if (carta === "revelacion") {
    return (
      <Revelacion
        event={event}
        members={members}
        meId={meId}
        onRol={() => {
          onCarta(undefined);
          onTab("rol");
        }}
        onCerrar={() => onCarta(undefined)}
      />
    );
  }

  return (
    <main className="px-3 pb-4 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold">Pizarra</h1>
        <button type="button" className="h-10 max-w-[58%] truncate rounded-full bg-surface px-3 text-xs font-semibold" onClick={() => setAbierta((v) => !v)}>
          {event.title} ▾
        </button>
      </div>
      {abierta ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {events.filter((item) => item.kind === "partido").map((item) => (
            <button key={item.id} type="button" className="h-10 shrink-0 rounded-full bg-surface-2 px-3 text-xs" onClick={() => { onEvento(item.id); setAbierta(false); }}>
              {item.title}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={`h-10 shrink-0 rounded-full px-3 text-xs font-semibold ${tab === item.id ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "plan" ? (
        <Plan
          event={event}
          members={members}
          staff={staff}
          meId={meId}
          meta={meta}
          onCarta={onCarta}
          onRol={() => onTab("rol")}
        />
      ) : null}
      {tab === "rol" ? (
        <MiRol event={event} members={members} staff={staff} meId={meId} slot={slot} onCarta={onCarta} />
      ) : null}
      {tab === "momentos" ? <Momentos event={event} staff={staff} slot={slot} /> : null}
      {tab === "pelota" ? <Pelota event={event} members={members} meId={meId} slot={slot} staff={staff} /> : null}
      {tab === "despues" ? (
        <Despues event={event} members={members} sheets={sheets} staff={staff} meId={meId} />
      ) : null}
      {tab === "equipo" ? <MiEquipo event={event} events={events} sheets={sheets} members={members} staff={staff} meId={meId} /> : null}
      {carta && carta !== "datos" && carta !== "quiz" && carta !== "revelacion" ? (
        <SheetRol event={event} members={members} slot={carta} onCerrar={() => onCarta(undefined)} />
      ) : null}
      {carta === "datos" && staff ? (
        <SheetDatos
          event={event}
          events={events}
          sheets={sheets}
          members={members}
          onCerrar={() => onCarta(undefined)}
          onUsar={() => {
            usarOnce(event.id, { ...event.lineup });
            onCarta(undefined);
          }}
        />
      ) : null}
      {carta === "quiz" && !staff ? (
        <Quiz event={event} plantel={plantel} yo={yo?.nick ?? "Jugador"} onCerrar={() => onCarta(undefined)} />
      ) : null}
      {staff && tab === "momentos" ? (
        <details className="mt-4 rounded-2xl bg-surface px-3 py-2">
          <summary className="h-10 cursor-pointer text-sm font-semibold">Dibujar la jugada</summary>
          <PizarraViva event={event} />
        </details>
      ) : null}
      <p className="sr-only">{nick(meId)}</p>
    </main>
  );
}

function Plan({
  event,
  members,
  staff,
  meId,
  meta,
  onCarta,
  onRol,
}: {
  event: ClubEvent;
  members: Member[];
  staff: boolean;
  meId: string;
  meta: ReturnType<typeof metaPlan>;
  onCarta: (carta?: string) => void;
  onRol: () => void;
}) {
  const [momento, setMomento] = useState<Momento>("con");
  const reglas = delMomento(event.consignas ?? [], momento);
  const faltan = quienFalta(event, event.convocados ?? []);
  const [lista, setLista] = useState(false);
  const link = "/cancha?tab=rol";
  const texto = textoWhatsappPlan(dia(event.startsAt), rivalDe(event), link);
  return (
    <section className="mt-3 grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Como equipo</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${event.lineupPublishedAt ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}>
          {staff ? (event.lineupPublishedAt ? "✓ Publicado" : "Borrador") : "Solo lectura"}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {MOMENTOS.map((item) => (
          <button key={item.id} type="button" onClick={() => setMomento(item.id)} className="h-10 shrink-0 border-b-2 px-1 text-xs font-semibold" style={{ borderColor: momento === item.id ? COLOR_MOMENTO[item.id] : "transparent", color: COLOR_MOMENTO[item.id] }}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {reglas.map((regla, index) => (
          <span key={regla.id} className="h-10 shrink-0 rounded-full bg-surface px-3 text-xs leading-10">
            {index + 1}. {regla.texto}
          </span>
        ))}
      </div>
      <div className="relative">
        <p className="absolute left-2 top-2 z-10 text-[11px] font-semibold text-white">Plan A · {event.formacion ?? "formación"}</p>
        {staff ? <p className="absolute bottom-2 left-2 z-10 text-[10px] text-white">✓ entendió · • lo vio · ○ no</p> : null}
        <CanchaCards event={event} members={members} staff={staff} yoId={staff ? undefined : meId} onCarta={onCarta} />
      </div>
      <BancoChips event={event} members={members} staff={staff} />
      {staff ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">Plantilla · Presión alta y salida corta ›</p>
          <button type="button" className="h-11 shrink-0 rounded-xl border border-accent px-3 text-xs font-semibold text-accent" onClick={() => onCarta("datos")}>
            Usar el once sugerido
          </button>
        </div>
      ) : (
        <button type="button" className="h-12 rounded-2xl bg-surface text-sm font-semibold" onClick={onRol}>Ver mi rol ›</button>
      )}
      {staff ? (
        <button type="button" className="rounded-2xl bg-surface px-3 py-3 text-left" onClick={() => setLista((v) => !v)}>
          <p className="text-sm font-semibold">{meta.entendieron} de {meta.total} entendieron · {meta.vieron} lo vieron · Ver quién ›</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-void">
            <div className="h-full bg-accent" style={{ width: `${Math.min(100, (meta.entendieron / meta.total) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">{meta.llegamos ? "¡Llegamos a la meta!" : "Meta del plantel: 80 %"}</p>
        </button>
      ) : null}
      {lista && staff ? (
        <ul className="grid gap-1 text-sm">
          {faltan.map((fila) => (
            <li key={fila.id} className="flex justify-between rounded-xl bg-surface px-3 py-2">
              <span>{members.find((persona) => persona.id === fila.id)?.nick}</span>
              <span>{fila.entendio ? "✓" : fila.vio ? "•" : "○"}</span>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="h-11 text-sm font-semibold text-[#25d366]"
              onClick={() => avisarDemo(textoFaltan(Math.max(0, meta.total - meta.vieron), "sábado", link))}
            >
              Recordar por WhatsApp
            </button>
          </li>
        </ul>
      ) : null}
      {staff ? (
        <button type="button" className="h-14 rounded-2xl bg-[#25d366] text-base font-semibold text-[#06210f]" onClick={() => avisarDemo(DEMO ? texto : texto)}>
          Publicar y mandar por WhatsApp
        </button>
      ) : null}
    </section>
  );
}

function MiRol({
  event,
  members,
  staff,
  meId,
  slot,
  onCarta,
}: {
  event: ClubEvent;
  members: Member[];
  staff: boolean;
  meId: string;
  slot: string | null;
  onCarta: (carta?: string) => void;
}) {
  const reglas = slot ? consignasDelSlot(event, slot) : [];
  const visto = (event.vistos ?? []).find((item) => item.memberId === meId);
  return (
    <section className="mt-3 grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">{dia(event.startsAt)} · Plan A · {event.formacion}</p>
        <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-accent-fg">{slot ? "Sos titular" : "Estás en el banco"}</span>
      </div>
      <span className="w-fit rounded-full bg-surface px-2 py-1 text-[11px]">⏱ 30 s</span>
      <CanchaCards event={event} members={members} staff={false} yoId={meId} onCarta={onCarta} />
      <div className="rounded-2xl bg-surface px-3 py-3">
        <p className="text-xs font-semibold uppercase text-muted">Como equipo</p>
        <ul className="mt-2 grid gap-2">
          {MOMENTOS.map((item) => {
            const regla = (event.consignas ?? []).find((consigna) => consigna.momento === item.id);
            return (
              <li key={item.id} className="text-sm" style={{ color: COLOR_MOMENTO[item.id] }}>
                {item.label}: <span className="text-fg">{regla?.texto ?? "Sin regla"}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-2xl border border-accent px-3 py-3">
        <p className="text-sm font-semibold">Vos · {slot ?? "banco"}</p>
        <ul className="mt-2 grid gap-1 text-sm">
          {reglas.map((regla) => (
            <li key={regla.id}>{regla.texto}</li>
          ))}
          {reglas.length === 0 ? <li className="text-muted">Todavía no hay una consigna para tu puesto.</li> : null}
        </ul>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2">
        <p className="text-sm">Audio del Profe</p>
        <button
          type="button"
          className="h-11 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-fg"
          onClick={() => {
            if (!staff) entendiPlan(event.id);
          }}
        >
          {visto?.entendido ? "Entendido ✓" : "Entendido ✓"}
        </button>
      </div>
      <button type="button" className="rounded-2xl border border-dashed border-accent px-3 py-3 text-left text-sm" onClick={() => onCarta("quiz")}>
        🧠 ¿Qué harías vos? · 3 preguntas · cierra {dia(event.quiz?.cierra ?? event.startsAt)} ›
      </button>
    </section>
  );
}

function Momentos({ event, staff, slot }: { event: ClubEvent; staff: boolean; slot: string | null }) {
  const [momento, setMomento] = useState<Momento>("con");
  const reglas = delMomento(event.consignas ?? [], momento);
  const mias = slot ? consignasDelSlot(event, slot).filter((item) => item.momento === momento) : [];
  return (
    <section className="mt-3 grid gap-3">
      <div className="flex gap-2 overflow-x-auto">
        {MOMENTOS.map((item) => (
          <button key={item.id} type="button" className="h-10 shrink-0 border-b-2 text-xs font-semibold" style={{ borderColor: momento === item.id ? COLOR_MOMENTO[item.id] : "transparent" }} onClick={() => setMomento(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a9a4a] to-[#0c5a2a]">
        <div className="absolute inset-4 rounded-xl border border-white/30" />
        <p className="absolute bottom-3 left-3 text-xs text-white">La jugada de este momento</p>
      </div>
      <div className="rounded-2xl bg-surface px-3 py-3">
        <p className="text-xs font-semibold uppercase text-muted">Como equipo · {MOMENTOS.find((item) => item.id === momento)?.label}</p>
        <ol className="mt-2 grid gap-1 text-sm">
          {reglas.map((regla, index) => (
            <li key={regla.id}>{index + 1}. {regla.texto}</li>
          ))}
        </ol>
      </div>
      {staff ? <p className="text-sm text-muted">Editar las 3 reglas desde la plantilla del plan.</p> : (
        <div className="rounded-2xl border border-accent px-3 py-3 text-sm">
          <p className="font-semibold">Vos</p>
          {mias[0]?.texto ?? "En este momento seguís la regla del equipo."}
        </div>
      )}
    </section>
  );
}

function Pelota({
  event,
  members,
  meId,
  slot,
  staff,
}: {
  event: ClubEvent;
  members: Member[];
  meId: string;
  slot: string | null;
  staff: boolean;
}) {
  const [modo, setModo] = useState("Córner en contra");
  const lugares = [
    { lugar: "Primer palo", id: event.lineup.LI },
    { lugar: "Segundo palo", id: event.lineup.LD },
    { lugar: "Zona del penal", id: event.lineup.DC },
    { lugar: "Corta", id: event.lineup.MI },
  ];
  return (
    <section className="mt-3 grid gap-3">
      <div className="flex gap-2 overflow-x-auto">
        {["Córner en contra", "Córner a favor", "Lateral", "Tiro libre"].map((item) => (
          <button key={item} type="button" onClick={() => setModo(item)} className={`h-10 shrink-0 rounded-full px-3 text-xs font-semibold ${modo === item ? "bg-accent text-accent-fg" : "bg-surface"}`}>
            {item}
          </button>
        ))}
      </div>
      <div className="relative h-44 overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a9a4a] to-[#0d6a32]">
        <div className="absolute inset-x-8 top-0 h-24 rounded-b-full border border-white/40" />
      </div>
      <p className="text-xs font-semibold uppercase text-muted">Como equipo · {modo}</p>
      <ul className="grid gap-2">
        {lugares.map((fila) => {
          const persona = members.find((item) => item.id === fila.id);
          const propia = fila.id === meId;
          return (
            <li key={fila.lugar} className={`flex h-12 items-center justify-between rounded-xl px-3 ${propia && !staff ? "border border-accent" : "bg-surface"}`}>
              <span>{fila.lugar}</span>
              <span className="font-semibold">{persona?.menor ? persona.nick : persona?.nick ?? "Libre"}{slot && propia ? ` · ${slot}` : ""}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Despues({
  event,
  members,
  sheets,
  staff,
  meId,
}: {
  event: ClubEvent;
  members: Member[];
  sheets: MatchSheet[];
  staff: boolean;
  meId: string;
}) {
  const hoja = sheets.find((item) => item.eventId === event.id);
  const marcas = cumplidasDe(event);
  const impacto = miImpacto(meId, [event], sheets);
  const puesto = miPuesto(meId, [event], sheets, members);
  const sociedad = misSociedades(meId, sheets, members);
  const tendencia = miTendencia(meId, sheets);
  const link = `/cancha?tab=despues&partido=${event.id}`;
  return (
    <section className="mt-3 grid gap-3">
      {staff ? <p className="text-xs text-muted">Solo vos editás</p> : null}
      <div className="rounded-2xl bg-surface px-3 py-3">
        <p className="font-display text-4xl font-semibold">{hoja ? `${hoja.goalsFor}–${hoja.goalsAgainst}` : "Sin resultado"}</p>
        <p className="text-sm text-muted">{event.title}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {Object.entries(event.lineup).map(([puestoSlot, id]) => {
          const persona = members.find((item) => item.id === id);
          return <MiniCard key={puestoSlot} apodo={persona?.nick ?? "Libre"} dorsal={persona?.menor ? null : persona?.number ?? null} puesto={puestoSlot} ancho={46} />;
        })}
      </div>
      <div className="rounded-2xl bg-surface px-3 py-3">
        <p className="text-sm font-semibold">{staff ? `¿Cumplimos las consignas del equipo? ${marcas.si} de ${marcas.de || (event.consignas?.length ?? 0)}` : `Así nos fue ${marcas.si} de ${marcas.de}`}</p>
        <ul className="mt-2 grid gap-2">
          {(event.consignas ?? []).map((regla) => {
            const valor = event.cumplidas?.[regla.id];
            return (
              <li key={regla.id} className="flex items-center justify-between gap-2 text-sm">
                <span><span style={{ color: COLOR_MOMENTO[regla.momento] }}>● </span>{regla.texto}</span>
                {staff ? (
                  <span className="flex gap-1">
                    <button type="button" className={`h-9 rounded-lg px-2 ${valor === "si" ? "bg-accent text-accent-fg" : "bg-void"}`} onClick={() => marcarCumplida(event.id, regla.id, "si")}>Cumplimos</button>
                    <button type="button" className={`h-9 rounded-lg px-2 ${valor === "no" ? "bg-danger text-white" : "bg-void"}`} onClick={() => marcarCumplida(event.id, regla.id, "no")}>No</button>
                  </span>
                ) : (
                  <span>{valor === "si" ? "✓" : valor === "no" ? "✗" : "·"}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-2xl bg-surface px-3 py-3 text-sm">
        <p className="font-semibold">Origen de los goles</p>
        <p className="mt-1 text-muted">{(event.origenGoles ?? []).join(" · ") || "Todavía no está cargado."}</p>
        <p className="mt-2">Qué funcionó: {marcas.si > 0 ? `cumplimos ${marcas.si}` : "el DT todavía no repasó las consignas"}.</p>
      </div>
      {!staff ? (
        <div className="rounded-2xl border border-accent px-3 py-3 text-sm">
          <p className="font-semibold">Tu impacto · solo lo ves vos</p>
          <p className="mt-1">{sociedad ?? "Todavía no hay una sociedad para mostrar."}</p>
          <p>{puesto ?? "Cuando sumes más partidos, aparece dónde rendís más."}</p>
          <p>{tendencia ?? `Como titular: ${impacto.titular.g}G ${impacto.titular.e}E ${impacto.titular.p}P (${impacto.titular.n})`}</p>
        </div>
      ) : null}
      <div className="rounded-2xl bg-surface px-3 py-3 text-sm">Cerebro de la fecha: Juancito, si respondió el plan.</div>
      {staff ? (
        <button type="button" className="h-14 rounded-2xl bg-[#25d366] font-semibold text-[#06210f]" onClick={() => avisarDemo(textoDespues(rivalDe(event), marcas.si, marcas.de, link))}>
          Mandar: Así nos fue
        </button>
      ) : (
        <p className="rounded-2xl bg-accent/15 px-3 py-3 text-sm">Sacaste la card Cerebro si llegaste a 2 de 3.</p>
      )}
    </section>
  );
}

function MiEquipo({
  sheets,
  staff,
  meId,
}: {
  event: ClubEvent;
  events: ClubEvent[];
  sheets: MatchSheet[];
  members: Member[];
  staff: boolean;
  meId: string;
}) {
  const tendencia = miTendencia(meId, sheets);
  return (
    <section className="mt-3 grid gap-3">
      <p className="text-xs font-semibold uppercase text-muted">Nuestro ADN</p>
      <div className="grid grid-cols-3 gap-2">
        {["Presión 5s", "Salida corta", "Bloque medio"].map((item) => (
          <div key={item} className="rounded-2xl bg-surface px-2 py-3 text-center text-xs font-semibold">{item}</div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface px-3 py-3 text-sm">
        <p className="font-semibold">Racha del plantel</p>
        <p className="text-muted">El plantel entendió el plan en las fechas publicadas. El comodín se guarda cada 4 y se usa una sola vez.</p>
      </div>
      {staff ? (
        <p className="rounded-2xl bg-surface px-3 py-3 text-sm">El plantel y el plan, sin nombres. {sheets.length} partidos cargados.</p>
      ) : (
        <div className="rounded-2xl border border-accent px-3 py-3 text-sm">
          <p className="font-semibold">Tu nivel de rol</p>
          <p>Titular del plan. {tendencia ?? "Seguís el plan del equipo."}</p>
        </div>
      )}
      <div className="flex gap-2">
        <MiniCard apodo="Juancito" dorsal={8} puesto="VOL" ancho={64} />
      </div>
      <p className="text-xs text-muted">Cerebros de la temporada</p>
    </section>
  );
}

function SheetRol({
  event,
  members,
  slot,
  onCerrar,
}: {
  event: ClubEvent;
  members: Member[];
  slot: string;
  onCerrar: () => void;
}) {
  const id = event.lineup[slot];
  const persona = members.find((item) => item.id === id);
  const reglas = consignasDelSlot(event, slot);
  const equipo = event.consignas ?? [];
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={onCerrar}>
      <div className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-bg px-4 py-4" onClick={(evento) => evento.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl font-semibold">{persona?.nick ?? "Libre"} · {slot}</p>
          <button type="button" className="h-10 px-2" onClick={onCerrar}>Cerrar</button>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase text-muted">Como equipo</p>
        <ul className="mt-1 text-sm">{equipo.slice(0, 3).map((item) => <li key={item.id}>{item.texto}</li>)}</ul>
        <p className="mt-3 text-xs font-semibold uppercase text-accent">Vos</p>
        <ul className="mt-1 text-sm">{reglas.map((item) => <li key={item.id}>{item.texto}</li>)}</ul>
        <p className="mt-3 text-xs font-semibold uppercase text-muted">Pelota parada</p>
        <p className="text-sm">{reglas.find((item) => item.momento === "pelota")?.texto ?? "Seguí la marca del equipo."}</p>
        <p className="mt-3 text-xs font-semibold uppercase text-muted">Nota del DT</p>
        <p className="text-sm">{id ? event.notas?.[id] ?? "Sin nota." : "Sin nota."}</p>
        <p className="mt-3 text-sm text-muted">Audio del puesto, cuando el DT lo graba.</p>
      </div>
    </div>
  );
}

function SheetDatos({
  event,
  events,
  sheets,
  members,
  onCerrar,
  onUsar,
}: {
  event: ClubEvent;
  events: ClubEvent[];
  sheets: MatchSheet[];
  members: Member[];
  onCerrar: () => void;
  onUsar: () => void;
}) {
  const [slot, setSlot] = useState("MI");
  const id = event.lineup[slot] ?? "";
  const persona = members.find((item) => item.id === id);
  const porque = useMemo(() => porQueCard(id, slot, events, sheets, members), [id, slot, events, sheets, members]);
  const pocos = sheets.length < 5;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50">
      <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-bg px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-2xl font-semibold">Armar con datos</p>
            <p className="text-xs text-muted">Solo lo ven el DT y el ayudante · {sheets.length} partidos cargados</p>
          </div>
          <button type="button" className="h-10 px-2" onClick={onCerrar}>X</button>
        </div>
        <p className="mt-3 text-sm font-semibold">Once sugerido · {event.formacion}</p>
        <p className="text-xs text-muted">Con {event.formacion}: mirá el récord del equipo en Stats.</p>
        <div className="mt-2">
          <CanchaCards event={event} members={members} staff={false} onCarta={setSlot} alto={220} />
        </div>
        <p className="mt-2 text-xs text-muted">Tocá una card</p>
        <p className="mt-2 rounded-2xl bg-accent/15 px-3 py-2 text-sm">Por qué {persona?.nick ?? "este puesto"}: {porque}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="h-12 rounded-2xl bg-accent font-semibold text-accent-fg" onClick={onUsar}>Usar este equipo</button>
          <button type="button" className="h-12 rounded-2xl bg-surface font-semibold" onClick={onCerrar}>Editar</button>
        </div>
        {["Disponibilidad", "Por esquema", "Sociedades", "Con / sin"].map((item) => (
          <div key={item} className="mt-2 rounded-2xl bg-surface px-3 py-3 text-sm">
            <p className="font-semibold">{item}</p>
            {pocos ? <p className="text-xs text-warning">Todavía son pocos partidos ({sheets.length})</p> : <p className="text-xs text-muted">Sale de las planillas cargadas.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Quiz({
  event,
  plantel,
  onCerrar,
}: {
  event: ClubEvent;
  plantel: ReturnType<typeof metaPlantel>;
  yo: string;
  onCerrar: () => void;
}) {
  const preguntas = event.quiz?.preguntas ?? [];
  const [paso, setPaso] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const pregunta = preguntas[paso];
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg px-4 py-4">
      <button type="button" className="h-10 text-sm" onClick={onCerrar}>Volver</button>
      <p className="text-sm">Pregunta {Math.min(paso + 1, preguntas.length)} de {preguntas.length} · cierra {dia(event.quiz?.cierra ?? event.startsAt)}</p>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {preguntas.map((item, index) => (
          <div key={item.id} className={`h-1.5 rounded-full ${index <= paso ? "bg-accent" : "bg-surface"}`} />
        ))}
      </div>
      {pregunta ? (
        <>
          <div className="mt-3 grid grid-cols-[120px_1fr] gap-3">
            <div className="h-28 rounded-2xl bg-gradient-to-b from-[#1a9a4a] to-[#0c5a2a]" />
            <div>
              <p className="text-xs font-semibold" style={{ color: COLOR_MOMENTO[pregunta.momento] }}>{MOMENTOS.find((item) => item.id === pregunta.momento)?.label}</p>
              <p className="font-display text-xl font-semibold leading-tight">{pregunta.situacion}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {pregunta.opciones.map((opcion, index) => (
              <button key={opcion} type="button" onClick={() => setElegida(index)} className={`h-12 rounded-2xl px-3 text-left text-sm ${elegida === index ? "bg-accent text-accent-fg" : "bg-surface"}`}>
                {String.fromCharCode(65 + index)}. {opcion}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 h-12 w-full rounded-2xl bg-accent font-semibold text-accent-fg"
            onClick={() => {
              if (elegida == null) return;
              guardarRespuestaQuiz(event.id, pregunta.id, elegida);
              setElegida(null);
              if (paso + 1 < preguntas.length) setPaso(paso + 1);
              else onCerrar();
            }}
          >
            Responder
          </button>
        </>
      ) : <p className="mt-4 text-sm">Esta fecha no tiene preguntas.</p>}
      <div className="mt-4 rounded-2xl bg-surface px-3 py-3 text-sm">
        <p>El plantel entendió el plan: {plantel.entendieron} de {plantel.total}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-void">
          <div className="h-full bg-accent" style={{ width: `${Math.min(100, (plantel.entendieron / plantel.total) * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">{plantel.faltan > 0 ? `Faltan ${plantel.faltan} para el 80 %` : "¡Llegamos a la meta!"}</p>
        <p className="text-xs">Racha del plantel: las fechas en las que se publicó el plan.</p>
      </div>
      <div className="mt-3">
        <MiniCard apodo="Cerebro" dorsal={null} puesto="de la fecha" ancho={72} bocaAbajo />
        <p className="mt-1 text-xs text-muted">Tu resultado lo ves cuando cierra.</p>
      </div>
    </div>
  );
}

function Revelacion({
  event,
  members,
  meId,
  onRol,
  onCerrar,
}: {
  event: ClubEvent;
  members: Member[];
  meId: string;
  onRol: () => void;
  onCerrar: () => void;
}) {
  const slot = slotDe(event, meId);
  const persona = members.find((item) => item.id === meId);
  return (
    <main className="mv-revelar fixed inset-0 z-50 overflow-y-auto bg-bg px-4 py-6">
      <p className="text-center text-xs uppercase tracking-widest text-muted">{dia(event.startsAt)} · vs {rivalDe(event)}</p>
      <h1 className="mt-2 text-center font-display text-5xl font-semibold leading-none">SALIÓ LA FORMACIÓN</h1>
      <p className="mt-2 text-center text-sm text-muted">El Profe ya armó el equipo. Dale vuelta a tu card.</p>
      <div className="mt-4">
        <CanchaCards event={event} members={members} staff={false} yoId={meId} alto={300} />
      </div>
      <p className="mt-3 text-center text-sm font-semibold">{slot ? `Sos titular · ${persona?.nick ?? ""} ${slot}` : "Estás en el banco"}</p>
      <button type="button" className="mt-4 h-14 w-full rounded-2xl bg-accent font-semibold text-accent-fg" onClick={onRol}>Mirá tu rol ›</button>
      <button type="button" className="mt-2 h-12 w-full text-sm text-muted" onClick={onCerrar}>Más tarde</button>
    </main>
  );
}
