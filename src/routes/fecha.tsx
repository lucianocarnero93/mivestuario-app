import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EnCancha, FiguraPartido, ParaLaFamilia } from "@/components/fija/partido";
import { PremiosFecha } from "@/components/fija/premios-fecha";
import { useContextoPremios } from "@/components/fija/use-premios";
import { PlayerAvatar } from "@/components/fija/stat-blocks";
import { Button } from "@/components/ui/button";
import { enJuego, estaJugado, fechaVisible, momentoFecha, rachaInvicto, rachaVoy } from "@/lib/fija/fecha";
import { formatWhen, plural } from "@/lib/fija/format";
import { FIGURA_CIERRE_HORAS, mesDe, votacionAbierta } from "@/lib/fija/figura";
import { etiquetaPremio, mesAnterior, nombreMes, premiosDelMes, premiosDelPartido } from "@/lib/fija/premios";
import { resumenSemana, validarPlanilla } from "@/lib/fija/vista";
import { caja, logo, png, recortar } from "@/lib/fija/lienzo";
import { PremioMini } from "@/components/fija/premio-card";
import { alumniMember } from "@/lib/fija/stats";
import { resultIsOpen } from "@/lib/fija/club-rules";
import { leerFamilia } from "@/lib/fija/familia";
import { reaccionId } from "@/lib/fija/vivo";
import { sheetFor, useFija, useIsStaff, useMe } from "@/lib/fija/store";
import type { ClubEvent, ReaccionFecha } from "@/lib/fija/types";

export const Route = createFileRoute("/fecha")({
  component: FechaPage,
  validateSearch: (search: Record<string, unknown>) => ({
    partido: typeof search.partido === "string" ? search.partido : undefined,
  }),
});

const EMOJIS: { id: ReaccionFecha["emoji"]; label: string }[] = [
  { id: "fuego", label: "🔥" },
  { id: "aplauso", label: "👏" },
  { id: "risa", label: "😂" },
];

function FechaPage() {
  const { partido } = Route.useSearch();
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const staff = useIsStaff();
  const me = useMe();
  const members = useFija((s) => s.members);
  const elegido = events.find((event) => event.id === partido && event.kind === "partido");
  const actual = elegido ?? fechaVisible(events, undefined, staff);
  const momento = momentoFecha(events.filter((event) => !event.fechaOculta || staff));
  const resumen = resumenSemana(events, sheets, (id) => members.find((person) => person.id === id)?.nick ?? "Alguien");
  const ctx = useContextoPremios();
  const mes = mesAnterior(mesDe(new Date().toISOString()));
  const delMes = premiosDelMes(mes, ctx).filter((premio) => premio.memberId === me.id);

  return (
    <main className="px-4 py-5">
      <h1 className="text-2xl font-semibold">Fecha</h1>
      <p className="mt-1 text-sm text-muted">
        {momento === "antes"
          ? "Cada fecha tiene su figura. Ahora tiene card."
          : momento === "en_juego"
            ? "El partido está en juego."
            : momento === "despues"
              ? "Votá la figura. Decide el plantel."
              : "El partido. Sin chat."}
      </p>
      {actual ? <FechaViva key={actual.id} event={actual} /> : <p className="mt-4 text-sm text-muted">No hay un partido para mostrar.</p>}
      {delMes.map((premio) => (
        <Sobre key={premio.id} premioId={premio.id} premio={premio} ctx={ctx} titulo={`Premios de ${nombreMes(mes)}. Abrí el sobre.`} />
      ))}
      <Resumen resumen={resumen} staff={staff} />
      <Historial actualId={actual?.id} staff={staff} />
    </main>
  );
}

