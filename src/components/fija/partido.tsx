import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cerrarMarcador, publicarMarcador } from "@/lib/fija/cloud";
import { candidatosFigura, figuraDe } from "@/lib/fija/figura";
import { personLabel } from "@/lib/fija/format";
import { vivoUrl, whatsAppEnVivo, whatsAppResultado, whatsAppSinConfirmar } from "@/lib/fija/share";
import { sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";
import { compartirTarjeta } from "@/lib/fija/tarjeta";
import type { ClubEvent, Member } from "@/lib/fija/types";

export function ParaLaFamilia({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const club = useFija((s) => s.club);
  const abrirEnVivo = useFija((s) => s.abrirEnVivo);
  const cerrarEnVivo = useFija((s) => s.cerrarEnVivo);
  const flushCloud = useFija((s) => s.flushCloud);
  const [nota, setNota] = useState("");
  if (!staff || !club || event.kind !== "partido") return null;

  async function publicar() {
    const token = abrirEnVivo(event.id);
    if (!token) return;
    setNota("Publicando el link…");
    await flushCloud();
    let ok = false;
    for (let intento = 0; intento < 3 && !ok; intento += 1) {
      const result = await publicarMarcador({ data: { code: club?.inviteCode, token } });
      ok = result.ok;
      if (!ok) await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    const text = whatsAppEnVivo(event, vivoUrl(token));
    await navigator.clipboard?.writeText(text);
    setNota(ok ? "Link copiado. Mandalo por WhatsApp." : "Todavía no se publicó. Tocá de nuevo.");
  }

  async function cerrar() {
    const token = event.liveToken;
    cerrarEnVivo(event.id);
    await flushCloud();
    if (token && club) await cerrarMarcador({ data: { code: club.inviteCode, token } });
    setNota("La familia ya no ve este partido.");
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Para la familia</p>
      <p className="mt-1 text-sm text-muted">
        El link muestra el resultado y la formación publicada: apodo, número y puesto. No muestra fotos, nombres, menores, indicaciones ni jugadas.
      </p>
      <Button className="mt-3 h-14 w-full" onClick={() => void publicar()}>
        {event.liveToken ? "Copiar link del partido" : "Compartir resultado en vivo"}
      </Button>
      {event.liveToken ? (
        <Button variant="outline" className="mt-2 h-12 w-full" onClick={() => void cerrar()}>
          Dejar de compartir
        </Button>
      ) : null}
      {nota ? <p className="mt-2 text-sm text-accent">{nota}</p> : null}
    </section>
  );
}

export function EnCancha({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const anotarEnCancha = useFija((s) => s.anotarEnCancha);
  const deshacerEnCancha = useFija((s) => s.deshacerEnCancha);
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const [modo, setModo] = useState<"gol" | "tarjeta" | null>(null);
  const [aviso, setAviso] = useState("");
  if (!staff || event.kind !== "partido" || event.resultClosedAt) return null;
  const sheet = sheetFor(event.id, sheets);
  const nombres = candidatosFigura(event, members);
  const marcas = event.liveLog ?? [];

  function elegir(personId: string) {
    if (!modo) return;
    anotarEnCancha(event.id, modo === "gol" ? "gol" : "tarjeta", personId);
    const nick = nombres.find((person) => person.id === personId)?.nick ?? "Jugador";
    setAviso(modo === "gol" ? `Gol de ${nick}.` : `Amarilla para ${nick}.`);
    setModo(null);
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">En la cancha</p>
      <p className="mt-1 text-2xl font-semibold">
        {sheet ? `${sheet.goalsFor}–${sheet.goalsAgainst}` : "0–0"}
      </p>
      {marcas.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {marcas.slice(-6).map((marca) => (
            <li key={marca.id}>
              {marca.kind === "gol"
                ? `Gol de ${nombres.find((person) => person.id === marca.memberId)?.nick ?? "un jugador"}`
                : marca.kind === "gol-rival"
                  ? "Gol de ellos"
                  : `Tarjeta para ${nombres.find((person) => person.id === marca.memberId)?.nick ?? "un jugador"}`}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 grid gap-2">
        <Button className="h-14" onClick={() => setModo(modo === "gol" ? null : "gol")}>
          Gol nuestro
        </Button>
        <Button variant="secondary" className="h-14" onClick={() => anotarEnCancha(event.id, "gol-rival")}>
          Gol de ellos
        </Button>
        <Button variant="outline" className="h-14" onClick={() => setModo(modo === "tarjeta" ? null : "tarjeta")}>
          Tarjeta
        </Button>
        <Button variant="ghost" className="h-12" disabled={marcas.length === 0} onClick={() => deshacerEnCancha(event.id)}>
          Deshacer último
        </Button>
      </div>
      {modo ? (
        <ul className="mt-3 max-h-60 space-y-1 overflow-auto">
          {nombres.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="h-12 w-full rounded-md bg-bg px-3 text-left text-sm font-semibold"
                onClick={() => elegir(person.id)}
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
