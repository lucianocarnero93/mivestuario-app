// Nube del vestuario. loadClubDoc trae el equipo. saveClubDoc lo guarda.
// La llave es el código del equipo, no el mail de una sola persona.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { sanitizeCode } from "./sanitize";
import type { ClubBundle } from "./types";

const COLLECTION = "clubs";
const MAX_BYTES = 350_000;

function asBundle(value: unknown): ClubBundle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ClubBundle;
  if (!row.club || typeof row.club.inviteCode !== "string") return null;
  if (!Array.isArray(row.members) || !Array.isArray(row.events)) return null;
  return row;
}

export const loadClubDoc = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code }): Promise<ClubBundle | null> => {
    if (!code) return null;
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql.query<{ data: ClubBundle | string }>(
        "select data from vestuario_docs where collection = $1 and id = $2",
        [COLLECTION, code],
      );
      const raw = rows[0]?.data;
      if (typeof raw === "string") {
        try {
          return asBundle(JSON.parse(raw));
        } catch {
          return null;
        }
      }
      return asBundle(raw);
    } catch {
      return null;
    }
  });

export const saveClubDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; bundle: ClubBundle }) => ({
    code: sanitizeCode(input.code),
    bundle: input.bundle,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!data.code || !data.bundle?.club) return { ok: false };
    const payload = JSON.stringify(data.bundle);
    if (payload.length > MAX_BYTES) return { ok: false };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [COLLECTION, data.code, payload],
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
