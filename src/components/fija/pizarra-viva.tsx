import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link2, Mic, Pause, Play } from "lucide-react";
import { Pitch } from "@/components/fija/pitch";
import { SquadPanel } from "@/components/fija/squad-panel";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FORMATIONS, MODALITY_SHORT, MODALITIES, puestoDe } from "@/lib/fija/formations";
import { personLabel, uid } from "@/lib/fija/format";
import { loadAudioJugada, saveAudioJugada } from "@/lib/fija/cloud";
import {
  editarPlan,
  guardarPasos,
  cambiarEsquema,
  JUGADAS_ABIERTAS,
  moverEnCuadro,
  nombreDeJugada,
  PELOTAS_PARADAS,
  planVisible,
  armarJugada,
  type ClaveJugada,
  ponerEnPlan,
  sacarPaso,
  sumarDibujo,
  sumarPaso,
  textoDePaso,
  videoLimpio,
} from "@/lib/fija/pizarra";
import { useFija, useIsStaff } from "@/lib/fija/store";
import type { ClubEvent, Dibujo, JugadaGuardada, PlanId, Trazo } from "@/lib/fija/types";

type Vista =
  | "puesto"
  | "planes"
  | "jugada"
  | "pelota"
  | "charla"
  | "biblioteca"
  | "partido"
  | "compartir";

const VISTAS: { id: Vista; label: string; staff?: boolean }[] = [
  { id: "puesto", label: "Tu puesto" },
  { id: "planes", label: "Planes" },
  { id: "jugada", label: "Jugada" },
  { id: "pelota", label: "Pelota parada" },
  { id: "charla", label: "Charla" },
  { id: "biblioteca", label: "Mis jugadas", staff: true },
  { id: "partido", label: "Modo partido", staff: true },
  { id: "compartir", label: "Compartir" },
];

