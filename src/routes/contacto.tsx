import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/contacto")({ component: ContactoPage });

function ContactoPage() {
  return (
    <main className="px-4 py-5 pb-10">
      <p className="text-sm text-muted">Ayuda</p>
      <h1 className="text-2xl font-semibold">Contacto</h1>
      <p className="mt-1 text-sm text-muted">
        ¿Tenés una duda, un problema o una sugerencia? Escribinos y te respondemos lo antes posible.
      </p>

      <section className="mt-6 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Email</h2>
        <a
          href="mailto:contacto@mivestuario.com.ar"
          className="mt-2 block text-base font-semibold text-accent"
        >
          contacto@mivestuario.com.ar
        </a>
        <p className="mt-2 text-xs text-muted">
          Te respondemos en 24-48 horas hábiles.
        </p>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Antes de escribir</h2>
        <p className="mt-2 text-sm text-muted">
          Si es un problema técnico, contanos:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Qué celular y navegador usás.</li>
          <li>Qué intentaste hacer.</li>
          <li>Qué pasó (mensaje de error, si hay).</li>
        </ul>
        <p className="mt-2 text-sm text-muted">
          Si es una sugerencia, contanos qué te gustaría ver en la app.
        </p>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Redes</h2>
        <p className="mt-2 text-sm text-muted">
          Pronto vamos a tener Instagram y X. Por ahora, solo email.
        </p>
      </section>

      <Link to="/seguridad" className="mt-6 flex h-12 items-center font-semibold text-accent">
        Volver a seguridad
      </Link>
    </main>
  );
}