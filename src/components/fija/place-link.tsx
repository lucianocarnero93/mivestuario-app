import { Navigation } from "lucide-react";
import { hasMapsTarget, mapsHref } from "@/lib/fija/maps";
import type { ClubEvent } from "@/lib/fija/types";
import { cn } from "@/lib/utils";

export function PlaceLink({
  event,
  className,
}: {
  event: ClubEvent;
  className?: string;
}) {
  const href = mapsHref(event);
  if (!hasMapsTarget(event) || !href) {
    return (
      <p className={cn("mt-3 flex items-center gap-2 text-sm text-muted", className)}>
        <Navigation className="size-4 shrink-0" />
        <span>{event.place}</span>
      </p>
    );
  }

  const native = href.startsWith("geo:") || href.startsWith("maps:");

  return (
    <a
      href={href}
      target={native ? undefined : "_blank"}
      rel={native ? undefined : "noopener noreferrer"}
      className={cn(
        "mt-3 flex min-h-12 min-w-0 items-center gap-3 rounded-lg bg-bg px-3 text-left text-sm",
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-fg">
        <Navigation className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-fg">{event.place}</span>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-accent">
        Mapas
      </span>
    </a>
  );
}
