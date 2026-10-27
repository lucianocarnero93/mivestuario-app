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
  beforeLoad: ({ search }) => {
    if (!DEMO) throw redirect(INICIO);
    if (search.como) ponerRolDemo(search.como);
    const ir = search.ir;
    if (!ir || ir === "inicio") {
      if (search.como || ir === "inicio") throw redirect(INICIO);
      return;
    }
    if (ir === "agenda") throw redirect({ to: "/agenda" });
    if (ir === "equipo") throw redirect({ to: "/equipo" });
    if (ir === "stats") throw redirect({ to: "/stats", search: { partido: undefined, torneo: "general" } });
    if (ir === "fecha") throw redirect({ to: "/fecha", search: { partido: "ev-academia" } });
    if (ir === "caja") throw redirect({ to: "/caja", search: { mp: undefined } });
    if (ir === "vivo") throw redirect({ to: "/vivo", search: { t: "", e: "" } });
    if (ir === "plan" || ir === "rol" || ir === "revelacion" || ir === "datos" || ir === "quiz" || ir === "despues") {
      throw redirect({ to: "/cancha" });
    }
  },
  component: DemoPage,
});

function DemoPage() {
  const navigate = useNavigate();
  const club = useFija((s) => s.club);
  const resetDemo = useFija((s) => s.resetDemo);

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
