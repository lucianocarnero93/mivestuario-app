import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { deudaDe, aplicarCobro, pagoAlcanza } from "./caja";
import { readClub } from "./cloud";
import { sanitizeCode } from "./sanitize";
import type { Caja, ClubBundle } from "./types";

const MP = "mp-cuentas";
const MP_STATE = "mp-state";

type CuentaMp = {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
  expiresAt?: number;
};

function clientId() {
  return process.env.MP_CLIENT_ID?.trim() ?? "";
}

function clientSecret() {
  return process.env.MP_CLIENT_SECRET?.trim() ?? "";
}

function redirectUri() {
  return process.env.MP_REDIRECT_URI?.trim() || "https://www.mivestuario.com.ar/api/mp/callback";
}

async function leerCuenta(code: string): Promise<CuentaMp | null> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: CuentaMp | string }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [MP, code],
  );
  const raw = rows[0]?.data;
  const data = typeof raw === "string" ? safeJson<CuentaMp>(raw) : raw;
  return data?.accessToken ? data : null;
}

async function guardarCuenta(code: string, cuenta: CuentaMp) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(
    `insert into vestuario_docs (collection, id, data, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (collection, id) do update set data = excluded.data, updated_at = now()`,
    [MP, code, JSON.stringify(cuenta)],
  );
}

async function refrescar(code: string, cuenta: CuentaMp): Promise<CuentaMp | null> {
  if (!cuenta.refreshToken || !clientId() || !clientSecret()) return cuenta.accessToken ? cuenta : null;
  const token = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
      refresh_token: cuenta.refreshToken,
    }),
  });
  if (!token.ok) return cuenta;
  const body = (await token.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!body.access_token) return cuenta;
  const siguiente: CuentaMp = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token || cuenta.refreshToken,
    userId: cuenta.userId,
    expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
  };
  await guardarCuenta(code, siguiente);
  return siguiente;
}

async function cuentaVigente(code: string): Promise<CuentaMp | null> {
  const cuenta = await leerCuenta(code);
  if (!cuenta) return null;
  if (cuenta.expiresAt && cuenta.expiresAt < Date.now() + 60_000) return refrescar(code, cuenta);
  return cuenta;
}

async function preferencia(
  code: string,
  cuenta: CuentaMp,
  input: { title: string; monto: number; reference: string },
): Promise<string | null> {
  const pedir = (token: string) =>
    fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: input.title,
            description: `Cupón de $${input.monto}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: input.monto,
          },
        ],
        external_reference: input.reference,
        notification_url: "https://www.mivestuario.com.ar/api/mp/webhook",
        binary_mode: true,
      }),
    });
  let response = await pedir(cuenta.accessToken);
  if (response.status === 401) {
    const nueva = await refrescar(code, cuenta);
    if (!nueva) return null;
    response = await pedir(nueva.accessToken);
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { init_point?: string; sandbox_init_point?: string };
  return body.init_point || body.sandbox_init_point || null;
}

function safeJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function memberDe(code: string, userId: string) {
  const bundle = await readClub(code);
  const me = bundle?.members.find((person) => person.accountId === userId || person.id === userId);
  return { bundle, me };
}

export const estadoMp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code, context }): Promise<{ conectado: boolean }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    const { me } = await memberDe(code, userId);
    if (!me) return { conectado: false };
    return { conectado: Boolean(await leerCuenta(code)) };
  });

export const empezarMp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => sanitizeCode(code))
  .handler(async ({ data: code, context }): Promise<{ ok: boolean; url?: string; reason?: "sin-mp" }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    const { me } = await memberDe(code, userId);
    if (!me || (me.role !== "dt" && me.role !== "ayudante")) return { ok: false };
    if (!clientId() || !clientSecret()) return { ok: false, reason: "sin-mp" };
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id) do update set data = excluded.data, updated_at = now()`,
      [MP_STATE, nonce, JSON.stringify({ code, userId, at: Date.now() })],
    );
    const url = new URL("https://auth.mercadopago.com/authorization");
    url.searchParams.set("client_id", clientId());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("platform_id", "mp");
    url.searchParams.set("state", nonce);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("scope", "offline_access read write");
    return { ok: true, url: url.toString() };
  });

