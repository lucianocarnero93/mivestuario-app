import { createFileRoute } from "@tanstack/react-router";
import { getResponseHeaders } from "@tanstack/react-start/server";
import { parseSetCookieHeader } from "better-auth/cookies";
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
 * Google vuelve con una redirección. El mail, en cambio, guarda el token
 * porque la respuesta le llega al celular. Acá lo copiamos antes de abrir
 * el inicio, si no la app muestra el login otra vez.
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

  const deRespuesta = leerCookies(response.headers);
  const deEvento = leerCookies(headersDelEvento());
  const cookies = deRespuesta.length > 0 ? deRespuesta : deEvento;
  const token =
    response.headers.get("set-auth-token") ||
    tokenDeSesion(deRespuesta) ||
    tokenDeSesion(deEvento);
  if (!token) return response;

  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("referrer-policy", "no-referrer");
  const vistas = new Set<string>();
  for (const cookie of cookies) {
    if (vistas.has(cookie)) continue;
    vistas.add(cookie);
    headers.append("set-cookie", cookie);
  }
  const path = `${destino.pathname}${destino.search}${destino.hash}` || "/";
  return new Response(paginaDeEntrada(path, token), { status: 200, headers });
}

function headersDelEvento(): Headers | null {
  try {
    return getResponseHeaders() as Headers;
  } catch {
    return null;
  }
}

function leerCookies(headers: Headers | null): string[] {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list.length > 0) return list;
  }
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  return parseSetCookieHeader(raw).size > 0 ? [raw] : [];
}

function tokenDeSesion(cookies: string[]): string {
  const parsed = parseSetCookieHeader(cookies.join(", "));
  for (const [name, cookie] of parsed) {
    if (!name.endsWith("session_token")) continue;
    if (cookie["max-age"] === 0) continue;
    if (!cookie.value) continue;
    return cookie.value;
  }
  return "";
}

function paginaDeEntrada(destino: string, token: string): string {
  const data = JSON.stringify({ destino, token, key: SESSION_TOKEN_KEY }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Entrando</title><p style="font-family:sans-serif;padding:24px">Entrando al vestuario…</p><script>(async function(){try{var p=${data};if(p.token)localStorage.setItem(p.key,p.token);if(navigator.serviceWorker){var regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(function(r){return r.unregister();}));}if(window.caches){var keys=await caches.keys();await Promise.all(keys.map(function(k){return caches.delete(k);}));}}catch(e){}location.replace((p&&p.destino)||"/");})();</script>`;
}
