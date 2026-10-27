import { cn } from "@/lib/utils";

type Estado = "ok" | "vio" | "no";

export function MiniCard({
  apodo,
  dorsal,
  puesto,
  ancho = 58,
  yo = false,
  estado,
  bocaAbajo = false,
  atenuada = false,
  grande = false,
}: {
  apodo: string;
  dorsal: number | null;
  puesto: string;
  ancho?: number;
  yo?: boolean;
  estado?: Estado;
  bocaAbajo?: boolean;
  atenuada?: boolean;
  grande?: boolean;
}) {
  const alto = Math.round(ancho * 1.28);
  const marca = estado === "ok" ? "✓" : estado === "vio" ? "•" : estado === "no" ? "○" : null;
  return (
    <div
      className={cn("mv-carta relative shrink-0", atenuada && "opacity-45", yo && "z-10")}
      style={{ width: ancho, height: yo && grande ? Math.round(alto * 1.12) : alto }}
    >
      {yo ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-wide text-accent">VOS</span>
      ) : null}
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[11px] border bg-gradient-to-b from-[#245c3c] to-[#0c2416] shadow-card",
          yo ? "border-accent ring-2 ring-accent" : "border-white/15",
        )}
      >
        {bocaAbajo ? (
          <div className="grid flex-1 place-items-center bg-[#123222] font-display text-2xl text-accent">?</div>
        ) : (
          <>
            <div className="flex items-start justify-between px-1 pt-0.5">
              <span className="font-display text-[15px] font-bold leading-none text-white">{dorsal ?? ""}</span>
              {marca ? <span className="text-[10px] leading-none text-accent">{marca}</span> : null}
            </div>
            <div className="flex-1" />
            <div className="bg-black/55 px-0.5 py-0.5 text-center">
              <p className="truncate text-[8px] font-semibold uppercase leading-tight text-white">{apodo}</p>
              <p className="truncate text-[7px] uppercase leading-tight text-accent">{puesto}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
