import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lienzo } from "@/components/fija/jugada-panel";
import { leerMarcador, type MarcadorPublico } from "@/lib/fija/cloud";
import { formatWhen } from "@/lib/fija/format";

export const Route = createFileRoute("/vivo")({
  component: VivoPage,
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
});

const ESTADO = {
  espera: "Todavía no empezó",
  juego: "En juego",
  final: "Final",
} as const;

function VivoPage() {
  const { t } = Route.useSearch();
  const [marcador, setMarcador] = useState<MarcadorPublico | null>(null);

  useEffect(() => {
    if (!t) return;
    let cancel = false;
    async function load() {
      try {
        const next = await leerMarcador({ data: t });
        if (!cancel) setMarcador(next);
      } catch {
        if (!cancel) setMarcador({ ok: false, reason: "missing" });
      }
    }
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load();
    }, 12_000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [t]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-6 py-8">
      <p className="text-sm text-muted">Mi Vestuario</p>
      {!t || marcador?.ok === false ? (
        <>
          <h1 className="mt-2 text-3xl font-semibold">Este link no está activo</h1>
          <p className="mt-2 text-sm text-muted">
            {marcador && !marcador.ok && marcador.reason === "limited"
              ? "Hay demasiada gente mirando desde la misma red. Probá de nuevo en un rato."
              : "Pedile al DT que vuelva a compartir el partido."}
          </p>
        </>
      ) : marcador?.ok ? (
        <>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent">{ESTADO[marcador.estado]}</p>
          <h1 className="mt-2 text-3xl font-semibold">{marcador.club}</h1>
          <p className="mt-1 text-sm text-muted">{marcador.title}</p>
          <p className="mt-6 text-7xl font-semibold tracking-tight">
            {marcador.goalsFor}–{marcador.goalsAgainst}
          </p>
          <p className="mt-4 text-sm text-muted">
            {formatWhen(marcador.startsAt)}
            {marcador.place ? ` · ${marcador.place}` : ""}
          </p>
          {marcador.titulares.length > 0 ? (
            <section className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">La jugada</p>
              <JugadaPublica marcador={marcador} />
              {marcador.banco.length > 0 ? (
                <p className="mt-3 text-sm text-muted">Banco: {marcador.banco.join(", ")}</p>
              ) : null}
            </section>
          ) : (
            <p className="mt-6 text-sm text-muted">El DT todavía no publicó la formación.</p>
          )}
          <p className="mt-6 text-xs text-subtle">Se ven el resultado, la jugada y la formación. No hay fotos.</p>
        </>
      ) : (
        <h1 className="mt-2 text-3xl font-semibold">Cargando el partido…</h1>
      )}
    </main>
  );
}

function JugadaPublica({ marcador }: { marcador: Extract<MarcadorPublico, { ok: true }> }) {
  const pasos = marcador.pasos.length ? marcador.pasos : [{ id: "p1", nota: "", trazos: [] }];
  const [indice, setIndice] = useState(0);
  const [sigue, setSigue] = useState(pasos.length > 1);
  const paso = pasos[Math.min(indice, pasos.length - 1)] ?? pasos[0];

  useEffect(() => {
    if (!sigue || pasos.length < 2) return;
    const id = window.setInterval(() => setIndice((actual) => (actual + 1) % pasos.length), 1600);
    return () => window.clearInterval(id);
  }, [sigue, pasos.length]);

  return (
    <>
      <div className="relative mt-2 aspect-[5/7] overflow-hidden rounded-xl bg-linear-to-b from-pitch-top to-pitch-deep">
        {marcador.titulares.map((puesto) => (
          <div
            key={`${puesto.puesto}-${puesto.x}-${puesto.y}`}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${puesto.x}%`, top: `${puesto.y}%` }}
          >
            <span className="grid size-9 place-items-center rounded-full border border-line bg-surface text-[10px] font-bold text-accent">
              {puesto.puesto}
            </span>
            <span className="mt-0.5 max-w-16 truncate text-[10px] font-semibold text-line">{puesto.nick}</span>
          </div>
        ))}
        <Lienzo trazos={paso?.trazos ?? []} />
      </div>
      {paso?.nota ? <p className="mt-3 text-center text-lg font-medium leading-snug">{paso.nota}</p> : null}
      {marcador.tactica ? <p className="mt-2 text-sm text-muted">{marcador.tactica}</p> : null}
      {pasos.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {pasos.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`h-11 min-w-11 rounded-full px-3 text-xs font-semibold ${i === indice ? "bg-accent text-accent-fg" : "bg-surface text-muted"}`}
              onClick={() => {
                setSigue(false);
                setIndice(i);
              }}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="h-11 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg"
            onClick={() => setSigue((valor) => !valor)}
          >
            {sigue ? "Pausa" : "Ver jugada"}
          </button>
        </div>
      ) : null}
    </>
  );
}
