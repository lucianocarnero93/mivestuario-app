const TAGS = /<\/?[^>]+>/g;

export function sanitizeText(raw: string, max = 280): string {
  return raw
    .replace(TAGS, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
}

export function sanitizeName(raw: string): string {
  return sanitizeText(raw, 40);
}
