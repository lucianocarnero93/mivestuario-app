import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { rememberMenor } from "@/lib/fija/edad";
import { useFija } from "@/lib/fija/store";
import { LogoMark } from "./logo";

export function EdadGate() {
  const applyMyEdad = useFija((s) => s.applyMyEdad);
  const [menor, setMenor] = useState<boolean | null>(null);
  const [adulto, setAdulto] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (menor === null) {
      setErrorText("Decí si tenés menos de 18.");
      return;
    }
    if (menor && !adulto) {
      setErrorText("Un menor necesita que un adulto responsable sepa que usa la app.");
      return;
    }
    setBusy(true);
    setErrorText("");
    const result = await authClient.updateUser({
      menor,
      edadConfirmada: true,
      adultoAvisado: menor ? true : false,
    });
    if (result.error) {
      setBusy(false);
      setErrorText("No se pudo guardar. Probá de nuevo.");
      return;
    }
    rememberMenor(menor);
    applyMyEdad(menor);
    window.location.replace("/");
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <LogoMark className="size-16" />
      <h1 className="mt-5 text-3xl font-semibold">Antes de entrar</h1>
      <p className="mt-2 text-sm text-muted">¿Tenés menos de 18? No guardamos la fecha de nacimiento.</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={menor === false ? on : off}
          onClick={() => {
            setMenor(false);
            setErrorText("");
          }}
        >
          No
        </button>
        <button
          type="button"
          className={menor === true ? on : off}
          onClick={() => {
            setMenor(true);
            setErrorText("");
          }}
        >
          Sí
        </button>
      </div>
      {menor ? (
        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-accent"
            checked={adulto}
            onChange={(event) => setAdulto(event.target.checked)}
          />
          Un adulto responsable sabe que uso esta app.
        </label>
      ) : null}
      {errorText ? <p className="mt-3 text-sm text-danger">{errorText}</p> : null}
      <button
        type="button"
        className="mt-6 h-14 w-full rounded-lg bg-accent text-base font-semibold text-accent-fg"
        disabled={busy}
        onClick={() => void confirm()}
      >
        {busy ? "Un momento…" : "Continuar"}
      </button>
    </main>
  );
}

const on = "h-11 rounded-lg bg-accent text-sm font-semibold text-accent-fg";
const off = "h-11 rounded-lg bg-surface text-sm font-semibold text-muted";
