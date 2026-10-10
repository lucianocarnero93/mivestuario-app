import { Link } from "@tanstack/react-router";
import { LogoMark } from "./logo";

/** Portada pública. Google tiene que leer para qué es la app sin iniciar sesión. */
export function Portada() {
  return (
    <main className="px-6 py-10">
      <LogoMark className="size-16" />
      <h1 className="mt-5 text-3xl font-semibold">Mi Vestuario</h1>
      <p className="mt-3 text-base leading-relaxed">
        Mi Vestuario es la app de un equipo de fútbol amateur. El cuerpo técnico convoca, arma la
        formación y la pizarra. Los jugadores confirman si van, siguen el partido en vivo y ven la caja
        del equipo.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Cada equipo es privado y se entra con una invitación. La cuenta pide nombre y mail, o Google,
        solo para saber quién sos en el plantel. No es una red social ni muestra datos a quien no está
        en el equipo.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        <li>Convocatoria y confirmación de asistencia.</li>
        <li>Formación, pizarra y resultado del partido.</li>
        <li>Caja del equipo, para repartir la cancha y otros gastos.</li>
      </ul>
      <Link
        to="/login"
        className="mt-6 flex h-14 w-full items-center justify-center rounded-lg bg-accent text-base font-semibold text-accent-fg"
      >
        Entrar
      </Link>
      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link to="/privacidad" className="text-accent">Política de privacidad</Link>
        <Link to="/terminos" className="text-accent">Condiciones del servicio</Link>
        <Link to="/contacto" className="text-accent">Contacto</Link>
      </p>
    </main>
  );
}
