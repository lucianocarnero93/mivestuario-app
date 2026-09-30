import { KIND_LABEL, formatDay, formatTime, personLabel } from "@/lib/fija/format";
import { MODALITY_LABEL } from "@/lib/fija/formations";
import type { ClubEvent, Rsvp } from "@/lib/fija/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useFija } from "@/lib/fija/store";
import { PlaceLink } from "./place-link";
import { EquipmentCard } from "./equipment-card";

export function EventCard({
  event,
  rsvps,
  children,
  className,
  result,
  showGear = false,
}: {
  event: ClubEvent;
  rsvps: Rsvp[];
  children?: ReactNode;
  className?: string;
  result?: { gf: number; ga: number };
  showGear?: boolean;
}) {
  const members = useFija((s) => s.members);
  const voy = rsvps.filter((r) => r.status === "voy").length;
  const no = rsvps.filter((r) => r.status === "no").length;
  const pending = rsvps.filter((r) => r.status === "pendiente").length;
  const total = Math.max(rsvps.length, 1);
  const van = rsvps
    .filter((row) => row.status === "voy")
    .map((row) => members.find((person) => person.id === row.memberId))
    .filter((person): person is NonNullable<typeof person> => Boolean(person))
    .map((person) => personLabel(person, members));

  return (
    <article className={cn("rounded-xl bg-surface p-4 shadow-card", className)}>
      <div className="flex items-stretch gap-4">
        <div className="grid w-20 shrink-0 place-items-center rounded-lg bg-board px-1 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-chalk/80">
            {formatDay(event.startsAt)}
          </p>
          <p className="font-display text-xl font-semibold tabular-nums leading-none text-chalk">
            {formatTime(event.startsAt)}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {KIND_LABEL[event.kind]}
            {event.kind === "partido" ? ` · ${MODALITY_LABEL[event.modality]}` : ""}
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold leading-tight">
            <span className="min-w-0 truncate">{event.title}</span>
            {result ? (
              <span className="shrink-0 rounded-md bg-bg px-2 py-0.5 text-sm font-semibold tabular-nums text-accent">
                {result.gf}–{result.ga}
              </span>
            ) : null}
          </h2>
        </div>
      </div>
      <PlaceLink event={event} />
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div className="flex h-full">
          <span className="bg-accent" style={{ width: `${(voy / total) * 100}%` }} />
          <span className="bg-warning" style={{ width: `${(pending / total) * 100}%` }} />
          <span className="bg-danger" style={{ width: `${(no / total) * 100}%` }} />
        </div>
      </div>
      <p className="mt-2 text-sm">
        <span className="font-semibold text-accent">{voy} van</span>
        <span className="text-muted">
          {" "}
          · {pending} sin responder · {no} no
        </span>
      </p>
      {van.length > 0 ? <p className="mt-1 text-sm text-muted">Van: {van.join(", ")}</p> : null}
         {showGear && event.kind === "partido" ? <EquipmentCard event={event} /> : null}
      {children}
    </article>
  );
}
