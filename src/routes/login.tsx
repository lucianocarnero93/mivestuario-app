import { createFileRoute, Link } from "@tanstack/react-router";
import { SignInPanel } from "@/components/fija/sign-in-panel";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <p className="grid min-h-dvh place-items-center text-sm text-muted">Abriendo el vestuario…</p>;
  }
  if (user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Ya entraste</h1>
        <p className="mt-2 text-sm text-muted">La sesión de este celular sigue abierta.</p>
        <Link to="/" className="mt-6 flex h-12 items-center font-semibold text-accent">
          Ir al vestuario
        </Link>
      </main>
    );
  }
  return <SignInPanel />;
}
