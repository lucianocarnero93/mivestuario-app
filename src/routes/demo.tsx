import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { TeamCrest } from "@/components/fija/team-crest";
import { DEMO } from "@/lib/fija/demo-flag";
import { ponerRolDemo, useFija } from "@/lib/fija/store";

const INICIO = { to: "/" as const, search: { invite: undefined, protocol: undefined } };

function comoDe(valor: unknown): "dt" | "jugador" | undefined {
  return valor === "dt" || valor === "jugador" ? valor : undefined;
}

function irDe(valor: unknown): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

export const Route = createFileRoute("/demo")({
  validateSearch: (search: Record<string, unknown>) => ({
    como: comoDe(search.como),
    ir: irDe(search.ir),
  }),
  beforeLoad: () => {
    if (!DEMO) throw redirect(INICIO);
  },
  component: DemoPage,
});

function DemoPage() {
  const navigate = useNavigate();
  const { como, ir } = Route.useSearch();
  const club = useFija((s) => s.club);
  const hydrated = useFija((s) => s.hydrated);
  const resetDemo = useFija((s) => s.resetDemo);

  useEffect(() => {
    if (!hydrated) return;
    if (como) ponerRolDemo(como);
    if (!ir && !como) return;
    if (!ir || ir === "inicio") {
      void navigate(INICIO);
      return;
    }
    if (ir === "agenda") {
      void navigate({ to: "/agenda" });
      return;
    }
    if (ir === "equipo") {
      void navigate({ to: "/equipo" });
      return;
    }
    if (ir === "stats") {
      void navigate({ to: "/stats", search: { partido: undefined, torneo: "general" } });
      return;
    }
    if (ir === "fecha") {
      void navigate({ to: "/fecha", search: { partido: "ev-academia" } });
      return;
    }
    if (ir === "caja") {
      void navigate({ to: "/caja", search: { mp: undefined } });
      return;
    }
    if (ir === "vivo") {
      void navigate({ to: "/vivo", search: { t: "", e: "" } });
      return;
    }
    if (ir === "plan" || ir === "rol" || ir === "revelacion" || ir === "datos" || ir === "quiz" || ir === "despues") {
      void navigate({ to: "/cancha" });
    }
  }, [hydrated, como, ir, navigate]);

  function entrar(rol: "dt" | "jugador") {
    ponerRolDemo(rol);
    void navigate(INICIO);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <TeamCrest src={club?.crest} name={club?.name ?? "Los Pibes FC"} className="size-20 text-lg" />
      <h1 className="font-display text-4xl font-semibold">Los Pibes FC</h1>
      <p className="text-sm text-muted">Mi Vestuario · Datos de ejemplo</p>
      <button type="button" className="h-14 w-full max-w-xs rounded-2xl bg-accent text-base font-semibold text-accent-fg" onClick={() => entrar("dt")}>
        Entrar como DT
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