function FechaViva({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const me = useMe();
  const members = useFija((s) => s.members);
  const sheets = useFija((s) => s.matchSheets);
  const rsvps = useFija((s) => s.rsvps);
  const markMatchResult = useFija((s) => s.markMatchResult);
  const reaccionarFecha = useFija((s) => s.reaccionarFecha);
  const flushCloud = useFija((s) => s.flushCloud);
  const teamToken = useFija((s) => s.club?.teamLiveToken ?? "");
  const [familias, setFamilias] = useState(0);
  const [nota, setNota] = useState("");
  const votes = useFija((s) => s.figuraVotes);
  const ctx = useContextoPremios();
  const sheet = sheetFor(event.id, sheets);
  const cerrado = Boolean(event.resultClosedAt);
  const vivo = enJuego(event);
  const falta = !cerrado && !vivo && Date.parse(event.startsAt) <= Date.now();
  const byId = new Map(members.map((person) => [person.id, person]));
  const goleadores = (sheet?.players ?? [])
    .filter((row) => row.goals > 0)
    .map((row) => `${byId.get(row.memberId)?.nick ?? "Jugador"} ${row.goals}`)
    .join(", ");
  const mia = event.reacciones?.find((item) => item.memberId === me.id);
  const racha = rachaVoy(useFija.getState().events, rsvps, me.id, sheets);
  const votacion = cerrado && votacionAbierta(event, Date.now());
  const yaVote = (votes ?? []).some((row) => row.eventId === event.id && row.voterId === me.id);
  const cierraEn = event.resultClosedAt
    ? Math.max(0, Math.ceil((Date.parse(event.resultClosedAt) + FIGURA_CIERRE_HORAS * 3_600_000 - Date.now()) / 3_600_000))
    : 0;
  const confirmados = rsvps.filter((row) => row.eventId === event.id && row.status === "voy").length;
  const duda = rsvps.filter((row) => row.eventId === event.id && row.status !== "voy" && row.status !== "no").length;
  const premiosMios = premiosDelPartido(event.id, ctx).filter((premio) => premio.memberId === me.id && premio.tipo === "figura");

  useEffect(() => {
    const id = teamToken ? reaccionId("equipo", teamToken, event.id) : event.liveToken || "";
    if (!id) return;
    void leerFamilia({ data: id }).then((result) => setFamilias(result.n)).catch(() => setFamilias(0));
  }, [teamToken, event.id, event.liveToken, event.resultClosedAt]);
  useEffect(() => {
    if (window.location.hash !== "#votar") return;
    document.getElementById("votar")?.scrollIntoView({ block: "start" });
  }, [event.id, cerrado]);
  const invicto = rachaInvicto(sheets, useFija.getState().events);

  return (
    <section className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {cerrado ? "Final" : vivo ? "En juego" : falta ? "Falta resultado" : "Próximo"}
      </p>
      <h2 className="mt-1 text-3xl font-semibold">{event.title}</h2>
      <p className="text-sm text-muted">{formatWhen(event.startsAt)}</p>
      <p className="text-sm text-muted">
        {event.place || "Sin cancha"}
        {!cerrado && !vivo ? ` · ${confirmados} van · ${duda} en duda` : ""}
        {racha > 1 ? ` · Fuiste a los últimos ${racha}` : ""}
        {invicto > 1 ? ` · ${plural(invicto, "partido seguido sin perder", "partidos seguidos sin perder")}` : ""}
        {familias > 0 && staff ? ` · ${familias} familias` : ""}
      </p>
      {sheet ? (
        <p className="mt-3 text-6xl font-semibold tracking-tight">
          {sheet.goalsFor}–{sheet.goalsAgainst}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Todavía no hay marcador.</p>
      )}
      {goleadores ? <p className="mt-2 text-sm">Goles: {goleadores}</p> : null}
      {staff && !cerrado ? (
        <Button asChild className="mt-3 h-14 w-full">
          <Link to="/stats" search={{ partido: event.id, torneo: event.tournamentId ?? "general" }}>
            {sheet ? "Ver planilla" : "Cargar planilla"}
          </Link>
        </Button>
      ) : null}
      {staff && !cerrado && vivo ? <EnCancha event={event} /> : null}
      {staff && !cerrado && !vivo && Date.parse(event.startsAt) > Date.now() ? (
        <Button
          className="mt-3 h-14 w-full"
          onClick={() => setNota("Cuando llegue el horario, acá se anotan los goles.")}
        >
          Empezar en vivo
        </Button>
      ) : null}
      {staff ? <ParaLaFamilia event={event} /> : null}
      {!cerrado && event.lineupPublishedAt ? (
        <Button asChild variant="outline" className="mt-3 h-12 w-full">
          <Link to="/cancha">Ver formación</Link>
        </Button>
      ) : null}
      <div className="mt-3 grid gap-2">
        {staff && !cerrado && resultIsOpen(event.startsAt) && sheet ? (
          <Button
            className="h-14"
            onClick={() => {
              const ok = markMatchResult(event.id, true);
              if (!ok) {
                setNota("El partido tiene que haber empezado y tener planilla.");
                return;
              }
              void flushCloud();
              setNota("Partido terminado. La familia ve el final si el link sigue abierto.");
            }}
          >
            Terminar partido
          </Button>
        ) : null}
        {staff ? (
          <Button asChild variant="secondary" className="h-12">
            <Link to="/cancha">Indicaciones en la pizarra</Link>
          </Button>
        ) : null}
      </div>
      {votacion ? (
        <div className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-lg font-semibold">{yaVote ? `Ya votaste · Cierra en ${cierraEn} h` : "Votá la figura"}</p>
          <p className="mt-1 text-sm text-muted">Si no lo votaron, no es figura.</p>
          <Button
            variant="outline"
            className="mt-3 h-12 w-full"
            onClick={() => {
              const link = `${window.location.origin}/fecha?partido=${event.id}#votar`;
              window.open(`https://wa.me/?text=${encodeURIComponent(`Votá la figura de anoche 👉 ${link}`)}`, "_blank", "noopener,noreferrer");
            }}
          >
            Mandar a WhatsApp
          </Button>
        </div>
      ) : null}
      {cerrado ? <FiguraPartido event={event} /> : null}
      {premiosMios[0] ? <Sobre premioId={premiosMios[0].id} premio={premiosMios[0]} ctx={ctx} titulo="La figura ya está. Abrí el sobre." /> : null}
      {estaJugado(event, sheet) ? <PremiosFecha event={event} /> : null}
      <div className="mt-4 flex gap-2">
        {EMOJIS.map((emoji) => {
          const cuenta = event.reacciones?.filter((item) => item.emoji === emoji.id).length ?? 0;
          return (
            <button
              key={emoji.id}
              type="button"
              className={`h-12 flex-1 rounded-md text-sm font-semibold ${mia?.emoji === emoji.id ? "bg-accent text-accent-fg" : "bg-surface"}`}
              onClick={() => reaccionarFecha(event.id, emoji.id)}
            >
              {emoji.label} {cuenta || ""}
            </button>
          );
        })}
      </div>
      {nota ? <p className="mt-2 text-sm text-accent">{nota}</p> : null}
    </section>
  );
}

function Historial({ actualId, staff }: { actualId?: string; staff: boolean }) {
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const members = useFija((s) => s.members);
  const ocultarFecha = useFija((s) => s.ocultarFecha);
  const ctx = useContextoPremios();
  const pasados = events
    .filter((event) => event.kind === "partido" && event.id !== actualId && (staff || !event.fechaOculta))
    .filter((event) => event.resultClosedAt || (!enJuego(event) && Date.parse(event.startsAt) < Date.now()))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  if (pasados.length === 0) {
    return <p className="mt-8 text-sm text-muted">Todavía no hay fechas. Cuando carguen el primer resultado, aparece acá.</p>;
  }
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Fechas</h2>
      <ul className="mt-3 space-y-3">
        {pasados.map((event) => {
          const sheet = sheetFor(event.id, sheets);
          const planilla = sheet ? validarPlanilla(sheet) : null;
          const goles = (sheet?.players ?? [])
            .filter((row) => row.goals > 0)
            .map((row) => members.find((person) => person.id === row.memberId)?.nick ?? "Jugador");
          const premios = event.resultClosedAt ? premiosDelPartido(event.id, ctx) : [];
          const rival = sheet?.opponent.trim();
          const verbo = !sheet ? "Sin cargar" : sheet.goalsFor > sheet.goalsAgainst ? "Ganado" : sheet.goalsFor < sheet.goalsAgainst ? "Perdido" : "Empate";
          return (
            <li key={event.id} className="rounded-xl bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <Link to="/fecha" search={{ partido: event.id }} className="min-w-0 flex-1">
                  <p className="text-lg font-semibold">
                    {sheet && event.resultClosedAt ? `${verbo} ${sheet.goalsFor}–${sheet.goalsAgainst}${rival ? ` vs ${rival}` : ""}` : event.resultClosedAt ? event.title : "Falta resultado"}
                  </p>
                  <p className="text-sm text-muted">{formatWhen(event.startsAt)} · {event.title}</p>
                  {goles.length > 0 ? <p className="mt-1 text-sm text-muted">{goles.join(", ")}</p> : null}
                  {staff && planilla && planilla.faltan > 0 ? <p className="mt-1 text-sm text-warning">Faltan {planilla.faltan} goleadores · Completar</p> : null}
                </Link>
                {staff ? (
                  <details className="shrink-0">
                    <summary className="grid size-11 cursor-pointer list-none place-items-center text-lg">⋯</summary>
                    <button type="button" className="mt-1 h-11 text-sm font-semibold" onClick={() => { if (window.confirm(event.fechaOculta ? "¿Mostrar esta fecha?" : "¿Ocultar esta fecha?")) ocultarFecha(event.id, !event.fechaOculta); }}>
                      {event.fechaOculta ? "Mostrar fecha" : "Ocultar fecha"}
                    </button>
                  </details>
                ) : null}
              </div>
              {premios.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {premios.map((premio) => {
                    const person = members.find((item) => item.id === premio.memberId) ?? alumniMember(ctx.alumni, premio.memberId);
                    return (
                      <span key={premio.id} className="inline-flex items-center gap-1 rounded-full bg-bg py-1 pr-2 pl-1 text-xs font-semibold">
                        <PlayerAvatar name={person.menor ? person.nick : person.name} photo={person.menor ? null : person.photo} />
                        {etiquetaPremio(premio.tipo)} · {premio.nombre}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Resumen({ resumen, staff }: { resumen: ReturnType<typeof resumenSemana>; staff: boolean }) {
  const [nota, setNota] = useState("");
  async function compartir() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1c12";
    ctx.fillRect(0, 0, 1080, 1920);
    logo(ctx, 80, 120, 72);
    ctx.fillStyle = "#b8f25a";
    ctx.font = "700 64px sans-serif";
    ctx.fillText(recortar(ctx, resumen.titulo, 860), 180, 175);
    ctx.fillStyle = "#eef6ef";
    ctx.font = "600 42px sans-serif";
    resumen.partidos.slice(0, 8).forEach((partido, index) => {
      caja(ctx, 80, 280 + index * 140, 920, 120, 24);
      ctx.fillStyle = "#123222";
      ctx.fill();
      ctx.fillStyle = "#eef6ef";
      ctx.fillText(recortar(ctx, partido.resultado, 860), 110, 355 + index * 140);
    });
    ctx.fillStyle = "#b8f25a";
    ctx.font = "600 32px sans-serif";
    ctx.fillText("¿Tu equipo no tiene cards? mivestuario.com.ar", 80, 1800);
    const blob = await png(ctx);
    const file = new File([blob], "resumen.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: resumen.titulo }).catch(() => undefined);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resumen.png";
    link.click();
    URL.revokeObjectURL(url);
    setNota("Imagen guardada.");
  }
  return (
    <section className="mt-8 rounded-xl bg-surface p-4 shadow-card">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{resumen.titulo}</h2>
      {resumen.partidos.length === 0 ? <p className="mt-2 text-sm text-muted">Esta semana no hubo partidos cerrados.</p> : null}
      <ul className="mt-2 space-y-2 text-sm">
        {resumen.partidos.map((partido) => (
          <li key={partido.id}>
            {partido.resultado}
            {partido.goleador ? ` · gol de ${partido.goleador}` : ""}
          </li>
        ))}
      </ul>
      {staff ? <Button variant="outline" className="mt-3 h-12 w-full" onClick={() => void compartir()}>Compartir resumen</Button> : null}
      {nota ? <p className="mt-2 text-sm text-accent">{nota}</p> : null}
    </section>
  );
}

function Sobre({
  premioId,
  premio,
  ctx,
  titulo,
}: {
  premioId: string;
  premio: Parameters<typeof PremioMini>[0]["premio"];
  ctx: Parameters<typeof PremioMini>[0]["ctx"];
  titulo: string;
}) {
  const clave = `mv-sobre:${premioId}`;
  const [abierto, setAbierto] = useState(() => {
    try {
      return localStorage.getItem(clave) === "1";
    } catch {
      return false;
    }
  });
  const [recien, setRecien] = useState(false);
  const [animando, setAnimando] = useState(false);
  if (abierto) return <div className="mt-4"><PremioMini premio={premio} ctx={ctx} abrir={recien} /></div>;
  return (
    <button
      type="button"
      className="mt-4 w-full rounded-xl bg-surface p-6 text-left shadow-card"
      style={animando ? { animation: "mv-sobre .9s ease" } : undefined}
      onClick={() => {
        const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setAnimando(!reducido);
        window.setTimeout(() => {
          try {
            localStorage.setItem(clave, "1");
          } catch {
            // Si el celular no guarda, el sobre igual se abre.
          }
          setRecien(true);
          setAbierto(true);
        }, reducido ? 0 : 900);
      }}
    >
      <p className="text-lg font-semibold">{titulo}</p>
      <p className="mt-1 text-sm text-muted">La card que te ganaste en la cancha.</p>
    </button>
  );
}

