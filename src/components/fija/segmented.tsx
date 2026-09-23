import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-1 rounded-lg bg-surface p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "h-11 rounded-md px-1 text-xs font-semibold leading-tight",
            value === opt.id ? "bg-accent text-accent-fg" : "text-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
