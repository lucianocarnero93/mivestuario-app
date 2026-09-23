// Pizarra: el DT y el ayudante arman la formación del partido.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Chalkboard } from "@/components/fija/chalkboard";
import { Pitch } from "@/components/fija/pitch";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MODALITY_LABEL, MODALITY_SHORT, MODALITIES } from "@/lib/fija/formations";
import { formatWhen } from "@/lib/fija/format";
import { nextEvent, useFija, useIsStaff } from "@/lib/fija/store";

export const Route = createFileRoute("/cancha")({ component: CanchaPage });

function CanchaPage() {
  const staff = useIsStaff();
  const events = useFija((s) => s.events);
  const members = useFija((s) => s.members);
  const setSpot = useFija((s) => s.setSpot);
  const setTactics = useFija((s) => s.setTactics);
  const updateEvent = useFija((s) => s.updateEvent);
  const publishLineup = useFija((s) => s.publishLineup);
  const matchEvents = events
    .filter((e) => e.kind !== "reunion")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const fallback = nextEvent(matchEvents) ?? matchEvents[0];
  const [eventId, setEventId] = useState(fallback?.id ?? "");
  const event = events.find((e) => e.id === eventId) ?? fallback;
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const players = members.filter((m) => m.role === "jugador");
  const used = useMemo(() => new Set(Object.values(event?.lineup ?? {})), [event]);
  const filled = Object.keys(event?.lineup ?? {}).length;

  if (!event) {
    return (
      <main className="px-4 py-6">
        <h1 className="text-3xl font-semibold">Sin pizarra</h1>
        <p className="mt-2 text-sm text-muted">Agendá un partido o un entreno para armar la formación.</p>
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
          onChange={(id) => updateEvent(event.id, { modality: id })}
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

      <div className="mt-4">
        <Pitch
          modality={event.modality}
          lineup={event.lineup}
          members={members}
          editable={staff}
          onSlot={setSlot}
        />
      </div>
      {staff ? (
        <p className="mt-2 text-center text-xs text-muted">Tocá un puesto para poner o sacar a alguien.</p>
      ) : null}

      {staff ? (
        <Button
          className="mt-3 h-14 w-full text-base"
          disabled={filled === 0}
          onClick={() => {
            publishLineup(event.id);
            setNote("Avisamos al plantel.");
          }}
        >
          {event.lineupPublishedAt ? "Actualizar formación y avisar" : "Publicar formación"}
        </Button>
      ) : null}
      {note ? <p className="mt-2 text-center text-xs text-accent">{note}</p> : null}
      {event.lineupPublishedAt && !staff ? (
        <p className="mt-2 text-center text-xs text-muted">Formación publicada.</p>
      ) : null}

      {staff ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Mensaje de aliento / pauta táctica
          </p>
          <Textarea
            className="mt-2 min-h-28"
            value={event.tactics}
            onChange={(e) => setTactics(event.id, e.target.value)}
            placeholder="Cómo vamos a jugar, quién presiona, un empujón al grupo…"
          />
        </section>
      ) : (
        <Chalkboard title="Pauta del DT" className="mt-4">
          {event.tactics || "El DT todavía no dejó una pauta."}
        </Chalkboard>
      )}

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
                    setSpot(event.id, slot, null);
                    setSlot(null);
                  }}
                >
                  Dejar vacío
                </Button>
              </li>
            ) : null}
            {players.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-md px-3 text-sm hover:bg-surface-2"
                  onClick={() => {
                    if (!staff || !slot) return;
                    setSpot(event.id, slot, p.id);
                    setSlot(null);
                  }}
                >
                  <span>
                    {p.number != null ? `${p.number} · ` : ""}
                    {p.nick}
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
