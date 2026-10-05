// Avisos del plantel. La clave pública se crea sola la primera vez y queda en la base.
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isClubMember, memberIdInClub, memberIdsInClub, readClub } from "./cloud";
import { memberGetsPush, pushCopy } from "./club-rules";
import { sanitizeCode } from "./sanitize";

const PUSHES = "pushes";
const SENT = "push-enviados";
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

export const pushPublicKey = createServerFn({ method: "POST" })
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
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    if (!data.code || !data.memberId || !data.endpoint || !data.p256dh || !data.auth) return { ok: false };
    if (!(await isClubMember(data.code, userId))) return { ok: false };
    const realMemberId = await memberIdInClub(data.code, userId);
    if (!realMemberId) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const current = asPushes(await readJson(sql, PUSHES, data.code));
    const next = [
      ...current.filter((item) => item.endpoint !== data.endpoint),
      { memberId: realMemberId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
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

export const dropPushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { endpoint?: string; codes?: string[] }) => ({
    endpoint: String(input?.endpoint ?? "").slice(0, 800),
    codes: (Array.isArray(input?.codes) ? input.codes : [])
      .map((code) => sanitizeCode(String(code)))
      .filter((code) => code.length > 0)
      .slice(0, 12),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    if (!userId || !data.endpoint || data.codes.length === 0) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    for (const code of data.codes) {
      const current = asPushes(await readJson(sql, PUSHES, code));
      const next = current.filter((item) => item.endpoint !== data.endpoint);
      if (next.length === current.length) continue;
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [PUSHES, code, JSON.stringify({ subs: next })],
      );
    }
    return { ok: true };
  });

export const notifyClub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; noticeId?: string; exceptMemberId?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    noticeId: String(input?.noticeId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40),
    exceptMemberId: String(input?.exceptMemberId ?? "").slice(0, 40),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    if (!data.code) return { ok: false };
    if (!(await isClubMember(data.code, userId))) return { ok: false };
    const bundle = await readClub(data.code);
    if (!bundle) return { ok: false };
    const me = bundle.members.find((person) => person.accountId === userId || person.id === userId);
    if (!me) return { ok: false };
    const note = data.noticeId ? (bundle.inbox ?? []).find((item) => item.id === data.noticeId) : undefined;
    if (data.noticeId && !note) return { ok: false };
    if (!data.noticeId && me.role !== "dt" && me.role !== "ayudante") return { ok: false };
    const copy = note
      ? pushCopy(bundle.club.name, note)
      : { title: `${bundle.club.name}: Aviso`.slice(0, 80), body: "Hay una novedad en el vestuario.", url: "/" };
    const keys = await ensureVapid();
    if (!keys) return { ok: false };
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    if (data.noticeId) {
      const rows = await sql.query<{ data: { ids?: string[] } | string }>(
        "select data from vestuario_docs where collection = $1 and id = $2",
        [SENT, data.code],
      );
      const raw = rows[0]?.data;
      let parsed: { ids?: string[] } | null = null;
      if (typeof raw === "string") {
        try {
          parsed = JSON.parse(raw) as { ids?: string[] };
        } catch {
          parsed = null;
        }
      } else if (raw && typeof raw === "object") parsed = raw;
      const ids = Array.isArray(parsed?.ids) ? parsed.ids : [];
      if (ids.includes(data.noticeId)) return { ok: true };
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [SENT, data.code, JSON.stringify({ ids: [...ids, data.noticeId].slice(-80) })],
      );
    }
    const alive = new Set((await memberIdsInClub(data.code)) ?? []);
    const stored = asPushes(await readJson(sql, PUSHES, data.code));
    const current = stored.filter((item) => alive.has(item.memberId));
    if (current.length !== stored.length) {
      await sql.query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [PUSHES, data.code, JSON.stringify({ subs: current })],
      );
    }
    const subs = current.filter((item) => {
      if (item.memberId === data.exceptMemberId) return false;
      const person = bundle.members.find((member) => member.id === item.memberId);
      if (!person) return false;
      if (!note) return person.role === "dt" || person.role === "ayudante";
      const status = (bundle.rsvps ?? []).find(
        (row) => row.eventId === note.eventId && row.memberId === person.id,
      )?.status;
      const known = status === "voy" || status === "no" || status === "pendiente" ? status : null;
      return memberGetsPush(note, person, known);
    });
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (item) => {
        try {
          await webpush.sendNotification(
            { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } },
            JSON.stringify({
              title: copy.title,
              body: copy.body,
              tag: data.noticeId || "vestuario",
              data: { url: copy.url },
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
