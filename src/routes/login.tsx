import { createFileRoute } from "@tanstack/react-router";
import { SignInPanel } from "@/components/fija/sign-in-panel";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  return <SignInPanel />;
}
