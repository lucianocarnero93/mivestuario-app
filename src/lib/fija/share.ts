import { formatWhen } from "./format";
import { sanitizeCode } from "./sanitize";
import type { Club, ClubEvent, Member } from "./types";

export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return `/?invite=${code}`;
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.search = `?invite=${encodeURIComponent(code)}`;
  url.hash = "";
  return url.toString();
}

const INVITE_KEY = "mv-invite";
const INVITE_TTL_MS = 30 * 60 * 1000;

type StoredInvite = { code: string; timestamp: number };

export function rememberInvite(code: string | null | undefined) {
  if (typeof window === "undefined" || !code) return;
  const clean = sanitizeCode(code);
  if (!clean) return;
  const payload: StoredInvite = { code: clean, timestamp: Date.now() };
  localStorage.setItem(INVITE_KEY, JSON.stringify(payload));
}

export function readRememberedInvite(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = sanitizeCode(new URLSearchParams(window.location.search).get("invite") ?? "");
  if (fromUrl) {
    rememberInvite(fromUrl);
    return fromUrl;
  }
  try {
    const raw = localStorage.getItem(INVITE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Partial<StoredInvite>;
    const code = typeof parsed.code === "string" ? sanitizeCode(parsed.code) : "";
    const timestamp = typeof parsed.timestamp === "number" ? parsed.timestamp : 0;
    if (!code || !timestamp || Date.now() - timestamp > INVITE_TTL_MS) {
      localStorage.removeItem(INVITE_KEY);
      return "";
    }
    return code;
  } catch {
    localStorage.removeItem(INVITE_KEY);
    return "";
  }
}

export function clearRememberedInvite() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INVITE_KEY);
}

export function inviteCallbackPath(): string {
  const code = readRememberedInvite();
  return code ? `/?invite=${encodeURIComponent(code)}` : "/";
}

export function inviteSharePayload(club: Club) {
  const url = inviteUrl(club.inviteCode);
  return {
    title: "Mi Vestuario App",
    text: `Te invito al vestuario de ${club.name}. Código ${club.inviteCode}.`,
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

export function clampHours(value: number, min = 1, max = 168): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
