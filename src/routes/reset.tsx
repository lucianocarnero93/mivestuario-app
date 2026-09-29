import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { LogoMark } from "@/components/fija/logo";

export const Route = createFileRoute("/reset")({
  component: ResetPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : "",
  }),
});

function ResetPage() {
  const search = Route.useSearch();
  const token = search.token;
  const linkBroken = !token || search.error === "INVALID_TOKEN";
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrorText("");
    if (password.length < 8) {
      setErrorText("La contraseña necesita al menos 8 caracteres.");
      return;
    }
    if (!token) {
      setErrorText("El enlace no es válido. Pedí uno nuevo.");
      return;
    }
    setBusy(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setBusy(false);
    if (result.error) {
      setErrorText(result.error.message ?? "No se pudo cambiar la contraseña.");
    } else {
      setDone(true);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <LogoMark className="size-16" />
      <h1 className="mt-5 text-3xl font-semibold">Nueva contraseña</h1>
      {done ? (
        <>
          <p className="mt-2 text-sm text-muted">Listo. Ya podés entrar con tu nueva contraseña.</p>
          <Link to="/login" className="mt-6 text-sm text-accent">
            Ir al login
          </Link>
        </>
      ) : linkBroken ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Este enlace no sirve o ya venció. Pedí uno nuevo. Dura una hora.
          </p>
          <Link to="/olvide" className="mt-6 text-sm text-accent">
            Pedir otro enlace
          </Link>
        </>
      ) : (
        <>
          <form className="mt-6 space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm">
              Nueva contraseña
              <input
                className="mt-1 flex h-12 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg"
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {errorText ? <p className="text-sm text-danger">{errorText}</p> : null}
            <button
              type="submit"
              className="h-14 w-full rounded-lg bg-accent text-base font-semibold text-accent-fg"
              disabled={busy}
            >
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
          <Link to="/login" className="mt-4 text-sm text-accent">
            Volver al login
          </Link>
        </>
      )}
    </main>
  );
}