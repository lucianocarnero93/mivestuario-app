/**
 * Better Auth self-hosted para Mi Vestuario.
 * Google directo + email/password.
 * Reset de contraseña vía Resend. Borrado de cuenta directo.
 *
 * NEVER import from client code.
 */
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Pool } from "pg";
import { Resend } from "resend";
import { vestuarioLog } from "@/lib/vestuario-log";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const VERIFIED_FROM = "Mi Vestuario <no-reply@send.mivestuario.com.ar>";

const databaseUrl = env("DATABASE_URL");
const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const resendApiKey = env("RESEND_API_KEY");

function resolveFromEmail(): string {
  const configured = env("RESEND_FROM_EMAIL");
  if (!configured) {
    console.error(
      "[resend] RESEND_FROM_EMAIL no está seteada. No se usa onboarding@resend.dev. Remitente:",
      VERIFIED_FROM,
    );
    return VERIFIED_FROM;
  }
  if (configured.includes("onboarding@resend.dev") || !configured.includes("@send.mivestuario.com.ar")) {
    console.error(
      "[resend] RESEND_FROM_EMAIL no es del dominio verificado:",
      configured,
      ". Se usa",
      VERIFIED_FROM,
    );
    return VERIFIED_FROM;
  }
  return configured;
}

const fromEmail = resolveFromEmail();

export const authConfigured = Boolean(googleClientId && googleClientSecret);

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

if (!database) {
  vestuarioLog("sesion", "falta la base");
}

if (!resendApiKey) {
  vestuarioLog("mail", "falta la api key");
} else if (!resendApiKey.startsWith("re_")) {
  vestuarioLog("mail", "la api key no tiene el formato esperado");
} else {
  console.log("[vestuario] mail listo");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function sendMail(payload: { to: string; subject: string; html: string }) {
  if (!resend || !fromEmail) {
    vestuarioLog("mail", "no se envió: falta la api key o el remitente");
    return;
  }
  void resend.emails
    .send({ from: fromEmail, ...payload })
    .then((result) => {
      if (result.error) {
        vestuarioLog("mail", result.error.message ?? "error al enviar");
        return;
      }
      console.log("[vestuario] mail enviado");
    })
    .catch((error: unknown) => {
      vestuarioLog("mail", error instanceof Error ? error.message : "excepción al enviar");
    });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

export const auth = betterAuth({
  baseURL: env("BETTER_AUTH_URL") ?? "http://localhost:8080",
  secret: env("BETTER_AUTH_SECRET") ?? "dev-secret-change-me-32-chars-minimum",
  database: database!,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  trustedOrigins: [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
    "https://www.mivestuario.com.ar",
    "https://mivestuario.com.ar",
    "https://mivestuario-app.vercel.app",
  ],

  socialProviders: authConfigured
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      }
    : undefined,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      sendMail({
        to: user.email,
        subject: "Recuperá tu contraseña de Mi Vestuario",
        html: `
          <p>Hola ${escapeHtml(user.name ?? "jugador")},</p>
          <p>Recibimos un pedido para recuperar tu contraseña.</p>
          <p><a href="${url}">Hacé clic acá para elegir una nueva contraseña</a></p>
          <p>El enlace expira en 1 hora. Si no pediste esto, ignorá este mail.</p>
        `,
      });
    },
  },

  user: {
    additionalFields: {
      menor: { type: "boolean", required: false, defaultValue: false, input: true },
      edadConfirmada: { type: "boolean", required: false, defaultValue: false, input: true },
      adultoAvisado: { type: "boolean", required: false, defaultValue: false, input: true },
    },
    deleteUser: {
      enabled: true,
    },
  },

  session: { cookieCache: { enabled: true, maxAge: 300 } },

  rateLimit: {
    window: 60,
    max: 100,
    customRules: {
      "/get-session": false,
    },
  },

  databaseHooks: {
    user: {
      update: {
        before: async (data: { menor?: boolean }) => {
          if (data?.menor === false) {
            const { menor: _ignored, ...rest } = data;
            return { data: rest };
          }
          return { data };
        },
      },
      delete: {
        before: async (user: { id?: string }) => {
          if (!user?.id) return;
          const { releaseAccount } = await import("@/lib/fija/release-account");
          await releaseAccount(user.id);
        },
      },
    },
  },

  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
  },

  plugins: [bearer(), tanstackStartCookies()],
});
