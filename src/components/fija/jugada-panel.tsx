import { useEffect, useId, useState, type PointerEvent, type ReactNode } from "react";
import { CLASES_FLECHA, type ClaseFlecha, type Jugada, type PasoJugada, type Trazo, jugadaVisible } from "@/lib/fija/jugada";
import { uid } from "@/lib/fija/format";

const NOMBRE: Record<ClaseFlecha, string> = {
  pase: "Pase",
  desmarque: "Desmarque",
  presion: "Presión",
  cobertura: "Cobertura",
  conduccion: "Conducción",
};

const VACIO: PasoJugada = { id: "p1", nota: "", trazos: [] };

function trazoFlecha(clase: ClaseFlecha) {
  if (clase === "presion") return { stroke: "#b8f25a", width: 1.6, dash: undefined as string | undefined };
  if (clase === "desmarque") return { stroke: "#f4f7ef", width: 1.2, dash: "2 1.4" };
  if (clase === "cobertura") return { stroke: "#f4f7ef", width: 2.4, dash: undefined };
  if (clase === "conduccion") return { stroke: "#f4f7ef", width: 1.2, dash: "0.4 1.3" };
  return { stroke: "#f4f7ef", width: 1.3, dash: undefined };
}

export function Lienzo({
  trazos,
  dibuja,
  onDown,
  onMove,
  onUp,
}: {
  trazos: Trazo[];
  dibuja?: boolean;
  onDown?: (x: number, y: number) => void;
  onMove?: (x: number, y: number) => void;
  onUp?: (x: number, y: number) => void;
}) {
  const marca = useId().replace(/:/g, "");
  const verde = `${marca}-verde`;
  const claro = `${marca}-claro`;

  function punto(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  return (
    <div className="absolute inset-0 z-20" style={{ pointerEvents: dibuja ? "auto" : "none" }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        onPointerDown={dibuja ? (event) => { event.currentTarget.setPointerCapture(event.pointerId); const p = punto(event); onDown?.(p.x, p.y); } : undefined}
        onPointerMove={dibuja ? (event) => { const p = punto(event); onMove?.(p.x, p.y); } : undefined}
        onPointerUp={dibuja ? (event) => { const p = punto(event); onUp?.(p.x, p.y); } : undefined}
      >
        <defs>
          <marker id={claro} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#f4f7ef" />
          </marker>
          <marker id={verde} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#b8f25a" />
          </marker>
        </defs>
        {trazos.map((trazo) => {
          if (trazo.tipo === "zona") {
            return (
              <rect
                key={trazo.id}
                x={trazo.x - 11}
                y={trazo.y - 8}
                width={22}
                height={16}
                rx={2}
                fill="rgba(184,242,90,0.28)"
                stroke="#b8f25a"
                strokeWidth={0.6}
              />
            );
          }
          if (trazo.tipo !== "flecha") return null;
          const estilo = trazoFlecha(trazo.clase);
          return (
            <line
              key={trazo.id}
              x1={trazo.x1}
              y1={trazo.y1}
              x2={trazo.x2}
              y2={trazo.y2}
              stroke={estilo.stroke}
              strokeWidth={estilo.width}
              strokeDasharray={estilo.dash}
              markerEnd={`url(#${trazo.clase === "presion" ? verde : claro})`}
            />
          );
        })}
      </svg>
      {trazos.map((trazo) =>
        trazo.tipo === "texto" ? (
          <span
            key={trazo.id}
            className="absolute max-w-24 -translate-x-1/2 -translate-y-1/2 rounded bg-bg/80 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight text-line"
            style={{ left: `${trazo.x}%`, top: `${trazo.y}%` }}
          >
            {trazo.texto}
          </span>
        ) : null,
      )}
    </div>
  );
}

export function JugadaPanel({
  staff,
  jugada,
  onChange,
  children,
}: {
  staff: boolean;
  jugada?: Jugada;
  onChange: (pasos: PasoJugada[]) => void;
  children: (lienzo: ReactNode, editaEquipo: boolean) => ReactNode;
}) {
  const guardados = jugada?.pasos ?? [];
  const pasos = guardados.length ? guardados : [VACIO];
  const [indice, setIndice] = useState(0);
  const [modo, setModo] = useState<"equipo" | "jugada">(staff ? "equipo" : "jugada");
  const [herramienta, setHerramienta] = useState<ClaseFlecha | "zona" | "texto">("pase");
  const [origen, setOrigen] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<Trazo | null>(null);
  const [rehacer, setRehacer] = useState<Trazo[]>([]);
  const [frase, setFrase] = useState("");
  const [sigue, setSigue] = useState(false);
  const paso = pasos[Math.min(indice, pasos.length - 1)] ?? VACIO;
  const dibuja = staff && modo === "jugada" && !sigue;
  const visible = jugadaVisible(jugada);

  useEffect(() => {
    if (!sigue || pasos.length < 2) return;
    const id = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % pasos.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [sigue, pasos.length]);

  function guardar(siguientes: PasoJugada[]) {
    onChange(siguientes);
  }

  function poner(trazo: Trazo, limpiaRehacer = true) {
    const siguientes = pasos.map((item, i) =>
      i === Math.min(indice, pasos.length - 1) ? { ...item, trazos: [...item.trazos, trazo].slice(-8) } : item,
    );
    if (limpiaRehacer) setRehacer([]);
    guardar(siguientes);
  }

  function soltar(x: number, y: number) {
    const desde = origen;
    setOrigen(null);
    setPreview(null);
    if (!dibuja) return;
    if (herramienta === "zona") {
      poner({ id: uid("z"), tipo: "zona", x, y });
      return;
    }
    if (herramienta === "texto") {
      const texto = frase.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
      if (!texto) return;
      poner({ id: uid("t"), tipo: "texto", x, y, texto });
      setFrase("");
      return;
    }
    if (!desde) return;
    if (Math.abs(desde.x - x) + Math.abs(desde.y - y) < 4) return;
    poner({ id: uid("f"), tipo: "flecha", clase: herramienta, x1: desde.x, y1: desde.y, x2: x, y2: y });
  }

  function deshacer() {
    const ultimo = paso.trazos[paso.trazos.length - 1];
    if (!ultimo) return;
    setRehacer((lista) => [...lista, ultimo]);
    guardar(pasos.map((item) => (item.id === paso.id ? { ...item, trazos: item.trazos.slice(0, -1) } : item)));
  }

  function rehacerTrazo() {
    const ultimo = rehacer[rehacer.length - 1];
    if (!ultimo) return;
    setRehacer((lista) => lista.slice(0, -1));
    poner(ultimo, false);
  }

  const trazos = preview ? [...paso.trazos, preview] : paso.trazos;
  const lienzo = (
    <Lienzo
      trazos={trazos}
      dibuja={dibuja}
      onDown={(x, y) => {
        if (herramienta === "zona" || herramienta === "texto") return;
        setOrigen({ x, y });
        setPreview({ id: "preview", tipo: "flecha", clase: herramienta, x1: x, y1: y, x2: x, y2: y });
      }}
      onMove={(x, y) => {
        if (!origen || herramienta === "zona" || herramienta === "texto") return;
        setPreview({ id: "preview", tipo: "flecha", clase: herramienta, x1: origen.x, y1: origen.y, x2: x, y2: y });
      }}
      onUp={soltar}
    />
  );

  return (
    <div>
      {staff ? (
        <div className="mb-3 flex gap-2">
          {(["equipo", "jugada"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`h-11 flex-1 rounded-md text-sm font-semibold ${modo === item ? "bg-accent text-accent-fg" : "bg-black/40 text-line"}`}
              onClick={() => {
                setModo(item);
                setSigue(false);
              }}
            >
              {item === "equipo" ? "Equipo" : "Jugada"}
            </button>
          ))}
        </div>
      ) : null}
      {children(lienzo, modo === "equipo")}
      {paso.nota && !dibuja ? (
        <p className="mt-3 text-center text-lg font-medium leading-snug text-line">{paso.nota}</p>
      ) : null}
      {staff && dibuja ? (
        <label className="mt-3 block text-sm text-line/80">
          Este paso
          <input
            className="mt-1 h-11 w-full rounded-md border border-line/30 bg-black/30 px-3 text-sm text-line"
            maxLength={80}
            value={paso.nota}
            placeholder="Una línea. Qué pasa en este paso."
            onChange={(event) => {
              const nota = event.target.value;
              guardar(pasos.map((item) => (item.id === paso.id ? { ...item, nota } : item)));
            }}
          />
        </label>
      ) : null}
      {staff && dibuja ? (
        <>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CLASES_FLECHA.map((clase) => (
              <button
                key={clase}
                type="button"
                className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${herramienta === clase ? "bg-accent text-accent-fg" : "bg-black/40 text-line"}`}
                onClick={() => setHerramienta(clase)}
              >
                {NOMBRE[clase]}
              </button>
            ))}
            <button
              type="button"
              className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${herramienta === "zona" ? "bg-accent text-accent-fg" : "bg-black/40 text-line"}`}
              onClick={() => setHerramienta("zona")}
            >
              Zona
            </button>
            <button
              type="button"
              className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${herramienta === "texto" ? "bg-accent text-accent-fg" : "bg-black/40 text-line"}`}
              onClick={() => setHerramienta("texto")}
            >
              Texto
            </button>
          </div>
          {herramienta === "texto" ? (
            <input
              className="mt-2 h-11 w-full rounded-md border border-line/30 bg-black/30 px-3 text-sm text-line"
              maxLength={24}
              value={frase}
              placeholder="Tres palabras, después tocá la cancha"
              onChange={(event) => setFrase(event.target.value)}
            />
          ) : (
            <p className="mt-2 text-center text-xs text-line/70">
              {herramienta === "zona" ? "Tocá la cancha para marcar la zona." : "Tocá el inicio y soltá en el final."}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="h-11 rounded-md bg-black/40 px-3 text-xs font-semibold text-line" onClick={deshacer}>
              Deshacer
            </button>
            <button type="button" className="h-11 rounded-md bg-black/40 px-3 text-xs font-semibold text-line" onClick={rehacerTrazo}>
              Rehacer
            </button>
            <button
              type="button"
              className="h-11 rounded-md bg-black/40 px-3 text-xs font-semibold text-line"
              disabled={pasos.length >= 5}
              onClick={() => {
                const siguiente = { id: uid("p"), nota: "", trazos: [] };
                const lista = [...pasos, siguiente];
                setIndice(lista.length - 1);
                guardar(lista);
              }}
            >
              Otro paso
            </button>
            {pasos.length > 1 ? (
              <button
                type="button"
                className="h-11 rounded-md bg-black/40 px-3 text-xs font-semibold text-line"
                onClick={() => {
                  const lista = pasos.filter((item) => item.id !== paso.id);
                  setIndice(0);
                  guardar(lista);
                }}
              >
                Borrar paso
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      {visible.length > 1 || (!staff && visible.length > 0) ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {pasos.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Paso ${i + 1}`}
              className={`h-11 min-w-11 rounded-full px-3 text-xs font-semibold ${i === Math.min(indice, pasos.length - 1) ? "bg-accent text-accent-fg" : "bg-black/40 text-line"}`}
              onClick={() => {
                setSigue(false);
                setIndice(i);
              }}
            >
              {i + 1}
            </button>
          ))}
          {pasos.length > 1 ? (
            <button
              type="button"
              className="h-11 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg"
              onClick={() => setSigue((valor) => !valor)}
            >
              {sigue ? "Pausa" : "Ver jugada"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
