import { createServerFn } from "@tanstack/react-start";
import { sanitizeNote, vestuarioLog } from "@/lib/vestuario-log";

const recent = new Map<string, number>();

export const reportNote = createServerFn({ method: "POST" })
  .validator((input: { action?: unknown; detail?: unknown }) => {
    return sanitizeNote(input?.action, input?.detail) ?? { action: "", detail: "" };
  })
  .handler(async ({ data }) => {
    if (!data.action) return { ok: false };
    vestuarioLog(data.action, data.detail);
    return { ok: true };
  });

export function noteQuiet(action: string, detail?: unknown) {
  const clean = sanitizeNote(action, detail);
  if (!clean || typeof window === "undefined") return;
  const key = `${clean.action}|${clean.detail}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 30_000) return;
  recent.set(key, now);
  void reportNote({ data: clean }).catch(() => undefined);
}
