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
 * El mail guarda el token al responder el fetch. Google vuelve con una
 * redirección y esa respuesta no llega al celular. Si hay sesión, la
 * dejamos en la página y recién ahí abrimos el inicio.
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
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const token = tokenDeSesion(cookies) || response.headers.get("set-auth-token") || "";
  if (!token) return response;
  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("referrer-policy", "no-referrer");
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  const path = `${destino.pathname}${destino.search}${destino.hash}` || "/";
  return new Response(paginaDeEntrada(path, token), { status: 200, headers });
}

function tokenDeSesion(cookies: string[]): string {
  for (const cookie of cookies) {
    const semi = cookie.indexOf(";");
    const pair = semi === -1 ? cookie : cookie.slice(0, semi);
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    if (!name.endsWith("session_token")) continue;
    if (/max-age=0/i.test(cookie)) continue;
    const value = pair.slice(eq + 1).trim();
    if (!value) continue;
    try {
      return value.includes("%") ? decodeURIComponent(value) : value;
    } catch {
      return value;
    }
  }
  return "";
}

function paginaDeEntrada(destino: string, token: string): string {
  const data = JSON.stringify({ destino, token, key: SESSION_TOKEN_KEY }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Entrando</title><p style="font-family:sans-serif;padding:24px">Entrando al vestuario…</p><script>try{var p=${data};if(p.token)localStorage.setItem(p.key,p.token);location.replace(p.destino||"/");}catch(e){location.replace("/");}</script>`;
}
