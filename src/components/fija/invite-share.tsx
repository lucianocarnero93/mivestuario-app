import { Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inviteSharePayload, shareOrCopy } from "@/lib/fija/share";
import { useFija } from "@/lib/fija/store";

export function InviteShareButton({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline";
}) {
  const club = useFija((s) => s.club);
  const publishClub = useFija((s) => s.publishClub);
  const cloudError = useFija((s) => s.cloudError);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        className={className ?? "h-14 w-full text-base"}
        disabled={busy}
        onClick={async () => {
          if (!club || busy) return;
          setBusy(true);
          setNote(null);
          const published = await publishClub();
          if (!published) {
            setNote(useFija.getState().cloudError ?? "No se pudo publicar el equipo. Probá de nuevo.");
            setBusy(false);
            return;
          }
          try {
            const result = await shareOrCopy(inviteSharePayload(club));
            setNote(result === "shared" ? "Elegí por dónde enviarlo." : "Enlace copiado. El código ya está en la nube.");
          } catch {
            setNote("El equipo ya está publicado. Podés pasar el código.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Share2 className="size-4" />
        {busy ? "Publicando…" : "Invitar al equipo"}
      </Button>
      {note ? <p className="mt-2 text-center text-xs text-muted">{note}</p> : null}
      {!note && cloudError ? <p className="mt-2 text-center text-xs text-danger">{cloudError}</p> : null}
    </div>
  );
}
