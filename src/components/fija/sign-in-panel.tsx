import { Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { authClient, signInWithGoogle } from "@/lib/auth/client";
import { LogoMark } from "./logo";

// Pantalla de entrada.
// Login con mail/contraseña (siempre funciona) + Google (opcional).
export function SignInPanel({
  opening = false,
  authError,
}: {
  opening?: boolean;
  authError?: string;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState(() => googleError(authError));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const mapped = googleError(authError);
    if (mapped) setErrorText(mapped);
  }, [authError]);

  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    setErrorText("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setErrorText("El mail no parece válido.");
      return;
    }
    if (password.length < 8) {
      setErrorText("La contraseña necesita al menos 8 caracteres.");
      return;
    }
    if (mode === "register" && fullName.trim().length < 2) {
      setErrorText("Poné tu nombre para crear la cuenta.");
      return;
    }

    setBusy(true);
    const result =
      mode === "register"
        ? await authClient.signUp.email({
            name: fullName.trim(),
            email: cleanEmail,
            password,
            callbackURL: "/",
          })
        : await authClient.signIn.email({
            email: cleanEmail,
            password,
            callbackURL: "/",
          });
    setBusy(false);

    if (result.error) {
      setErrorText(accountError(result.error.message ?? "", mode));
    } else if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  async function submitGoogle() {
    setErrorText("");
    try {
      await signInWithGoogle("/");
    } catch {
      setErrorText("No se pudo abrir Google. Probá con mail y contraseña.");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <LogoMark className="size-16" />
      <h1 className="mt-5 text-3xl font-semibold">Mi Vestuario</h1>
      {opening ? (
        <p className="mt-2 text-sm text-muted">Abriendo el vestuario…</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Entrá con tu mail o con Google. Sin vueltas.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={mode === "register" ? tabOn : tabOff}
              onClick={() => {
                setMode("register");
                setErrorText("");
              }}
            >
              Registrate
            </button>
            <button
              type="button"
              className={mode === "login" ? tabOn : tabOff}
              onClick={() => {
                setMode("login");
                setErrorText("");
              }}
            >
              Ya tengo cuenta
            </button>
          </div>

          <form className="mt-4 space-y-3" onSubmit={(event) => void submitAccount(event)}>
            {mode === "register" ? (
              <label className="block text-sm">
                Nombre
                <input
                  className={field}
                  value={fullName}
                  autoComplete="name"
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            ) : null}
            <label className="block text-sm">
              Mail
              <input
                className={field}
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Contraseña
              <input
                className={field}
                type="password"
                value={password}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {mode === "login" ? (
              <Link to="/olvide" className="block text-sm text-accent">
                ¿Olvidaste tu contraseña?
              </Link>
            ) : null}
            {errorText ? <p className="text-sm text-danger">{errorText}</p> : null}
            <button type="submit" className="h-14 w-full rounded-lg bg-accent text-base font-semibold text-accent-fg" disabled={busy}>
              {busy ? "Un momento…" : mode === "register" ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            className="mt-4 h-12 w-full rounded-lg bg-surface text-sm font-semibold text-fg"
            onClick={() => void submitGoogle()}
          >
            Continuar con Google
          </button>
        </>
      )}
    </main>
  );
}

const field =
  "mt-1 flex h-12 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const tabOn = "h-11 rounded-lg bg-accent text-sm font-semibold text-accent-fg";
const tabOff = "h-11 rounded-lg bg-surface text-sm font-semibold text-muted";

function accountError(message: string, mode: "register" | "login"): string {
  const text = message.toLowerCase();
  if (text.includes("already") || text.includes("exist")) {
    return "Ese mail ya tiene cuenta. Entrá con la contraseña.";
  }
  if (text.includes("password") || text.includes("short")) {
    return "La contraseña necesita al menos 8 caracteres.";
  }
  if (text.includes("invalid email")) return "El mail no parece válido.";
  if (mode === "login") return "Mail o contraseña incorrectos.";
  return "No se pudo crear la cuenta. Probá de nuevo.";
}

function googleError(error: string | undefined): string {
  if (!error) return "";
  const text = error.toLowerCase();
  if (text.includes("state_mismatch") || text.includes("state")) {
    return "Google se cortó al volver. Cerrá la pestaña y probá de nuevo.";
  }
  if (text.includes("access_denied") || text.includes("cancelled") || text.includes("denied")) {
    return "Cancelaste el login con Google.";
  }
  return "No se pudo entrar con Google. Probá con mail y contraseña.";
}
