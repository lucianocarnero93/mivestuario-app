import { useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { authEnabled, signInWithGoogle } from "./client";
import { resolveSignInGateState } from "./sign-in-gate";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";
import { signOutAndWipe } from "@/lib/fija/logout";

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present. */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/** Render children only once we KNOW the visitor is signed out. */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/** Client-side redirect to the sign-in route. */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

export function SignInGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const state = resolveSignInGateState({ isPending, hasUser: user !== null });
  if (state === "pending") return null;
  if (state === "signed_in") return <>{children}</>;
  return <>{fallback ?? <SignInButtons />}</>;
}

/** Botones de login alternativos (por si se usan en algún lado). */
export function SignInButtons() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <button
        type="button"
        onClick={() => void signInWithGoogle("/")}
        className="w-full cursor-pointer rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold hover:opacity-90"
      >
        Continuar con Google
      </button>
    </div>
  );
}

/** Chip de identidad + sign-out. */
export function UserButton() {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Cuenta";
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium">{label}</span>
      {authEnabled && (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOutAndWipe().catch(() => setSigningOut(false));
          }}
          className="cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline"
        >
          {signingOut ? "Saliendo…" : "Salir"}
        </button>
      )}
    </div>
  );
}