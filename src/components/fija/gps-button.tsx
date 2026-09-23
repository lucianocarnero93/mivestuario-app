import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapsQueryFromFix, queryGpsPermission, readGpsFix } from "@/lib/fija/gps";
import { useFija } from "@/lib/fija/store";

export function GpsLocateButton({
  onFix,
}: {
  onFix: (value: { mapsQuery: string; lat: number; lng: number }) => void;
}) {
  const consent = useFija((s) => s.gpsConsent);
  const setGpsConsent = useFija((s) => s.setGpsConsent);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  async function locate() {
    setBusy(true);
    setHint("");
    try {
      const permission = await queryGpsPermission();
      if (permission === "unavailable") {
        setHint("Este celular no da GPS.");
        return;
      }
      if (consent !== "granted") {
        setGpsConsent("granted");
      }
      const fix = await readGpsFix();
      onFix({ mapsQuery: mapsQueryFromFix(fix), lat: fix.lat, lng: fix.lng });
      setHint("Ubicación lista. Se abre Mapas, no queda un mapa acá.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "denied") {
        setGpsConsent("denied");
        setHint("GPS bloqueado. Activalo en Ajustes del celular.");
      } else {
        setHint(message || "No se pudo leer el GPS.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        className="h-12 w-full"
        disabled={busy || consent === "denied"}
        onClick={() => void locate()}
      >
        <LocateFixed className="size-4" />
        {busy ? "Buscando GPS…" : "Usar mi ubicación"}
      </Button>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