export function PizarraViva({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const members = useFija((s) => s.members);
  const me = useFija((s) => s.members.find((m) => m.id === s.activeId));
  const code = useFija((s) => s.club?.inviteCode ?? "");
  const crest = useFija((s) => s.club?.crest);
  const aplicar = useFija((s) => s.aplicarPizarra);
  const pasarAlPlan = useFija((s) => s.pasarAlPlan);
  const guardarEnBiblioteca = useFija((s) => s.guardarEnBiblioteca);
  const sacarDeBiblioteca = useFija((s) => s.sacarDeBiblioteca);
  const mostrarJugada = useFija((s) => s.mostrarJugada);
  const biblioteca = useFija((s) => s.biblioteca ?? []);
  const setSpot = useFija((s) => s.setSpot);
  const setBoardShape = useFija((s) => s.setBoardShape);
  const setTactics = useFija((s) => s.setTactics);
  const setNotaJugador = useFija((s) => s.setNota);
  const setJuega = useFija((s) => s.setJuega);
  const publishLineup = useFija((s) => s.publishLineup);
  const rsvps = useFija((s) => s.rsvps);
  const [vista, setVista] = useState<Vista>("puesto");
  const [planId, setPlanId] = useState<PlanId>(event.planActivo ?? "a");
  const [slot, setSlot] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState("");
  const plan = planVisible(event, planId);
  const forma = FORMATIONS[event.modality].find((item) => item.id === (plan.formacion || event.formacion)) ?? FORMATIONS[event.modality][0];
  const miPuesto = me ? puestoDe(plan.lineup, me.id, forma.slots) : undefined;
  const vistas = VISTAS.filter((item) => !item.staff || staff);

  function aplicarEvento(next: ClubEvent) {
    aplicar(event.id, {
      lineup: next.lineup,
      planes: next.planes,
      pasos: next.pasos,
      videoUrl: next.videoUrl,
      audioDe: next.audioDe,
    });
  }

  function elegir(id: string | null) {
    if (!slot) return;
    if (planId === "a") setNota(setSpot(event.id, slot, id) ?? "");
    else aplicarEvento(ponerEnPlan(event, planId, slot, id));
    setSlot(null);
  }

  const players = members.filter((m) => m.juega ?? m.role === "jugador");
  const usados = new Set(Object.values(plan.lineup));

  return (
    <section className="mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {vistas.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`h-11 shrink-0 rounded-md px-3 text-sm font-semibold ${vista === item.id ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}
            onClick={() => setVista(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {vista === "puesto" || vista === "planes" || vista === "partido" ? (
        <div className="mt-3">
          {vista === "planes" || vista === "partido" ? <Planes planId={planId} onPlan={setPlanId} /> : null}
          {vista === "puesto" && !staff && me ? (
            <div className="mb-3 rounded-2xl border border-line/25 bg-black/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Tu puesto</p>
              {miPuesto ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-line">
                    {me.nick}
                    {me.number != null ? ` · ${me.number}` : ""} · {miPuesto.label}
                  </p>
                  <p className="mt-2 text-xl font-medium leading-snug text-line">
                    {event.notas?.[me.id] || "El DT todavía no te dejó una indicación."}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-base text-line">En este plan no salís.</p>
              )}
            </div>
          ) : null}
          {staff && vista === "planes" ? (
            <div className="mb-3">
              <Segmented
                value={event.modality}
                onChange={(modality) => {
                  setNota(setBoardShape(event.id, modality, FORMATIONS[modality][0].id) ?? "");
                  const fresco = useFija.getState().events.find((item) => item.id === event.id);
                  if (fresco?.planes?.length) aplicar(event.id, { planes: fresco.planes.map((item) => ({ ...item, formacion: undefined })) });
                }}
                options={MODALITIES.map((id) => ({ id, label: MODALITY_SHORT[id] }))}
              />
              <p className="mt-3 text-xs text-muted">El esquema es de este plan.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FORMATIONS[event.modality].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`h-11 rounded-md px-3 text-xs font-semibold ${(plan.formacion || event.formacion) === item.id ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}
                    onClick={() => aplicarEvento(cambiarEsquema(event, planId, item.id))}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              {staff && me ? (
                <label className="mt-3 flex items-center gap-2 text-sm text-line">
                  <input type="checkbox" className="size-5 accent-accent" checked={me.juega ?? false} onChange={(e) => setJuega(me.id, e.target.checked)} />
                  Jugar yo también
                </label>
              ) : null}
            </div>
          ) : null}
          <CanchaConDibujo
            event={event}
            planId={planId}
            editable={staff && (vista === "planes" || vista === "puesto")}
            dibujar={false}
            trazo="flecha"
            highlightId={staff ? undefined : me?.id}
            onSlot={setSlot}
            onDibujo={(dibujo) => aplicarEvento(sumarDibujo(event, planId, dibujo))}
          />
          {vista === "planes" && staff ? (
            <div className="mt-3 grid gap-2">
              <p className="text-sm text-muted">{SENTIDO[planId]}</p>
              <input
                className="h-12 w-full rounded-md bg-surface px-3"
                maxLength={40}
                placeholder="Un nombre, si querés"
                value={plan.idea}
                onChange={(e) => aplicarEvento(editarPlan(event, planId, { idea: e.target.value }))}
              />
              <input
                className="h-12 w-full rounded-md bg-surface px-3"
                maxLength={80}
                placeholder="Quién entra y quién sale"
                value={plan.cambio}
                onChange={(e) => aplicarEvento(editarPlan(event, planId, { cambio: e.target.value }))}
              />
            </div>
          ) : vista === "planes" ? (
            <p className="mt-3 text-sm text-muted">{plan.idea || SENTIDO[planId]}{plan.cambio ? ` · ${plan.cambio}` : ""}</p>
          ) : null}
          {vista === "partido" && staff ? (
            <Button className="mt-3 h-14 w-full" onClick={() => { pasarAlPlan(event.id, planId); setAviso(`Pasamos al plan ${planId.toUpperCase()}.`); }}>
              Avisar este plan
            </Button>
          ) : null}
        </div>
      ) : null}

      {vista === "puesto" && staff ? (
        <ul className="mt-3 grid gap-2">
          <li className="text-sm text-muted">Cada jugador ve su puesto y su indicación. No ve la de los demás.</li>
          {Object.entries(event.lineup).map(([key, id]) => {
            const person = members.find((item) => item.id === id);
            const puesto = forma.slots.find((item) => item.key === key);
            if (!person) return null;
            return (
              <li key={key}>
                <label className="block text-xs text-muted">
                  {person.nick} · {puesto?.label ?? "Puesto"}
                  <input
                    className="mt-1 h-12 w-full rounded-md bg-surface px-3 text-base text-fg"
                    maxLength={80}
                    placeholder="Su indicación"
                    value={event.notas?.[id] ?? ""}
                    onChange={(e) => setNotaJugador(event.id, id, e.target.value)}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      {vista === "puesto" || vista === "charla" ? (
        <div className="mt-3 rounded-2xl border border-line/25 bg-black/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Para todo el equipo</p>
          {staff ? (
            <Textarea
              className="mt-2 min-h-28 border-line/30 bg-transparent text-base text-line"
              rows={4}
              maxLength={180}
              value={event.tactics}
              onChange={(e) => setTactics(event.id, e.target.value)}
              placeholder="Lo que se dice antes de salir."
            />
          ) : (
            <p className="mt-2 text-xl font-medium leading-snug text-line">{event.tactics || "El DT todavía no dejó indicaciones."}</p>
          )}
        </div>
      ) : null}

      {vista === "charla" ? <AudioEquipo event={event} code={code} staff={staff} onAviso={setAviso} /> : null}
      {vista === "charla" ? <VideoLink event={event} staff={staff} onChange={(url) => aplicar(event.id, { videoUrl: url })} /> : null}
      {vista === "jugada" || vista === "pelota" ? (
        <Pasos
          key={vista}
          event={event}
          seccion={vista === "pelota" ? "pelota" : "jugada"}
          formacionId={plan.formacion}
          guardado={vista === "pelota" ? event.pelotaParada : event.pasos}
          visible={vista === "pelota" ? event.pelotaVisible !== false : event.jugadaVisible !== false}
          onMostrar={(play) => {
            const next = guardarPasos(event, play);
            if (!next.pasos) return;
            if (vista === "pelota") aplicar(event.id, { pelotaParada: next.pasos, pelotaVisible: true });
            else aplicar(event.id, { pasos: next.pasos, jugadaVisible: true });
            setAviso("El jugador ya lo ve.");
          }}
          onOcultar={() => {
            if (vista === "pelota") aplicar(event.id, { pelotaVisible: false });
            else aplicar(event.id, { jugadaVisible: false });
            setAviso("El jugador ya no lo ve.");
          }}
          onEliminar={() => {
            if (vista === "pelota") aplicar(event.id, { pelotaParada: undefined, pelotaVisible: false });
            else aplicar(event.id, { pasos: undefined, jugadaVisible: false });
            setAviso("Eliminada. El jugador no ve nada.");
          }}
          predeterminadas={biblioteca}
          onPredeterminada={(item) => {
            guardarEnBiblioteca(item);
            setAviso("Predeterminada guardada.");
          }}
        />
      ) : null}
      {vista === "biblioteca" ? (
        <Biblioteca
          items={biblioteca}
          onSacar={(id) => {
            sacarDeBiblioteca(id);
            setAviso("Jugada eliminada.");
          }}
          onMostrar={(id, visible) => mostrarJugada(id, visible)}
        />
      ) : null}
      {vista === "compartir" ? <Compartir event={event} crest={crest} lineup={plan.lineup} /> : null}

      {aviso || nota ? <p className="mt-3 text-sm text-accent">{aviso || nota}</p> : null}
      {staff && (vista === "puesto" || vista === "planes") ? (
        <Button
          className="mt-3 h-14 w-full"
          disabled={Object.keys(event.lineup).length === 0}
          onClick={() => {
            publishLineup(event.id);
            setAviso("Publicado. El plantel ya puede ver la pizarra.");
          }}
        >
          {event.lineupPublishedAt ? "Actualizar formación y avisar" : "Publicar formación"}
        </Button>
      ) : null}
      {(staff || event.lineupPublishedAt) && vista === "puesto" ? <SquadPanel event={event} staff={staff} onNotice={(message) => setNota(message ?? "")} /> : null}

      <Dialog open={slot != null} onOpenChange={(open) => !open && setSlot(null)}>
        <DialogContent title="Elegí jugador">
          <ul className="max-h-80 space-y-1 overflow-auto">
            <li>
              <Button variant="ghost" className="h-12 w-full justify-start" onClick={() => elegir(null)}>Dejar vacío</Button>
            </li>
            {players.filter((p) => {
              const llamado = event.convocados ? event.convocados.includes(p.id) : true;
              const noVa = rsvps.some((row) => row.eventId === event.id && row.memberId === p.id && row.status === "no");
              return llamado && !noVa;
            }).map((p) => (
              <li key={p.id}>
                <button type="button" className="flex h-12 w-full items-center justify-between rounded-md px-3 text-sm" onClick={() => elegir(p.id)}>
                  <span>{personLabel(p, players)}</span>
                  <span className="text-xs text-muted">{usados.has(p.id) ? "en cancha" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}

const SENTIDO: Record<PlanId, string> = {
  a: "Con este salís.",
  b: "Si van abajo.",
  c: "Para cerrar el partido.",
};

function Planes({ planId, onPlan }: { planId: PlanId; onPlan: (id: PlanId) => void }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {(["a", "b", "c"] as PlanId[]).map((id) => (
        <button key={id} type="button" className={`h-14 rounded-md text-sm font-semibold ${id === planId ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => onPlan(id)}>
          Plan {id.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function CanchaConDibujo({
  event,
  planId,
  editable,
  dibujar,
  trazo,
  highlightId,
  onSlot,
  onDibujo,
}: {
  event: ClubEvent;
  planId: PlanId;
  editable: boolean;
  dibujar: boolean;
  trazo: Trazo;
  highlightId?: string;
  onSlot: (key: string) => void;
  onDibujo: (dibujo: Dibujo) => void;
}) {
  const plan = planVisible(event, planId);
  const members = useFija((s) => s.members);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Dibujo | null>(null);
  const [vivo, setVivo] = useState<Dibujo | null>(null);

  function punto(pointer: ReactPointerEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: Math.min(100, Math.max(0, ((pointer.clientX - box.left) / box.width) * 100)),
      y: Math.min(100, Math.max(0, ((pointer.clientY - box.top) / box.height) * 100)),
    };
  }

  const trazos = vivo ? [...plan.dibujos, vivo] : plan.dibujos;

  return (
    <div ref={ref} className="relative mx-auto aspect-[5/7] w-full desk:w-[min(100%,calc(min(72dvh,100dvh-12rem)*5/7))]">
      <Pitch modality={event.modality} formacionId={plan.formacion || event.formacion} lineup={plan.lineup} members={members} editable={editable} highlightId={highlightId} onSlot={editable ? onSlot : undefined} />
      <svg className={`absolute inset-0 h-full w-full ${dibujar ? "" : "pointer-events-none"}`} viewBox="0 0 100 100" preserveAspectRatio="none"
        onPointerDown={(pointer) => {
          if (!dibujar) return;
          const p = punto(pointer);
          drag.current = { id: "tmp", trazo, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
          setVivo(drag.current);
        }}
        onPointerMove={(pointer) => {
          if (!drag.current) return;
          const p = punto(pointer);
          const next = { ...drag.current, x2: p.x, y2: p.y };
          drag.current = next;
          setVivo(next);
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          setVivo(null);
          if (d && Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 3) onDibujo({ ...d, id: uid("d").slice(0, 16) });
        }}
      >
        {trazos.map((dibujo) => <TrazoSvg key={dibujo.id} dibujo={dibujo} />)}
      </svg>
    </div>
  );
}

function TrazoSvg({ dibujo }: { dibujo: Dibujo }) {
  if (dibujo.trazo === "zona") {
    return <rect x={Math.min(dibujo.x1, dibujo.x2)} y={Math.min(dibujo.y1, dibujo.y2)} width={Math.abs(dibujo.x2 - dibujo.x1)} height={Math.abs(dibujo.y2 - dibujo.y1)} fill="#b8f25a" opacity="0.28" />;
  }
  if (dibujo.trazo === "circulo") {
    return <circle cx={dibujo.x1} cy={dibujo.y1} r={Math.hypot(dibujo.x2 - dibujo.x1, dibujo.y2 - dibujo.y1)} fill="none" stroke="#f0b429" strokeWidth="0.8" />;
  }
  return <line x1={dibujo.x1} y1={dibujo.y1} x2={dibujo.x2} y2={dibujo.y2} stroke="#e8f3ea" strokeWidth="0.8" strokeDasharray={dibujo.trazo === "pase" ? "2 1.4" : undefined} />;
}

function Pasos({
  event,
  seccion,
  guardado,
  formacionId,
  visible,
  predeterminadas,
  onMostrar,
  onOcultar,
  onEliminar,
  onPredeterminada,
}: {
  event: ClubEvent;
  seccion: "jugada" | "pelota";
  guardado?: ClubEvent["pasos"];
  formacionId?: string;
  visible: boolean;
  predeterminadas: JugadaGuardada[];
  onMostrar: (pasos: NonNullable<ClubEvent["pasos"]>) => void;
  onOcultar: () => void;
  onEliminar: () => void;
  onPredeterminada: (item: JugadaGuardada) => void;
}) {
  const staff = useIsStaff();
  const forma = FORMATIONS[event.modality].find((item) => item.id === (formacionId || event.formacion)) ?? FORMATIONS[event.modality][0];
  const puestos = forma.slots.map((slot) => ({ key: slot.key, x: slot.x, y: slot.y, memberId: event.lineup[slot.key] }));
  const catalogo = seccion === "pelota" ? PELOTAS_PARADAS : JUGADAS_ABIERTAS;
  const propias = predeterminadas.filter((item) => (seccion === "jugada" ? item.tipo === "jugada" : item.tipo !== "jugada"));
  const visibles = propias.filter((item) => item.visible !== false);
  function cargar(id: string) {
    const propia = propias.find((item) => item.id === id);
    if (propia && propia.cuadros.length >= 2) {
      return {
        id: propia.id,
        nombre: propia.nombre,
        tipo: (propia.tipo === "jugada" || propia.tipo === "corned" || propia.tipo === "tiro" || propia.tipo === "lateral" || propia.tipo === "salida" ? propia.tipo : seccion === "jugada" ? "jugada" : "corned") as NonNullable<ClubEvent["pasos"]>["tipo"],
        cuadros: propia.cuadros,
      };
    }
    const clave = (catalogo.find((item) => item.id === id)?.id ?? catalogo[0].id) as ClaveJugada;
    return armarJugada(clave, puestos);
  }
  const deAqui = Boolean(guardado && guardado.cuadros.some((cuadro) => cuadro.fichas.length > 0) && (seccion === "jugada" ? guardado.tipo === "jugada" : guardado.tipo !== "jugada"));
  const [pasos, setPasos] = useState(() => (deAqui && guardado ? guardado : armarJugada(catalogo[0].id, puestos)));
  const [cuadro, setCuadro] = useState(0);
  const [play, setPlay] = useState(false);
  const [vivo, setVivo] = useState<{ quien: string; x: number; y: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const indice = Math.min(cuadro, Math.max(pasos.cuadros.length - 1, 0));
  const actual = pasos.cuadros[indice];
  const members = useFija((s) => s.members);
  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setCuadro((n) => (n + 1) % pasos.cuadros.length), 1400);
    return () => window.clearInterval(id);
  }, [play, pasos.cuadros.length]);

  function coords(pointer: ReactPointerEvent) {
    const box = caja.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: Math.min(100, Math.max(0, ((pointer.clientX - box.left) / box.width) * 100)),
      y: Math.min(100, Math.max(0, ((pointer.clientY - box.top) / box.height) * 100)),
    };
  }

  function empezar(pointer: ReactPointerEvent, quien: string) {
    if (!staff || play) return;
    pointer.preventDefault();
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    setVivo({ quien, ...coords(pointer) });
  }

  function lugar(quien: string, x: number, y: number) {
    if (vivo?.quien === quien) return { x: vivo.x, y: vivo.y };
    return { x, y };
  }

  if (!staff && (!deAqui || !visible)) {
    return <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">El DT todavía no te dejó esta jugada.</p>;
  }

  const ve = Boolean(deAqui && visible && guardado);
  return (
    <div className="mt-3">
      {staff ? (
        <div className={`rounded-xl border p-4 ${ve ? "border-accent/50 bg-surface" : "border-line/20 bg-surface"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">El jugador ve</p>
          <p className="mt-1 text-lg font-semibold">{ve ? guardado?.nombre : "Nada en esta pantalla."}</p>
          {ve ? <p className="mt-1 text-sm text-muted">{guardado?.cuadros[0]?.texto}</p> : <p className="mt-1 text-sm text-muted">Lo que armes abajo no se ve hasta que lo muestres.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {ve ? <button type="button" className="h-11 rounded-md bg-surface-2 px-3 text-sm font-semibold" onClick={onOcultar}>Ocultar</button> : null}
            {deAqui ? <button type="button" className="h-11 rounded-md bg-surface-2 px-3 text-sm font-semibold" onClick={onEliminar}>Eliminar</button> : null}
          </div>
        </div>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{pasos.nombre}</p>
      )}
      {staff ? (
        <input
          className="mt-3 h-12 w-full rounded-md bg-surface px-3 text-base font-semibold"
          maxLength={40}
          value={pasos.nombre}
          onChange={(e) => setPasos(nombreDeJugada(pasos, e.target.value))}
        />
      ) : null}
      <div ref={caja} className="relative mx-auto mt-2 aspect-[5/7] w-full max-w-md overflow-hidden rounded-xl bg-linear-to-b from-pitch-top to-pitch-deep">
        <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full text-line/70" aria-hidden>
          <rect x="5" y="5" width="90" height="130" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <line x1="5" y1="70" x2="95" y2="70" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="50" cy="70" r="12" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <rect x="22" y="5" width="56" height="18" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <rect x="22" y="117" width="56" height="18" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </svg>
        {actual?.fichas.map((ficha) => {
          const person = members.find((item) => item.id === ficha.memberId);
          const puesto = ficha.memberId.startsWith("puesto:") ? ficha.memberId.slice(7) : "";
          const pos = lugar(ficha.memberId, ficha.x, ficha.y);
          return (
            <span
              key={ficha.memberId}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center ${vivo ? "" : "transition-all duration-700"} ${staff && !play ? "cursor-grab touch-none" : ""}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onPointerDown={(pointer) => empezar(pointer, ficha.memberId)}
              onPointerMove={(pointer) => vivo?.quien === ficha.memberId && setVivo({ quien: ficha.memberId, ...coords(pointer) })}
              onPointerUp={() => {
                if (vivo?.quien !== ficha.memberId) return;
                setPasos(moverEnCuadro(pasos, indice, ficha.memberId, vivo.x, vivo.y));
                setVivo(null);
              }}
            >
              <span className="relative grid size-10 place-items-center rounded-full border-2 border-line bg-surface text-sm font-bold text-accent">{person?.number ?? puesto.slice(0, 3)}</span>
              <span className="block max-w-16 truncate text-xs font-semibold text-line">{person?.nick ?? puesto}</span>
            </span>
          );
        })}
        {actual ? (
          <span
            className={`absolute z-20 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center ${vivo ? "" : "transition-all duration-700"} ${staff && !play ? "cursor-grab touch-none" : ""}`}
            style={{ left: `${lugar("pelota", actual.pelota.x, actual.pelota.y).x}%`, top: `${lugar("pelota", actual.pelota.x, actual.pelota.y).y}%` }}
            onPointerDown={(pointer) => empezar(pointer, "pelota")}
            onPointerMove={(pointer) => vivo?.quien === "pelota" && setVivo({ quien: "pelota", ...coords(pointer) })}
            onPointerUp={() => {
              if (vivo?.quien !== "pelota") return;
              setPasos(moverEnCuadro(pasos, indice, "pelota", vivo.x, vivo.y));
              setVivo(null);
            }}
          >
            <span className="size-4 rounded-full border border-fg bg-white" />
          </span>
        ) : null}
      </div>
      {staff ? <p className="mt-2 text-center text-xs text-muted">Arrastrá las fichas y la pelota de este paso.</p> : null}
      {staff ? (
        <textarea
          className="mt-3 min-h-20 w-full rounded-md bg-surface px-3 py-2 text-base"
          maxLength={80}
          value={actual?.texto ?? ""}
          onChange={(e) => setPasos(textoDePaso(pasos, indice, e.target.value))}
        />
      ) : (
        <p className="mt-3 text-lg font-medium leading-snug">{actual?.texto}</p>
      )}
      <div className="mt-3 flex gap-2">
        {pasos.cuadros.map((item, i) => (
          <button key={`${pasos.id}-${i}`} type="button" className={`h-11 flex-1 rounded-md text-sm font-semibold ${i === indice ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => { setPlay(false); setCuadro(i); }}>
            {i + 1}
          </button>
        ))}
      </div>
      {staff ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="h-11 rounded-md bg-surface text-sm font-semibold" disabled={pasos.cuadros.length >= 4} onClick={() => { setPasos(sumarPaso(pasos)); setCuadro(pasos.cuadros.length); }}>Otro paso</button>
          <button type="button" className="h-11 rounded-md bg-surface text-sm font-semibold" disabled={pasos.cuadros.length <= 2} onClick={() => { setPasos(sacarPaso(pasos, indice)); setCuadro(Math.max(0, indice - 1)); }}>Sacar este paso</button>
        </div>
      ) : null}
      {staff ? (
        <>
          {visibles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {visibles.map((item) => (
                <button key={item.id} type="button" className={`h-11 rounded-md px-3 text-sm font-semibold ${pasos.id === item.id ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => { setPasos(cargar(item.id)); setCuadro(0); setPlay(false); }}>
                  {item.nombre}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No hay jugadas marcadas para mostrar. Las armás en Mis jugadas.</p>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">De base</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalogo.map((item) => (
              <button key={item.id} type="button" className="h-11 rounded-md bg-surface px-3 text-sm font-semibold" onClick={() => { setPasos(armarJugada(item.id, puestos)); setCuadro(0); setPlay(false); }}>
                {item.nombre}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {staff ? (
        <div className="mt-3 grid gap-2">
          <Button className="h-12 w-full" onClick={() => onMostrar(pasos)}>Mostrar al jugador</Button>
          <p className="text-center text-xs text-muted">La predeterminada queda en Mis jugadas. El jugador no la ve ahí.</p>
          <Button variant="secondary" className="h-12 w-full" onClick={() => onPredeterminada({ id: pasos.id, nombre: pasos.nombre || "Jugada", tipo: pasos.tipo, cuadros: pasos.cuadros, visible: true })}>Guardar predeterminada</Button>
          <button type="button" className="h-11 rounded-md bg-surface text-sm font-semibold" onClick={() => {
            const id = uid("jg").slice(0, 16);
            const nueva = { ...pasos, id, nombre: "Nueva" };
            setPasos(nueva);
            onPredeterminada({ id, nombre: nueva.nombre, tipo: nueva.tipo, cuadros: nueva.cuadros, visible: true });
          }}>Nueva predeterminada</button>
        </div>
      ) : null}
      <Button className="mt-3 h-12 w-full" onClick={() => setPlay((v) => !v)}>{play ? <Pause className="size-4" /> : <Play className="size-4" />} {play ? "Pausa" : "Ver el movimiento"}</Button>
    </div>
  );
}

function AudioEquipo({ event, code, staff, onAviso }: { event: ClubEvent; code: string; staff: boolean; onAviso: (t: string) => void }) {
  const notaId = "equipo";
  const [audio, setAudio] = useState<string | null>(null);
  const [grabando, setGrabando] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  useEffect(() => {
    if (!code) return;
    void loadAudioJugada({ data: { code, eventId: event.id, notaId } }).then((result) => setAudio(result.audio)).catch(() => setAudio(null));
  }, [code, event.id]);
  async function grabar() {
    if (rec.current && grabando) {
      rec.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onAviso("Este celular no puede grabar audio.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream);
    const partes: Blob[] = [];
    media.ondataavailable = (item) => partes.push(item.data);
    media.onstop = () => {
      setGrabando(false);
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(partes, { type: media.mimeType || "audio/webm" });
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result ?? "");
        void saveAudioJugada({ data: { code, eventId: event.id, notaId, audio: data } }).then((result) => {
          if (!result.ok) onAviso("No se pudo guardar el audio.");
          else setAudio(data);
        });
      };
      reader.readAsDataURL(blob);
    };
    rec.current = media;
    media.start();
    setGrabando(true);
    window.setTimeout(() => {
      if (media.state === "recording") media.stop();
    }, 60_000);
  }
  return (
    <div className="mt-3 rounded-xl bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Audio para todos</p>
      <p className="mt-1 text-sm text-muted">Lo escucha todo el plantel. La indicación de cada uno está en Tu puesto.</p>
      {audio ? <audio className="mt-3 w-full" controls src={audio} /> : <p className="mt-2 text-sm text-muted">Todavía no hay audio.</p>}
      {staff ? <Button className="mt-3 h-12 w-full" onClick={() => void grabar()}><Mic className="size-4" /> {grabando ? "Cortar" : "Grabar"}</Button> : null}
    </div>
  );
}

function VideoLink({ event, staff, onChange }: { event: ClubEvent; staff: boolean; onChange: (url: string) => void }) {
  return (
    <div className="mt-3 rounded-xl bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted"><Link2 className="size-4" /> Video</p>
      {staff ? (
        <input
          className="mt-2 h-12 w-full rounded-md bg-bg px-3"
          placeholder="https://…"
          defaultValue={event.videoUrl ?? ""}
          onBlur={(e) => onChange(videoLimpio(e.target.value))}
        />
      ) : null}
      {event.videoUrl ? (
        <a className="mt-3 block text-sm font-semibold text-accent" href={event.videoUrl} target="_blank" rel="noreferrer">{event.videoUrl}</a>
      ) : (
        <p className="mt-2 text-sm text-muted">Un link de YouTube o un clip. No se sube el video.</p>
      )}
    </div>
  );
}

function Biblioteca({
  items,
  onSacar,
  onMostrar,
}: {
  items: JugadaGuardada[];
  onSacar: (id: string) => void;
  onMostrar: (id: string, visible: boolean) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm text-muted">Estas no las ve el jugador. Son para volver a usarlas. Para que vea una, abrí Jugada o Pelota parada y tocá Mostrar al jugador.</p>
      <ul className="mt-3 grid gap-2">
        {items.length === 0 ? <li className="text-sm text-muted">Todavía no guardaste ninguna.</li> : null}
        {items.map((item) => (
          <li key={item.id} className="rounded-lg bg-surface p-4">
            <p className="text-xs uppercase tracking-widest text-muted">{item.tipo === "jugada" ? "Jugada" : "Pelota parada"}</p>
            <p className="mt-1 font-semibold">{item.nombre}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="h-11 rounded-md bg-surface-2 px-3 text-sm font-semibold" onClick={() => onMostrar(item.id, item.visible === false)}>
                {item.visible === false ? "Mostrar" : "Ocultar"}
              </button>
              <button type="button" className="h-11 rounded-md bg-surface-2 px-3 text-sm font-semibold" onClick={() => onSacar(item.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Compartir({ event, crest, lineup }: { event: ClubEvent; crest?: string | null; lineup: Record<string, string> }) {
  const members = useFija((s) => s.members);
  const [imagen, setImagen] = useState<string | null>(null);
  async function armar(story: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = story ? 1080 : 1200;
    canvas.height = story ? 1920 : 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0c5a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#eef6ef";
    ctx.font = story ? "700 92px sans-serif" : "700 54px sans-serif";
    ctx.fillText(story ? "Así salimos hoy" : event.title, 64, story ? 180 : 120);
    ctx.fillStyle = "#b8f25a";
    ctx.font = story ? "700 64px sans-serif" : "600 36px sans-serif";
    ctx.fillText(event.title, 64, story ? 270 : 180);
    const forma = FORMATIONS[event.modality][0];
    for (const [key, id] of Object.entries(lineup)) {
      const slot = forma.slots.find((item) => item.key === key);
      const person = members.find((item) => item.id === id);
      if (!slot || !person) continue;
      const x = 80 + (slot.x / 100) * (canvas.width - 160);
      const y = (story ? 420 : 240) + (slot.y / 100) * (story ? 1100 : 280);
      ctx.beginPath();
      ctx.fillStyle = "#b8f25a";
      ctx.arc(x, y, story ? 36 : 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0c1a10";
      ctx.font = story ? "700 28px sans-serif" : "700 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(person.number ?? person.nick.slice(0, 2)), x, y + 8);
      ctx.fillStyle = "#eef6ef";
      ctx.font = story ? "600 28px sans-serif" : "600 16px sans-serif";
      ctx.fillText(person.nick, x, y + (story ? 64 : 40));
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#eef6ef";
    ctx.font = "500 28px sans-serif";
    ctx.fillText(crest ? "Con el escudo del equipo" : "Armado en Mi Vestuario", 64, canvas.height - 80);
    const url = canvas.toDataURL("image/png");
    setImagen(url);
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], story ? "historia.png" : "formacion.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: event.title }).catch(() => undefined);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
    }
  }
  return (
    <div className="mt-3 grid gap-3">
      <p className="text-sm text-muted">La imagen lleva la formación, el rival y la marca. No lleva audios ni indicaciones.</p>
      <Button className="h-14" onClick={() => void armar(false)}>Compartir en WhatsApp</Button>
      <Button variant="secondary" className="h-14" onClick={() => void armar(true)}>Historia de Instagram</Button>
      {imagen ? <img src={imagen} alt="" className="w-full rounded-lg" /> : null}
    </div>
  );
}
