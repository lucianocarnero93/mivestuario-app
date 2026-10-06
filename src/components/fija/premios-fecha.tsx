import { PremioMini } from "@/components/fija/premio-card";
import { useContextoPremios } from "@/components/fija/use-premios";
import { useIsStaff } from "@/lib/fija/store";
import {
  esPrimerValidoDelMes,
  estadoFigura,
  mesAnterior,
  nombreMes,
  partidosValidos,
  premiosDelMes,
  premiosDelPartido,
  textoVotacionAbierta,
} from "@/lib/fija/premios";
import { mesDe } from "@/lib/fija/figura";
import type { ClubEvent } from "@/lib/fija/types";

export function PremiosFecha({ event }: { event: ClubEvent }) {
  const staff = useIsStaff();
  const ctx = useContextoPremios();
  if (event.fechaOculta && !staff) return null;
  if (!partidosValidos(ctx.events, ctx.sheets).some((item) => item.id === event.id)) return null;
  const delPartido = premiosDelPartido(event.id, ctx);
  const abierta = estadoFigura(event, ctx.votes, ctx.now ?? Date.now()) === "abierta";
  const mes = mesDe(event.startsAt);
  const anterior = mesAnterior(mes);
  const delMes = esPrimerValidoDelMes(event.id, ctx.events, ctx.sheets) ? premiosDelMes(anterior, ctx) : [];
  if (!abierta && delPartido.length === 0 && delMes.length === 0) return null;

  return (
    <section className="mt-5">
      {abierta || delPartido.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Premios de la fecha</h3>
          {abierta ? <p className="mt-2 text-sm">{textoVotacionAbierta(event)}</p> : null}
          {delPartido.length > 0 ? (
            <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {delPartido.map((premio) => (
                <PremioMini key={premio.id} premio={premio} ctx={ctx} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {delMes.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Premios de {nombreMes(anterior)}</h3>
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {delMes.map((premio) => (
              <PremioMini key={premio.id} premio={premio} ctx={ctx} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
