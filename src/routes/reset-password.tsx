import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordRedirect,
});

function ResetPasswordRedirect() {
  useEffect(() => {
    const next = new URL("/reset", window.location.origin);
    next.search = window.location.search;
    window.location.replace(`${next.pathname}${next.search}`);
  }, []);
  return null;
}
