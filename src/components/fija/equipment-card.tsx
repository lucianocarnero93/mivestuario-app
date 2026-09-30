import { useState } from "react";
import { personLabel } from "@/lib/fija/format";
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
  const [editing, setEditing] = useState(false);

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
    if (!member) return "Desconocido";
    return personLabel(member, members);
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
            </li>
          );
        })}
      </ul>
      {staff ? (
        editing ? (
          <ul className="mt-3 space-y-2">
            {ITEMS.map((item) => {
              const actual = efectivo(item.key);
              return (
                <li key={item.key}>
                  <label className="text-xs text-muted" htmlFor={`eq-${event.id}-${item.key}`}>
                    {item.label}
                  </label>
                  <select
                    id={`eq-${event.id}-${item.key}`}
                    className="mt-1 h-11 w-full rounded-md border border-border bg-surface px-2 text-sm"
                    value={event.equipamiento?.[item.key] ?? ""}
                    onChange={(e) => asignar(event.id, item.key, e.target.value || null)}
                  >
                    <option value="">{actual && !event.equipamiento?.[item.key] ? "Como el partido anterior" : "Sin asignar"}</option>
                    {members.map((m: Member) => (
                      <option key={m.id} value={m.id}>
                        {nombreDe(m.id)}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
            <li>
              <button type="button" className="h-11 text-sm font-semibold text-accent" onClick={() => setEditing(false)}>
                Listo
              </button>
            </li>
          </ul>
        ) : (
          <button type="button" className="mt-2 h-11 text-sm font-semibold text-accent" onClick={() => setEditing(true)}>
            Cambiar quién lleva
          </button>
        )
      ) : (
        <p className="mt-2 text-xs text-muted">Solo el DT y el ayudante cambian quién lleva cada cosa.</p>
      )}
    </div>
  );
}