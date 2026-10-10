import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

const SESSION_TOKEN_KEY = "mv-session";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => conEntrada(request, await auth.handler(request)),
      POST: ({ request }) => auth.handler(request),
    },
  },
});

/**
 * WhatsApp tira la cookie si viene en un redirect. La sesión se guarda en la
 * página y recién ahí se abre el inicio, ya adentro.
 */
function conEntrada(request: Request, response: Response): Response {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/callback/google")) return response;
  if (response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get("location");
  if (!location) return response;
  let destino: URL;
  try {
    destino = new URL(location, request.url);
  } catch {
    return response;
  }
  if (destino.origin !== url.origin || destino.searchParams.has("error")) return response;
  const token = response.headers.get("set-auth-token") ?? "";
  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("referrer-policy", "no-referrer");
  const cookies =
    typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  const path = `${destino.pathname}${destino.search}${destino.hash}` || "/";
  return new Response(paginaDeEntrada(path, token), { status: 200, headers });
}

function paginaDeEntrada(destino: string, token: string): string {
  const data = JSON.stringify({ destino, token, key: SESSION_TOKEN_KEY }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Entrando</title><p style="font-family:sans-serif;padding:24px">Entrando al vestuario…</p><script>try{var p=${data};if(p.token)localStorage.setItem(p.key,p.token);location.replace(p.destino||"/");}catch(e){location.replace("/");}</script>`;
}
