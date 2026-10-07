import { createFileRoute } from "@tanstack/react-router";
import { escudoDelLink } from "@/lib/fija/cloud";

export const Route = createFileRoute("/api/vivo/escudo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const data = await escudoDelLink({
          t: url.searchParams.get("t") ?? "",
          e: url.searchParams.get("e") ?? "",
        });
        const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(data ?? "");
        if (!match) return new Response("no", { status: 404 });
        const bytes = Buffer.from(match[2], "base64");
        return new Response(bytes, {
          headers: {
            "content-type": match[1],
            "cache-control": "public, max-age=60",
          },
        });
      },
    },
  },
});
