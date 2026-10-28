import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { FORMATIONS, puestoDe } from "@/lib/fija/formations";
import { lineaDeJugador } from "@/lib/fija/modelos-evento";
import { useFija } from "@/lib/fija/store";
import {
  CLAVES_EQUIPO,
  CUANDOS,
  FRASES,
  alternarClave,
  modelosDelPartido,
  tareasDe,
  type TacticaPartido,
} from "@/lib/fija/tactica";
import type { ClubEvent, Member } from "@/lib/fija/types";

function etiqueta(person: Member): string {
  const numero = person.number != null ? `${person.number} ` : "";
  return `${numero}${person.nick}`;
}

function plantelDelPartido(event: ClubEvent, members: Member[]): Member[] {
  const ids = [...Object.values(event.lineup), ...(event.suplentes ?? [])];
  const vistos = new Set<string>();
  const out: Member[] = [];
  for (const id of ids) {
    if (vistos.has(id)) continue;
    const person = members.find((item) => item.id === id);
    if (!person) continue;
    vistos.add(id);
    out.push(person);
  }
  return out;
}

export function ClavesEquipo({ event, staff }: { event: ClubEvent; staff: boolean }) {
  const setTactica = useFija((s) => s.setTactica);
  const claves = event.tactica?.claves ?? [];
  const [abierto, setAbierto] = useState(false);
  function guardar(next: string[]) {
    setTactica(event.id, { ...event.tactica, claves: next });
  }
  return (
    <div className="rounded-2xl border border-line/25 bg-black/30 p-4" data-testid="claves-equipo">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Claves del equipo</p>
      {staff ? <p className="mt-1 text-xs text-muted">Hasta 3 ideas para todo el equipo. Se eligen tocando.</p> : null}
      <ul className="mt-3 grid gap-2">
        {claves.map((clave, index) => (
          <li key={clave} className="flex items-center gap-3" data-testid="clave">
            <span className="grid size-7 place-items-center rounded-full bg-accent text-sm font-bold text-accent-fg">{index + 1}</span>
            <span className="flex-1 text-base font-medium">{clave}</span>
            {staff ? (
              <button type="button" className="grid size-11 place-items-center text-muted" aria-label={`Quitar ${clave}`} onClick={() => guardar(claves.filter((item) => item !== clave))}>
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {staff && claves.length < 3 ? (
        abierto ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {CLAVES_EQUIPO.filter((item) => !claves.includes(item)).map((item) => (
              <button
                key={item}
                type="button"
                className="h-11 rounded-full bg-surface px-3 text-sm font-semibold"
                onClick={() => {
                  guardar(alternarClave(claves, item));
                  setAbierto(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="mt-3 h-11 w-full rounded-xl bg-surface text-sm font-semibold" onClick={() => setAbierto(true)}>
            + Sumar clave
          </button>
        )
      ) : null}
      {!staff && claves.length === 0 ? <p className="mt-2 text-sm text-muted">El DT todavía no dejó claves.</p> : null}
    </div>
  );
}

export function FraseRapida({ event, memberId }: { event: ClubEvent; memberId: string }) {
  const setTactica = useFija((s) => s.setTactica);
  const actual = event.tactica?.frases?.[memberId] ?? "";
  return (
    <select
      aria-label="Frase rápida"
      className="h-11 rounded-md bg-surface px-2 text-sm"
      value={actual}
      onChange={(e) => {
        const frases = { ...(event.tactica?.frases ?? {}) };
        if (!e.target.value) delete frases[memberId];
        else frases[memberId] = e.target.value;
        setTactica(event.id, { ...event.tactica, frases });
      }}
    >
      <option value="">Sin frase</option>
      {FRASES.map((frase) => (
        <option key={frase} value={frase}>{frase}</option>
      ))}
    </select>
  );
}

export function CambiosPlaneados({ event }: { event: ClubEvent }) {
  const members = useFija((s) => s.members);
  const setTactica = useFija((s) => s.setTactica);
  const gente = plantelDelPartido(event, members);
  const cambios = event.tactica?.cambios ?? [];
  const [sale, setSale] = useState("");
  const [entra, setEntra] = useState("");
  const [cuando, setCuando] = useState<string>(CUANDOS[3]);
  function guardar(next: TacticaPartido["cambios"]) {
    setTactica(event.id, { ...event.tactica, cambios: next });
  }
  return (
    <div className="mt-3 rounded-2xl border border-line/25 bg-black/30 p-4" data-testid="cambios-planeados">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Cambios planeados</p>
      <ul className="mt-2 grid gap-2">
        {cambios.map((cambio, index) => {
          const saleP = members.find((item) => item.id === cambio.sale);
          const entraP = members.find((item) => item.id === cambio.entra);
          return (
            <li key={`${cambio.sale}-${cambio.cuando}-${index}`} className="flex items-center gap-2 text-sm">
              <span className="flex-1">
                Sale {saleP ? etiqueta(saleP) : "—"}. Entra {entraP ? etiqueta(entraP) : "—"} a los {cambio.cuando}.
              </span>
              <button type="button" className="grid size-11 place-items-center text-muted" aria-label="Quitar cambio" onClick={() => guardar(cambios.filter((_, i) => i !== index))}>
                ×
              </button>
            </li>
          );
        })}
      </ul>
      {cambios.length < 4 ? (
        <div className="mt-3 grid gap-2">
          <SelectGente label="Sale" value={sale} people={gente} onChange={setSale} />
          <SelectGente label="Entra" value={entra} people={gente} onChange={setEntra} />
          <label className="grid gap-1 text-xs text-muted">
            Cuándo
            <select className="h-11 rounded-md bg-surface px-2 text-sm text-fg" value={cuando} onChange={(e) => setCuando(e.target.value)}>
              {CUANDOS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="h-11 rounded-xl bg-accent text-sm font-semibold text-accent-fg disabled:opacity-40"
            disabled={!sale || !entra || sale === entra}
            onClick={() => {
              guardar([...cambios, { sale, entra, cuando }]);
              setSale("");
              setEntra("");
            }}
          >
            Sumar cambio
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function QuienPelota({ event }: { event: ClubEvent }) {
  const members = useFija((s) => s.members);
  const setTactica = useFija((s) => s.setTactica);
  const gente = plantelDelPartido(event, members);
  const pelota = event.tactica?.pelota ?? {};
  function poner(patch: {
    corners?: string;
    tiros?: string;
    penales?: string;
    contra?: { primer?: string; segundo?: string; arriba?: string };
    favor?: { atras?: string };
  }) {
    setTactica(event.id, {
      ...event.tactica,
      pelota: {
        ...pelota,
        ...patch,
        contra: { ...pelota.contra, ...patch.contra },
        favor: { ...pelota.favor, ...patch.favor },
      },
    });
  }
  return (
    <div className="mb-3 rounded-2xl border border-line/25 bg-black/30 p-4" data-testid="pelota-quien">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Pelota parada · quién hace qué</p>
      <p className="mt-1 text-xs text-muted">Lo ve todo el plantel cuando publicás.</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Pateadores</p>
      <div className="mt-2 grid gap-2">
        <SelectGente label="Córners" value={pelota.corners ?? ""} people={gente} onChange={(id) => poner({ corners: id || undefined })} />
        <SelectGente label="Tiros libres" value={pelota.tiros ?? ""} people={gente} onChange={(id) => poner({ tiros: id || undefined })} />
        <SelectGente label="Penales" value={pelota.penales ?? ""} people={gente} onChange={(id) => poner({ penales: id || undefined })} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Córner en contra</p>
      <div className="mt-2 grid gap-2">
        <SelectGente label="Primer palo" value={pelota.contra?.primer ?? ""} people={gente} onChange={(id) => poner({ contra: { primer: id || undefined } })} />
        <SelectGente label="Segundo palo" value={pelota.contra?.segundo ?? ""} people={gente} onChange={(id) => poner({ contra: { segundo: id || undefined } })} />
        <SelectGente label="Queda arriba" value={pelota.contra?.arriba ?? ""} people={gente} onChange={(id) => poner({ contra: { arriba: id || undefined } })} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Córner a favor</p>
      <div className="mt-2">
        <SelectGente label="Queda atrás" value={pelota.favor?.atras ?? ""} people={gente} onChange={(id) => poner({ favor: { atras: id || undefined } })} />
      </div>
    </div>
  );
}

function SelectGente({
  label,
  value,
  people,
  onChange,
}: {
  label: string;
  value: string;
  people: Member[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <select className="h-11 rounded-md bg-surface px-2 text-sm text-fg" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin asignar</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{etiqueta(person)}</option>
        ))}
      </select>
    </label>
  );
}

export function TarjetaTuPartido({ event }: { event: ClubEvent }) {
  const me = useFija((s) => s.members.find((item) => item.id === s.activeId));
  const members = useFija((s) => s.members);
  if (!me || !event.lineupPublishedAt) return null;
  const forma = FORMATIONS[event.modality].find((item) => item.id === event.formacion) ?? FORMATIONS[event.modality][0];
  const puesto = puestoDe(event.lineup, me.id, forma.slots);
  const frase = event.tactica?.frases?.[me.id];
  const tareas = tareasDe(event.tactica, me.id, members);
  const claves = event.tactica?.claves ?? [];
  const modelos = modelosDelPartido(event.tactica);
  const primero = modelos[0];
  const linea = primero ? lineaDeJugador(primero, forma.slots, event.lineup, me.id) : null;
  return (
    <section className="mt-4 rounded-2xl border border-line/30 bg-black/30 p-4" data-testid="tu-partido">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Tu partido</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight">{puesto ? `Salís de ${puesto.label}` : "En este partido no salís"}</h2>
      {frase ? <p className="mt-1 text-lg font-medium">{frase}</p> : null}
      {modelos.length > 0 && primero ? (
        <Link
          to="/cancha"
          search={{ ver: "modelos", partido: event.id }}
          className="mt-3 block rounded-2xl border border-accent/50 p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            El DT cargó {modelos.length} {modelos.length === 1 ? "modelo" : "modelos"}
          </p>
          <p className="mt-1 text-lg font-semibold">{primero.nombre}</p>
          {linea ? <p className="mt-1 text-sm leading-snug">{linea}</p> : null}
          <p className="mt-2 text-sm font-semibold text-accent">Verlo animado ›</p>
        </Link>
      ) : null}
      {tareas.length > 0 ? (
        <ul className="mt-3 grid gap-1 text-sm">
          {tareas.map((item) => (
            <li key={item}>› {item}</li>
          ))}
        </ul>
      ) : null}
      {claves.length > 0 ? (
        <p className="mt-3 text-sm text-muted">Equipo: {claves.map((item, index) => `${index + 1}. ${item}`).join(" · ")}</p>
      ) : null}
    </section>
  );
}
