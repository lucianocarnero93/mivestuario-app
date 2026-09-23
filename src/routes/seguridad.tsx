import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { queryGpsPermission, type GpsPermission } from "@/lib/fija/gps";
import { useFija, useMe } from "@/lib/fija/store";

export const Route = createFileRoute("/seguridad")({ component: SeguridadPage });

const GPS_LABEL: Record<GpsPermission, string> = {
  unknown: "Sin consultar",
  prompt: "El sistema va a preguntar",
  granted: "Permitido",
  denied: "Bloqueado en el celular",
  unavailable: "No disponible",
};

function SeguridadPage() {
  const me = useMe();
  const consent = useFija((s) => s.gpsConsent);
  const setGpsConsent = useFija((s) => s.setGpsConsent);
  const leaveClub = useFija((s) => s.leaveClub);
  const club = useFija((s) => s.club);
  const cloudStatus = useFija((s) => s.cloudStatus);
  const flushCloud = useFija((s) => s.flushCloud);
  const syncFromCloud = useFija((s) => s.syncFromCloud);
  const [gps, setGps] = useState<GpsPermission>("unknown");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    void queryGpsPermission().then(setGps);
  }, []);

  return (
    <main className="px-4 py-5">
      <p className="text-sm text-muted">Permisos y salida</p>
      <h1 className="text-2xl font-semibold">Seguridad</h1>
      <p className="mt-1 text-sm text-muted">
        Pedimos ubicación solo cuando el DT marca la cancha. No hay mapa adentro ni seguimiento en segundo plano.
      </p>

      <section className="mt-5 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">GPS</h2>
        <p className="mt-2 text-sm">Estado del sistema: {GPS_LABEL[gps]}</p>
        <p className="mt-1 text-sm text-muted">
          Consentimiento en la app:{" "}
          {consent === "granted" ? "aceptado" : consent === "denied" ? "rechazado" : "pendiente"}
        </p>
        <div className="mt-3 grid gap-2">
          <Button
            className="h-12"
            onClick={() => {
              setGpsConsent("granted");
              void queryGpsPermission().then(setGps);
            }}
          >
            Permitir ubicación para la cancha
          </Button>
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => {
              setGpsConsent("denied");
              setGps("denied");
            }}
          >
            No usar GPS
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Si el celular lo bloqueó, hay que habilitarlo en Ajustes → Ubicación → Mi Vestuario.
        </p>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Nube</h2>
        <p className="mt-2 text-sm text-muted">
          El vestuario se guarda en la base de la app publicada. En el celular queda una copia. Google
          Firebase no se puede abrir desde acá; esta nube sale con la publicación.
        </p>
        <p className="mt-2 text-sm">
          Estado:{" "}
          {cloudStatus === "ok"
            ? "sincronizado"
            : cloudStatus === "syncing"
              ? "subiendo"
              : cloudStatus === "off"
                ? "solo este celular"
                : "en espera"}
        </p>
        <div className="mt-3 grid gap-2">
          <Button variant="secondary" className="h-12" onClick={() => void syncFromCloud()}>
            Traer de la nube
          </Button>
          {club ? (
            <Button variant="outline" className="h-12" onClick={() => void flushCloud()}>
              Guardar ahora
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Datos</h2>
        <p className="mt-2 text-sm text-muted">
          El plantel vive en este celular y se copia a la nube. No mandamos GPS en vivo. El chat se limpia
          de código extraño. Solo DT y ayudante cargan planilla y pizarra.
        </p>
        <Link to="/privacidad" className="mt-3 flex h-12 items-center font-semibold text-accent">
          Política de privacidad
        </Link>
        <Link to="/tiendas" className="flex h-12 items-center font-semibold text-accent">
          Pasos para la App Store
        </Link>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Cuenta</h2>
        <p className="mt-2 text-sm text-muted">La sesión de Google de este celular.</p>
        <div className="mt-3">
          <UserButton />
        </div>
      </section>

      {club ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Salir del equipo</h2>
          <p className="mt-2 text-sm text-muted">
            {me.nick}, podés irte de {club.name} y entrar a otro con un código, o crear el tuyo. El DT, el
            ayudante y el jugador tienen la misma salida.
          </p>
          {leaving ? (
            <div className="mt-3 grid gap-2">
              <Button variant="danger" className="h-12" onClick={() => leaveClub()}>
                Sí, salir de {club.name}
              </Button>
              <Button variant="ghost" className="h-12" onClick={() => setLeaving(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="mt-3 h-12 w-full" onClick={() => setLeaving(true)}>
              Salir del equipo
            </Button>
          )}
        </section>
      ) : null}
    </main>
  );
}
