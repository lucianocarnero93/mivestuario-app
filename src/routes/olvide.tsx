import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { appOrigin, authClient } from "@/lib/auth/client";
import { LogoMark } from "@/components/fija/logo";

export const Route = createFileRoute("/olvide")({ component: OlvidePage });

function OlvidePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await authClient.requestPasswordReset({
      email: email.trim().toLowerCase(),
      // URL absoluta: Better Auth valida redirectTo contra trustedOrigins.
      // Un path relativo (`/reset`) a veces cae en `/` y muestra ClubGate.
      redirectTo: `${appOrigin()}/reset`,
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <LogoMark className="size-16" />
      <h1 className="mt-5 text-3xl font-semibold">Recuperar contraseña</h1>
      {sent ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Si el mail existe, te enviamos un enlace para elegir una nueva contraseña.
          </p>
          <Link to="/login" className="mt-6 text-sm text-accent">
            Volver al login
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Poné tu mail y te enviamos un enlace para elegir una nueva contraseña.
          </p>
          <form className="mt-6 space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm">
              Mail
              <input
                className="mt-1 flex h-12 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="h-14 w-full rounded-lg bg-accent text-base font-semibold text-accent-fg"
              disabled={busy}
            >
              {busy ? "Enviando…" : "Enviar enlace"}
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
