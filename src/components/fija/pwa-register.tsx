import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useFija } from "@/lib/fija/store";

type LaunchFile = { getFile: () => Promise<File> };
type LaunchParams = {
  targetURL?: string;
  files?: readonly LaunchFile[];
};
type AppPath = "/" | "/agenda" | "/cancha" | "/chat" | "/equipo" | "/stats" | "/seguridad" | "/privacidad" | "/tiendas";

declare global {
  interface Window {
    launchQueue?: { setConsumer: (cb: (params: LaunchParams) => void) => void };
  }
  interface ServiceWorkerRegistration {
    periodicSync?: {
      register: (tag: string, options?: { minInterval: number }) => Promise<void>;
    };
    sync?: { register: (tag: string) => Promise<void> };
  }
}

const PROTOCOL_MAP: Record<string, AppPath> = {
  "/": "/",
  home: "/",
  inicio: "/",
  agenda: "/agenda",
  cancha: "/cancha",
  pizarra: "/cancha",
  chat: "/chat",
  charla: "/chat",
  equipo: "/equipo",
  stats: "/stats",
  estadisticas: "/stats",
  seguridad: "/seguridad",
  permisos: "/seguridad",
  gps: "/seguridad",
};

function isAppPath(path: string): path is AppPath {
  return (
    path === "/" ||
    path === "/agenda" ||
    path === "/cancha" ||
    path === "/chat" ||
    path === "/equipo" ||
    path === "/stats" ||
    path === "/seguridad" ||
    path === "/privacidad" ||
    path === "/tiendas"
  );
}

export function PwaRegister() {
  const navigate = useNavigate();
  const router = useRouter();
  const importSnapshot = useFija((s) => s.importSnapshot);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => {
        if (cancelled) return;
        try {
          await registration.update();
        } catch {
          /* ignore */
        }
        try {
          await registration.sync?.register("vestuario-sync");
        } catch {
          /* SyncManager not available */
        }
        try {
          await registration.periodicSync?.register("vestuario-refresh", {
            minInterval: 60 * 60 * 1000,
          });
        } catch {
          /* Periodic Sync not available */
        }
      })
      .catch(() => {
        /* insecure context / blocked */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const protocol = params.get("protocol");
    if (!protocol) return;

    const path = pathFromProtocol(protocol);
    params.delete("protocol");
    const rest = params.toString();
    window.history.replaceState({}, "", path + (rest ? `?${rest}` : ""));
    if (path !== window.location.pathname) {
      void navigate({ to: path });
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queue = window.launchQueue;
    if (!queue?.setConsumer) return;

    queue.setConsumer(async (launchParams) => {
      const files = launchParams.files ?? [];
      for (const handle of files) {
        try {
          const file = await handle.getFile();
          const text = await file.text();
          importSnapshot(JSON.parse(text) as unknown);
        } catch {
          /* skip unreadable files */
        }
      }
      if (launchParams.targetURL) {
        try {
          const url = new URL(launchParams.targetURL);
          const mapped = pathFromProtocol(url.href);
          void navigate({ to: mapped });
        } catch {
          /* ignore */
        }
      }
    });
  }, [importSnapshot, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "vestuario-sync" && event.data?.type !== "cancha-fija-sync") return;
      void router.invalidate();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      void navigator.serviceWorker?.ready.then((reg) => reg.sync?.register("vestuario-sync"));
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}

function pathFromProtocol(raw: string): AppPath {
  try {
    const cleaned = raw
      .replace(/^web\+vestuario:\/\//i, "https://mi.vestuario/")
      .replace(/^web\+canchafija:\/\//i, "https://cancha.fija/");
    const url = new URL(cleaned);
    const host = url.hostname.replace(/^www\./, "");
    const first = (url.pathname.replace(/^\//, "") || host || "").split("/")[0] ?? "";
    const key = first.toLowerCase();
    if (PROTOCOL_MAP[key]) return PROTOCOL_MAP[key];
    if (PROTOCOL_MAP[host]) return PROTOCOL_MAP[host];
    if (isAppPath(url.pathname)) return url.pathname;
  } catch {
    const fallback = raw.replace(/^web\+(vestuario|canchafija):\/\/*/i, "").split("?")[0] ?? "";
    if (PROTOCOL_MAP[fallback]) return PROTOCOL_MAP[fallback];
  }
  return "/";
}
