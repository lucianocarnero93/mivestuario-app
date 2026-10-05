import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { leerMarcador, type MarcadorPublico } from "@/lib/fija/cloud";
import { reaccionarFamilia } from "@/lib/fija/familia";
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
  final: "Finalizado",
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
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Formación</p>
              <div className="relative mt-2 aspect-[5/7] overflow-hidden rounded-xl bg-linear-to-b from-pitch-top to-pitch-deep">
                {marcador.titulares.map((puesto) => (
                  <div
                    key={`${puesto.puesto}-${puesto.x}-${puesto.y}`}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${puesto.x}%`, top: `${puesto.y}%` }}
                  >
                    <span className="grid size-9 place-items-center rounded-full border border-line bg-surface text-[10px] font-bold text-accent">
                      {puesto.puesto}
                    </span>
                    <span className="mt-0.5 max-w-16 truncate text-[10px] font-semibold text-line">{puesto.nick}</span>
                  </div>
                ))}
              </div>
              {marcador.banco.length > 0 ? (
                <p className="mt-3 text-sm text-muted">Banco: {marcador.banco.join(", ")}</p>
              ) : null}
            </section>
          ) : (
            <p className="mt-6 text-sm text-muted">El DT todavía no publicó la formación.</p>
          )}
          {marcador.estado === "final" ? <FamiliaFuego token={t} inicial={marcador.familia} /> : null}
          <p className="mt-6 text-xs text-subtle">Se ven el resultado y la formación. No hay fotos, nombres ni jugadas.</p>
        </>
      ) : (
        <h1 className="mt-2 text-3xl font-semibold">Cargando el partido…</h1>
      )}
    </main>
  );
}

function FamiliaFuego({ token, inicial }: { token: string; inicial: number }) {
  const [n, setN] = useState(inicial);
  const [listo, setListo] = useState(false);
  return (
    <section className="mt-6">
      <button
        type="button"
        className="h-14 w-full rounded-md bg-surface text-base font-semibold"
        disabled={listo}
        onClick={() => {
          void reaccionarFamilia({ data: token }).then((result) => {
            if (result.ok) {
              setN(result.n);
              setListo(true);
            }
          });
        }}
      >
        {listo ? "Listo" : "Dejar un fuego"}
      </button>
      <p className="mt-2 text-sm text-muted">
        {n} {n === 1 ? "familia siguió" : "familias siguieron"} el partido.
      </p>
    </section>
  );
}
