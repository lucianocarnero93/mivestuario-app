import { Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inviteSharePayload, shareOrCopy } from "@/lib/fija/share";
import { useFija } from "@/lib/fija/store";

const FAIL = "No se pudo invitar. Fijate la conexión y tocalo de nuevo.";

export function InviteShareButton({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline";
}) {
  const club = useFija((s) => s.club);
  const publishClub = useFija((s) => s.publishClub);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        className={className ?? "h-14 w-full text-base"}
        disabled={busy || !club}
        onClick={async () => {
          if (!club || busy) return;
          setBusy(true);
          setNote(null);
          if (useFija.getState().cloudStatus !== "ok") {
            const published = await publishClub();
            if (!published) {
              setNote(FAIL);
              setBusy(false);
              return;
            }
          }
          try {
            const result = await shareOrCopy(inviteSharePayload(useFija.getState().club ?? club));
            setNote(result === "copied" ? "Enlace copiado." : null);
          } catch (error) {
            const cancelled = error instanceof DOMException && error.name === "AbortError";
            if (!cancelled) setNote(FAIL);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Share2 className="size-4" />
        Invitar al equipo
      </Button>
      {note ? (
        <p className={`mt-2 text-center text-xs ${note === FAIL ? "text-danger" : "text-muted"}`}>{note}</p>
      ) : null}
    </div>
  );
}
