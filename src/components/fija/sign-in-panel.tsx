import { useState, type FormEvent } from "react";
import { authClient, rememberSessionToken, signInWithGoogle } from "@/lib/auth/client";
import { noteQuiet } from "@/lib/note";
import { clearPedirEdad, esMenor, rememberMenor, rememberPedirEdad } from "@/lib/fija/edad";
import { inviteCallbackPath } from "@/lib/fija/share";
import { LogoMark } from "./logo";

// Pantalla de entrada.
// Login con mail/contraseña (siempre funciona) + Google (opcional).
export function SignInPanel({ opening = false }: { opening?: boolean }) {
  const [mode, setMode] = useState<"register" | "login">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [fecha, setFecha] = useState("");
  const [adultKnows, setAdultKnows] = useState(false);
  const menor = mode === "register" ? esMenor(fecha) : null;

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
    if (mode === "register" && menor === null) {
      setErrorText("Poné una fecha de nacimiento válida.");
      return;
    }
    if (mode === "register" && menor && !adultKnows) {
      setErrorText("Un menor necesita que un adulto responsable sepa que usa la app.");
      return;
    }
    if (mode === "login") clearPedirEdad();

    setBusy(true);
    try {
      const back = inviteCallbackPath();
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              name: fullName.trim(),
              email: cleanEmail,
              password,
              menor: menor === true,
              edadConfirmada: true,
              adultoAvisado: menor === true && adultKnows,
            })
          : await authClient.signIn.email({
              email: cleanEmail,
              password,
            });
      if (result.error) {
        setErrorText(accountError(result.error.message ?? "", mode));
        noteQuiet("login", mode === "login" ? "no coinciden" : "no se pudo crear");
        return;
      }
      const token = result.data?.token;
      if (!token) {
        setErrorText("No se pudo guardar la sesión. Probá de nuevo.");
        noteQuiet("login", "sin token");
        return;
      }
      rememberSessionToken(token);
      if (mode === "register") rememberMenor(menor === true);
      await forgetStuckSession();
      if (typeof window !== "undefined") window.location.replace(back);
    } catch {
      setErrorText("No se pudo entrar. Fijate la conexión y probá de nuevo.");
      noteQuiet("login", "sin red");
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    setErrorText("");
    if (mode === "register") rememberPedirEdad();
    else clearPedirEdad();
    setGoogleBusy(true);
    try {
      const opened = await signInWithGoogle(inviteCallbackPath());
      if (!opened) {
        setGoogleBusy(false);
        setErrorText("No se pudo abrir Google. Probá con mail y contraseña.");
      }
    } catch {
      setGoogleBusy(false);
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
            Entrá con tu mail o con Google.
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
            {mode === "register" ? (
              <fieldset className="space-y-2">
                <label className="block text-sm">
                  Fecha de nacimiento
                  <input
                    className={field}
                    type="date"
                    value={fecha}
                    max={hoyIso()}
                    min="1900-01-01"
                    onChange={(event) => {
                      setFecha(event.target.value);
                      setErrorText("");
                    }}
                  />
                </label>
                <p className="text-xs text-muted">Se usa para saber si sos menor. No se guarda.</p>
                {menor ? (
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 accent-accent"
                      checked={adultKnows}
                      onChange={(event) => setAdultKnows(event.target.checked)}
                    />
                    Un adulto responsable sabe que uso esta app.
                  </label>
                ) : null}
              </fieldset>
            ) : null}
            {mode === "login" ? (
              <a href="/olvide" className="block text-sm text-accent">
                ¿Olvidaste tu contraseña?
              </a>
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
            disabled={googleBusy}
            onClick={() => void submitGoogle()}
          >
            {googleBusy ? "Abriendo Google…" : "Continuar con Google"}
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

function hoyIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function accountError(message: string, mode: "register" | "login"): string {
  const text = message.toLowerCase();
  if (text.includes("already") || text.includes("exist")) {
    return "Ese mail ya tiene cuenta. Entrá con la contraseña, o con Google si la creaste así.";
  }
  if (text.includes("too short") || text.includes("too_short") || text.includes("min password") || text.includes("at least")) {
    return "La contraseña necesita al menos 8 caracteres.";
  }
  if (text.includes("invalid email")) return "El mail no parece válido.";
  if (mode === "login") {
    return "Mail o contraseña incorrectos. Si esa cuenta la creaste con Google, usá ese botón.";
  }
  return "No se pudo crear la cuenta. Probá de nuevo.";
}

async function forgetStuckSession() {
  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}