import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PhoneShell } from "@/components/fija/phone-shell";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Mi Vestuario App" },
      { name: "theme-color", content: "#0b1c12" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Vestuario" },
      {
        name: "description",
        content: "El vestuario de tu equipo amateur. Convocatorias, pizarra, fecha y stats.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Caveat:wght@500;600&family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="es" className="antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function recargar(){try{if(sessionStorage.getItem("vestuario-reload")==="1"){aviso();return}sessionStorage.setItem("vestuario-reload","1")}catch(e){}location.reload()}function aviso(){if(document.getElementById("vestuario-roto"))return;var nodo=document.createElement("p");nodo.id="vestuario-roto";nodo.textContent="La página quedó en una versión vieja. Recargá con el botón del navegador.";nodo.setAttribute("style","position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:#0b1c12;color:#eef6ef;text-align:center;font:16px/1.4 sans-serif");(document.body||document.documentElement).appendChild(nodo)}window.addEventListener("vite:preloadError",function(event){event.preventDefault();recargar()});window.addEventListener("unhandledrejection",function(event){var reason=event.reason;var message=reason&&(reason.message||String(reason))||"";if(message.indexOf("dynamically imported module")===-1&&message.indexOf("module script failed")===-1)return;event.preventDefault();recargar()})})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <PhoneShell />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}