import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tiendas")({ component: TiendasPage });

function TiendasPage() {
  return (
    <main className="px-4 py-5">
      <p className="text-sm text-muted">Publicación</p>
      <h1 className="text-2xl font-semibold">App Store</h1>
      <p className="mt-2 text-sm text-muted">
        La app ya se puede instalar desde Safari. Para venderla en la App Store Apple pide un paquete nativo
        y una cuenta de desarrollador. Eso no se sube desde acá.
      </p>

      <section className="mt-4 space-y-2 rounded-xl bg-surface p-4 text-sm shadow-card">
        <p className="font-semibold">Hecho en la app</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Icono, manifiesto e instalación en el inicio.</li>
          <li>Inicio sin el cartel de modo prueba.</li>
          <li>GPS explicado y política de privacidad.</li>
          <li>Pizarra, planilla, torneos y vestuario: no es una página vacía.</li>
        </ul>
      </section>

      <ol className="mt-4 space-y-3 text-sm">
        <Step n="1" title="Cuenta Apple Developer">
          Entrá a developer.apple.com/programs y pagá el programa (99 USD al año). Sin esa cuenta no existe
          ficha ni subida. La revisión del alta puede tardar uno o dos días.
        </Step>
        <Step n="2" title="Mac con Xcode">
          El paquete de iOS solo se compila en una Mac, con Xcode 26 o posterior. Un celular o esta preview
          no alcanzan para generar el archivo que App Store Connect acepta.
        </Step>
        <Step n="3" title="Publicar la web y no moverla">
          Publicá esta app y dejá esa dirección fija. El envoltorio de la tienda abre esa misma URL.
          Si cambia, la app de la tienda queda apuntando al sitio viejo.
        </Step>
        <Step n="4" title="Generar el proyecto iOS">
          En pwabuilder.com pegá la URL publicada y descargá el paquete iOS. Usá estos datos:
        </Step>
      </ol>

      <dl className="mt-3 space-y-2 rounded-xl bg-surface p-4 text-sm shadow-card">
        <Row k="Nombre" v="Mi Vestuario App" />
        <Row k="Bundle ID" v="app.mivestuario" />
        <Row k="Categoría" v="Deportes" />
        <Row k="Color" v="#0b1c12" />
        <Row
          k="Ubicación"
          v="Para marcar la cancha del partido y abrir Mapas. No rastreamos tu ubicación."
        />
      </dl>

      <ol className="mt-4 space-y-3 text-sm" start={5}>
        <Step n="5" title="App Store Connect">
          Creá la ficha, subí capturas de iPhone, pegá el enlace de Privacidad de la URL publicada y marcá
          que no hay seguimiento entre apps. La ubicación es opcional y solo mientras se usa la app.
        </Step>
        <Step n="6" title="Subir y esperar revisión">
          En Xcode: Archive y Distribute a App Store. Apple tarda de un día a una semana. Puede rechazarla
          si la lee como un sitio web metido en un navegador. La pizarra y la planilla son la utilidad que
          hay que mostrar en las capturas y en la descripción.
        </Step>
      </ol>

      <Link to="/privacidad" className="mt-6 flex h-12 items-center font-semibold text-accent">
        Ver privacidad
      </Link>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: string }) {
  return (
    <li className="rounded-xl bg-surface p-4 shadow-card">
      <p className="font-semibold">
        {n}. {title}
      </p>
      <p className="mt-1 text-muted">{children}</p>
    </li>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}