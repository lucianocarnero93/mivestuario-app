import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatWhen } from "@/lib/fija/format";
import { rachaVoy } from "@/lib/fija/fecha";
import { playerRows } from "@/lib/fija/stats";
import { avisosDe, posicionRanking } from "@/lib/fija/vista";
import { inboxVisible, useFija, useRespuestas, useMe } from "@/lib/fija/store";
import type { InboxItem, InboxKind } from "@/lib/fija/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<InboxKind, string> = {
  convocatoria: "Convocatoria",
  recordatorio: "Recordatorio",
  formacion: "Pizarra",
  charla: "Charla técnica",
  equipamiento: "Equipamiento",
  caja: "Caja",
};

export function InboxBell() {
  const me = useMe();
  const inbox = useFija((s) => s.inbox);
  const rsvps = useRespuestas();
  const events = useFija((s) => s.events);
  const sheets = useFija((s) => s.matchSheets);
  const members = useFija((s) => s.members);
  const votes = useFija((s) => s.figuraVotes);
  const markInboxRead = useFija((s) => s.markInboxRead);
  const markAllRead = useFija((s) => s.markAllRead);
  const [open, setOpen] = useState(false);
  const [vistos, setVistos] = useState<string[]>([]);
  const avisos = useMemo(() => {
    const cerradas = sheets.filter((sheet) => events.some((event) => event.id === sheet.eventId && event.resultClosedAt));
    const rows = playerRows(cerradas, members);
    const asistencias = posicionRanking(
      me.id,
      rows.map((row) => ({ memberId: row.memberId, valor: row.assists })),
    );
    let antes: number | null = null;
    try {
      const guardado = localStorage.getItem(`mv-puesto-asist:${me.id}`);
      antes = guardado ? Number(guardado) : null;
      if (asistencias && antes == null) localStorage.setItem(`mv-puesto-asist:${me.id}`, String(asistencias.puesto));
    } catch {
      antes = null;
    }
    return avisosDe({
      now: Date.now(),
      memberId: me.id,
      events,
      votes: votes ?? [],
      rows,
      racha: rachaVoy(events, rsvps, me.id, sheets),
      puestoAsistenciasAntes: antes,
    }).filter((aviso) => {
      try {
        return localStorage.getItem(`mv-aviso:${aviso.id}`) !== "1";
      } catch {
        return !vistos.includes(aviso.id);
      }
    });
  }, [events, me.id, members, rsvps, sheets, vistos, votes]);
  const items = useMemo(
    () => {
      const seen = new Set<string>();
      return inbox
        .filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return inboxVisible(item, me, rsvps);
        })
        .sort((a, b) => +new Date(b.at) - +new Date(a.at));
    },
    [inbox, me, rsvps],
  );
  const unread = items.filter((item) => !item.readBy.includes(me.id)).length + avisos.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="relative grid size-11 place-items-center rounded-md text-fg hover:bg-surface-2"
          aria-label="Alertas del vestuario"
        >
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-fg">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent title="Alertas">
        {items.length === 0 && avisos.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay avisos en el vestuario.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-auto">
            {avisos.map((aviso) => (
              <li key={aviso.id}>
                <a
                  href={aviso.href}
                  className="block rounded-lg bg-surface-2 px-3 py-3"
                  onClick={() => {
                    try {
                      localStorage.setItem(`mv-aviso:${aviso.id}`, "1");
                      const asistencias = posicionRanking(
                        me.id,
                        playerRows(
                          sheets.filter((sheet) => events.some((event) => event.id === sheet.eventId && event.resultClosedAt)),
                          members,
                        ).map((row) => ({ memberId: row.memberId, valor: row.assists })),
                      );
                      if (asistencias) localStorage.setItem(`mv-puesto-asist:${me.id}`, String(asistencias.puesto));
                    } catch {
                      // El aviso igual se cierra en esta sesión.
                    }
                    setVistos((lista) => [...lista, aviso.id]);
                    setOpen(false);
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">Fecha</p>
                  <p className="mt-1 text-sm font-medium">{aviso.title}</p>
                </a>
              </li>
            ))}
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
        {items.some((item) => !item.readBy.includes(me.id)) ? (
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
        : item.kind === "caja"
          ? "/caja"
          : "/";
  const search =
    href === "/chat"
      ? { title: undefined, text: undefined, url: undefined }
      : href === "/caja"
        ? { mp: undefined }
        : undefined;
  return (
    <Link
      to={href}
      search={search}
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
      <p className="mt-1 text-xs text-subtle">{formatWhen(item.at)}</p>
    </Link>
  );
}
