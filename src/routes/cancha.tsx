// Pizarra: el DT y el ayudante arman la formación del partido.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pitch } from "@/components/fija/pitch";
import { SquadPanel } from "@/components/fija/squad-panel";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FORMATIONS, MODALITY_LABEL, MODALITY_SHORT, MODALITIES } from "@/lib/fija/formations";
import { formatTime, formatWhen, personLabel } from "@/lib/fija/format";
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
        <section className="vestuario-board relative mt-4 overflow-hidden rounded-3xl p-3">
          <span className="vestuario-corners" aria-hidden />
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-line">Vestuario</p>
            <p className="font-semibold tabular-nums tracking-widest text-accent">{formatTime(event.startsAt)}</p>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-lg font-semibold leading-tight text-line">{event.title}</p>
              <p className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
                <span className="vestuario-led" aria-hidden />
                {event.lineupPublishedAt ? "En la pared" : "Armando"}
              </p>
            </div>
            <p className="text-right leading-none text-line">
              <span className="text-3xl font-semibold tabular-nums">{filled}</span>
              <span className="text-sm text-line/60">/{forma.slots.length}</span>
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <p className="rounded-lg border border-line/20 bg-black/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-line">
              {MODALITY_SHORT[event.modality]}
              <span className="mt-1 block text-sm normal-case tracking-normal text-accent">{MODALITY_LABEL[event.modality]}</span>
            </p>
            <p className="rounded-lg border border-line/20 bg-black/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-line">
              Sistema
              <span className="mt-1 block text-sm normal-case tracking-normal text-accent">{forma.name}</span>
            </p>
          </div>
          <div className="mt-3">
              {staff ? (
                <Segmented
                  className="mt-1"
                  value={event.modality}
                  onChange={cambiarModalidad}
                  options={MODALITIES.map((id) => ({ id, label: MODALITY_SHORT[id] }))}
                />
              ) : null}
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
                          activa ? "bg-accent text-accent-fg" : "bg-black/40 text-line"
                        }`}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {staff && me ? (
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-line/80">
                  <input
                    type="checkbox"
                    className="size-5 accent-accent"
                    checked={me.juega ?? false}
                    onChange={(e) => setJuega(me.id, e.target.checked)}
                  />
                  Jugar yo también
                </label>
              ) : null}
              <div className="vestuario-scan mt-3">
                <Pitch
                  modality={event.modality}
                  formacionId={event.formacion}
                  lineup={event.lineup}
                  members={members}
                  editable={staff}
                  onSlot={staff ? setSlot : undefined}
                />
              </div>
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {forma.slots.map((item) => {
                  const id = event.lineup[item.key];
                  const person = members.find((member) => member.id === id);
                  return (
                    <div
                      key={item.key}
                      className="w-16 shrink-0 rounded-lg border border-line/25 bg-black/40 px-1 py-1.5 text-center"
                    >
                      <p className="text-[10px] font-semibold tracking-widest text-accent">{item.label}</p>
                      <p className="text-lg font-semibold tabular-nums leading-none text-line">
                        {person?.number ?? "–"}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-line/80">{person ? person.nick : "libre"}</p>
                    </div>
                  );
                })}
              </div>
              {staff ? (
                <p className="mt-2 text-center text-xs text-line/80">Tocá un puesto para poner o sacar a alguien.</p>
              ) : null}
            </div>
            <div className="mt-3 rounded-2xl border border-accent/40 bg-black/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Canal del DT</p>
              {staff ? (
                <Textarea
                  className="mt-2 min-h-28 border-line/30 bg-transparent text-base text-line placeholder:text-line/40"
                  rows={4}
                  maxLength={180}
                  value={event.tactics}
                  onChange={(e) => setTactics(event.id, e.target.value)}
                  placeholder="Lo que se dice en el vestuario, antes de salir."
                />
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-xl font-medium leading-snug text-line">
                  {event.tactics || "El DT todavía no dejó la charla."}
                </p>
              )}
            </div>
        </section>
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
        <p className="mt-2 text-center text-xs text-muted">Formación publicada.</p>
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
