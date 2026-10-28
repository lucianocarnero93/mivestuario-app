import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { TeamCrest } from "@/components/fija/team-crest";
import { DEMO } from "@/lib/fija/demo-flag";
import { ponerRolDemo, useFija } from "@/lib/fija/store";

const INICIO = { to: "/" as const, search: { invite: undefined, protocol: undefined } };

function comoDe(valor: unknown): "dt" | "ayudante" | "jugador" | undefined {
  if (valor === "dt" || valor === "ayudante" || valor === "jugador") return valor;
  return undefined;
}

export const Route = createFileRoute("/demo")({
  validateSearch: (search: Record<string, unknown>) => ({
    como: comoDe(search.como),
  }),
  beforeLoad: () => {
    if (!DEMO) throw redirect(INICIO);
  },
  component: DemoPage,
});

function DemoPage() {
  const navigate = useNavigate();
  const { como } = Route.useSearch();
  const club = useFija((s) => s.club);
  const hydrated = useFija((s) => s.hydrated);
  const resetDemo = useFija((s) => s.resetDemo);

  useEffect(() => {
    if (!hydrated || !como) return;
    ponerRolDemo(como);
    void navigate(INICIO);
  }, [hydrated, como, navigate]);

  function entrar(rol: "dt" | "ayudante" | "jugador") {
    ponerRolDemo(rol);
    void navigate(INICIO);
  }

  if (como) {
    return <main className="grid min-h-dvh place-items-center px-6 text-sm text-muted">Abriendo Los Pibes FC…</main>;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <TeamCrest src={club?.crest} name={club?.name ?? "Los Pibes FC"} className="size-20 text-lg" />
      <h1 className="text-4xl font-semibold">Los Pibes FC</h1>
      <p className="text-sm text-muted">Datos de ejemplo. No se guarda nada.</p>
      <button type="button" className="h-14 w-full max-w-xs rounded-2xl bg-accent text-base font-semibold text-accent-fg" onClick={() => entrar("dt")}>
        Entrar como DT
      </button>
      <button type="button" className="h-14 w-full max-w-xs rounded-2xl bg-surface text-base font-semibold" onClick={() => entrar("ayudante")}>
        Entrar como ayudante
      </button>
      <button type="button" className="h-14 w-full max-w-xs rounded-2xl bg-surface text-base font-semibold" onClick={() => entrar("jugador")}>
        Entrar como jugador
      </button>
      <button
        type="button"
        className="h-12 text-sm text-muted"
        onClick={() => {
          resetDemo();
        }}
      >
        Volver a empezar
      </button>
    </main>
  );
}
