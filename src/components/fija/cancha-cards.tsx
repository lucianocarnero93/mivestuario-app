import { FORMATIONS } from "@/lib/fija/formations";
import type { ClubEvent, Member } from "@/lib/fija/types";
import { MiniCard } from "./mini-card";

function slotsDe(event: ClubEvent) {
  const lista = FORMATIONS[event.modality] ?? [];
  return lista.find((item) => item.id === event.formacion)?.slots ?? lista[0]?.slots ?? [];
}

export function CanchaCards({
  event,
  members,
  staff,
  yoId,
  onCarta,
  alto = 272,
}: {
  event: ClubEvent;
  members: Member[];
  staff: boolean;
  yoId?: string;
  onCarta?: (slot: string) => void;
  alto?: number;
}) {
  const slots = slotsDe(event);
  const persona = (id: string | undefined) => members.find((item) => item.id === id);
  const visto = new Map((event.vistos ?? []).map((item) => [item.memberId, item]));
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a9a4a] to-[#0c5a2a]" style={{ height: alto }}>
      <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
      {slots.map((slot) => {
        const id = event.lineup[slot.key];
        const personaSlot = persona(id);
        const menor = personaSlot?.menor === true;
        const marca = visto.get(id ?? "");
        const estado = staff ? (marca?.entendido ? "ok" : marca ? "vio" : "no") : undefined;
        return (
          <button
            key={slot.key}
            type="button"
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            onClick={() => onCarta?.(slot.key)}
          >
            <MiniCard
              apodo={menor ? personaSlot?.nick ?? "Jugador" : personaSlot?.nick ?? "Libre"}
              dorsal={menor ? null : personaSlot?.number ?? null}
              puesto={slot.label}
              ancho={40}
              yo={id === yoId}
              grande={id === yoId}
              estado={estado}
              atenuada={!id}
            />
          </button>
        );
      })}
    </div>
  );
}

export function BancoChips({
  event,
  members,
  staff,
}: {
  event: ClubEvent;
  members: Member[];
  staff: boolean;
}) {
  const visto = new Map((event.vistos ?? []).map((item) => [item.memberId, item]));
  return (
    <div className="flex gap-2 overflow-x-auto">
      {(event.suplentes ?? []).map((id) => {
        const persona = members.find((item) => item.id === id);
        const marca = visto.get(id);
        const estado = staff ? (marca?.entendido ? "✓" : marca ? "•" : "○") : "";
        return (
          <div key={id} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-xs font-semibold">
            {persona?.menor ? persona.nick.slice(0, 1) : persona?.number ?? "·"}
            {estado ? <span className="text-[9px] text-accent">{estado}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
