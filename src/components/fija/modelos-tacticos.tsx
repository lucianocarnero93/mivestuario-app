import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FORMATIONS } from "@/lib/fija/formations";
import { DEMO } from "@/lib/fija/demo-flag";
import { avisarDemo } from "@/lib/fija/demo-aviso";
import { aplicarCruces, alternarCruce, lineaDeJugador, resolverCuadros, type CuadroResuelto, type FichaModelo } from "@/lib/fija/modelos-evento";
import { MOMENTOS, MODELOS, aplicaEn, modeloDeLaSemana, modeloPorId, type Modelo } from "@/lib/fija/modelos";
import { useFija } from "@/lib/fija/store";
import { MAX_MODELOS, modelosDelPartido, textoWhatsapp } from "@/lib/fija/tactica";
import type { ClubEvent, Member, Modality } from "@/lib/fija/types";

export function ModelosTacticos({
  event,
  staff,
  abrirId,
}: {
  event: ClubEvent;
  staff: boolean;
  abrirId?: string | null;
}) {
  const members = useFija((s) => s.members);
  const me = useFija((s) => s.members.find((item) => item.id === s.activeId));
  const setTactica = useFija((s) => s.setTactica);
  const [abierto, setAbierto] = useState<string | null>(abrirId ?? null);
  const forma = FORMATIONS[event.modality].find((item) => item.id === event.formacion) ?? FORMATIONS[event.modality][0];
  const cargados = event.tactica?.modelos ?? [];
  const modelo = abierto ? modeloPorId(abierto) : undefined;

  function guardarLista(next: { id: string; cruces: [string, string][] }[]) {
    setTactica(event.id, { ...event.tactica, modelos: next });
  }

  function usar(id: string) {
    if (!staff) return;
    if (cargados.some((item) => item.id === id) || cargados.length >= MAX_MODELOS) return;
    guardarLista([...cargados, { id, cruces: [] }]);
  }

  function sacar(id: string) {
    if (!staff) return;
    guardarLista(cargados.filter((item) => item.id !== id));
  }

  if (modelo) {
    return (
      <Detalle
        event={event}
        modelo={modelo}
        staff={staff}
        members={members}
        me={me}
        formaSlots={forma.slots}
        modalidad={event.modality}
        onVolver={() => setAbierto(null)}
        onCruce={(a, b) => {
          const row = cargados.find((item) => item.id === modelo.id);
          if (!row) return;
          guardarLista(cargados.map((item) => (item.id === modelo.id ? { ...item, cruces: alternarCruce(item.cruces, a, b) } : item)));
        }}
      />
    );
  }

  const semana = modeloDeLaSemana();
  const visibles = staff ? MODELOS : modelosDelPartido(event.tactica);
  return (
    <div className="mt-3 grid gap-3" data-testid="biblioteca-modelos">
      <div className="rounded-2xl border border-line/25 bg-black/30 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Modelos de juego</p>
        <p className="mt-2 text-sm leading-snug">
          {staff
            ? "Elegí un movimiento armado. El plantel lo ve animado con tus titulares y cada uno su tarea."
            : "El DT los armó con los titulares. Mirá el tuyo con tu nombre."}
        </p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">En este partido ({cargados.length}/3)</p>
        {cargados.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Ninguno todavía. Tocá «Usar en el partido» en uno de abajo.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {cargados.map((item) => {
              const nombre = modeloPorId(item.id)?.nombre ?? item.id;
              return (
                <li key={item.id}>
                  <button type="button" className="h-11 rounded-full bg-accent px-3 text-sm font-semibold text-accent-fg" onClick={() => setAbierto(item.id)}>
                    {nombre}
                  </button>
                  {staff ? (
                    <button type="button" className="ml-1 h-11 px-2 text-sm text-muted" aria-label={`Sacar ${nombre}`} onClick={() => sacar(item.id)}>
                      ×
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {staff && !cargados.some((item) => item.id === semana.id) ? (
        <div className="rounded-2xl border border-accent/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Modelo de la semana</p>
          <h2 className="mt-1 text-xl font-semibold">{semana.nombre}</h2>
          <p className="mt-1 text-sm text-muted">{semana.cuando}</p>
          <button
            type="button"
            className="mt-3 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-accent-fg disabled:opacity-40"
            disabled={cargados.length >= MAX_MODELOS}
            data-testid={`usar-${semana.id}`}
            onClick={() => usar(semana.id)}
          >
            Usar en el partido
          </button>
        </div>
      ) : null}

      {MOMENTOS.map((momento) => {
        const lista = visibles.filter((item) => item.momento === momento.id);
        if (lista.length === 0) return null;
        return (
          <section key={momento.id}>
            <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{momento.label}</h3>
            <ul className="mt-2 grid gap-2">
              {lista.map((item) => (
                <Tarjeta
                  key={item.id}
                  modelo={item}
                  event={event}
                  slots={forma.slots}
                  modalidad={event.modality}
                  cargado={cargados.some((row) => row.id === item.id)}
                  lleno={cargados.length >= MAX_MODELOS}
                  staff={staff}
                  onVer={() => setAbierto(item.id)}
                  onUsar={() => usar(item.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Tarjeta({
  modelo,
  event,
  slots,
  modalidad,
  cargado,
  lleno,
  staff,
  onVer,
  onUsar,
}: {
  modelo: Modelo;
  event: ClubEvent;
  slots: { key: string; label: string; x: number; y: number }[];
  modalidad: Modality;
  cargado: boolean;
  lleno: boolean;
  staff: boolean;
  onVer: () => void;
  onUsar: () => void;
}) {
  const aplica = aplicaEn(modelo, modalidad);
  const lineup = lineupDelModelo(event, modelo.id);
  const cuadros = aplica ? resolverCuadros(modelo, slots, lineup, modalidad) : null;
  return (
    <li className="flex gap-3 rounded-2xl border border-line/20 bg-black/30 p-3">
      <Mini modelo={modelo} cuadros={cuadros} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{modelo.nombre}</p>
        <p className="mt-1 text-xs leading-snug text-muted">{aplica ? modelo.cuando : modelo.noAplica[modalidad]}</p>
        <div className="mt-2 flex gap-2">
          <button type="button" className="h-11 rounded-xl bg-surface px-3 text-sm font-semibold" onClick={onVer} disabled={!aplica}>
            Ver
          </button>
          {staff ? (
            <button
              type="button"
              className="h-11 flex-1 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-40"
              disabled={!aplica || cargado || lleno}
              data-testid={`usar-${modelo.id}`}
              onClick={onUsar}
            >
              {cargado ? "En el partido" : "Usar en el partido"}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Mini({ modelo, cuadros }: { modelo: Modelo; cuadros: CuadroResuelto[] | null }) {
  const a = cuadros?.[0];
  const b = cuadros?.[1];
  if (!a) {
    return <div className="h-24 w-16 shrink-0 rounded-lg bg-pitch-deep" aria-hidden />;
  }
  return (
    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-pitch-deep" aria-hidden>
      <CanchaSvg prefijo={`mini-${modelo.id}`} actual={a} anterior={b ? a : null} siguiente={b ?? null} chica />
    </div>
  );
}

function Detalle({
  event,
  modelo,
  staff,
  members,
  me,
  formaSlots,
  modalidad,
  onVolver,
  onCruce,
}: {
  event: ClubEvent;
  modelo: Modelo;
  staff: boolean;
  members: Member[];
  me: Member | undefined;
  formaSlots: { key: string; label: string; x: number; y: number }[];
  modalidad: Modality;
  onVolver: () => void;
  onCruce: (a: string, b: string) => void;
}) {
  const [paso, setPaso] = useState(0);
  const [play, setPlay] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);
  const cargado = (event.tactica?.modelos ?? []).some((item) => item.id === modelo.id);
  const lineup = lineupDelModelo(event, modelo.id);
  const cuadros = resolverCuadros(modelo, formaSlots, lineup, modalidad);
  const cuadro = cuadros?.[paso] ?? cuadros?.[0];
  const anterior = cuadros && paso > 0 ? cuadros[paso - 1] : null;
  const linea = me ? lineaDeJugador(modelo, formaSlots, lineup, me.id) : null;

  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setPaso((n) => (n + 1) % 3), 1800);
    return () => window.clearInterval(id);
  }, [play]);

  function tocar(memberId: string) {
    if (!staff || !cargado || !memberId) return;
    if (!elegido) {
      setElegido(memberId);
      return;
    }
    if (elegido === memberId) {
      setElegido(null);
      return;
    }
    onCruce(elegido, memberId);
    setElegido(null);
  }

  function avisar() {
    if (DEMO) {
      avisarDemo("En la demo no se manda nada.");
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(textoWhatsapp(modelo))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-3" data-testid="detalle-modelo">
      <button type="button" className="h-11 text-sm font-semibold text-accent" onClick={onVolver}>
        ‹ Modelos
      </button>
      <h2 className="text-2xl font-semibold leading-tight">{modelo.nombre}</h2>
      <p className="mt-1 text-sm text-muted">{modelo.cuando}</p>
      {linea ? (
        <p className="mt-3 text-base font-medium leading-snug" data-testid="linea-vos">
          {linea}
        </p>
      ) : null}
      {cuadro && cuadros ? (
        <div className="relative mt-3 aspect-[5/7] w-full overflow-hidden rounded-2xl bg-pitch-deep">
          <CanchaSvg
            prefijo={`det-${modelo.id}`}
            actual={cuadro}
            anterior={anterior}
            siguiente={null}
            fichas={cuadro.fichas}
            members={members}
            yo={me?.id}
            elegido={elegido}
            denso={modalidad === "f11" || modalidad === "f9"}
            onTocar={staff && cargado ? tocar : undefined}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">{modelo.noAplica[modalidad] ?? "Este modelo no entra en este formato."}</p>
      )}
      {cuadro ? <p className="mt-3 text-sm leading-snug">{paso + 1}. {cuadro.texto}</p> : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((n) => (
          <button
            key={n}
            type="button"
            className={`h-12 rounded-xl text-sm font-semibold ${paso === n ? "bg-accent text-accent-fg" : "bg-surface"}`}
            onClick={() => {
              setPlay(false);
              setPaso(n);
            }}
          >
            {n + 1}
          </button>
        ))}
      </div>
      <button type="button" className="mt-2 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-accent-fg" onClick={() => setPlay((v) => !v)}>
        {play ? "Pausa" : "▷ Ver el movimiento"}
      </button>
      {staff && cargado ? (
        <p className="mt-3 text-xs text-muted">
          Cambiar quién hace qué: dos toques intercambian dos fichas, solo en este modelo.
          {elegido ? " Tocá la otra." : ""}
        </p>
      ) : null}
      <ul className="mt-3 grid gap-1 text-sm">
        {modelo.claves.map((clave) => (
          <li key={clave}>· {clave}</li>
        ))}
      </ul>
      {!me?.menor ? (
        <button type="button" className="mt-3 h-12 w-full rounded-xl bg-surface text-sm font-semibold" onClick={avisar}>
          Avisar al grupo por WhatsApp
        </button>
      ) : null}
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Basado en</p>
      <ul className="mt-1 grid gap-1">
        {modelo.fuentes.map((fuente) => (
          <li key={fuente.url}>
            <a className="text-xs text-accent underline" href={fuente.url} target="_blank" rel="noreferrer">
              {fuente.nombre}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function lineupDelModelo(event: ClubEvent, modeloId: string): Record<string, string> {
  const cruces = event.tactica?.modelos?.find((item) => item.id === modeloId)?.cruces ?? [];
  return aplicarCruces(event.lineup, cruces);
}

function CanchaSvg({
  prefijo,
  actual,
  anterior,
  siguiente,
  fichas,
  members,
  yo,
  elegido,
  denso,
  chica,
  onTocar,
}: {
  prefijo: string;
  actual: CuadroResuelto;
  anterior: CuadroResuelto | null;
  siguiente: CuadroResuelto | null;
  fichas?: FichaModelo[];
  members?: Member[];
  yo?: string;
  elegido?: string | null;
  denso?: boolean;
  chica?: boolean;
  onTocar?: (memberId: string) => void;
}) {
  const desde = anterior ?? actual;
  const hacia = siguiente;
  const flechas = (hacia ? pares(actual, hacia) : pares(desde, actual)).filter((item) => item.lejos);
  const pelotaDesde = anterior?.pelota ?? actual.pelota;
  const pelotaHacia = actual.pelota;
  const mostrarLinea = anterior && Math.hypot(pelotaHacia.x - pelotaDesde.x, pelotaHacia.y - pelotaDesde.y) > 2;
  const lista = fichas ?? actual.fichas;
  return (
    <>
      <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full text-line/50" aria-hidden>
        <rect x="6" y="6" width="88" height="128" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="6" y1="70" x2="94" y2="70" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="50" cy="70" r="12" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </svg>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <marker id={`${prefijo}-punta`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="#e4ff55" />
          </marker>
        </defs>
        {mostrarLinea ? (
          <line x1={pelotaDesde.x} y1={pelotaDesde.y} x2={pelotaHacia.x} y2={pelotaHacia.y} stroke="#ffffff" strokeWidth="0.7" />
        ) : null}
        {flechas.map((item) => (
          <line
            key={item.id}
            x1={item.x1}
            y1={item.y1}
            x2={item.x2}
            y2={item.y2}
            stroke="#e4ff55"
            strokeWidth="0.8"
            strokeDasharray="2 1.4"
            markerEnd={`url(#${prefijo}-punta)`}
          />
        ))}
        <circle cx={actual.pelota.x} cy={actual.pelota.y} r={chica ? 3 : 2.2} fill="#fff" />
      </svg>
      {lista.map((ficha) => {
        const person = members?.find((item) => item.id === ficha.memberId);
        const esYo = Boolean(yo && ficha.memberId === yo);
        const nombre = esYo ? "Vos" : person?.nick ?? "";
        const Comp = onTocar ? "button" : "div";
        return (
          <Comp
            key={ficha.id}
            type={onTocar ? "button" : undefined}
            data-testid={chica ? undefined : `ficha-${person?.id || ficha.slot}`}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${ficha.x}%`, top: `${ficha.y}%` }}
            onClick={onTocar && person ? () => onTocar(person.id) : undefined}
          >
            {!chica && esYo ? <span className="text-[9px] font-semibold leading-none text-accent">{ficha.etiqueta}</span> : null}
            <span
              className={`grid place-items-center rounded-full border-2 font-bold ${chica ? "size-2 border-line bg-surface" : denso ? "size-8 text-[10px]" : "size-11 text-xs"} ${esYo ? "border-accent bg-accent text-accent-fg ring-4 ring-fg" : "border-line bg-surface text-accent"} ${elegido && person?.id === elegido ? "ring-2 ring-line" : ""}`}
            >
              {chica ? "" : person?.number ?? ""}
            </span>
            {!chica && nombre ? (
              <span className={`max-w-14 truncate text-[10px] ${esYo ? "font-semibold text-accent" : "text-line"}`} data-testid={esYo ? "vos" : undefined}>
                {nombre}
              </span>
            ) : null}
          </Comp>
        );
      })}
    </>
  );
}

function pares(desde: CuadroResuelto, hacia: CuadroResuelto) {
  return hacia.fichas.map((ficha) => {
    const prev = desde.fichas.find((item) => item.id === ficha.id);
    const x1 = prev?.x ?? ficha.x;
    const y1 = prev?.y ?? ficha.y;
    return { id: ficha.id, x1, y1, x2: ficha.x, y2: ficha.y, lejos: Math.hypot(ficha.x - x1, ficha.y - y1) > 3.5 };
  });
}

export function EntradaModelos({ event, staff, onAbrir }: { event: ClubEvent; staff: boolean; onAbrir: () => void }) {
  const n = event.tactica?.modelos?.length ?? 0;
  if (!staff) return null;
  return (
    <button type="button" onClick={onAbrir} className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-accent/70 px-4 py-3 text-left" data-testid="entrada-modelos">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-lg text-accent-fg">▷</span>
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Modelos de juego</span>
        <span className="block text-sm font-semibold leading-snug">
          {n > 0 ? `${n} en este partido` : "Mostrales cómo se mueven, con tus titulares"}
        </span>
      </span>
    </button>
  );
}

export function BotonesJugador({ event, onAbrir }: { event: ClubEvent; onAbrir: (id: string) => void }) {
  const me = useFija((s) => s.members.find((item) => item.id === s.activeId));
  const modelos = modelosDelPartido(event.tactica);
  if (!me || modelos.length === 0) return null;
  const forma = FORMATIONS[event.modality].find((item) => item.id === event.formacion) ?? FORMATIONS[event.modality][0];
  return (
    <div className="mb-3 grid gap-2">
      {modelos.map((modelo) => {
        const lineup = lineupDelModelo(event, modelo.id);
        const linea = lineaDeJugador(modelo, forma.slots, lineup, me.id);
        return (
          <button key={modelo.id} type="button" className="rounded-2xl border border-line/25 bg-black/30 px-4 py-3 text-left" onClick={() => onAbrir(modelo.id)}>
            <span className="block text-sm font-semibold">{modelo.nombre}</span>
            {linea ? <span className="mt-1 block text-xs leading-snug text-muted">{linea}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TarjetaStaffInicio({ event }: { event: ClubEvent }) {
  const cargados = modelosDelPartido(event.tactica);
  const semana = modeloDeLaSemana();
  const publicado = Boolean(event.lineupPublishedAt);
  return (
    <section className="mt-4 rounded-2xl border border-line/30 bg-black/30 p-4" data-testid="modelos-inicio">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Modelos de este partido</p>
      <p className="mt-1 text-base font-semibold">
        {cargados.length > 0 ? cargados.map((item) => item.nombre).join(" · ") : semana.nombre}
      </p>
      <p className="mt-1 text-sm text-muted">
        {publicado && cargados.length > 0
          ? "El plantel ya los ve animados, cada uno con su tarea."
          : cargados.length > 0
            ? "Publicá la formación para que el plantel los vea."
            : "Modelo de la semana. Todavía no está en este partido."}
      </p>
      <Link to="/cancha" search={{ ver: "modelos", partido: event.id }} className="mt-3 flex h-12 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg">
        Ver los modelos
      </Link>
    </section>
  );
}
