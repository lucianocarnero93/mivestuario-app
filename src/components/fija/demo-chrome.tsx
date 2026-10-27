import { useEffect, useState } from "react";
import { DEMO } from "@/lib/fija/demo-flag";
import { avisarDemo, escucharDemo } from "@/lib/fija/demo-aviso";
import { ponerRolDemo, useFija } from "@/lib/fija/store";

export function DemoChrome() {
  const activeId = useFija((s) => s.activeId);
  const [aviso, setAviso] = useState<string | null>(null);
  const dt = activeId === "profe";

  useEffect(() => {
    if (!DEMO) return;
    const dejar = escucharDemo(setAviso);
    const abrir = window.open.bind(window);
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const href = String(url ?? "");
      if (href.includes("wa.me") || href.includes("whatsapp")) {
        let texto = href;
        try {
          texto = new URL(href).searchParams.get("text") ?? href;
        } catch {
          texto = href;
        }
        avisarDemo(texto);
        return null;
      }
      return abrir(url, target, features);
    }) as typeof window.open;
    const compartir = typeof navigator.share === "function" ? navigator.share.bind(navigator) : null;
    if (compartir) {
      navigator.share = async (data) => {
        avisarDemo(data?.text || data?.title || data?.url || "");
      };
    }
    return () => {
      dejar();
      window.open = abrir;
      if (compartir) navigator.share = compartir;
    };
  }, []);

  if (!DEMO) return null;

  return (
    <div className="z-40 shrink-0 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-phone items-center justify-between gap-3 px-3 py-2 desk:max-w-none">
        <p className="text-xs text-muted">Datos de ejemplo · DT | Jugador</p>
        <div className="flex gap-1">
          <button
            type="button"
            className={`h-10 rounded-full px-3 text-sm font-semibold ${dt ? "bg-accent text-accent-fg" : "bg-bg text-fg"}`}
            onClick={() => ponerRolDemo("dt")}
          >
            DT
          </button>
          <button
            type="button"
            className={`h-10 rounded-full px-3 text-sm font-semibold ${dt ? "bg-bg text-fg" : "bg-accent text-accent-fg"}`}
            onClick={() => ponerRolDemo("jugador")}
          >
            Jugador
          </button>
        </div>
      </div>
      {aviso ? (
        <div className="mx-auto max-w-phone px-3 pb-3 desk:max-w-none">
          <p className="whitespace-pre-wrap rounded-2xl bg-bg px-3 py-3 text-sm">{aviso}</p>
          <button type="button" className="mt-2 h-10 text-sm font-semibold text-accent" onClick={() => setAviso(null)}>
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
