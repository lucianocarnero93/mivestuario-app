import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cerrarEquipo, cerrarMarcador, publicarEquipo, publicarMarcador } from "@/lib/fija/cloud";
import { resultIsOpen } from "@/lib/fija/club-rules";
import { candidatosFigura, figuraDe } from "@/lib/fija/figura";
import { estadoFigura } from "@/lib/fija/premios";
import { personLabel } from "@/lib/fija/format";
import { vivoUrl, whatsAppEnVivo, whatsAppResultado, whatsAppSinConfirmar } from "@/lib/fija/share";
import { sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";
import type { ClubEvent } from "@/lib/fija/types";

const APODOS_KEY = "mv-apodos-revisados";

export function ParaLaFamilia({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const club = useFija((s) => s.club);
  const abrirEnVivo = useFija((s) => s.abrirEnVivo);
  const cerrarEnVivo = useFija((s) => s.cerrarEnVivo);
  const abrirLinkEquipo = useFija((s) => s.abrirLinkEquipo);
  const cerrarLinkEquipo = useFija((s) => s.cerrarLinkEquipo);
  const rotarLinkEquipo = useFija((s) => s.rotarLinkEquipo);
  const flushCloud = useFija((s) => s.flushCloud);
  const [cual, setCual] = useState<"equipo" | "partido">("equipo");
  const [fase, setFase] = useState<"idle" | "preparando" | "listo">("idle");
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState(false);
  if (!staff || !club || event.kind !== "partido") return null;

  const tokenListo = cual === "equipo" ? club.teamLiveToken : event.liveToken;
  const puedeCopiar = Boolean(tokenListo) && fase !== "preparando";

  function yaReviso(): boolean {
    try {
      return localStorage.getItem(APODOS_KEY) === "1";
    } catch {
      return false;
    }
  }

  async function publicar() {
    if (!yaReviso()) {
      setAviso(true);
      return;
    }
    setFase("preparando");
    setNota("");
    const token = cual === "equipo" ? abrirLinkEquipo() : abrirEnVivo(event.id);
    if (!token) {
      setFase("idle");
      return;
    }
    await flushCloud();
    let ok = false;
    for (let intento = 0; intento < 3 && !ok; intento += 1) {
      const result =
        cual === "equipo"
          ? await publicarEquipo({ data: { code: club?.inviteCode, token } })
          : await publicarMarcador({ data: { code: club?.inviteCode, token } });
      ok = result.ok;
      if (!ok) await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    setFase(ok ? "listo" : "idle");
    setNota(ok ? "Link listo. Ahora sí lo podés copiar." : "Todavía no se publicó. Tocá de nuevo.");
  }

  async function copiar() {
    const token = cual === "equipo" ? club?.teamLiveToken : event.liveToken;
    if (!token || fase === "preparando") return;
    const text = whatsAppEnVivo(event, vivoUrl(token, cual === "equipo" ? "e" : "t"));
    await navigator.clipboard?.writeText(text);
    setNota("Link copiado. Mandalo por WhatsApp.");
  }

  async function cerrar() {
    if (cual === "equipo") {
      const token = club?.teamLiveToken;
      cerrarLinkEquipo();
      await flushCloud();
      if (token && club) await cerrarEquipo({ data: { code: club.inviteCode, token } });
      setNota("La familia ya no entra por el link del equipo.");
    } else {
      const token = event.liveToken;
      cerrarEnVivo(event.id);
      await flushCloud();
      if (token && club) await cerrarMarcador({ data: { code: club.inviteCode, token } });
      setNota("La familia ya no ve este partido.");
    }
    setFase("idle");
  }

  async function rotar() {
    if (!window.confirm("El link anterior deja de funcionar. ¿Generar uno nuevo?")) return;
    const viejo = club?.teamLiveToken;
    setFase("preparando");
    const token = rotarLinkEquipo();
    if (!token) {
      setFase("idle");
      return;
    }
    await flushCloud();
    if (viejo && club) await cerrarEquipo({ data: { code: club.inviteCode, token: viejo } });
    const result = await publicarEquipo({ data: { code: club?.inviteCode, token } });
    setFase(result.ok ? "listo" : "idle");
    setNota(result.ok ? "Link nuevo listo. Copialo y mandalo de nuevo." : "No se pudo generar. Probá otra vez.");
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">Para la familia</p>
      <p className="mt-1 text-sm text-muted">
        El link muestra el resultado y la formación publicada: apodo, número y puesto. No muestra fotos, nombres, menores, indicaciones ni jugadas.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`h-12 rounded-md text-sm font-semibold ${cual === "equipo" ? "bg-accent text-accent-fg" : "bg-bg"}`}
          onClick={() => setCual("equipo")}
        >
          Link del equipo (recomendado)
        </button>
        <button
          type="button"
          className={`h-12 rounded-md text-sm font-semibold ${cual === "partido" ? "bg-accent text-accent-fg" : "bg-bg"}`}
          onClick={() => setCual("partido")}
        >
          Solo este partido
        </button>
      </div>
      {aviso ? (
        <p className="mt-3 text-sm">
          En el link se ven los apodos. Revisá que ninguno sea un nombre completo.
          <button
            type="button"
            className="mt-2 h-12 w-full rounded-md bg-accent font-semibold text-accent-fg"
            onClick={() => {
              try {
                localStorage.setItem(APODOS_KEY, "1");
              } catch {
                /* el aviso igual se cierra */
              }
              setAviso(false);
              void publicar();
            }}
          >
            Ya revisé los apodos
          </button>
        </p>
      ) : null}
      <Button className="mt-3 h-14 w-full" disabled={fase === "preparando"} onClick={() => void publicar()}>
        {fase === "preparando" ? "Preparando el link…" : cual === "equipo" ? "Compartir link del equipo" : "Compartir este partido"}
      </Button>
      <Button className="mt-2 h-12 w-full" variant="secondary" disabled={!puedeCopiar} onClick={() => void copiar()}>
        {puedeCopiar ? "Copiar link del partido" : "Preparando el link…"}
      </Button>
      {tokenListo ? (
        <Button variant="outline" className="mt-2 h-12 w-full" onClick={() => void cerrar()}>
          Dejar de compartir
        </Button>
      ) : null}
      {cual === "equipo" && club.teamLiveToken ? (
        <Button variant="ghost" className="mt-2 h-12 w-full" onClick={() => void rotar()}>
          Generar link nuevo
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
  const [modo, setModo] = useState<"gol" | "amarilla" | "roja" | null>(null);
  const [aviso, setAviso] = useState("");
  if (!staff || event.kind !== "partido" || event.resultClosedAt || !resultIsOpen(event.startsAt)) return null;
  const sheet = sheetFor(event.id, sheets);
  const nombres = candidatosFigura(event, members);
  const marcas = event.liveLog ?? [];

  function elegir(personId: string) {
    if (!modo) return;
    const ok =
      modo === "gol"
        ? anotarEnCancha(event.id, "gol", personId)
        : anotarEnCancha(event.id, "tarjeta", personId, modo);
    if (!ok) return;
    const nick = nombres.find((person) => person.id === personId)?.nick ?? "Jugador";
    setAviso(modo === "gol" ? `Gol de ${nick}.` : modo === "roja" ? `Roja para ${nick}.` : `Amarilla para ${nick}.`);
    setModo(null);
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">En la cancha</p>
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
                  : marca.kind === "tarjeta"
                    ? `${marca.card === "roja" ? "Roja" : "Amarilla"} para ${nombres.find((person) => person.id === marca.memberId)?.nick ?? "un jugador"}`
                    : marca.kind === "inicio"
                      ? "Pitazo inicial"
                      : marca.kind === "entretiempo"
                        ? "Entretiempo"
                        : "Arranca el 2º tiempo"}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 grid gap-2">
        <Button className="h-14" onClick={() => setModo(modo === "gol" ? null : "gol")}>
          Gol nuestro
        </Button>
        <Button variant="secondary" className="h-14" onClick={() => {
          if (anotarEnCancha(event.id, "gol-rival")) setAviso("Gol de ellos.");
        }}>
          Gol de ellos
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-14" onClick={() => setModo(modo === "amarilla" ? null : "amarilla")}>
            🟨 Amarilla
          </Button>
          <Button variant="outline" className="h-14" onClick={() => setModo(modo === "roja" ? null : "roja")}>
            🟥 Roja
          </Button>
        </div>
        <Button variant="outline" className="h-12" onClick={() => anotarEnCancha(event.id, "inicio")}>
          Pitazo inicial
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="h-12" onClick={() => anotarEnCancha(event.id, "entretiempo")}>
            Entretiempo
          </Button>
          <Button variant="ghost" className="h-12" onClick={() => anotarEnCancha(event.id, "segundo")}>
            Arranca 2º tiempo
          </Button>
        </div>
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
  const sheet = sheetFor(event.id, sheets);
  if (!sheet || !club) return null;
  const candidatos = candidatosFigura(event, members).filter((person) => person.id !== me.id);
  const mio = (votes ?? []).find((row) => row.eventId === event.id && row.voterId === me.id);
  const figura = figuraDe(votes, event.id);
  const byId = new Map(members.map((person) => [person.id, person]));
  const cerrada = estadoFigura(event, votes ?? [], Date.now()) !== "abierta";

  return (
    <section id="votar" className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Figura del partido</p>
      {figura ? (
        <p className="mt-1 text-sm">
          {figura.ids.map((id) => byId.get(id)?.nick ?? "Jugador").join(" y ")} · {figura.votos}{" "}
          {figura.votos === 1 ? "voto" : "votos"}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Todavía no votó nadie.</p>
      )}
      {cerrada ? <p className="mt-2 text-sm text-muted">Votación cerrada</p> : null}
      <ul className="mt-3 space-y-1">
        {candidatos.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              disabled={cerrada}
              className={`h-12 w-full rounded-md px-3 text-left text-sm font-semibold disabled:opacity-50 ${
                mio?.pickId === person.id ? "bg-accent text-accent-fg" : "bg-bg"
              }`}
              onClick={() => voteFigura(event.id, person.id)}
            >
              {personLabel(person, candidatos)}
            </button>
          </li>
        ))}
      </ul>
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
