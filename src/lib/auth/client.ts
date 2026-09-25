/**
 * Better Auth client para el SPA. Google directo + email/password.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  fetchOptions: {
    credentials: "include",
  },
});

/**
 * True cuando la UI de login debe mostrarse.
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://www.mivestuario.com.ar";
}

/**
 * Inicia sesión con Google (redirect normal, no popup).
 */
export async function signInWithGoogle(callbackURL = "/"): Promise<void> {
  await authClient.signIn.social({
    provider: "google",
    callbackURL,
    errorCallbackURL: "/login",
    newUserCallbackURL: callbackURL,
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
