import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { abrirConexion, abrirPago, guardarCodigoMp } from "@/lib/fija/mercadopago";
import { sanitizeCode } from "@/lib/fija/sanitize";

function salir(request: Request, destino: string) {
  const location = destino.startsWith("http") ? destino : new URL(destino, request.url).toString();
  return new Response(null, { status: 302, headers: { location } });
}

export const Route = createFileRoute("/api/mp/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const modo = url.searchParams.get("ir");
        if (modo === "conectar" || modo === "pagar") {
          const user = await getSessionUser();
          const club = sanitizeCode(url.searchParams.get("club") ?? "");
          if (!user || !club) return salir(request, "/caja?mp=error");
          const result =
            modo === "conectar"
              ? await abrirConexion(club, user.id)
              : await abrirPago({
                  code: club,
                  userId: user.id,
                  gastoId: String(url.searchParams.get("gasto") ?? "").slice(0, 40),
                  memberId: String(url.searchParams.get("member") ?? "").slice(0, 80),
                });
          if (result.url) return salir(request, result.url);
          const fallo = result.reason === "sin-mp" ? "sin-clave" : result.reason === "sin-permiso" ? "sin-permiso" : "error";
          return salir(request, `/caja?mp=${fallo}`);
        }
        const ok = await guardarCodigoMp(url.searchParams.get("state") ?? "", url.searchParams.get("code") ?? "");
        return salir(request, ok ? "/caja?mp=ok" : "/caja?mp=error");
      },
    },
  },
});