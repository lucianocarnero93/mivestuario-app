/**
 * Better Auth self-hosted para Mi Vestuario.
 * Google directo + email/password. Sin broker de Grok.
 * Reset de contraseña y borrado de cuenta vía Resend.
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

export const authConfigured = Boolean(googleClientId && googleClientSecret);

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

if (!database) {
  console.error("[auth] DATABASE_URL no está seteado. Better Auth no puede persistir sesiones.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const auth = betterAuth({
  baseURL: env("BETTER_AUTH_URL") ?? "http://localhost:8080",
  secret: env("BETTER_AUTH_SECRET") ?? "dev-secret-change-me-32-chars-minimum",
  database: database!,
  trustedOrigins: [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
    env("BETTER_AUTH_URL") ?? "",
  ].filter(Boolean),

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
      if (!resend) {
        console.error("[auth] RESEND_API_KEY no seteado. No se puede enviar el mail de reset.");
        return;
      }
      // NO await: evita timing attacks (recomendación oficial de Better Auth) [citation:2]
      void resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Recuperá tu contraseña de Mi Vestuario",
        html: `
          <p>Hola ${user.name ?? "jugador"},</p>
          <p>Recibimos un pedido para recuperar tu contraseña.</p>
          <p><a href="${url}">Hacé clic acá para elegir una nueva contraseña</a></p>
          <p>El enlace expira en 1 hora. Si no pediste esto, ignorá este mail.</p>
        `,
      });
    },
  },

  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        if (!resend) {
          console.error("[auth] RESEND_API_KEY no seteado. No se puede enviar el mail de borrado.");
          return;
        }
        void resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: "Confirmá el borrado de tu cuenta de Mi Vestuario",
          html: `
            <p>Hola ${user.name ?? "jugador"},</p>
            <p>Pediste borrar tu cuenta y todos tus datos.</p>
            <p><a href="${url}">Confirmá el borrado acá</a></p>
            <p>Si no pediste esto, ignorá este mail. Tu cuenta seguirá existiendo.</p>
          `,
        });
      },
    },
  },

  session: { cookieCache: { enabled: true, maxAge: 300 } },

  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
  },

  plugins: [
    bearer(),
    tanstackStartCookies(),
  ],
});