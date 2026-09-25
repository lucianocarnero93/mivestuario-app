/**
 *   Better Auth client para el SPA. Google directo + email/password..
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/**
 * True cuando la UI de login debe mostrarse.
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/**
 * Inicia sesión con Google (redirect normal, no popup).
 */
export async function signInWithGoogle(callbackURL = "/"): Promise<void> {
  await authClient.signIn.social({
    provider: "google",
    callbackURL,
  });
}

/**
 * Cierra sesión y redirige.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  await authClient.signOut();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}

/** En el sitio publicado la sesión viaja en la cookie. No hay token aparte. */
export function getBearerToken(): string | null {
  return null;
}