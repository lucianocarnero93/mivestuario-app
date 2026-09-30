import { formatWhen } from "./format";
import type { ClubEvent } from "./types";

const APP = "Mi Vestuario App";

export async function notifyApp(input: {
  title?: string;
  body: string;
  tag: string;
  eventId?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  try {
    const permission = Notification.permission;
    if (permission !== "granted") return;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vestuario-notifications-granted"));
    }

    const title = input.title ?? APP;
    const icon = "/icon-192.png";

    if (navigator.serviceWorker?.getRegistration) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body: input.body,
          icon,
          badge: icon,
          tag: input.tag,
          lang: "es-AR",
          data: { eventId: input.eventId },
        });
        return;
      }
    }

    new Notification(title, {
      body: input.body,
      icon,
      badge: icon,
      tag: input.tag,
      lang: "es-AR",
    });
  } catch {
    // iOS Safari, WebView without the plugin, or insecure context
  }
}

export async function notifyReminder(event: ClubEvent | undefined): Promise<void> {
  if (!event) return;
  await notifyApp({
    body: `Confirmá ${event.title} · ${formatWhen(event.startsAt)}`,
    tag: `vestuario-${event.id}`,
    eventId: event.id,
  });
}
