export function sanitizeNote(
  action: unknown,
  detail?: unknown,
): { action: string; detail: string } | null {
  const cleanAction = String(action ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  if (!cleanAction) return null;
  const cleanDetail = String(detail ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[mail]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return { action: cleanAction, detail: cleanDetail };
}

export function vestuarioLog(action: string, detail?: unknown) {
  const clean = sanitizeNote(action, detail);
  if (!clean) return;
  console.error(`[vestuario] ${clean.action}${clean.detail ? ` ${clean.detail}` : ""}`);
}
