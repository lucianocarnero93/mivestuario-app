import { createFileRoute } from "@tanstack/react-router";
import { VivoPantalla } from "@/components/fija/vivo-pagina";
import { resolverMarcador } from "@/lib/fija/cloud";
import { cspVivo, descripcionCompartida, tituloCompartido, type MarcadorPublico } from "@/lib/fija/vivo";

const SITIO = "https://www.mivestuario.com.ar";

export const Route = createFileRoute("/vivo")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
    e: typeof search.e === "string" ? search.e : "",
  }),
  loaderDeps: ({ search }) => ({ t: search.t, e: search.e }),
  loader: async ({ deps }): Promise<MarcadorPublico> => {
    if (!deps.t && !deps.e) return { ok: false, reason: "missing" };
    let ua = "";
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      ua = getRequest()?.headers?.get("user-agent") ?? "";
    } catch {
      ua = "";
    }
    return resolverMarcador(deps, ua);
  },
  head: ({ loaderData, match }) => {
    const search = match.search as { t?: string; e?: string };
    const q = search.e ? `e=${encodeURIComponent(search.e)}` : `t=${encodeURIComponent(search.t ?? "")}`;
    const title = loaderData?.ok && !loaderData.sinPartido ? tituloCompartido(loaderData) : "Mi Vestuario";
    const description = descripcionCompartida();
    const image = `${SITIO}/api/og/vivo?${q}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
        { httpEquiv: "Content-Security-Policy", content: cspVivo() },
      ],
    };
  },
  component: VivoRoute,
});

function VivoRoute() {
  const { t, e } = Route.useSearch();
  const inicial = Route.useLoaderData();
  return <VivoPantalla t={t} e={e} inicial={inicial} />;
}
