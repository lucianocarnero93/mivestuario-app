import { createFileRoute } from "@tanstack/react-router";
import { guardarCodigoMp } from "@/lib/fija/mercadopago";

export const Route = createFileRoute("/api/mp/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ok = await guardarCodigoMp(url.searchParams.get("state") ?? "", url.searchParams.get("code") ?? "");
        return new Response(null, { status: 302, headers: { location: ok ? "/caja?mp=ok" : "/caja?mp=error" } });
      },
    },
  },
});
