import { useState } from "react";
import { Button } from "@/components/ui/button";
import { candidatosFigura, figuraDe } from "@/lib/fija/figura";
import { personLabel } from "@/lib/fija/format";
import { whatsAppResultado, whatsAppSinConfirmar } from "@/lib/fija/share";
import { sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";
import { compartirTarjeta } from "@/lib/fija/tarjeta";
import type { ClubEvent, Member } from "@/lib/fija/types";

export function EnCancha({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const anotarEnCancha = useFija((s) => s.anotarEnCancha);
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const [tarjeta, setTarjeta] = useState(false);
  const [aviso, setAviso] = useState("");
  if (!staff || event.kind !== "partido") return null;
  const sheet = sheetFor(event.id, sheets);
  const nombres = candidatosFigura(event, members);

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">En la cancha</p>
      <p className="mt-1 text-2xl font-semibold">
        {sheet ? `${sheet.goalsFor}–${sheet.goalsAgainst}` : "0–0"}
      </p>
      <p className="text-sm text-muted">Se guarda en el celular y se sube cuando hay señal. Después completás la planilla.</p>
      <div className="mt-3 grid gap-2">
        <Button className="h-14" onClick={() => anotarEnCancha(event.id, "gol")}>
          Gol nuestro
        </Button>
        <Button variant="secondary" className="h-14" onClick={() => anotarEnCancha(event.id, "gol-rival")}>
          Gol de ellos
        </Button>
        <Button variant="outline" className="h-14" onClick={() => setTarjeta((open) => !open)}>
          Tarjeta
        </Button>
      </div>
      {tarjeta ? (
        <ul className="mt-3 max-h-60 space-y-1 overflow-auto">
          {nombres.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="h-12 w-full rounded-md bg-bg px-3 text-left text-sm font-semibold"
                onClick={() => {
                  anotarEnCancha(event.id, "tarjeta", person.id);
                  setTarjeta(false);
                  setAviso(`Amarilla para ${person.nick}.`);
                }}
              >
                {personLabel(person, nombres)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {aviso ? <p className="mt-2 text-sm text-accent">{aviso}</p> : null}
    </section>
  );
}

export function FiguraPartido({ event }: { event: ClubEvent }) {
  const me = useMe();
  const club = useFija((s) => s.club);
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const votes = useFija((s) => s.figuraVotes);
  const voteFigura = useFija((s) => s.voteFigura);
  const [nota, setNota] = useState("");
  const sheet = sheetFor(event.id, sheets);
  if (!sheet || !club) return null;
  const candidatos = candidatosFigura(event, members).filter((person) => person.id !== me.id);
  const mio = (votes ?? []).find((row) => row.eventId === event.id && row.voterId === me.id);
  const figura = figuraDe(votes, event.id);
  const byId = new Map(members.map((person) => [person.id, person]));

  async function tarjetaDe(player: Member) {
    const puesto = Object.values(event.lineup).includes(player.id)
      ? "Titular"
      : (event.suplentes ?? []).includes(player.id)
        ? "Suplente"
        : "";
    const goles = sheet?.players.find((row) => row.memberId === player.id)?.goals ?? 0;
    try {
      const mode = await compartirTarjeta({
        club: club?.name ?? "",
        event,
        sheet: sheet!,
        player,
        puesto,
        goles,
        figura: Boolean(figura?.ids.includes(player.id)),
      });
      setNota(mode === "shared" ? "Tarjeta lista para compartir." : "Tarjeta guardada en el celular.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNota("No se pudo armar la tarjeta.");
    }
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Figura del partido</p>
      {figura ? (
        <p className="mt-1 text-sm">
          {figura.ids.map((id) => byId.get(id)?.nick ?? "Jugador").join(" y ")} · {figura.votos}{" "}
          {figura.votos === 1 ? "voto" : "votos"}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Todavía no votó nadie.</p>
      )}
      <ul className="mt-3 space-y-1">
        {candidatos.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className={`h-12 w-full rounded-md px-3 text-left text-sm font-semibold ${
                mio?.pickId === person.id ? "bg-accent text-accent-fg" : "bg-bg"
              }`}
              onClick={() => voteFigura(event.id, person.id)}
            >
              {personLabel(person, candidatos)}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-2">
        <Button variant="secondary" className="h-12" onClick={() => void tarjetaDe(me)}>
          Compartir mi tarjeta
        </Button>
        {figura?.ids[0] && figura.ids[0] !== me.id && byId.get(figura.ids[0]) ? (
          <Button variant="outline" className="h-12" onClick={() => void tarjetaDe(byId.get(figura.ids[0])!)}>
            Compartir la figura
          </Button>
        ) : null}
      </div>
      {nota ? <p className="mt-2 text-sm text-accent">{nota}</p> : null}
    </section>
  );
}

export function CopiarResultado({ event }: { event: ClubEvent }) {
  const club = useFija((s) => s.club);
  const sheet = sheetFor(event.id, useFija((s) => s.matchSheets));
  const [copied, setCopied] = useState(false);
  if (!club || !sheet) return null;
  return (
    <Button
      variant="outline"
      className="mt-3 h-12 w-full"
      onClick={() => {
        const text = whatsAppResultado(club, event, sheet.goalsFor, sheet.goalsAgainst);
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? "Resultado copiado" : "Copiar resultado para WhatsApp"}
    </Button>
  );
}

export function CopiarSinConfirmar({ event, names }: { event: ClubEvent; names: string[] }) {
  const club = useFija((s) => s.club);
  const [copied, setCopied] = useState(false);
  if (!club || names.length === 0) return null;
  return (
    <Button
      variant="outline"
      className="mt-3 h-12 w-full"
      onClick={() => {
        const text = whatsAppSinConfirmar(club, event, names);
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? "Aviso copiado" : "Copiar aviso a los que no contestaron"}
    </Button>
  );
}