export async function guardarCodigoMp(nonce: string, code: string): Promise<boolean> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ data: { code?: string; userId?: string; at?: number } | string }>(
    "select data from vestuario_docs where collection = $1 and id = $2",
    [MP_STATE, nonce],
  );
  const raw = rows[0]?.data;
  const state = typeof raw === "string" ? safeJson<{ code?: string; at?: number }>(raw) : raw;
  if (!state?.code || !code) return false;
  if (state.at && Date.now() - state.at > 15 * 60 * 1000) return false;
  const token = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  });
  if (!token.ok) return false;
  const body = (await token.json()) as { access_token?: string; refresh_token?: string; user_id?: number; expires_in?: number };
  if (!body.access_token) return false;
  const cuenta: CuentaMp = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    userId: String(body.user_id ?? ""),
    expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
  };
  await sql.query(
    `insert into vestuario_docs (collection, id, data, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (collection, id) do update set data = excluded.data, updated_at = now()`,
    [MP, state.code, JSON.stringify(cuenta)],
  );
  return true;
}

export const crearLinkPago = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; gastoId?: string; memberId?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    gastoId: String(input?.gastoId ?? "").slice(0, 40),
    memberId: String(input?.memberId ?? "").slice(0, 80),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; url?: string; reason?: "sin-mp" | "sin-deuda" }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    const { bundle, me } = await memberDe(data.code, userId);
    if (!bundle || !me) return { ok: false };
    const caja = bundle.caja;
    if (!caja) return { ok: false, reason: "sin-deuda" };
    const memberId = data.memberId || me.id;
    const tesorero = me.role === "dt" || me.role === "ayudante" || caja.tesoreroId === me.id;
    if (memberId !== me.id && !tesorero) return { ok: false };
    const monto = deudaDe(caja, data.gastoId, memberId);
    if (monto < 1) return { ok: false, reason: "sin-deuda" };
    const cuenta = await cuentaVigente(data.code);
    if (!cuenta) return { ok: false, reason: "sin-mp" };
    const gasto = caja.gastos.find((item) => item.id === data.gastoId);
    const url = await preferencia(data.code, cuenta, {
      title: `${gasto?.titulo || "Caja del equipo"} · $${monto}`.slice(0, 80),
      monto,
      reference: `${data.code}:${data.gastoId}:${memberId}`,
    });
    return url ? { ok: true, url } : { ok: false, reason: "sin-mp" };
  });

export async function marcarPagoMp(reference: string, paymentId: string, status: string, amount: number): Promise<void> {
  if (status !== "approved" || !paymentId) return;
  const [code, gastoId, memberId] = reference.split(":");
  const clubCode = sanitizeCode(code ?? "");
  if (!clubCode || !gastoId || !memberId) return;
  const { withTransaction } = await import("@/lib/db");
  await withTransaction(async (query) => {
    const rows = await query<{ data: ClubBundle | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2 for update",
      ["clubs", clubCode],
    );
    const raw = rows[0]?.data;
    const bundle = typeof raw === "string" ? safeJson<ClubBundle>(raw) : raw;
    if (!bundle?.club) return;
    const caja: Caja = bundle.caja ?? { tesoreroId: "", gastos: [], cobros: [] };
    const deuda = deudaDe(caja, gastoId, memberId);
    if (!pagoAlcanza(deuda, amount)) return;
    const next = aplicarCobro(caja, {
      id: `mp-${paymentId}`.slice(0, 40),
      gastoId,
      memberId,
      monto: Math.round(amount),
      medio: "mp",
      estado: "confirmado",
      paymentId,
      at: new Date().toISOString(),
    });
    await query(
      `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
      ["clubs", clubCode, JSON.stringify({ ...bundle, caja: next })],
    );
  });
}
