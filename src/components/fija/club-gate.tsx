import { useEffect, useState } from "react";
import { CircleDot, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadClubCard } from "@/lib/fija/cloud";
import { clearRememberedInvite, readRememberedInvite } from "@/lib/fija/share";
import { useFija } from "@/lib/fija/store";
import { LogoMark } from "./logo";
import { CrestPicker, TeamCrest } from "./team-crest";

type GateMode = "choose" | "preview" | "join" | "create";
type CardStatus = "loading" | "ready" | "missing" | "error";

type TeamCard = {
  name: string;
  crest: string | null;
  coach: string;
  players: number;
};

export function ClubGate() {
  const joinClub = useFija((s) => s.joinClub);
  const createClub = useFija((s) => s.createClub);
  const profile = useFija((s) => s.profile);
  const setProfile = useFija((s) => s.setProfile);
  const [mode, setMode] = useState<GateMode>("choose");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [crest, setCrest] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [nick, setNick] = useState(profile.nick);
  const [fullName, setFullName] = useState(profile.name);
  const [joining, setJoining] = useState(false);
  const [fromCard, setFromCard] = useState(false);
  const [card, setCard] = useState<TeamCard | null>(null);
  const [cardStatus, setCardStatus] = useState<CardStatus>("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const clean = readRememberedInvite();
    if (!clean) return;
    setCode(clean);
    setMode("preview");
    setCardStatus("loading");
    let cancelled = false;
    void loadClubCard({ data: clean })
      .then((card) => {
        if (cancelled) return;
        if (!card) {
          setCard(null);
          setCardStatus("missing");
          return;
        }
        setCard(card);
        setCardStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setCardStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);

  if (mode === "choose") {
    return (
      <main className="flex min-h-dvh flex-col px-5 py-8">
        <LogoMark className="mx-auto size-28 shadow-card" />
        <h1 className="mt-5 text-center text-3xl font-semibold">Mi Vestuario</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Organizá tu equipo de fútbol amateur.
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => {
              setFromCard(false);
              setMode("join");
            }}
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

  if (mode === "preview") {
    const playersLabel = card?.players === 1 ? "1 jugador" : `${card?.players ?? 0} jugadores`;
    return (
      <main className="flex min-h-dvh flex-col px-5 py-8">
        {cardStatus === "ready" && card ? (
          <TeamCrest src={card.crest} name={card.name} className="mx-auto size-28 text-3xl shadow-card" />
        ) : (
          <LogoMark className="mx-auto size-28 shadow-card" />
        )}

        {cardStatus === "loading" ? (
          <h1 className="mt-5 text-center text-3xl font-semibold">Buscando el equipo…</h1>
        ) : null}

        {cardStatus === "missing" ? (
          <>
            <h1 className="mt-5 text-center text-3xl font-semibold">No encontramos ese equipo</h1>
            <p className="mt-2 text-center text-sm text-danger">
              Ese equipo todavía no está en la nube, o el código no es el de vestuario. Pedile al DT que abra la app y toque Invitar al equipo.
            </p>
            <p className="mt-4 text-center font-display text-2xl font-semibold tracking-widest text-accent">
              {code}
            </p>
          </>
        ) : null}

        {cardStatus === "error" ? (
          <>
            <h1 className="mt-5 text-center text-3xl font-semibold">No pudimos leer el equipo</h1>
            <p className="mt-2 text-center text-sm text-muted">Probá de nuevo en un momento.</p>
            <Button className="mt-6 h-14 w-full text-base" onClick={() => setRetry((n) => n + 1)}>
              Reintentar
            </Button>
          </>
        ) : null}

        {cardStatus === "ready" && card ? (
          <>
            <h1 className="mt-5 text-center text-3xl font-semibold">{card.name}</h1>
            <p className="mt-2 text-center text-sm text-muted">DT: {card.coach}</p>
            <p className="mt-1 text-center text-sm text-muted">{playersLabel}</p>
            <p className="mt-3 text-center text-xs tracking-widest text-subtle">Código {code}</p>
            <Button
              className="mt-6 h-auto min-h-14 w-full whitespace-normal px-4 py-3 text-base"
              onClick={() => {
                setFromCard(true);
                setError("");
                setMode("join");
              }}
            >
              Unirme a {card.name}
            </Button>
          </>
        ) : null}

        <Button
          variant="ghost"
          className="mt-3 h-12 w-full"
          onClick={() => {
            setMode("choose");
            setError("");
          }}
        >
          No, gracias
        </Button>
      </main>
    );
  }

  if (mode === "join") {
    return (
      <main className="flex min-h-dvh flex-col px-5 py-8">
        {fromCard && card ? (
          <TeamCrest src={card.crest} name={card.name} className="mx-auto size-28 text-3xl shadow-card" />
        ) : (
          <LogoMark className="mx-auto size-28 shadow-card" />
        )}
        <h1 className="mt-5 text-center text-3xl font-semibold">
          {fromCard && card ? `Unirme a ${card.name}` : "Unirme a un equipo"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          {fromCard ? "Poné tu nombre y tu apodo." : "Poné tu nombre y el código que te pasó el DT."}
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
          {fromCard ? null : (
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
          )}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (joining) return;
            if (fullName.trim().length < 2) {
              setError("Poné tu nombre para entrar.");
              return;
            }
            setError("");
            setJoining(true);
            setProfile({ name: fullName, nick: nick || fullName.split(" ")[0] });
            void joinClub(code)
              .then((ok) => {
                if (ok) {
                  clearRememberedInvite();
                  return;
                }
                setError("Ese equipo no está en la nube. Pedile al DT que toque Invitar al equipo y te pase el código de nuevo.");
                setJoining(false);
              })
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : "";
                setError(message || "No pudimos leer el equipo. Probá de nuevo en un momento.");
                setJoining(false);
              });
          }}
        >
          <Button type="submit" className="h-14 w-full text-base" disabled={joining}>
            {joining ? "Entrando…" : "Entrar al equipo"}
          </Button>
        </form>

        <Button
          variant="ghost"
          className="mt-3 h-12 w-full"
          onClick={() => {
            setMode(fromCard ? "preview" : "choose");
            setError("");
          }}
        >
          Volver
        </Button>
      </main>
    );
  }

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
