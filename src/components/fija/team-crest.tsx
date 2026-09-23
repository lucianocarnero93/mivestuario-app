import { useState } from "react";
import { readCrestFile } from "@/lib/fija/crest";
import { cn } from "@/lib/utils";

export function TeamCrest({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  const letter = (name?.trim().charAt(0) || "E").toUpperCase();
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-accent font-semibold text-accent-fg",
        className,
      )}
    >
      {letter}
    </span>
  );
}

export function CrestPicker({
  src,
  name,
  onChange,
  chooseLabel = "Elegir escudo o foto",
  emptyHint = "Del celular. Se recorta en círculo.",
}: {
  src?: string | null;
  name?: string;
  onChange: (crest: string | null) => void;
  chooseLabel?: string;
  emptyHint?: string;
}) {
  const [error, setError] = useState("");

  return (
    <div className="flex items-center gap-3">
      <TeamCrest src={src} name={name} className="size-16 text-xl" />
      <div className="min-w-0 flex-1">
        <label className="flex h-12 cursor-pointer items-center justify-center rounded-lg bg-surface text-sm font-semibold">
          {chooseLabel}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setError("");
              void readCrestFile(file).then((crest) => {
                if (!crest) {
                  setError("No se pudo usar esa imagen. Probá con otra foto.");
                  return;
                }
                onChange(crest);
              });
            }}
          />
        </label>
        {src ? (
          <button type="button" className="mt-1 h-8 text-xs text-muted underline" onClick={() => onChange(null)}>
            Quitar foto
          </button>
        ) : (
          <p className="mt-1 text-xs text-muted">{emptyHint}</p>
        )}
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
