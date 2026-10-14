import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { bearer } from "better-auth/plugins";
import { cortarClaveAlVincularGoogle, type AdaptadorCuentas } from "./vincular-google.ts";

const BASE = "http://127.0.0.1:4017";

function jwtFalso(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.x`;
}

type AuthDePrueba = {
  handler: (request: Request) => Promise<Response>;
  options: Parameters<typeof getMigrations>[0];
  $context: Promise<{ internalAdapter: AdaptadorCuentas }>;
};

async function pedir(auth: AuthDePrueba, path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
  const headers = new Headers({ origin: BASE, "content-type": "application/json" });
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  const response = await auth.handler(
    new Request(`${BASE}/api/auth/${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
  );
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  return { status: response.status, json, token: response.headers.get("set-auth-token") };
}

async function armarAuth() {
  const database = new DatabaseSync(":memory:");
  const listo: { actual: AuthDePrueba | null } = { actual: null };
  const auth = betterAuth({
    baseURL: BASE,
    secret: "test-secret-de-vestuario-largo-32",
    database,
    rateLimit: { enabled: false },
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        requireLocalEmailVerified: false,
      },
    },
    socialProviders: {
      google: {
        clientId: "test-client",
        clientSecret: "test-secret",
        verifyIdToken: async () => true,
      },
    },
    trustedOrigins: [BASE],
    databaseHooks: {
      account: {
        create: {
          after: async (acc) => {
            const vivo = listo.actual;
            if (!vivo) return;
            const ctx = await vivo.$context;
            await cortarClaveAlVincularGoogle(acc, ctx.internalAdapter);
          },
        },
      },
    },
    plugins: [bearer()],
    logger: { level: "error" },
  });
  listo.actual = auth as unknown as AuthDePrueba;
  const { runMigrations } = await getMigrations({ ...listo.actual.options, database });
  await runMigrations();
  return listo.actual;
}

function codigo(json: unknown): string {
  if (!json || typeof json !== "object" || !("code" in json)) return "";
  return String(json.code);
}

test("enganchar Google borra la contraseña y la sesión vieja", async () => {
  const auth = await armarAuth();
  const alta = await pedir(auth, "sign-up/email", {
    body: { email: "dueno@mail.com", password: "clave-ajena", name: "Atacante" },
  });
  assert.equal(alta.status, 200, JSON.stringify(alta.json));

  const entrada = await pedir(auth, "sign-in/email", {
    body: { email: "dueno@mail.com", password: "clave-ajena" },
  });
  assert.equal(entrada.status, 200, JSON.stringify(entrada.json));
  assert.ok(entrada.token);
  const sesionVieja = await pedir(auth, "get-session", { token: entrada.token });
  assert.ok(sesionVieja.json && typeof sesionVieja.json === "object" && "user" in sesionVieja.json);

  const google = await pedir(auth, "sign-in/social", {
    body: {
      provider: "google",
      idToken: {
        token: jwtFalso({
          sub: "google-dueno",
          email: "dueno@mail.com",
          email_verified: true,
          name: "Dueño",
        }),
      },
    },
  });
  assert.equal(google.status, 200, JSON.stringify(google.json));
  assert.ok(google.token, JSON.stringify(google.json));

  const muerta = await pedir(auth, "get-session", { token: entrada.token });
  assert.equal(muerta.json, null);

  const viva = await pedir(auth, "get-session", { token: google.token });
  assert.ok(viva.json && typeof viva.json === "object" && "user" in viva.json, JSON.stringify(viva.json));

  const clave = await pedir(auth, "sign-in/email", {
    body: { email: "dueno@mail.com", password: "clave-ajena" },
  });
  assert.equal(codigo(clave.json), "INVALID_EMAIL_OR_PASSWORD", JSON.stringify(clave.json));
});

test("un usuario solo con Google sigue entrando", async () => {
  const auth = await armarAuth();
  const tokenGoogle = jwtFalso({
    sub: "google-solo",
    email: "solo@mail.com",
    email_verified: true,
    name: "Solo Google",
  });
  const primero = await pedir(auth, "sign-in/social", {
    body: { provider: "google", idToken: { token: tokenGoogle } },
  });
  assert.equal(primero.status, 200, JSON.stringify(primero.json));
  assert.ok(primero.token);
  const sesion = await pedir(auth, "get-session", { token: primero.token });
  assert.ok(sesion.json && typeof sesion.json === "object" && "user" in sesion.json, JSON.stringify(sesion.json));

  const segundo = await pedir(auth, "sign-in/social", {
    body: { provider: "google", idToken: { token: tokenGoogle } },
  });
  assert.equal(segundo.status, 200, JSON.stringify(segundo.json));
  assert.ok(segundo.token);
  const sesion2 = await pedir(auth, "get-session", { token: segundo.token });
  assert.ok(sesion2.json && typeof sesion2.json === "object" && "user" in sesion2.json, JSON.stringify(sesion2.json));
});
