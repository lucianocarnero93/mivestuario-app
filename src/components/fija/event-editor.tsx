import { useState, type ReactNode } from "react";
import { fromDatetimeLocal, KIND_LABEL, toDatetimeLocal, defaultKickoff } from "@/lib/fija/format";
import { MODALITY_SHORT, MODALITIES } from "@/lib/fija/formations";
import { parseMapsInput } from "@/lib/fija/maps";
import { activeTournament, useFija } from "@/lib/fija/store";
import type { ClubEvent, EventKind, Modality } from "@/lib/fija/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GpsLocateButton } from "./gps-button";
import { Segmented } from "./segmented";

export function CreateEventButton() {
  const createEvent = useFija((s) => s.createEvent);
  const current = activeTournament(useFija((s) => s.tournaments));
  return (
    <EventDialog
      title="Agendar"
      trigger={<Button className="h-11">Nuevo</Button>}
      submitLabel="Publicar en la agenda"
      initial={{
        kind: "partido",
        modality: "f8",
        title: "",
        place: "",
        mapsQuery: "",
        when: defaultKickoff(),
        tournamentId: current?.id ?? "",
      }}
      onSubmit={(data) => {
        const maps = parseMapsInput(data.mapsQuery);
        createEvent({
          kind: data.kind,
          title: data.title.trim() || defaultTitle(data.kind),
          place: data.place.trim() || "A confirmar",
          mapsQuery: maps.mapsQuery || data.place.trim(),
          lat: maps.lat,
          lng: maps.lng,
          startsAt: fromDatetimeLocal(data.when),
          modality: data.modality,
          tournamentId: data.kind === "partido" ? data.tournamentId : null,
        });
      }}
    />
  );
}

export function EditEventButton({ event }: { event: ClubEvent }) {
  const updateEvent = useFija((s) => s.updateEvent);
  const deleteEvent = useFija((s) => s.deleteEvent);
  return (
    <EventDialog
      title="Editar fecha"
      trigger={
        <Button variant="ghost" className="h-11 px-3 text-xs text-muted">
          Editar
        </Button>
      }
      submitLabel="Guardar cambios"
      initial={{
        kind: event.kind,
        modality: event.modality,
        title: event.title,
        place: event.place,
        mapsQuery: event.mapsQuery || "",
        when: toDatetimeLocal(event.startsAt),
        tournamentId: event.tournamentId ?? "",
      }}
      keepTournamentId={event.tournamentId}
      onSubmit={(data) => {
        const maps = parseMapsInput(data.mapsQuery);
        updateEvent(event.id, {
          kind: data.kind,
          title: data.title.trim() || defaultTitle(data.kind),
          place: data.place.trim() || "A confirmar",
          mapsQuery: maps.mapsQuery || data.place.trim(),
          lat: maps.lat,
          lng: maps.lng,
          startsAt: fromDatetimeLocal(data.when),
          modality: data.modality,
          lineup: event.lineup,
          tournamentId: data.kind === "partido" ? data.tournamentId || null : null,
        });
      }}
      onDelete={() => deleteEvent(event.id)}
    />
  );
}

type Draft = {
  kind: EventKind;
  modality: Modality;
  title: string;
  place: string;
  mapsQuery: string;
  when: string;
  tournamentId: string;
};

