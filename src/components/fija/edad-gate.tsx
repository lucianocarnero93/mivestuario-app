import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { clearPedirEdad, esMenor, rememberMenor } from "@/lib/fija/edad";
import { useFija } from "@/lib/fija/store";
import { LogoMark } from "./logo";

export function EdadGate() {
  const applyMyEdad = useFija((s) => s.applyMyEdad);
  const [fecha, setFecha] = useState("");
  const [adulto, setAdulto] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);
  const menor = esMenor(fecha);

  async function confirm() {
    if (menor === null) {
      setErrorText("Poné una fecha de nacimiento válida.");
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
      adultoAvisado: menor,
    });
    if (result.error) {
      setBusy(false);
      setErrorText("No se pudo guardar. Probá de nuevo.");
      return;
    }
    rememberMenor(menor);
    applyMyEdad(menor);
    clearPedirEdad();
    window.location.replace("/");
  }

  return (
    <main className="desk-panel flex min-h-dvh flex-col justify-center px-6 py-10 desk:mx-auto desk:min-h-0 desk:w-full desk:max-w-md desk:self-center desk:rounded-[28px] desk:border desk:border-border">
      <LogoMark className="size-16" />
      <h1 className="mt-5 text-3xl font-semibold">Antes de entrar</h1>
      <p className="mt-2 text-sm text-muted">
        Google no nos dice tu edad. La fecha se usa para saber si sos menor y no se guarda.
      </p>
      <label className="mt-6 block text-sm">
        Fecha de nacimiento
        <input
          className="mt-1 flex h-12 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg"
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

function hoyIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
