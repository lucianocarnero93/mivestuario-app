import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Algo salió mal. Probá recargar.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

function esVersionVieja(error: unknown): boolean {
  const message = errorMessage(error);
  return message.includes("dynamically imported module") || message.includes("module script failed");
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  useEffect(() => {
    if (!esVersionVieja(error)) return;
    try {
      if (sessionStorage.getItem("vestuario-reload") === "1") return;
      sessionStorage.setItem("vestuario-reload", "1");
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Se trabó el partido</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {esVersionVieja(error) ? "Había una versión vieja abierta. Recargá la página." : errorMessage(error)}
      </p>
      <button
        type="button"
        className="h-12 rounded-lg bg-accent px-5 font-semibold text-accent-fg"
        onClick={() => window.location.reload()}
      >
        Recargar
      </button>
    </main>
  );
}
