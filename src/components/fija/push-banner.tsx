import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { inboxVisible, useFija, useRespuestas, useMe } from "@/lib/fija/store";

export function PushBanner() {
  const me = useMe();
  const reminder = useFija((s) => s.reminder);
  const events = useFija((s) => s.events);
  const rsvps = useRespuestas();
  const inbox = useFija((s) => s.inbox);
  const setRsvp = useFija((s) => s.setRsvp);
  const dismiss = useFija((s) => s.dismissReminder);
  const markInboxRead = useFija((s) => s.markInboxRead);
  const savedMine = useFija((s) => s.savedMine);
  const cloudError = useFija((s) => s.cloudError);
  const flushCloud = useFija((s) => s.flushCloud);

  const reminderEvent = reminder ? events.find((e) => e.id === reminder.eventId) : undefined;
  const mine = reminderEvent
    ? rsvps.find((r) => r.eventId === reminderEvent.id && r.memberId === me.id)
    : undefined;
  const saved = reminderEvent ? savedMine[reminderEvent.id] : undefined;
  const pending = !mine || mine.status === "pendiente";
  const waiting =
    Boolean(mine) && (mine?.status === "voy" || mine?.status === "no") && saved !== mine?.status;
  const past = reminderEvent ? +new Date(reminderEvent.startsAt) < Date.now() - 3_600_000 : false;
  const showLegacy =
    Boolean(reminderEvent) && !past && (me.juega ?? me.role === "jugador") && (pending || waiting);

  function answerLabel(status: "voy" | "no", on: string, off: string) {
    if (mine?.status !== status) return off;
    if (saved === status) return on;
    return cloudError ? `${off} · no se guardó` : `${off} · guardando…`;
  }

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
              <Button className="h-12" variant="success" onClick={() => setRsvp(reminderEvent.id, "voy")}>
                {answerLabel("voy", "Voy ✓", "Voy")}
              </Button>
              <Button className="h-12" variant="danger" onClick={() => setRsvp(reminderEvent.id, "no")}>
                {answerLabel("no", "No voy ✕", "No voy")}
              </Button>
            </div>
            {waiting && cloudError ? (
              <p className="mt-2 text-xs">
                {cloudError}{" "}
                <button type="button" className="h-10 font-semibold underline" onClick={() => void flushCloud()}>
                  Reintentar
                </button>
              </p>
            ) : null}
            <button type="button" className="mt-2 h-11 text-xs underline" onClick={dismiss}>
              Después
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unread = inbox
    .filter((item, index) => inbox.findIndex((other) => other.id === item.id) === index)
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

export function AvisosPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  if (permission !== "default") return null;

  return (
    <div className="mx-3 mt-3 rounded-lg border border-border bg-surface px-3 py-3 shadow-card">
      <p className="text-sm">Si no activás los avisos, no te llega la convocatoria al celular.</p>
      <Button
        className="mt-3 h-12 w-full"
        onClick={() => {
          void Notification.requestPermission()
            .then((result) => {
              setPermission(result);
              if (result === "granted") {
                window.dispatchEvent(new Event("vestuario-notifications-granted"));
              }
            })
            .catch(() => setPermission("denied"));
        }}
      >
        Activar avisos
      </Button>
    </div>
  );
}
