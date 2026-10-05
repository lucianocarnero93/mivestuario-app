import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({ component: PrivacidadPage });

function PrivacidadPage() {
  return (
    <main className="px-4 py-5 pb-10">
      <p className="text-sm text-muted">Legal</p>
      <h1 className="text-2xl font-semibold">Política de Privacidad</h1>
      <p className="mt-1 text-xs text-muted">Última actualización: septiembre 2026</p>

      <div className="mt-4 space-y-4 text-sm leading-relaxed">
        <p>
          Mi Vestuario App organiza equipos de fútbol amateur. Esta política explica qué datos
          recolectamos, cómo los usamos y qué control tenés sobre ellos.
        </p>

        <section>
          <h2 className="font-semibold text-fg">1. Qué datos recolectamos</h2>
          <p className="mt-1 text-muted">
            <strong className="text-fg">Cuenta:</strong> nombre, apodo y dirección de email. Si entrás con
            Google, también obtenemos tu nombre y foto de perfil públicos. Al crear la cuenta pedimos la
            fecha de nacimiento para saber si es menor de 18. Esa fecha no se guarda: solo queda si es
            menor o no. No pedimos documento. A las cuentas que ya existían no se les vuelve a preguntar.
          </p>
          <p className="mt-1 text-muted">
            <strong className="text-fg">Equipo:</strong> nombre del equipo, escudo (si lo subís), plantel
            (nombres, apodos, números de camiseta, roles), partidos, formaciones, resultados, goles,
            asistencias y tarjetas.
          </p>
          <p className="mt-1 text-muted">
            <strong className="text-fg">Charla:</strong> mensajes que enviás en el chat del equipo.
          </p>
          <p className="mt-1 text-muted">
            <strong className="text-fg">Ubicación:</strong> solo si el DT o el ayudante tocan "Usar mi
            ubicación" para marcar la cancha. No guardamos historial de GPS ni seguimos el celular en
            segundo plano.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">2. Cómo usamos tus datos</h2>
          <p className="mt-1 text-muted">
            Usamos tus datos solo para que la app funcione: mostrar el plantel, las convocatorias, las
            estadísticas y la charla del equipo. No vendemos datos a terceros ni los usamos para publicidad.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">3. Dónde se guardan</h2>
          <p className="mt-1 text-muted">
            Los datos se guardan en una base de datos PostgreSQL (proveedor Neon) en servidores seguros. En
            el celular queda una copia local para que la app funcione sin conexión.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">4. Quién puede ver los datos</h2>
          <p className="mt-1 text-muted">
            Solo los miembros del equipo que tengan el código de vestuario. El DT y el ayudante pueden
            editar la formación, la planilla y las convocatorias. Los jugadores pueden ver y confirmar
            asistencia. Si el DT comparte el resultado en vivo, quien tenga ese link ve el nombre del
            equipo, el rival, el horario, la cancha y el marcador. No ve jugadores, fotos ni la charla.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">5. Tus derechos</h2>
          <p className="mt-1 text-muted">
            Podés <strong className="text-fg">cambiar tu nombre</strong> desde Seguridad,{" "}
            <strong className="text-fg">salir del equipo</strong> cuando quieras, y{" "}
            <strong className="text-fg">borrar tu cuenta</strong> desde Seguridad. Al borrar tu cuenta se
            eliminan tus datos, tu sesión y tu equipo (si sos el creador). Esta acción no se puede deshacer.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">6. Seguridad</h2>
          <p className="mt-1 text-muted">
            Usamos HTTPS para todas las conexiones. Las contraseñas se guardan hasheadas. Las sesiones usan
            cookies seguras.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">7. Menores de edad</h2>
          <p className="mt-1 text-muted">
            Un menor puede usar la app en el mismo equipo: entrar con el código, confirmar si va y ver la
            formación. No le pedimos foto ni ubicación. No hay chat entre jugadores. Si la fecha indica
            que es menor, queda anotado que un adulto responsable sabe que la usa. El DT lo ve en el
            plantel y puede sacarlo. El permiso de la familia lo gestiona ese adulto. No guardamos la
            fecha de nacimiento ni el documento.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">8. Cambios en esta política</h2>
          <p className="mt-1 text-muted">
            Podemos actualizar esta política. Si hay cambios importantes, te avisamos en la app.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-fg">9. Contacto</h2>
          <p className="mt-1 text-muted">
            Si tenés dudas sobre esta política, escribinos a{" "}
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