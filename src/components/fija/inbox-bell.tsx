import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatTime } from "@/lib/fija/format";
import { inboxVisible, useFija, useMe } from "@/lib/fija/store";
import type { InboxItem } from "@/lib/fija/types";
import { cn } from "@/lib/utils";

const KIND_LABEL = {
  convocatoria: "Convocatoria",
  recordatorio: "Recordatorio",
  formacion: "Pizarra",
  charla: "Charla técnica",
} as const;

export function InboxBell() {
  const me = useMe();
  const inbox = useFija((s) => s.inbox);
  const rsvps = useFija((s) => s.rsvps);
  const markInboxRead = useFija((s) => s.markInboxRead);
  const markAllRead = useFija((s) => s.markAllRead);
  const [open, setOpen] = useState(false);
  const items = useMemo(
    () =>
      inbox
        .filter((item) => inboxVisible(item, me, rsvps))
        .sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [inbox, me, rsvps],
  );
  const unread = items.filter((item) => !item.readBy.includes(me.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="relative grid size-11 place-items-center rounded-md text-fg hover:bg-surface-2"
          aria-label="Alertas del vestuario"
        >
          <Bell className="size-5" />
          {unread.length > 0 ? (
            <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-fg">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent title="Alertas">
        {items.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay avisos en el vestuario.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-auto">
            {items.map((item) => (
              <li key={item.id}>
                <InboxRow
                  item={item}
                  unread={!item.readBy.includes(me.id)}
                  onOpen={() => {
                    markInboxRead(item.id);
                    setOpen(false);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {unread.length > 0 ? (
          <Button variant="ghost" className="mt-3 h-11 w-full" onClick={() => markAllRead()}>
            Marcar todo leído
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InboxRow({
  item,
  unread,
  onOpen,
}: {
  item: InboxItem;
  unread: boolean;
  onOpen: () => void;
}) {
  const href =
    item.kind === "formacion"
      ? "/cancha"
      : item.kind === "charla"
        ? "/chat"
        : "/";
  return (
    <Link
      to={href}
      search={href === "/chat" ? { title: undefined, text: undefined, url: undefined } : undefined}
      onClick={onOpen}
      className={cn(
        "block rounded-lg px-3 py-3",
        unread ? "bg-surface-2" : "bg-bg",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {KIND_LABEL[item.kind]}
      </p>
      <p className="mt-1 text-sm font-medium">{item.title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.body}</p>
      <p className="mt-1 text-xs text-subtle">{formatTime(item.at)}</p>
    </Link>
  );
}
