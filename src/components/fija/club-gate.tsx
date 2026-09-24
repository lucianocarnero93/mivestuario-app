import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState<"join" | "create">("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [crest, setCrest] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [nick, setNick] = useState(profile.nick);
  const [fullName, setFullName] = useState(profile.name);
  const [autoJoining, setAutoJoining] = useState(false);

  // Lee el ?invite= de la URL. Si existe, completa el código automáticamente.
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

  // Cuando el código está completo y el usuario tiene nombre, entra solo.
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

  return (
    <main className="flex min-h-dvh flex-col px-5 py-8">
      <LogoMark className="mx-auto size-28 shadow-card" />
      <h1 className="mt-5 text-center text-3xl font-semibold">Tu vestuario</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Creá el equipo si sos el DT, o entrá con el código que te pasaron.
      </p>

      <div className="mt-6 space-y-3">
        <div>
          <Label htmlFor="gate-name">Tu nombre</Label>
          <Input
            id="gate-name"
            className="mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gate-nick">Apodo</Label>
          <Input
            id="gate-nick"
            className="mt-1"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button
          variant={mode === "join" ? "default" : "secondary"}
          className="h-12"
          onClick={() => setMode("join")}
        >
          Unirme
        </Button>
        <Button
          variant={mode === "create" ? "default" : "secondary"}
          className="h-12"
          onClick={() => setMode("create")}
        >
          Crear
        </Button>
      </div>

      {mode === "join" ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setProfile({ name: fullName, nick: nick || fullName.split(" ")[0] });
            void joinClub(code).then((ok) => {
              setError(ok ? "" : "Ese código no existe. Pedile el correcto al DT.");
            });
          }}
        >
          <Label htmlFor="gate-code">Código del vestuario</Label>
          <Input
            id="gate-code"
            className="mt-1 uppercase tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            required
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="h-14 w-full text-base" disabled={autoJoining}>
            {autoJoining ? "Entrando…" : "Entrar al equipo"}
          </Button>
        </form>
      ) : (
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setProfile({ name: fullName, nick });
            createClub(name, crest);
          }}
        >
          <Label htmlFor="gate-club">Nombre del equipo</Label>
          <Input
            id="gate-club"
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del equipo"
            required
          />
          <CrestPicker src={crest} name={name} onChange={setCrest} />
          <Button type="submit" className="h-14 w-full text-base">
            Crear y ser DT
          </Button>
        </form>
      )}
    </main>
  );
}