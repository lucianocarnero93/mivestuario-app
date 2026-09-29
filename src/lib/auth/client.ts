/**
 *   Better Auth client para el SPA. Google directo + email/password..
 */
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

const SESSION_TOKEN_KEY = "mv-session";

export function rememberSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) localStorage.removeItem(SESSION_TOKEN_KEY);
  else localStorage.setItem(SESSION_TOKEN_KEY, token);
}

/** En el sitio publicado la cookie a veces no sobrevive la recarga. El token sí. */
export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        menor: { type: "boolean", required: false },
        edadConfirmada: { type: "boolean", required: false },
        adultoAvisado: { type: "boolean", required: false },
      },
    }),
  ],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getBearerToken() ?? undefined,
    },
  },
});

/**
 * True cuando la UI de login debe mostrarse.
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/**
 * Inicia sesión con Google (redirect normal, no popup).
 */
export async function signInWithGoogle(callbackURL = "/"): Promise<boolean> {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL,
  });
  if (result.error) return false;
  const url = result.data?.url;
  if (!url || typeof window === "undefined") return false;
  window.location.assign(url);
  return true;
}

/**
 * Cierra sesión y redirige.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    // Si el servidor no contesta, igual hay que borrar el token de este celular.
  }
  rememberSessionToken(null);
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}