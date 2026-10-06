import { useFija } from "@/lib/fija/store";
import type { ContextoPremios } from "@/lib/fija/premios";

export function useContextoPremios(): ContextoPremios {
  const members = useFija((s) => s.members);
  const alumni = useFija((s) => s.alumni);
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const votes = useFija((s) => s.figuraVotes);
  const rsvps = useFija((s) => s.rsvps);
  const club = useFija((s) => s.club);
  const tournaments = useFija((s) => s.tournaments);
  return {
    members,
    alumni,
    events,
    sheets,
    votes: votes ?? [],
    rsvps,
    club,
    tournaments,
    now: Date.now(),
  };
}
