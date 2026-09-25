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

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const databaseUrl = env("DATABASE_URL");
const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const resendApiKey = env("RESEND_API_KEY");
const fromEmail = env("RESEND_FROM_EMAIL") ?? "Mi Vestuario <onboarding@resend.dev>";

const CANONICAL_URL = "https://www.mivestuario.com.ar";
const appUrl = (env("BETTER_AUTH_URL") ?? CANONICAL_URL).replace(/\/$/, "");
const isHttps = appUrl.startsWith("https://");

export const authConfigured = Boolean(googleClientId && googleClientSecret);

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

if (!database) {
  console.error("[auth] DATABASE_URL no está seteado. Better Auth no puede persistir sesiones.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const vercelOrigin = env("VERCEL_URL") ? `https://${env("VERCEL_URL")}` : undefined;

export const auth = betterAuth({
  baseURL: appUrl,
  secret: env("BETTER_AUTH_SECRET") ?? "dev-secret-change-me-32-chars-minimum",
  database: database!,
  trustedOrigins: [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
    CANONICAL_URL,
    "https://mivestuario.com.ar",
    "https://mivestuario-app.vercel.app",
    ...(vercelOrigin ? [vercelOrigin] : []),
  ],

  socialProviders: authConfigured
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          redirectURI: `${appUrl}/api/auth/callback/google`,
        },
      }
    : undefined,

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      if (!resend) {
        console.error("[auth] RESEND_API_KEY no seteado. No se puede enviar el mail de reset.");
        return;
      }
      // Link directo a /reset (ruta pelada). Evita el hop por /api/auth/reset-password
      // que, con redirectTo relativo, a veces cae en `/` → ClubGate ("crear equipo").
      const resetLink = `${appUrl}/reset?token=${encodeURIComponent(token)}`;
      void resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Recuperá tu contraseña de Mi Vestuario",
        html: `
          <p>Hola ${user.name ?? "jugador"},</p>
          <p>Recibimos un pedido para recuperar tu contraseña.</p>
          <p><a href="${resetLink}">Hacé clic acá para elegir una nueva contraseña</a></p>
          <p>El enlace expira en 1 hora. Si no pediste esto, ignorá este mail.</p>
        `,
      });
    },
  },

  user: {
    deleteUser: {
      enabled: true,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 300 },
  },

  advanced: {
    useSecureCookies: isHttps,
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      ...(isHttps ? { secure: true } : {}),
    },
  },

  plugins: [bearer(), tanstackStartCookies()],
});
