import { useEffect, useState } from "react";
import { CircleDot, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFija } from "@/lib/fija/store";
import { LogoMark } from "./logo";
import { CrestPicker } from "./team-crest";

export function ClubGate() {
  const joinClub = useFija((s) => s.joinClub);
  const createClub = useFija((s) => s.createClub);
  const profile = useFija((s) => s.profile);
  const setProfile = useFija((s) => s.setProfile);
  const [mode, setMode] = useState<"choose" | "join" | "create">("choose");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [crest, setCrest] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [nick, setNick] = useState(profile.nick);
  const [fullName, setFullName] = useState(profile.name);
  const [autoJoining, setAutoJoining] = useState(false);

  // Lee el ?invite= de la URL. Si existe, va directo al form de unirse.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) {
      const clean = invite.trim().toUpperCase();
      setCode(clean);
      setMode("join");
    }
  }, []);

  // Auto-entrada: si hay ?invite= y el usuario ya tiene nombre, entra solo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (!invite || !code || autoJoining) return;
    if (fullName.trim().length < 2) return;
    setAutoJoining(true);
    setProfile({ name: fullName, nick: nick || fullName.split(" ")[0] });
    void joinClub(code).then((ok) => {
      if (!ok) {
        setError("Ese código no existe. Pedile el correcto al DT.");
        setAutoJoining(false);
      }
    });
  }, [code, fullName, nick, joinClub, setProfile, autoJoining]);

  // ── Pantalla de elección ──
  if (mode === "choose") {
    return (
      <main className="flex min-h-dvh flex-col px-5 py-8">
        <LogoMark className="mx-auto size-28 shadow-card" />
        <h1 className="mt-5 text-center text-3xl font-semibold">Mi Vestuario</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Organizá tu equipo de fútbol amateur.
        </p>

        <div className="mt-8 space-y-4">
                {/* Opción 1: Unirme */}
          <button
            type="button"
            onClick={() => setMode("join")}
            className="flex w-full items-center gap-4 rounded-2xl bg-accent p-5 text-left shadow-card transition-opacity hover:opacity-90"
          >
            <CircleDot className="size-10 shrink-0 text-accent-fg" strokeWidth={1.8} />
            <div>
              <p className="text-lg font-semibold text-accent-fg">Unirme a un equipo</p>
              <p className="mt-1 text-sm text-accent-fg/80">
                Tu DT te pasó un código o un link. Entrá acá.
              </p>
            </div>
          </button>
                 {/* Opción 2: Crear */}
          <button
            type="button"
            onClick={() => setMode("create")}
            className="flex w-full items-center gap-4 rounded-2xl bg-surface p-5 text-left shadow-card transition-opacity hover:opacity-90"
          >
            <Shield className="size-10 shrink-0 text-accent" strokeWidth={1.8} />
            <div>
              <p className="text-lg font-semibold text-fg">Crear un equipo</p>
              <p className="mt-1 text-sm text-muted">
                Sos el que organiza. Vas a ser el DT y podés invitar a los demás.
              </p>
            </div>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Si no sabés qué elegir, preguntale a tu DT.
        </p>
      </main>
    );
  }

  // ── Pantalla de unirse ──
  if (mode === "join") {
    return (
      <main className="flex min-h-dvh flex-col px-5 py-8">
        <LogoMark className="mx-auto size-28 shadow-card" />
        <h1 className="mt-5 text-center text-3xl font-semibold">Unirme a un equipo</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Poné tu nombre y el código que te pasó el DT.
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <Label htmlFor="gate-name">Tu nombre</Label>
            <Input
              id="gate-name"
              className="mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <Label htmlFor="gate-nick">Apodo (opcional)</Label>
            <Input
              id="gate-nick"
              className="mt-1"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Ej: Juanchi"
            />
          </div>
          <div>
            <Label htmlFor="gate-code">Código del vestuario</Label>
            <Input
              id="gate-code"
              className="mt-1 uppercase tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              required
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (fullName.trim().length < 2) {
              setError("Poné tu nombre para entrar.");
              return;
            }
            setProfile({ name: fullName, nick: nick || fullName.split(" ")[0] });
            void joinClub(code).then((ok) => {
              setError(ok ? "" : "Ese código no existe. Pedile el correcto al DT.");
            });
          }}
        >
          <Button type="submit" className="h-14 w-full text-base" disabled={autoJoining}>
            {autoJoining ? "Entrando…" : "Entrar al equipo"}
          </Button>
        </form>

        <Button
          variant="ghost"
          className="mt-3 h-12 w-full"
          onClick={() => {
            setMode("choose");
            setError("");
          }}
        >
          Volver
        </Button>
      </main>
    );
  }

  // ── Pantalla de crear ──
  return (
    <main className="flex min-h-dvh flex-col px-5 py-8">
      <LogoMark className="mx-auto size-28 shadow-card" />
      <h1 className="mt-5 text-center text-3xl font-semibold">Crear un equipo</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Vas a ser el DT. Después invitás a los jugadores con un código.
      </p>

      <div className="mt-6 space-y-3">
        <div>
          <Label htmlFor="gate-name-c">Tu nombre</Label>
          <Input
            id="gate-name-c"
            className="mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div>
          <Label htmlFor="gate-nick-c">Apodo (opcional)</Label>
          <Input
            id="gate-nick-c"
            className="mt-1"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Ej: Juanchi"
          />
        </div>
      </div>

      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (fullName.trim().length < 2) {
            setError("Poné tu nombre para crear el equipo.");
            return;
          }
          if (name.trim().length < 2) {
            setError("Ponele un nombre al equipo.");
            return;
          }
          setProfile({ name: fullName, nick: nick || fullName.split(" ")[0] });
          createClub(name, crest);
        }}
      >
        <div>
          <Label htmlFor="gate-club">Nombre del equipo</Label>
          <Input
            id="gate-club"
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Los Pibes del Barrio"
            required
          />
        </div>
        <CrestPicker src={crest} name={name} onChange={setCrest} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="h-14 w-full text-base">
          Crear equipo y ser DT
        </Button>
      </form>

      <Button
        variant="ghost"
        className="mt-3 h-12 w-full"
        onClick={() => {
          setMode("choose");
          setError("");
        }}
      >
        Volver
      </Button>
    </main>
  );
}