import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowUpRight, Circle, Eraser, Eye, Link2, Mic, Pause, Play, SquareDashed, Undo2 } from "lucide-react";
import { Pitch } from "@/components/fija/pitch";
import { JugadaPanel } from "@/components/fija/jugada-panel";
import { SquadPanel } from "@/components/fija/squad-panel";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FORMATIONS, MODALITY_SHORT, MODALITIES, puestoDe } from "@/lib/fija/formations";
import { personLabel, uid } from "@/lib/fija/format";
import { loadAudioJugada, saveAudioJugada } from "@/lib/fija/cloud";
import {
  deshacerDibujo,
  editarPlan,
  faltanVer,
  guardarPasos,
  JUGADAS_ABIERTAS,
  limpiarDibujos,
  PELOTAS_PARADAS,
  planVisible,
  armarJugada,
  type ClaveJugada,
  ponerEnPlan,
  sumarDibujo,
  videoLimpio,
} from "@/lib/fija/pizarra";
import { useFija, useIsStaff } from "@/lib/fija/store";
import type { ClubEvent, Dibujo, PlanId, Trazo } from "@/lib/fija/types";

type Vista =
  | "puesto"
  | "planes"
  | "dibujar"
  | "jugada"
  | "pelota"
  | "charla"
  | "vistos"
  | "biblioteca"
  | "partido"
  | "compartir";

