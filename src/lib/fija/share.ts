import { formatWhen } from "./format";
import type { Club, ClubEvent, Member } from "./types";

export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return `/?invite=${code}`;
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.search = `?invite=${encodeURIComponent(code)}`;
  url.hash = "";
  return url.toString();
}

export function inviteSharePayload(club: Club) {
  const url = inviteUrl(club.inviteCode);
  return {
    title: "Mi Vestuario App",
    text: `Te invito al vestuario de ${club.name}. Entrá, confirmá y mirá la pizarra.`,
    url,
  };
}

export async function shareOrCopy(payload: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "copied"> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share(payload);
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
  }
  const line = `${payload.text}\n${payload.url}`;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(line);
  }
  return "copied";
}

export function whatsAppClaimUrl(player: Member, event: ClubEvent, club: Club): string {
  const text = `Che ${player.nick}, el DT te está esperando. Confirmá si vas a ${event.title} el ${formatWhen(event.startsAt)}. — ${club.name}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function hoursSince(iso: string, now = Date.now()): number {
  const t = +new Date(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (now - t) / 3_600_000);
}

export function clampHours(value: number, min = 1, max = 168): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
