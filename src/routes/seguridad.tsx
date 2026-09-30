import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
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
  const members = useFija((s) => s.members);
  const club = useFija((s) => s.club);
  const cloudStatus = useFija((s) => s.cloudStatus);
  const flushCloud = useFija((s) => s.flushCloud);
  const syncFromCloud = useFija((s) => s.syncFromCloud);
  const [gps, setGps] = useState<GpsPermission>("unknown");
  const [avisos, setAvisos] = useState<NotificationPermission | "unsupported">("unsupported");
  const [leaving, setLeaving] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  // Cambiar nombre
  const [newName, setNewName] = useState(me.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

  // Borrar cuenta
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  useEffect(() => {
    void queryGpsPermission().then(setGps);
    if (typeof Notification === "undefined") setAvisos("unsupported");
    else setAvisos(Notification.permission);
  }, []);

  async function handleSaveName() {
    const clean = newName.trim();
    if (clean.length < 2) {
      setNameMessage("El nombre tiene que tener al menos 2 letras.");
      return;
    }
    setSavingName(true);
    setNameMessage("");
    const result = await authClient.updateUser({ name: clean });
    setSavingName(false);
    if (result.error) {
      setNameMessage("No se pudo guardar. Probá de nuevo.");
    } else {
      setNameMessage("¡Listo! Nombre actualizado.");
      // Refrescar la sesión para que la app vea el nuevo nombre
      if (typeof window !== "undefined") {
        setTimeout(() => window.location.reload(), 800);
      }
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteMessage("");
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        setDeleteMessage("No se pudo borrar la cuenta. Probá de nuevo.");
        setDeletingAccount(false);
      } else if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch {
      setDeleteMessage("No se pudo borrar la cuenta. Probá de nuevo.");
      setDeletingAccount(false);
    }
  }

  return (
    <main className="px-4 py-5">
      <p className="text-sm text-muted">Permisos y salida</p>
      <h1 className="text-2xl font-semibold">Seguridad</h1>
      <p className="mt-1 text-sm text-muted">
        Pedimos ubicación solo cuando el DT marca la cancha. No hay mapa adentro ni seguimiento en segundo plano.
      </p>

      <section className="mt-5 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">GPS</h2>
        {me.menor ? (
          <p className="mt-2 text-sm text-muted">No pedimos tu ubicación.</p>
        ) : (
          <>
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
          </>
        )}
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Avisos</h2>
        <p className="mt-2 text-sm">
          {avisos === "granted"
            ? "Los avisos están activados. Te llega la convocatoria al celular."
            : avisos === "denied"
              ? "Los avisos están bloqueados. Sin eso no te llega la convocatoria."
              : avisos === "unsupported"
                ? "Este navegador no muestra avisos."
                : "Si no los activás, te perdés la convocatoria."}
        </p>
        {avisos === "default" ? (
          <Button
            className="mt-3 h-12 w-full"
            onClick={() => {
              void Notification.requestPermission()
                .then((result) => {
                  setAvisos(result);
                  if (result === "granted") {
                    window.dispatchEvent(new Event("vestuario-notifications-granted"));
                  }
                })
                .catch(() => setAvisos("denied"));
            }}
          >
            Activar avisos
          </Button>
        ) : null}
        {avisos === "denied" ? (
          <p className="mt-2 text-xs text-muted">
            Habilitalos en el candado del navegador, en Ajustes del sitio, y recargá.
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Nube</h2>
        <p className="mt-2 text-sm text-muted">
          El vestuario se guarda en la base de la app publicada. En el celular queda una copia.
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
          El plantel está en la nube: el DT y los jugadores ven la misma lista. No mandamos GPS en vivo.
          Solo el DT y el ayudante cargan la planilla y la pizarra.
        </p>
        <Link to="/privacidad" className="mt-3 flex h-12 items-center font-semibold text-accent">
  Política de privacidad
</Link>
<Link to="/terminos" className="flex h-12 items-center font-semibold text-accent">
  Términos y condiciones
</Link>
<Link to="/contacto" className="flex h-12 items-center font-semibold text-accent">
  Contacto
</Link>
      </section>

      {/* ─── Cuenta ─── */}
      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Cuenta</h2>
        <p className="mt-2 text-sm text-muted">La sesión de este celular.</p>
        <div className="mt-3">
          <UserButton />
        </div>

        {/* Cambiar nombre */}
        <div className="mt-4 border-t border-border pt-4">
          <label className="block text-sm font-semibold">Cambiar nombre</label>
          <p className="mt-1 text-xs text-muted">Es el nombre que ven tus compañeros en el equipo.</p>
          <input
            className="mt-2 flex h-12 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Tu nombre"
          />
          {nameMessage ? <p className="mt-2 text-sm text-muted">{nameMessage}</p> : null}
          <Button
            className="mt-3 h-12 w-full"
            onClick={() => void handleSaveName()}
            disabled={savingName || newName.trim() === (me.name ?? "")}
          >
            {savingName ? "Guardando…" : "Guardar nombre"}
          </Button>
        </div>
      </section>

      {/* ─── Salir del equipo ─── */}
      {club ? (
        <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Salir del equipo</h2>
          <p className="mt-2 text-sm text-muted">
            {members.length <= 1
              ? "Sos el único del equipo: si salís, el equipo se borra."
              : `${me.nick}, podés irte de ${club.name} y entrar a otro con un código, o crear el tuyo.`}
          </p>
          {leaveError ? <p className="mt-2 text-sm text-danger">{leaveError}</p> : null}
          {leaving ? (
            <div className="mt-3 grid gap-2">
              <Button
                variant="danger"
                className="h-12"
                disabled={leaveBusy}
                onClick={() => {
                  setLeaveBusy(true);
                  setLeaveError("");
                  void leaveClub().then((result) => {
                    setLeaveBusy(false);
                    if (!result.ok) setLeaveError(result.error || "No pudimos sacarte del equipo. Probá de nuevo.");
                  });
                }}
              >
                {leaveBusy ? "Saliendo…" : `Sí, salir de ${club.name}`}
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

      {/* ─── Zona peligrosa: borrar cuenta ─── */}
      <section className="mt-4 rounded-xl border border-danger/30 bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-danger">Zona peligrosa</h2>
        <p className="mt-2 text-sm text-muted">
          Si borrás tu cuenta, se eliminan tus datos, tu sesión y tu equipo (si sos el creador).
          Esta acción no se puede deshacer.
        </p>
        {confirmDelete ? (
          <div className="mt-3 grid gap-2">
            <p className="text-sm font-semibold text-danger">¿Estás seguro?</p>
            <Button
              variant="danger"
              className="h-12"
              onClick={() => void handleDeleteAccount()}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Borrando…" : "Sí, borrar mi cuenta"}
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="mt-3 h-12 w-full"
            onClick={() => setConfirmDelete(true)}
          >
            Borrar mi cuenta
          </Button>
        )}
        {deleteMessage ? <p className="mt-2 text-sm text-danger">{deleteMessage}</p> : null}
      </section>
    </main>
  );
}