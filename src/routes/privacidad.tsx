import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({ component: PrivacidadPage });

function PrivacidadPage() {
  return (
    <main className="px-4 py-5">
      <p className="text-sm text-muted">Legal</p>
      <h1 className="text-2xl font-semibold">Privacidad</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
        <p>
          Mi Vestuario App organiza equipos amateur. El plantel, la planilla y la charla se guardan en el
          celular y se copian a la base de la app cuando el equipo tiene un código de vestuario.
        </p>
        <p>
          <strong className="text-fg">Qué se guarda.</strong> Apodos, números de camiseta, roles, goles,
          asistencias, tarjetas, resultados y mensajes del vestuario. No pedimos documento, mail ni cuenta
          de Apple.
        </p>
        <p>
          <strong className="text-fg">Ubicación.</strong> Solo se usa si el DT o el ayudante tocan “Usar mi
          ubicación” para marcar la cancha. No hay mapa dentro de la app: se abre Mapas del teléfono. No
          guardamos un historial de GPS ni seguimos el celular en segundo plano.
        </p>
        <p>
          <strong className="text-fg">Notificaciones.</strong> Las alertas de convocatoria se piden con
          consentimiento. Se pueden apagar en el sistema. No las usamos para publicidad.
        </p>
        <p>
          <strong className="text-fg">Cuenta.</strong> No hay login. El código de vestuario es la llave para
          entrar a un equipo. Quien tenga el código puede ver ese plantel.
        </p>
        <p>
          <strong className="text-fg">Menores.</strong> La app es para fútbol amateur. Si hay menores, el
          adulto responsable debe gestionar el equipo.
        </p>
        <p>
          <strong className="text-fg">Para la App Store.</strong> No rastreamos entre apps ni vendemos datos.
          La ubicación, si se permite, es “cuando se usa la app”, solo para anotar la cancha.
        </p>
      </div>
      <Link to="/seguridad" className="mt-6 flex h-12 items-center font-semibold text-accent">
        Volver a seguridad
      </Link>
    </main>
  );
}
