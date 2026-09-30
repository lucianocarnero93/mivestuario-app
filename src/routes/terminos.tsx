import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terminos")({ component: TerminosPage });

function TerminosPage() {
  return (
    <main className="px-4 py-5 pb-10">
      <p className="text-sm text-muted">Legal</p>
      <h1 className="text-2xl font-semibold">Términos y Condiciones</h1>
      <p className="mt-1 text-xs text-muted">Última actualización: septiembre 2026</p>

      <div className="mt-4 space-y-4 text-sm leading-relaxed">
        <section>
          <h2 className="font-semibold text-fg">1. Aceptación</h2>
          <p className="mt-1 text-muted">
            Al usar Mi Vestuario App, aceptás estos términos. Si no estás de acuerdo, no uses la app.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">2. Uso de la app</h2>
          <p className="mt-1 text-muted">
            Mi Vestuario App es una herramienta para organizar equipos de fútbol amateur. Podés usarla
            para crear equipos, convocar jugadores, armar formaciones, llevar estadísticas y chatear con
            tu equipo.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">3. Tu cuenta</h2>
          <p className="mt-1 text-muted">
            Sos responsable de mantener la seguridad de tu cuenta. No compartas tu contraseña ni tu código
            de vestuario con personas ajenas al equipo.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">4. Contenido</h2>
          <p className="mt-1 text-muted">
            El contenido que subís (nombres, mensajes, estadísticas) es tuyo. No lo usamos para otros fines
            que no sean el funcionamiento de la app.
          </p>
          <p className="mt-1 text-muted">
            No está permitido subir contenido ofensivo, discriminatorio o ilegal. Nos reservamos el derecho
            de eliminar contenido y suspender cuentas que violen esto.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">5. Disponibilidad</h2>
          <p className="mt-1 text-muted">
            Hacemos lo posible para que la app funcione siempre, pero no garantizamos disponibilidad
            ininterrumpida. Podemos hacer mantenimiento o actualizaciones sin previo aviso.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">6. Limitación de responsabilidad</h2>
          <p className="mt-1 text-muted">
            Mi Vestuario App no se hace responsable por daños indirectos, pérdida de datos o problemas
            derivados del uso de la app. Usala bajo tu propio riesgo.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">7. Cambios en los términos</h2>
          <p className="mt-1 text-muted">
            Podemos actualizar estos términos. Si hay cambios importantes, te avisamos en la app.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">8. Contacto</h2>
          <p className="mt-1 text-muted">
            Si tenés dudas sobre estos términos, escribinos a{" "}
            <a href="mailto:contacto@mivestuario.com.ar" className="text-accent underline">
              contacto@mivestuario.com.ar
            </a>{" "}
            o por Instagram en{" "}
            <a
              href="https://www.instagram.com/mivestuario.app"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              @mivestuario.app
            </a>
            .
          </p>
        </section>
      </div>

      <Link to="/seguridad" className="mt-6 flex h-12 items-center font-semibold text-accent">
        Volver a seguridad
      </Link>
    </main>
  );
}