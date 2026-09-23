import { FORMATIONS } from "@/lib/fija/formations";
import { initials } from "@/lib/fija/format";
import type { Member, Modality } from "@/lib/fija/types";
import { cn } from "@/lib/utils";

export function Pitch({
  modality,
  lineup,
  members,
  onSlot,
  editable,
}: {
  modality: Modality;
  lineup: Record<string, string>;
  members: Member[];
  onSlot?: (key: string) => void;
  editable?: boolean;
}) {
  const slots = FORMATIONS[modality];
  const byId = new Map(members.map((m) => [m.id, m]));
  const dense = modality === "f11" || modality === "f9";

  return (
    <div className="relative overflow-hidden rounded-xl bg-linear-to-b from-pitch-top to-pitch-deep shadow-pitch">
      <svg viewBox="0 0 100 140" className="block h-auto w-full text-line/55" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            key={i}
            x="0"
            y={i * 14}
            width="100"
            height="14"
            fill={i % 2 === 0 ? "rgba(255,255,255,0.06)" : "transparent"}
          />
        ))}
        <rect x="5" y="5" width="90" height="130" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <line x1="5" y1="70" x2="95" y2="70" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="70" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="70" r="1.1" fill="currentColor" />
        <rect x="22" y="5" width="56" height="18" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="32" y="5" width="36" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="19" r="1" fill="currentColor" />
        <rect x="22" y="117" width="56" height="18" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="32" y="127" width="36" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="121" r="1" fill="currentColor" />
        <path d="M 5 8 Q 8 8 8 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <path d="M 95 8 Q 92 8 92 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <path d="M 5 132 Q 8 132 8 135" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <path d="M 95 132 Q 92 132 92 135" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </svg>
      <div className="absolute inset-0">
        {slots.map((slot) => {
          const member = byId.get(lineup[slot.key] ?? "");
          const Comp = editable ? "button" : "div";
          return (
            <Comp
              key={slot.key}
              type={editable ? "button" : undefined}
              onClick={editable ? () => onSlot?.(slot.key) : undefined}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <span className="relative">
                <span
                  className={cn(
                    "grid overflow-hidden place-items-center rounded-full border-2 font-bold shadow-md",
                    dense ? "size-9 text-xs" : "size-11 text-xs",
                    member
                      ? "border-line bg-surface text-accent"
                      : "border-dashed border-line/80 bg-bg/35 text-line",
                  )}
                >
                  {member?.photo ? (
                    <img src={member.photo} alt="" className="size-full object-cover" />
                  ) : member ? (
                    (member.number ?? initials(member.name))
                  ) : (
                    slot.label
                  )}
                </span>
                {member?.photo && member.number != null ? (
                  <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-bg text-[9px] text-fg">
                    {member.number}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 max-w-14 truncate text-center text-xs font-semibold text-line drop-shadow">
                {member ? member.nick : editable ? "vacío" : ""}
              </span>
            </Comp>
          );
        })}
      </div>
    </div>
  );
}
