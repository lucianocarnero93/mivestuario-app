import { Bell, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hoursSince, whatsAppClaimUrl } from "@/lib/fija/share";
import {
  convocatoriaFor,
  useFija,
  whatsappReady,
} from "@/lib/fija/store";
import type { ClubEvent, Member, RsvpStatus } from "@/lib/fija/types";

export function StaffCallup({ event }: { event: ClubEvent }) {
  const members = useFija((s) => s.members);
  const rsvps = useFija((s) => s.rsvps);
  const club = useFija((s) => s.club);
  const convocatorias = useFija((s) => s.convocatorias);
  const policy = useFija((s) => s.reminderPolicy);
  const sendConvocatoria = useFija((s) => s.sendConvocatoria);
  const sendReminder = useFija((s) => s.sendReminder);
  const reminder = useFija((s) => s.reminder);
  const conv = convocatoriaFor(event.id, convocatorias);
  const eventRsvps = rsvps.filter((r) => r.eventId === event.id);
  const pending = eventRsvps.filter((r) => r.status === "pendiente");
  const ready = conv ? whatsappReady(event.id, convocatorias, policy) : false;
  const players = members.filter((m) => m.role === "jugador");
  const overdue = ready
    ? players.filter(
        (p) => eventRsvps.find((r) => r.memberId === p.id)?.status === "pendiente",
      )
    : [];

  return (
    <section className="mt-5">
      {conv ? (
        <p className="text-xs text-muted">
          Convocatoria enviada hace {Math.floor(hoursSince(conv.sentAt))} h. Primera alerta a las{" "}
          {policy.firstHours} h. WhatsApp a las {policy.secondHours} h.
        </p>
      ) : (
        <p className="text-xs text-muted">Todavía no mandaste la convocatoria de este partido.</p>
      )}

      <Button
        className="mt-3 h-14 w-full text-base"
        onClick={() => sendConvocatoria(event.id)}
      >
        <Bell className="size-4" />
        {conv ? "Reenviar convocatoria" : "Enviar convocatoria"}
      </Button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-12"
          disabled={pending.length === 0}
          onClick={() => sendReminder(event.id)}
        >
          {reminder?.eventId === event.id ? "Alerta enviada" : "Alertar ahora"}
        </Button>
        <PolicyDialog />
      </div>

      {overdue.length > 0 ? (
        <div className="mt-4 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-warning">
            Sin respuesta · {policy.secondHours} h
          </p>
          <ul className="mt-2 divide-y divide-border">
            {overdue.map((player) => (
              <li key={player.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-sm font-medium">{player.nick}</span>
                <a
                  href={club ? whatsAppClaimUrl(player, event, club) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-1 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg"
                >
                  <MessageCircle className="size-3.5" />
                  WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function PolicyDialog() {
  const policy = useFija((s) => s.reminderPolicy);
  const setReminderPolicy = useFija((s) => s.setReminderPolicy);
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(String(policy.firstHours));
  const [second, setSecond] = useState(String(policy.secondHours));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFirst(String(policy.firstHours));
          setSecond(String(policy.secondHours));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12">
          Plazos
        </Button>
      </DialogTrigger>
      <DialogContent title="Plazos de respuesta">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setReminderPolicy({
              firstHours: Number(first),
              secondHours: Number(second),
            });
            setOpen(false);
          }}
        >
          <p className="text-sm text-muted">
            Si el jugador no responde, a las primeras horas llega una segunda alerta. Después se
            habilita el reclamo por WhatsApp.
          </p>
          <div>
            <Label htmlFor="first-h">Segunda alerta (horas)</Label>
            <Input
              id="first-h"
              className="mt-1"
              inputMode="numeric"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="second-h">WhatsApp de reclamo (horas)</Label>
            <Input
              id="second-h"
              className="mt-1"
              inputMode="numeric"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-12 w-full">
            Guardar plazos
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmGroups({
  players,
  eventRsvps,
}: {
  players: Member[];
  eventRsvps: { memberId: string; status: RsvpStatus }[];
}) {
  const groups: { status: RsvpStatus; title: string; tone: string }[] = [
    { status: "pendiente", title: "Sin responder", tone: "text-warning" },
    { status: "voy", title: "Van", tone: "text-accent" },
    { status: "no", title: "No juegan", tone: "text-danger" },
  ];

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group) => {
        const rows = players.filter(
          (p) => (eventRsvps.find((r) => r.memberId === p.id)?.status ?? "pendiente") === group.status,
        );
        if (rows.length === 0) return null;
        return (
          <div key={group.status} className="overflow-hidden rounded-xl bg-surface shadow-card">
            <p className={`px-4 pt-3 text-xs font-semibold uppercase tracking-widest ${group.tone}`}>
              {group.title}
            </p>
            <ul className="divide-y divide-border">
              {rows.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {p.number ? `${p.number} · ` : ""}
                    {p.nick}
                  </span>
                  <span className={`text-xs font-semibold ${group.tone}`}>
                    {group.status === "voy" ? "Va" : group.status === "no" ? "No" : "Pendiente"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
