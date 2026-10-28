import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PhoneShell } from "@/components/fija/phone-shell";
import { DEMO } from "@/lib/fija/demo-flag";
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
      ...(DEMO ? [{ name: "robots", content: "noindex" }] : []),
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

const recuperarVersion = `(function(){
  var KEY="vestuario-reload";
  function modulo(message){
    return message.indexOf("dynamically imported module")!==-1||message.indexOf("module script failed")!==-1||message.indexOf("Importing a module script failed")!==-1;
  }
  function limpiar(){
    var trabajos=[];
    try{
      if(navigator.serviceWorker){
        trabajos.push(navigator.serviceWorker.getRegistrations().then(function(regs){
          return Promise.all(regs.map(function(reg){return reg.unregister()}));
        }));
      }
      if(window.caches){
        trabajos.push(caches.keys().then(function(keys){
          return Promise.all(keys.map(function(key){return caches.delete(key)}));
        }));
      }
    }catch(e){}
    return Promise.race([
      Promise.all(trabajos).catch(function(){}),
      new Promise(function(resolve){setTimeout(resolve,1200)})
    ]);
  }
  function entrar(){
    var url=location.pathname+location.search;
    url+=(url.indexOf("?")===-1?"?":"&")+"nuevo="+Date.now();
    location.replace(url);
  }
  function aviso(){
    if(document.getElementById("vestuario-roto"))return;
    var caja=document.createElement("div");
    caja.id="vestuario-roto";
    caja.setAttribute("style","position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:#0b1c12;color:#eef6ef;text-align:center;font:16px/1.4 sans-serif");
    var texto=document.createElement("p");
    texto.textContent="La página se quedó con una copia vieja.";
    var boton=document.createElement("button");
    boton.type="button";
    boton.textContent="Entrar de nuevo";
    boton.setAttribute("style","height:48px;padding:0 20px;border:0;border-radius:12px;background:#b8f25a;color:#0b1c12;font:600 16px sans-serif");
    boton.onclick=function(){
      try{sessionStorage.removeItem(KEY)}catch(e){}
      limpiar().then(entrar,entrar);
    };
    caja.appendChild(texto);
    caja.appendChild(boton);
    (document.body||document.documentElement).appendChild(caja);
  }
  function recuperar(){
    var ahora=Date.now();
    var previo=0;
    try{previo=Number(sessionStorage.getItem(KEY)||"0")}catch(e){}
    if(previo&&ahora-previo<20000){aviso();return}
    try{sessionStorage.setItem(KEY,String(ahora))}catch(e){}
    limpiar().then(entrar,entrar);
  }
  window.addEventListener("vite:preloadError",function(event){event.preventDefault();recuperar()});
  window.addEventListener("unhandledrejection",function(event){
    var reason=event.reason;
    var message=reason&&(reason.message||String(reason))||"";
    if(!modulo(message))return;
    event.preventDefault();
    recuperar();
  });
})();`;

function RootDocument() {
  return (
    <html lang="es" className="antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: recuperarVersion,
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