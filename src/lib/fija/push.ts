// Avisos del plantel. La clave pública se crea sola la primera vez y queda en la base.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { sanitizeCode } from "./sanitize";

const PUSHES = "pushes";
const CONFIG = "config";
const VAPID_ID = "vapid";
const VAPID_SUBJECT = "mailto:contacto@mivestuario.com.ar";

type StoredPush = {
  memberId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type VapidKeys = { publicKey: string; privateKey: string };

function asPushes(value: unknown): StoredPush[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { subs?: unknown }).subs)
      ? (value as { subs: unknown[] }).subs
      : [];
  return list.filter((item): item is StoredPush => {
    if (!item || typeof item !== "object") return false;
    const row = item as StoredPush;
    return Boolean(row.endpoint && row.p256dh && row.auth && row.memberId);
  });
}

async function readJson(sql: { query: <T>(text: string, params?: unknown[]) => Promise<T[]> }, collection: string, id: string) {
  const rows = await sql.query<{ data: unknown }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [collection, id],
  );
  const raw = rows[0]?.data;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw ?? null;
}

async function ensureVapid(): Promise<VapidKeys | null> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const current = await readJson(sql, CONFIG, VAPID_ID);
  if (
    current &&
    typeof current === "object" &&
    typeof (current as VapidKeys).publicKey === "string" &&
    typeof (current as VapidKeys).privateKey === "string"
  ) {
    return current as VapidKeys;
  }
  const webpush = (await import("web-push")).default;
  const keys = webpush.generateVAPIDKeys();
  await sql.query(
    `insert into vestuario_docs (collection, id, data, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (collection, id) do nothing`,
    [CONFIG, VAPID_ID, JSON.stringify(keys)],
  );
  const saved = await readJson(sql, CONFIG, VAPID_ID);
  if (
    saved &&
    typeof saved === "object" &&
    typeof (saved as VapidKeys).publicKey === "string" &&
    typeof (saved as VapidKeys).privateKey === "string"
  ) {
    return saved as VapidKeys;
  }
  return keys;
}

export const pushPublicKey = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<string> => {
    const keys = await ensureVapid();
    return keys?.publicKey ?? "";
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      code: string;
      memberId: string;
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    }) => ({
      code: sanitizeCode(input.code),
      memberId: String(input.memberId ?? "").slice(0, 40),
      endpoint: String(input.subscription?.endpoint ?? "").slice(0, 800),
      p256dh: String(input.subscription?.keys?.p256dh ?? "").slice(0, 200),
      auth: String(input.subscription?.keys?.auth ?? "").slice(0, 200),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!data.code || !data.memberId || !data.endpoint || !data.p256dh || !data.auth) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const current = asPushes(await readJson(sql, PUSHES, data.code));
    const next = [
      ...current.filter((item) => item.endpoint !== data.endpoint),
      { memberId: data.memberId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
    ].slice(-80);
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [PUSHES, data.code, JSON.stringify({ subs: next })],
    );
    return { ok: true };
  });

export const notifyClub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { code: string; exceptMemberId: string; title: string; body: string; url: string; tag: string }) => ({
      code: sanitizeCode(input.code),
      exceptMemberId: String(input.exceptMemberId ?? "").slice(0, 40),
      title: String(input.title ?? "Mi Vestuario").slice(0, 80),
      body: String(input.body ?? "").slice(0, 180),
      url: String(input.url ?? "/").slice(0, 80),
      tag: String(input.tag ?? "vestuario").slice(0, 80),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!data.code || !data.body) return { ok: false };
    const keys = await ensureVapid();
    if (!keys) return { ok: false };
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const subs = asPushes(await readJson(sql, PUSHES, data.code)).filter(
      (item) => item.memberId !== data.exceptMemberId,
    );
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (item) => {
        try {
          await webpush.sendNotification(
            { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } },
            JSON.stringify({
              title: data.title,
              body: data.body,
              tag: data.tag,
              data: { url: data.url },
            }),
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(item.endpoint);
        }
      }),
    );
    if (gone.length) {
      const left = asPushes(await readJson(sql, PUSHES, data.code)).filter((item) => !gone.includes(item.endpoint));
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [PUSHES, data.code, JSON.stringify({ subs: left })],
      );
    }
    return { ok: true };
  });