function EventDialog({
  title,
  trigger,
  submitLabel,
  initial,
  keepTournamentId,
  onSubmit,
  onDelete,
}: {
  title: string;
  trigger: ReactNode;
  submitLabel: string;
  initial: Draft;
  keepTournamentId?: string | null;
  onSubmit: (data: Draft) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EventKind>(initial.kind);
  const [modality, setModality] = useState<Modality>(initial.modality);
  const [eventTitle, setEventTitle] = useState(initial.title);
  const [place, setPlace] = useState(initial.place);
  const [mapsQuery, setMapsQuery] = useState(initial.mapsQuery);
  const [when, setWhen] = useState(initial.when);
  const [tournamentId, setTournamentId] = useState(initial.tournamentId);
  const [saved, setSaved] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tournaments = useFija((s) => s.tournaments);
  const createTournament = useFija((s) => s.createTournament);
  const matchNeedsTournament = kind === "partido";
  const listed = tournaments.filter(
    (tournament) => tournament.status === "active" || tournament.id === keepTournamentId,
  );
  const chosen = listed.find((tournament) => tournament.id === tournamentId);
  const canSaveMatch = !matchNeedsTournament || tournamentId === "" || Boolean(chosen);

  function reset() {
    setKind(initial.kind);
    setModality(initial.modality);
    setEventTitle(initial.title);
    setPlace(initial.place);
    setMapsQuery(initial.mapsQuery);
    setWhen(initial.when);
    setTournamentId(initial.tournamentId);
    setSaved(false);
    setConfirmDelete(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title}>
        <div className="space-y-3">
          <Segmented
            value={kind}
            onChange={setKind}
            options={(["partido", "entrenamiento", "reunion"] as const).map((id) => ({
              id,
              label: KIND_LABEL[id],
            }))}
          />
          {kind === "partido" ? (
          <Segmented
            value={modality}
            onChange={setModality}
            options={MODALITIES.map((id) => ({
              id,
              label: MODALITY_SHORT[id],
            }))}
          />
          ) : null}
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="vs Los del Bajo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Día y hora</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cancha</Label>
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Predio, cancha 2"
            />
          </div>
            <div className="space-y-1.5">
            <Label>Dirección para Mapas</Label>
            <Input
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="Calle y barrio, o un link de Maps"
            />
            <GpsLocateButton
              onFix={(fix) => {
                setMapsQuery(fix.mapsQuery);
              }}
            />
          </div>
          {matchNeedsTournament ? (
            <div className="space-y-1.5">
              <Label>Torneo</Label>
              {listed.length > 0 ? (
                <select
                  className="h-12 w-full rounded-md border border-border bg-bg px-3 text-sm"
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                >
                  <option value="">Amistoso, sin torneo</option>
                  {listed.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                      {tournament.status === "active" ? " · activo" : " · cerrado"}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted">Sin torneo queda como amistoso. O creá uno ahora.</p>
              )}
              <div className="space-y-2 pt-1">
                  <Input
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    placeholder="Apertura 2026"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 w-full"
                    disabled={newTournamentName.trim().length < 2}
                    onClick={() => {
                      const createdId = createTournament(newTournamentName);
                      if (!createdId) return;
                      setTournamentId(createdId);
                      setNewTournamentName("");
                    }}
                  >
                    Crear torneo y usarlo en este partido
                  </Button>
              </div>
            </div>
          ) : null}
          <Button
            className="h-14 w-full text-base"
            disabled={!canSaveMatch}
            onClick={() => {
              if (!canSaveMatch) return;
              onSubmit({ kind, modality, title: eventTitle, place, mapsQuery, when, tournamentId });
              setSaved(true);
              window.setTimeout(() => setOpen(false), 700);
            }}
          >
            {saved ? "Guardado" : submitLabel}
          </Button>
          {onDelete ? (
            confirmDelete ? (
              <div className="rounded-lg bg-bg p-3">
                <p className="text-sm">¿Sacar esta fecha? También se van la planilla, las respuestas y los avisos.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    variant="danger"
                    className="h-11"
                    onClick={() => {
                      onDelete();
                      setOpen(false);
                    }}
                  >
                    Sacar
                  </Button>
                  <Button variant="ghost" className="h-11" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="h-11 w-full text-danger" onClick={() => setConfirmDelete(true)}>
                Quitar de la agenda
              </Button>
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function defaultTitle(kind: EventKind) {
  if (kind === "partido") return "Partido";
  if (kind === "entrenamiento") return "Entrenamiento";
  return "Reunión";
}
