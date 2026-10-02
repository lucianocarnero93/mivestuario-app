import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/eliminar-cuenta")({ component: EliminarCuentaPage });

function EliminarCuentaPage() {
  return (
    <main className="px-4 py-5 pb-10">
      <p className="text-sm text-muted">Cuenta</p>
      <h1 className="text-2xl font-semibold">Eliminar la cuenta</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        En Mi Vestuario podés borrar tu cuenta vos mismo. No hace falta escribirnos.
      </p>

      <section className="mt-6">
        <h2 className="font-semibold text-fg">Cómo hacerlo</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Entrá a la app con tu mail o con Google.</li>
          <li>Tocá el candado de arriba, en Seguridad.</li>
          <li>Bajá hasta Zona peligrosa y tocá Borrar cuenta.</li>
          <li>Confirmá con Sí, borrar mi cuenta.</li>
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-fg">Qué se borra</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Se eliminan el mail, la contraseña, la sesión, la foto y los avisos del celular. No se puede
          deshacer.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-fg">Qué queda</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          El equipo no se borra. Tu nombre puede quedar en el plantel, sin la cuenta, para que las
          estadísticas del equipo sigan. Los partidos y la charla son del equipo y se mantienen.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-fg">Si no podés entrar</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Escribinos a{" "}
          <a href="mailto:contacto@mivestuario.com.ar" className="text-accent underline">
            contacto@mivestuario.com.ar
          </a>{" "}
          desde el mail de la cuenta y pedí que la borremos.
        </p>
      </section>
    </main>
  );
}