const VISTAS: { id: Vista; label: string; staff?: boolean }[] = [
  { id: "puesto", label: "Tu puesto" },
  { id: "planes", label: "Planes" },
  { id: "dibujar", label: "Dibujar", staff: true },
  { id: "jugada", label: "Jugada" },
  { id: "pelota", label: "Pelota parada" },
  { id: "charla", label: "Charla" },
  { id: "vistos", label: "Quién lo vio", staff: true },
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
  const marcarVisto = useFija((s) => s.marcarVisto);
  const pasarAlPlan = useFija((s) => s.pasarAlPlan);
  const guardarEnBiblioteca = useFija((s) => s.guardarEnBiblioteca);
  const duplicarEnBiblioteca = useFija((s) => s.duplicarEnBiblioteca);
  const biblioteca = useFija((s) => s.biblioteca ?? []);
  const setSpot = useFija((s) => s.setSpot);
  const setBoardShape = useFija((s) => s.setBoardShape);
  const setTactics = useFija((s) => s.setTactics);
  const setJugada = useFija((s) => s.setJugada);
  const setNotaJugador = useFija((s) => s.setNota);
  const setJuega = useFija((s) => s.setJuega);
  const publishLineup = useFija((s) => s.publishLineup);
  const rsvps = useFija((s) => s.rsvps);
  const [vista, setVista] = useState<Vista>("puesto");
  const [planId, setPlanId] = useState<PlanId>(event.planActivo ?? "a");
  const [trazo, setTrazo] = useState<Trazo>("flecha");
  const [slot, setSlot] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState("");
  const plan = planVisible(event, planId);
  const forma = FORMATIONS[event.modality].find((item) => item.id === event.formacion) ?? FORMATIONS[event.modality][0];
  const miPuesto = me ? puestoDe(plan.lineup, me.id, forma.slots) : undefined;
  const vistas = VISTAS.filter((item) => !item.staff || staff);

  useEffect(() => {
    if (me?.id) marcarVisto(event.id);
  }, [event.id, me?.id, marcarVisto]);

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

      {vista === "puesto" || vista === "planes" || vista === "dibujar" || vista === "partido" ? (
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
                onChange={(modality) => setNota(setBoardShape(event.id, modality, FORMATIONS[modality][0].id) ?? "")}
                options={MODALITIES.map((id) => ({ id, label: MODALITY_SHORT[id] }))}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {FORMATIONS[event.modality].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`h-11 rounded-md px-3 text-xs font-semibold ${forma.id === item.id ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}
                    onClick={() => setNota(setBoardShape(event.id, event.modality, item.id) ?? "")}
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
            dibujar={staff && vista === "dibujar"}
            trazo={trazo}
            highlightId={staff ? undefined : me?.id}
            onSlot={setSlot}
            onDibujo={(dibujo) => aplicarEvento(sumarDibujo(event, planId, dibujo))}
          />
          {staff && vista === "dibujar" ? (
            <div className="mt-3">
              <Herramientas trazo={trazo} onTrazo={setTrazo} onUndo={() => aplicarEvento(deshacerDibujo(event, planId))} onClear={() => aplicarEvento(limpiarDibujos(event, planId))} />
            </div>
          ) : null}
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

      {vista === "puesto" || vista === "charla" ? (
        <JugadaPanel staff={staff} code={code} eventId={event.id} jugada={event.jugada} onChange={(notas) => setJugada(event.id, notas)} />
      ) : null}

      {vista === "charla" && me ? <AudioPropio event={event} meId={me.id} code={code} staff={staff} onAviso={setAviso} /> : null}
      {vista === "charla" ? <VideoLink event={event} staff={staff} onChange={(url) => aplicar(event.id, { videoUrl: url })} /> : null}
      {vista === "jugada" || vista === "pelota" ? (
        <Pasos event={event} seccion={vista === "pelota" ? "pelota" : "jugada"} onGuardar={(next) => aplicarEvento(guardarPasos(event, next))} />
      ) : null}
      {vista === "vistos" ? <Vistos event={event} ids={players.map((p) => p.id)} nombres={members} onRecordar={setAviso} /> : null}
      {vista === "biblioteca" ? (
        <Biblioteca
          items={biblioteca}
          onGuardar={() => {
            if (!event.pasos) return;
            guardarEnBiblioteca({ id: uid("jg"), nombre: event.pasos.nombre, tipo: event.pasos.tipo, cuadros: event.pasos.cuadros });
            setAviso("Quedó en Mis jugadas.");
          }}
          onDuplicar={(id) => {
            duplicarEnBiblioteca(id);
            const item = biblioteca.find((row) => row.id === id);
            if (item) aplicar(event.id, { pasos: { id: uid("jp").slice(0, 16), nombre: item.nombre, tipo: "jugada", cuadros: item.cuadros } });
            setAviso("Lista para este partido.");
          }}
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

function Herramientas({ trazo, onTrazo, onUndo, onClear }: { trazo: Trazo; onTrazo: (t: Trazo) => void; onUndo: () => void; onClear: () => void }) {
  const tools: { id: Trazo; label: string; icon: typeof ArrowUpRight }[] = [
    { id: "flecha", label: "Movimiento", icon: ArrowUpRight },
    { id: "pase", label: "Pase", icon: SquareDashed },
    { id: "zona", label: "Zona", icon: SquareDashed },
    { id: "circulo", label: "Círculo", icon: Circle },
  ];
  return (
    <div className="grid gap-2">
      <div className="flex gap-2 overflow-x-auto">
        {tools.map((tool) => (
          <button key={tool.id} type="button" className={`flex h-12 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold ${trazo === tool.id ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => onTrazo(tool.id)}>
            <tool.icon className="size-4" />
            {tool.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-md bg-surface text-sm font-semibold" onClick={onUndo}><Undo2 className="size-4" /> Deshacer</button>
        <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-md bg-surface text-sm font-semibold" onClick={onClear}><Eraser className="size-4" /> Borrar</button>
      </div>
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
      <Pitch modality={event.modality} formacionId={event.formacion} lineup={plan.lineup} members={members} editable={editable} highlightId={highlightId} onSlot={editable ? onSlot : undefined} />
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

function Pasos({ event, seccion, onGuardar }: { event: ClubEvent; seccion: "jugada" | "pelota"; onGuardar: (pasos: NonNullable<ClubEvent["pasos"]>) => void }) {
  const forma = FORMATIONS[event.modality].find((item) => item.id === event.formacion) ?? FORMATIONS[event.modality][0];
  const puestos = forma.slots.map((slot) => ({ key: slot.key, x: slot.x, y: slot.y, memberId: event.lineup[slot.key] }));
  const catalogo = seccion === "pelota" ? PELOTAS_PARADAS : JUGADAS_ABIERTAS;
  const guardado = event.pasos;
  const sirve = Boolean(guardado && guardado.cuadros.some((cuadro) => cuadro.fichas.length > 0) && (seccion === "jugada" ? guardado?.tipo === "jugada" : guardado?.tipo !== "jugada"));
  const [elegida, setElegida] = useState<ClaveJugada>(catalogo[0].id);
  const pasos = sirve && guardado ? guardado : armarJugada(elegida, puestos);
  const [cuadro, setCuadro] = useState(0);
  const [play, setPlay] = useState(false);
  const indice = Math.min(cuadro, Math.max(pasos.cuadros.length - 1, 0));
  const actual = pasos.cuadros[indice];
  const members = useFija((s) => s.members);
  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setCuadro((n) => (n + 1) % pasos.cuadros.length), 1400);
    return () => window.clearInterval(id);
  }, [play, pasos.cuadros.length]);
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">{pasos.nombre}</p>
      <div className="relative mx-auto mt-2 aspect-[5/7] w-full max-w-md overflow-hidden rounded-xl bg-linear-to-b from-pitch-top to-pitch-deep">
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
          return (
            <span key={ficha.memberId} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700" style={{ left: `${ficha.x}%`, top: `${ficha.y}%` }}>
              <span className="relative grid size-10 place-items-center rounded-full border-2 border-line bg-surface text-sm font-bold text-accent">{person?.number ?? puesto.slice(0, 3)}</span>
              <span className="block max-w-16 truncate text-xs font-semibold text-line">{person?.nick ?? puesto}</span>
            </span>
          );
        })}
        {actual ? <span className="absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fg bg-white transition-all duration-700" style={{ left: `${actual.pelota.x}%`, top: `${actual.pelota.y}%` }} /> : null}
      </div>
      <p className="mt-3 text-lg font-medium leading-snug">{actual?.texto}</p>
      <div className="mt-3 flex gap-2">
        {pasos.cuadros.map((item, i) => (
          <button key={item.texto} type="button" className={`h-11 flex-1 rounded-md text-sm font-semibold ${i === indice ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => { setPlay(false); setCuadro(i); }}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {catalogo.map((item) => (
          <button key={item.id} type="button" className={`h-11 rounded-md px-3 text-sm font-semibold ${pasos.id === item.id ? "bg-accent text-accent-fg" : "bg-surface"}`} onClick={() => { setElegida(item.id); setCuadro(0); setPlay(false); onGuardar(armarJugada(item.id, puestos)); }}>
            {item.nombre}
          </button>
        ))}
      </div>
      <Button className="mt-3 h-12 w-full" onClick={() => setPlay((v) => !v)}>{play ? <Pause className="size-4" /> : <Play className="size-4" />} {play ? "Pausa" : "Ver el movimiento"}</Button>
    </div>
  );
}

function AudioPropio({ event, meId, code, staff, onAviso }: { event: ClubEvent; meId: string; code: string; staff: boolean; onAviso: (t: string) => void }) {
  const members = useFija((s) => s.members);
  const aplicar = useFija((s) => s.aplicarPizarra);
  const [quien, setQuien] = useState(meId);
  const notaId = quien.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  const [audio, setAudio] = useState<string | null>(null);
  const [grabando, setGrabando] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  useEffect(() => {
    if (!code || !notaId) return;
    void loadAudioJugada({ data: { code, eventId: event.id, notaId } }).then((result) => setAudio(result.audio)).catch(() => setAudio(null));
  }, [code, event.id, notaId]);
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
          else {
            setAudio(data);
            aplicar(event.id, { audioDe: [...new Set([...(event.audioDe ?? []), quien])] });
          }
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
  const person = members.find((item) => item.id === quien);
  return (
    <div className="mt-3 rounded-xl bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Audio de {person?.nick ?? "jugador"}</p>
      {staff ? (
        <select className="mt-2 h-12 w-full rounded-md bg-bg px-3" value={quien} onChange={(e) => setQuien(e.target.value)}>
          {members.map((item) => <option key={item.id} value={item.id}>{item.nick}</option>)}
        </select>
      ) : null}
      {audio ? <audio className="mt-3 w-full" controls src={audio} /> : <p className="mt-2 text-sm text-muted">Todavía no hay un audio para esta persona.</p>}
      {staff ? <Button className="mt-3 h-12 w-full" onClick={() => void grabar()}><Mic className="size-4" /> {grabando ? "Cortar" : "Grabar audio"}</Button> : null}
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

function Vistos({ event, ids, nombres, onRecordar }: { event: ClubEvent; ids: string[]; nombres: { id: string; nick: string }[]; onRecordar: (t: string) => void }) {
  const vistos = new Set((event.vistos ?? []).map((item) => item.memberId));
  const faltan = faltanVer(event, ids);
  return (
    <div className="mt-3">
      <h2 className="font-display text-4xl font-bold">{ids.length - faltan.length} de {ids.length}</h2>
      <ul className="mt-3 grid gap-2">
        {ids.map((id) => (
          <li key={id} className="flex h-12 items-center justify-between rounded-md bg-surface px-3">
            <span>{nombres.find((item) => item.id === id)?.nick ?? "Jugador"}</span>
            <span className={vistos.has(id) ? "flex items-center gap-1 text-sm text-accent" : "text-sm text-muted"}>{vistos.has(id) ? <Eye className="size-4" /> : null}{vistos.has(id) ? "Vio" : "No vio"}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-3 h-14 w-full" onClick={() => {
        const texto = `Mirá tu puesto antes del partido. Todavía no lo viste.`;
        void navigator.clipboard?.writeText(texto);
        onRecordar("Aviso copiado para WhatsApp.");
      }}>Recordar a los que no lo vieron</Button>
    </div>
  );
}

function Biblioteca({ items, onGuardar, onDuplicar }: { items: { id: string; nombre: string; tipo: string }[]; onGuardar: () => void; onDuplicar: (id: string) => void }) {
  return (
    <div className="mt-3">
      <Button className="h-12 w-full" onClick={onGuardar}>Guardar la jugada de este partido</Button>
      <ul className="mt-3 grid gap-2">
        {items.length === 0 ? <li className="text-sm text-muted">Todavía no guardaste jugadas.</li> : null}
        {items.map((item) => (
          <li key={item.id} className="rounded-lg bg-surface p-4">
            <p className="text-xs uppercase tracking-widest text-muted">{item.tipo}</p>
            <p className="mt-1 font-semibold">{item.nombre}</p>
            <button type="button" className="mt-3 h-11 rounded-md bg-surface-2 px-3 text-sm font-semibold" onClick={() => onDuplicar(item.id)}>Usar en este partido</button>
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
