// Al borrar la cuenta, el nombre queda en el equipo como jugador cargado a mano.
// Así las estadísticas siguen y, si vuelve a entrar, puede elegir ese nombre.
import { detachAccount } from "./club-rules";
import type { ClubBundle } from "./types";

function asBundle(value: unknown): ClubBundle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ClubBundle;
  if (!row.club || !Array.isArray(row.members)) return null;
  return row;
}

export async function releaseAccount(accountId: string): Promise<void> {
  if (!accountId) return;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ id: string; data: ClubBundle | string }>(
    `select id, data from vestuario_docs
      where collection = 'clubs'
        and jsonb_typeof(data->'members') = 'array'
        and exists (
          select 1 from jsonb_array_elements(data->'members') as member
          where member->>'accountId' = $1
        )`,
    [accountId],
  );
  for (const row of rows) {
    const raw = row.data;
    let bundle: ClubBundle | null = null;
    if (typeof raw === "string") {
      try {
        bundle = asBundle(JSON.parse(raw));
      } catch {
        bundle = null;
      }
    } else {
      bundle = asBundle(raw);
    }
    if (!bundle) continue;
    const memberIds = new Set(
      bundle.members.filter((person) => person.accountId === accountId).map((person) => person.id),
    );
    const next = detachAccount(bundle, accountId);
    await sql.query(
      `update vestuario_docs set data = $2::jsonb, updated_at = now() where collection = 'clubs' and id = $1`,
      [row.id, JSON.stringify(next)],
    );
    const pushes = await sql.query<{ data: { subs?: { memberId?: string }[] } | string }>(
      "select data from vestuario_docs where collection = 'pushes' and id = $1",
      [row.id],
    );
    const pushRaw = pushes[0]?.data;
    if (!pushRaw) continue;
    let parsed: { subs?: { memberId?: string }[] } | null = null;
    if (typeof pushRaw === "string") {
      try {
        parsed = JSON.parse(pushRaw) as { subs?: { memberId?: string }[] };
      } catch {
        parsed = null;
      }
    } else {
      parsed = pushRaw;
    }
    const subs = Array.isArray(parsed?.subs) ? parsed.subs.filter((item) => !memberIds.has(item.memberId ?? "")) : [];
    await sql.query(
      `update vestuario_docs set data = $2::jsonb, updated_at = now() where collection = 'pushes' and id = $1`,
      [row.id, JSON.stringify({ subs })],
    );
  }
  await sql.query("delete from vestuario_docs where collection = 'retratos' and id = $1", [accountId]);
}
