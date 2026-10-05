import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { sanitizeLiveToken } from "./vivo";

const FAMILIA = "familia-reaccion";

export async function contarFamilia(token: string): Promise<number> {
  if (!token) return 0;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: { n?: number } | string }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [FAMILIA, token],
  );
  const raw = rows[0]?.data;
  const data = typeof raw === "string" ? safe(raw) : raw;
  return typeof data?.n === "number" ? data.n : 0;
}

function safe(value: string): { n?: number } | null {
  try {
    return JSON.parse(value) as { n?: number };
  } catch {
    return null;
  }
}

export const leerFamilia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((token: string) => sanitizeLiveToken(token))
  .handler(async ({ data }): Promise<{ n: number }> => ({ n: await contarFamilia(data) }));

export const reaccionarFamilia = createServerFn({ method: "POST" })
  .validator((token: string) => sanitizeLiveToken(token))
  .handler(async ({ data: token }): Promise<{ ok: boolean; n: number }> => {
    if (!token) return { ok: false, n: 0 };
    const { withTransaction } = await import("@/lib/db");
    let total = 0;
    let ok = false;
    await withTransaction(async (query) => {
      const rows = await query<{ data: { n?: number; ips?: string[] } | string }>(
        "select data from vestuario_docs where collection = $1 and id = $2 for update",
        [FAMILIA, token],
      );
      const raw = rows[0]?.data;
      const parsed = typeof raw === "string" ? (safe(raw) as { n?: number; ips?: string[] } | null) : raw;
      const ips = Array.isArray(parsed?.ips) ? parsed.ips.slice(-300) : [];
      const ip = await ipDe();
      if (ips.includes(ip)) {
        total = parsed?.n ?? ips.length;
        ok = true;
        return;
      }
      const next = { n: (parsed?.n ?? 0) + 1, ips: [...ips, ip].slice(-300) };
      total = next.n;
      ok = true;
      await query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [FAMILIA, token, JSON.stringify(next)],
      );
    });
    return { ok, n: total };
  });

async function ipDe(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const real = request?.headers?.get("x-real-ip")?.trim() ?? "";
    const forwarded = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    return (real || forwarded || "comun").slice(0, 80);
  } catch {
    return "comun";
  }
}
