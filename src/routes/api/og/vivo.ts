import { createFileRoute } from "@tanstack/react-router";
import { readFileSync } from "node:fs";
import { resolverMarcador, escudoDelLink } from "@/lib/fija/cloud";
import { esCrawler } from "@/lib/fija/vivo";
import { pngVivo } from "@/lib/fija/og-vivo";

const cache = new Map<string, { at: number; png: Uint8Array }>();

function ogEstatico(): Response {
  try {
    const bytes = readFileSync(new URL("../../../../public/og.jpg", import.meta.url));
    return new Response(bytes, {
      headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=60" },
    });
  } catch {
    return new Response(null, { status: 302, headers: { location: "/og.jpg" } });
  }
}

export const Route = createFileRoute("/api/og/vivo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const t = url.searchParams.get("t") ?? "";
        const e = url.searchParams.get("e") ?? "";
        const clave = e ? `e:${e}` : `t:${t}`;
        const guardado = cache.get(clave);
        if (guardado && Date.now() - guardado.at < 60_000) {
          return new Response(Buffer.from(guardado.png), {
            headers: { "content-type": "image/png", "cache-control": "public, max-age=60" },
          });
        }
        try {
          const ua = request.headers.get("user-agent") ?? "";
          const marcador = await resolverMarcador({ t, e }, esCrawler(ua) ? ua : "facebookexternalhit");
          if (!marcador.ok) return ogEstatico();
          const crest = marcador.escudo ? await escudoDelLink({ t, e }).catch(() => null) : null;
          const png = pngVivo(marcador, crest);
          cache.set(clave, { at: Date.now(), png });
          return new Response(Buffer.from(png), {
            headers: { "content-type": "image/png", "cache-control": "public, max-age=60" },
          });
        } catch {
          return ogEstatico();
        }
      },
    },
  },
});
