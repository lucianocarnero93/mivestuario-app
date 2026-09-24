import { useFija, useIsStaff } from "@/lib/fija/store";
import type { ClubEvent, ItemEquipamiento, Member } from "@/lib/fija/types";

const ITEMS: { key: ItemEquipamiento; label: string; icon: string }[] = [
  { key: "remeras", label: "Remeras", icon: "👕" },
  { key: "pelotas", label: "Pelotas", icon: "⚽" },
];

export function EquipmentCard({ event }: { event: ClubEvent }) {
  const members = useFija((s) => s.members);
  const asignar = useFija((s) => s.asignarEquipamiento);
  const ultimo = useFija((s) => s.ultimoEquipamiento);
  const staff = useIsStaff();

  if (event.kind !== "partido") return null;

  // El valor efectivo: lo asignado en este partido, o el último que lo llevó.
  function efectivo(item: ItemEquipamiento): string | null {
    const asignado = event.equipamiento?.[item];
    if (asignado) return asignado;
    return ultimo(event.id, item);
  }

  function nombreDe(memberId: string | null): string {
    if (!memberId) return "Sin asignar";
    const member = members.find((m) => m.id === memberId);
    return member?.nick ?? member?.name ?? "Desconocido";
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-bg p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        🧳 Equipamiento
      </p>
      <ul className="mt-2 space-y-2">
        {ITEMS.map((item) => {
          const actual = efectivo(item.key);
          const heredado = !event.equipamiento?.[item.key] && actual;
          return (
            <li key={item.key} className="flex items-center justify-between gap-2">
              <span className="text-sm">
                <span className="mr-1">{item.icon}</span>
                <span className="text-muted">{item.label}:</span>{" "}
                <span className="font-medium">{nombreDe(actual)}</span>
                {heredado ? (
                  <span className="ml-1 text-xs text-muted">(del partido anterior)</span>
                ) : null}
              </span>
              {staff ? (
                <select
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                  value={actual ?? ""}
                  onChange={(e) => asignar(event.id, item.key, e.target.value || null)}
                >
                  <option value="">Sin asignar</option>
                  {members.map((m: Member) => (
                    <option key={m.id} value={m.id}>
                      {m.nick ?? m.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!staff ? (
        <p className="mt-2 text-xs text-muted">
          Solo el DT y el ayudante pueden cambiar quién lleva cada cosa.
        </p>
      ) : null}
    </div>
  );
}