// Pizarra: el DT y el ayudante arman la formación del partido.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Historias } from "@/components/fija/historias";
import { Pitch } from "@/components/fija/pitch";
import { SquadPanel } from "@/components/fija/squad-panel";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FORMATIONS, MODALITY_LABEL, MODALITY_SHORT, MODALITIES } from "@/lib/fija/formations";
import { formatWhen, personLabel } from "@/lib/fija/format";
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
  const setRival = useFija((s) => s.setRival);
  const setNota = useFija((s) => s.setNota);
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
  const [note, setNote] = useState<string | null>(null);
  const [historia, setHistoria] = useState(0);
  const historiaDe = event?.id ?? "";
  useEffect(() => {
    setHistoria(0);
  }, [historiaDe]);
   const players = members.filter((m) => m.juega ?? m.role === "jugador");
  const used = useMemo(() => new Set(Object.values(event?.lineup ?? {})), [event]);
  const filled = Object.keys(event?.lineup ?? {}).length;
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

  const forma = FORMATIONS[event.modality].find((item) => item.id === event.formacion) ?? FORMATIONS[event.modality][0];
  const titulares = forma.slots.map((item) => event.lineup[item.key]).filter((id): id is string => Boolean(id));
  const enCancha = [...titulares, ...(event.suplentes ?? []).filter((id) => !titulares.includes(id))];

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

      {staff || event.lineupPublishedAt ? (
        <Historias
          pagina={historia}
          titulos={["Formación", "El partido", "Para cada uno"]}
          onPagina={setHistoria}
        >
          {historia === 0 ? (
            <div>
              {staff ? (
                <Segmented
                  className="mt-1"
                  value={event.modality}
                  onChange={cambiarModalidad}
                  options={MODALITIES.map((id) => ({ id, label: MODALITY_SHORT[id] }))}
                />
              ) : (
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  {MODALITY_LABEL[event.modality]}
                </p>
              )}
              {staff ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {FORMATIONS[event.modality].map((item) => {
                    const activa = forma.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => cambiarFormacion(item.id)}
                        className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${
                          activa ? "bg-accent text-accent-fg" : "bg-bg text-muted"
                        }`}
                      >
                        {item.name}
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
              <div className="mt-3">
                <Pitch
                  modality={event.modality}
                  formacionId={event.formacion}
                  lineup={event.lineup}
                  members={members}
                  editable={staff}
                  onSlot={staff ? setSlot : undefined}
                />
              </div>
              {staff ? (
                <p className="mt-2 text-center text-xs text-muted">Tocá un puesto para poner o sacar a alguien.</p>
              ) : null}
            </div>
          ) : null}
          {historia === 1 ? (
            <div className="whiteboard rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#3d5c49]">Ellos</p>
              {staff ? (
                <Textarea
                  className="mt-2 min-h-20 border-[#d7d1c4] bg-white text-[#1c2b22] placeholder:text-[#1c2b22]/40"
                  rows={3}
                  maxLength={180}
                  value={event.rival ?? ""}
                  onChange={(e) => setRival(event.id, e.target.value)}
                  placeholder="Cómo juega el que viene."
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm">{event.rival || "Sin notas del rival."}</p>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#3d5c49]">Cómo jugamos</p>
              {staff ? (
                <Textarea
                  className="mt-2 min-h-20 border-[#d7d1c4] bg-white text-[#1c2b22] placeholder:text-[#1c2b22]/40"
                  rows={3}
                  maxLength={180}
                  value={event.tactics}
                  onChange={(e) => setTactics(event.id, e.target.value)}
                  placeholder="Tres líneas para todo el equipo."
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {event.tactics || "El DT todavía no escribió la pauta."}
                </p>
              )}
            </div>
          ) : null}
          {historia === 2 ? (
            <div>
              <p className="text-sm text-muted">Lo lee todo el equipo.</p>
              {enCancha.length === 0 ? (
                <p className="mt-3 text-sm">Primero hay que armar la formación.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {enCancha.map((id) => {
                    const person = members.find((item) => item.id === id);
                    if (!person) return null;
                    return (
                      <li key={id}>
                        <p className="text-sm font-semibold">
                          {personLabel(person, members)}
                          {id === me?.id ? " · vos" : ""}
                        </p>
                        {staff ? (
                          <input
                            className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
                            maxLength={80}
                            value={event.notas?.[id] ?? ""}
                            placeholder="Una frase para este jugador"
                            onChange={(e) => setNota(event.id, id, e.target.value)}
                          />
                        ) : (
                          <p className="text-sm text-muted">{event.notas?.[id] || "Sin indicación."}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </Historias>
      ) : (
        <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">
          El DT todavía no publicó la formación.
        </p>
      )}

      {note ? <p className="mt-3 text-center text-sm font-semibold text-accent">{note}</p> : null}
      {staff ? (
        <Button
          className="mt-3 h-14 w-full text-base"
          disabled={filled === 0}
          onClick={() => {
            publishLineup(event.id);
            setNote("Publicado. El plantel ya puede ver la pizarra.");
          }}
        >
          {event.lineupPublishedAt ? "Actualizar formación y avisar" : "Publicar formación"}
        </Button>
      ) : null}
      {event.lineupPublishedAt && !staff ? (
        <p className="mt-2 text-center text-xs text-muted">Formación publicada. Deslizá para ver el partido y las indicaciones.</p>
      ) : null}
      {staff || event.lineupPublishedAt ? <SquadPanel event={event} staff={staff} onNotice={setNote} /> : null}

      <Dialog open={slot != null} onOpenChange={(o) => !o && setSlot(null)}>
        <DialogContent title="Elegí jugador">
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
        </DialogContent>
      </Dialog>
    </main>
  );
}
