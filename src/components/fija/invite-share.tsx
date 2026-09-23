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
  const [note, setNote] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        className={className ?? "h-14 w-full text-base"}
        onClick={async () => {
          if (!club) return;
          try {
            const result = await shareOrCopy(inviteSharePayload(club));
            setNote(result === "shared" ? "Elegí por dónde enviarlo." : "Enlace copiado.");
          } catch {
            setNote(null);
          }
        }}
      >
        <Share2 className="size-4" />
        Invitar al equipo
      </Button>
      {note ? <p className="mt-2 text-center text-xs text-muted">{note}</p> : null}
    </div>
  );
}
