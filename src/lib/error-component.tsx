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
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Se trabó el partido</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {esVersionVieja(error) ? "Había una copia vieja en el celular." : errorMessage(error)}
      </p>
      <button
        type="button"
        className="h-12 rounded-lg bg-accent px-5 font-semibold text-accent-fg"
        onClick={() => {
          void entrarLimpio();
        }}
      >
        Entrar de nuevo
      </button>
    </main>
  );
}

async function entrarLimpio() {
  try {
    sessionStorage.removeItem("vestuario-reload");
  } catch {
    /* ignore */
  }
  try {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* igual hay que entrar */
  }
  const extra = location.search ? "&" : "?";
  location.replace(`${location.pathname}${location.search}${extra}nuevo=${Date.now()}`);
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <h1 className="text-lg font-semibold">Esa página no existe</h1>
      <p className="max-w-md text-sm text-muted">El enlace no corresponde a una pantalla del vestuario.</p>
      <a href="/" className="flex h-12 items-center rounded-lg bg-accent px-5 font-semibold text-accent-fg">
        Volver al inicio
      </a>
    </main>
  );
}
