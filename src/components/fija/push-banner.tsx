import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { inboxVisible, useFija, useMe } from "@/lib/fija/store";

export function PushBanner() {
  const me = useMe();
  const reminder = useFija((s) => s.reminder);
  const events = useFija((s) => s.events);
  const rsvps = useFija((s) => s.rsvps);
  const inbox = useFija((s) => s.inbox);
  const setRsvp = useFija((s) => s.setRsvp);
  const dismiss = useFija((s) => s.dismissReminder);
  const markInboxRead = useFija((s) => s.markInboxRead);

  const reminderEvent = reminder ? events.find((e) => e.id === reminder.eventId) : undefined;
  const mine = reminderEvent
    ? rsvps.find((r) => r.eventId === reminderEvent.id && r.memberId === me.id)
    : undefined;
  const showLegacy =
    Boolean(reminderEvent) && me.role === "jugador" && (!mine || mine.status === "pendiente");

  if (showLegacy && reminderEvent) {
    return (
      <div className="mx-3 mt-3 rounded-lg bg-accent px-3 py-3 text-accent-fg shadow-lg">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide">Recordatorio del DT</p>
            <p className="mt-1 text-sm font-medium leading-snug">
              Falta tu respuesta para {reminderEvent.title}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                className="h-12 bg-accent-fg text-accent hover:opacity-90"
                onClick={() => setRsvp(reminderEvent.id, "voy")}
              >
                Confirmar
              </Button>
              <Button
                className="h-12 border-accent-fg/30 bg-transparent text-accent-fg"
                variant="outline"
                onClick={() => setRsvp(reminderEvent.id, "no")}
              >
                No juego
              </Button>
            </div>
            <button type="button" className="mt-2 h-11 text-xs underline" onClick={dismiss}>
              Después
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unread = inbox
    .filter((item) => inboxVisible(item, me, rsvps) && !item.readBy.includes(me.id))
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))[0];

  if (!unread) return null;

  const href =
    unread.kind === "formacion" ? "/cancha" : unread.kind === "charla" ? "/chat" : "/";

  return (
    <div className="mx-3 mt-3 rounded-lg border border-border bg-surface px-3 py-3 shadow-card">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">{unread.title}</p>
          <p className="mt-1 text-sm leading-snug text-fg">{unread.body}</p>
          <div className="mt-2 flex gap-2">
            <Button asChild variant="secondary" className="h-11 flex-1" onClick={() => markInboxRead(unread.id)}>
              <Link
                to={href}
                search={
                  href === "/chat" ? { title: undefined, text: undefined, url: undefined } : undefined
                }
              >
                Abrir
              </Link>
            </Button>
            <button
              type="button"
              className="h-11 px-3 text-xs text-muted underline"
              onClick={() => markInboxRead(unread.id)}
            >
              Ocultar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
