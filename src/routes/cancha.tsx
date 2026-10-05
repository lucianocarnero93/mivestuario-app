// Pizarra: el DT y el ayudante arman la formación del partido.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Chalkboard } from "@/components/fija/chalkboard";
import { Pitch } from "@/components/fija/pitch";
import { SquadPanel } from "@/components/fija/squad-panel";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FORMATIONS, MODALITY_LABEL, MODALITY_SHORT, MODALITIES } from "@/lib/fija/formations";
import { formatWhen, personLabel } from "@/lib/fija/format";
import { ETIQUETAS, leyendaDe } from "@/lib/fija/pizarra";
import { compartirPizarra } from "@/lib/fija/pizarra-imagen";
import { matchSettled, nextEvent, sheetFor, useFija, useIsStaff } from "@/lib/fija/store";
import type { Modality } from "@/lib/fija/types";

export const Route = createFileRoute("/cancha")({ component: CanchaPage });

function CanchaPage() {
  const staff = useIsStaff();
  const events = useFija((s) => s.events);
  const tournaments = useFija((s) => s.tournaments);
  const sheets = useFija((s) => s.matchSheets);
  const members = useFija((s) => s.members);
  const setSpot = useFija((s) => s.setSpot);
  const setBoardShape = useFija((s) => s.setBoardShape);
  const setTactics = useFija((s) => s.setTactics);
  const setIndicacion = useFija((s) => s.setIndicacion);
  const setRival = useFija((s) => s.setRival);
  const rsvps = useFija((s) => s.rsvps);
  const publishLineup = useFija((s) => s.publishLineup);
    const setJuega = useFija((s) => s.setJuega);
  const me = useFija((s) => s.members.find((m) => m.id === s.activeId));
  const matchEvents = events
    .filter((event) => event.kind === "partido")
    .filter((event) => {
      const closed = tournaments.some(
        (tournament) => tournament.id === event.tournamentId && tournament.status === "finished",
      );
      if (!closed) return true;
      return !matchSettled(event, sheetFor(event.id, sheets));
    })
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const fallback = nextEvent(matchEvents, { tournaments, sheets }) ?? matchEvents[matchEvents.length - 1];
  const [eventId, setEventId] = useState(fallback?.id ?? "");
  const event = matchEvents.find((e) => e.id === eventId) ?? fallback;
  const [slot, setSlot] = useState<string | null>(null);
  const [cambiar, setCambiar] = useState(false);
  const [frase, setFrase] = useState("");
  const [rivalDraft, setRivalDraft] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
   const players = members.filter((m) => m.juega ?? m.role === "jugador");
  const ocupanteId = slot && event ? event.lineup[slot] : undefined;
  useEffect(() => {
    setFrase(event?.indicaciones?.[ocupanteId ?? ""]?.nota ?? "");
    setCambiar(false);
  }, [slot, ocupanteId, event?.id]);
  const filled = Object.keys(event?.lineup ?? {}).length;
  const used = useMemo(() => new Set(Object.values(event?.lineup ?? {})), [event]);
  const leyenda = leyendaDe(
    event?.indicaciones,
    [...Object.values(event?.lineup ?? {}), ...(event?.suplentes ?? [])],
    members,
  );
  useEffect(() => {
    setRivalDraft(null);
  }, [event?.id]);
  function cambiarFormacion(nuevaId: string) {
    if (!event) return;
    const actual = event.formacion ?? FORMATIONS[event.modality][0].id;
    if (actual === nuevaId) return;
    setNote(setBoardShape(event.id, event.modality, nuevaId));
  }

  function cambiarModalidad(modality: Modality) {
    if (!event || event.modality === modality) return;
    setNote(setBoardShape(event.id, modality, FORMATIONS[modality][0].id));
  }

  if (!event) {
    return (
      <main className="px-4 py-6">
        <h1 className="text-3xl font-semibold">Sin pizarra</h1>
        <p className="mt-2 text-sm text-muted">
          Agendá un partido para armar la formación. También entran los amistosos.
        </p>
      </main>
    );
  }

  return (
    <main className="px-4 py-5">
      <h1 className="text-3xl font-semibold">Pizarra</h1>
      <p className="text-sm text-muted">{formatWhen(event.startsAt)}</p>

      {matchEvents.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {matchEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEventId(e.id)}
              className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${
                e.id === event.id ? "bg-accent text-accent-fg" : "bg-surface text-muted"
              }`}
            >
              {e.title}
            </button>
          ))}
        </div>
      ) : null}

      {staff ? (
        <Segmented
          className="mt-3"
          value={event.modality}
          onChange={cambiarModalidad}
          options={MODALITIES.map((id) => ({
            id,
            label: MODALITY_SHORT[id],
          }))}
        />
      ) : (
        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent">
          {MODALITY_LABEL[event.modality]}
        </p>
      )}
            {staff ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {FORMATIONS[event.modality].map((f) => {
            const activa = (event.formacion ?? FORMATIONS[event.modality][0].id) === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => cambiarFormacion(f.id)}
                className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${
                  activa ? "bg-accent text-accent-fg" : "bg-surface text-muted"
                }`}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {staff && me ? (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="size-5 accent-accent"
            checked={me.juega ?? false}
            onChange={(e) => setJuega(me.id, e.target.checked)}
          />
          Jugar yo también
        </label>
      ) : null}

      <div className="contents desk:mt-4 desk:grid desk:grid-cols-[minmax(0,0.9fr)_minmax(280px,1fr)] desk:items-start desk:gap-6">
      <div className="mt-4 desk:sticky desk:top-4 desk:rounded-3xl desk:bg-bg/80 desk:p-3">
        {staff || event.lineupPublishedAt ? (
          <Pitch
            modality={event.modality}
            formacionId={event.formacion}
            lineup={event.lineup}
            members={members}
            editable={staff}
            marked={new Set(Object.keys(event.indicaciones ?? {}))}
            onSlot={staff || event.lineupPublishedAt ? setSlot : undefined}
          />
        ) : (
          <p className="rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">
            El DT todavía no publicó la formación.
          </p>
        )}
        {staff ? (
          <p className="mt-2 text-center text-xs text-muted">
            Tocá un puesto para elegir jugador o dejarle una indicación.
          </p>
        ) : event.lineupPublishedAt ? (
          <p className="mt-2 text-center text-xs text-muted">El punto amarillo es una indicación. Tocalo para leerla.</p>
        ) : null}
      </div>
      <div className="desk:sticky desk:top-4">
      {note ? <p className="mt-3 text-center text-sm font-semibold text-accent desk:mt-0">{note}</p> : null}
      {staff ? (
        <Button
          className="mt-3 h-14 w-full text-base desk:mt-0"
          disabled={filled === 0}
          onClick={() => {
            publishLineup(event.id);
            setNote("Publicado. El plantel ya puede ver la formación.");
          }}
        >
          {event.lineupPublishedAt ? "Actualizar formación y avisar" : "Publicar formación"}
        </Button>
      ) : null}
      {event.lineupPublishedAt && !staff ? (
        <p className="mt-2 text-center text-xs text-muted">Formación publicada.</p>
      ) : null}
      {staff || event.lineupPublishedAt ? <SquadPanel event={event} staff={staff} onNotice={setNote} /> : null}
      </div>
      </div>

      {staff ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Ellos</p>
          <Textarea
            className="mt-2 min-h-20"
            rows={3}
            maxLength={180}
            value={rivalDraft ?? event.rival ?? ""}
            onChange={(e) => setRivalDraft(e.target.value)}
            onBlur={() => {
              if (rivalDraft != null) setRival(event.id, rivalDraft);
            }}
            placeholder="Cómo juega el que viene. Tres líneas."
          />
        </section>
      ) : event.lineupPublishedAt && event.rival ? (
        <Chalkboard title="Ellos" className="mt-4">
          {event.rival}
        </Chalkboard>
      ) : null}

      {staff ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Pauta del equipo</p>
          <Textarea
            className="mt-2 min-h-20"
            rows={3}
            maxLength={180}
            value={event.tactics}
            onChange={(e) => setTactics(event.id, e.target.value)}
            placeholder="Tres líneas. Cómo salimos, a quién marcar, qué no hacer."
          />
        </section>
      ) : event.lineupPublishedAt ? (
        <Chalkboard title="Pauta del DT" className="mt-4">
          {event.tactics || "El DT todavía no dejó una pauta."}
        </Chalkboard>
      ) : null}

      {(staff || event.lineupPublishedAt) && leyenda.length > 0 ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Indicaciones</p>
          <ul className="mt-2 space-y-2">
            {leyenda.map((item) => (
              <li key={item.id} className={item.id === me?.id ? "text-accent" : ""}>
                <p className="text-sm font-semibold">
                  {item.nick}
                  {item.etiqueta ? ` · ${item.etiqueta}` : ""}
                </p>
                {item.nota ? <p className="text-sm text-muted">{item.nota}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {staff || event.lineupPublishedAt ? (
        <Button
          variant="outline"
          className="mt-3 h-12 w-full"
          onClick={() => {
            const list = FORMATIONS[event.modality];
            const slots = (list.find((item) => item.id === event.formacion) ?? list[0]).slots;
            const puestos = slots
              .map((item) => {
                const id = event.lineup[item.key];
                const person = members.find((member) => member.id === id);
                if (!person) return null;
                return {
                  x: item.x,
                  y: item.y,
                  nick: person.nick || person.name,
                  etiqueta: event.indicaciones?.[id]?.etiqueta ?? "",
                };
              })
              .filter((item): item is { x: number; y: number; nick: string; etiqueta: string } => Boolean(item));
            void compartirPizarra({
              title: event.title,
              rival: event.rival ?? "",
              pauta: event.tactics,
              puestos,
            })
              .then((mode) => setNote(mode === "shared" ? "Pizarra lista para mandar." : "Imagen guardada en el celular."))
              .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === "AbortError") return;
                setNote("No se pudo armar la imagen.");
              });
          }}
        >
          Compartir pizarra
        </Button>
      ) : null}

      <Dialog open={slot != null} onOpenChange={(o) => !o && setSlot(null)}>
        <DialogContent title={ocupanteId ? "Indicación" : "Elegí jugador"}>
          {ocupanteId ? (
            <div className="mb-4">
              <p className="text-sm font-semibold">
                {members.find((person) => person.id === ocupanteId)?.nick}
              </p>
              {staff ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ETIQUETAS.map((etiqueta) => {
                      const activa = event.indicaciones?.[ocupanteId]?.etiqueta === etiqueta;
                      return (
                        <button
                          key={etiqueta}
                          type="button"
                          className={`h-11 rounded-md px-3 text-xs font-semibold ${
                            activa ? "bg-accent text-accent-fg" : "bg-bg text-muted"
                          }`}
                          onClick={() => setIndicacion(event.id, ocupanteId, activa ? "" : etiqueta, frase)}
                        >
                          {etiqueta}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    className="mt-3 min-h-16"
                    maxLength={80}
                    value={frase}
                    onChange={(e) => setFrase(e.target.value)}
                    onBlur={() =>
                      setIndicacion(event.id, ocupanteId, event.indicaciones?.[ocupanteId]?.etiqueta ?? "", frase)
                    }
                    placeholder="Una línea más, si hace falta."
                  />
                  <Button variant="ghost" className="mt-2 h-11 px-0" onClick={() => setCambiar((open) => !open)}>
                    {cambiar ? "Ocultar jugadores" : "Cambiar jugador"}
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm">
                  {[event.indicaciones?.[ocupanteId]?.etiqueta, event.indicaciones?.[ocupanteId]?.nota]
                    .filter(Boolean)
                    .join(". ") || "El DT no le dejó una indicación."}
                </p>
              )}
            </div>
          ) : null}
          {staff && (!ocupanteId || cambiar) ? (
          <ul className="max-h-80 space-y-1 overflow-auto">
            {slot ? (
              <li>
                <Button
                  variant="ghost"
                  className="h-12 w-full justify-start"
                  onClick={() => {
                    if (!staff || !slot) return;
                    setNote(setSpot(event.id, slot, null));
                    setSlot(null);
                  }}
                >
                  Dejar vacío
                </Button>
              </li>
            ) : null}
            <li className="px-3 py-2 text-sm text-muted">
              Entran los convocados que no dijeron que no van. Si todavía no contestaron, podés ponerlos igual.
            </li>
            {players
              .filter((p) => {
                const llamado = event.convocados ? event.convocados.includes(p.id) : true;
                const noVa = rsvps.some(
                  (row) => row.eventId === event.id && row.memberId === p.id && row.status === "no",
                );
                return llamado && !noVa;
              })
              .map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-md px-3 text-sm hover:bg-surface-2"
                  onClick={() => {
                    if (!staff || !slot) return;
                    setNote(setSpot(event.id, slot, p.id));
                    setSlot(null);
                  }}
                >
                  <span>
                    {personLabel(p, players)}
                  </span>
                  <span className="text-xs text-muted">{used.has(p.id) ? "en cancha" : p.name.split(" ")[1]}</span>
                </button>
              </li>
            ))}
          </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
