import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
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
          <p className="mt-6 text-xs text-subtle">Solo se ve el resultado. No aparecen los jugadores.</p>
        </>
      ) : (
        <h1 className="mt-2 text-3xl font-semibold">Cargando el partido…</h1>
      )}
    </main>
  );
}
