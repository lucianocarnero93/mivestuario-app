import { createFileRoute } from "@tanstack/react-router";
import { SignInPanel } from "@/components/fija/sign-in-panel";

type LoginSearch = { error?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  return <SignInPanel authError={error} />;
}
