import { useState } from "react";
import { personLabel } from "@/lib/fija/format";
import { useFija, useRespuestas } from "@/lib/fija/store";
import type { ClubEvent, Member } from "@/lib/fija/types";

export function SquadPanel({
  event,
  staff,
  onNotice,
}: {
  event: ClubEvent;
  staff: boolean;
  onNotice: (message: string | null) => void;
}) {
  const members = useFija((s) => s.members);
  const rsvps = useRespuestas();
  const setConvocado = useFija((s) => s.setConvocado);
  const setSuplente = useFija((s) => s.setSuplente);
  const setMemberRsvp = useFija((s) => s.setMemberRsvp);
  const convocarLosQueVan = useFija((s) => s.convocarLosQueVan);
  const byId = new Map(members.map((person) => [person.id, person]));
  const plantel = members.filter((person) => person.juega ?? person.role === "jugador");
  const titulares = new Set(Object.values(event.lineup));
  const banco = (event.suplentes ?? []).filter((id) => !titulares.has(id));
  const convocados = new Set(event.convocados ?? [...titulares, ...banco]);
  const sinAsignar = [...convocados].filter((id) => !titulares.has(id) && !banco.includes(id));
  const [abierto, setAbierto] = useState<"van" | "falta" | "no" | null>(null);

  function actuar(message: string | null) {
    onNotice(message);
  }

  function respuestaDe(personId: string) {
    return rsvps.find((row) => row.eventId === event.id && row.memberId === personId)?.status;
  }

  const visibles = staff ? plantel : plantel.filter((person) => convocados.has(person.id));
  const van = visibles.filter((person) => respuestaDe(person.id) === "voy");
  const noVan = visibles.filter((person) => respuestaDe(person.id) === "no");
  const sinContestar = visibles.filter((person) => respuestaDe(person.id) !== "voy" && respuestaDe(person.id) !== "no");

  function fila(person: Member) {
    const llamado = convocados.has(person.id);
    const donde = titulares.has(person.id) ? "Titular" : banco.includes(person.id) ? "Suplente" : llamado ? "Sin puesto" : "No convocado";
    return (
      <li key={person.id} className="py-1">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm">
            {personLabel(person, plantel)}
            <span className="ml-2 text-xs text-muted">{donde}</span>
          </span>
          {staff ? (
            <button
              type="button"
              className="h-10 shrink-0 rounded-md bg-bg px-3 text-xs font-semibold"
              onClick={() => actuar(setConvocado(event.id, person.id, !llamado))}
            >
              {llamado ? "Sacar" : "Convocar"}
            </button>
          ) : null}
        </div>
        {staff ? (
          <div className="mt-1 grid grid-cols-3 gap-1">
            <button type="button" className="h-10 rounded-md bg-bg text-xs font-semibold" onClick={() => setMemberRsvp(event.id, person.id, "voy")}>
              Va
            </button>
            <button type="button" className="h-10 rounded-md bg-bg text-xs font-semibold" onClick={() => setMemberRsvp(event.id, person.id, "no")}>
              No va
            </button>
            <button type="button" className="h-10 rounded-md bg-bg text-xs font-semibold" onClick={() => setMemberRsvp(event.id, person.id, "pendiente")}>
              Pendiente
            </button>
          </div>
        ) : null}
      </li>
    );
  }

  function grupo(id: "van" | "falta" | "no", titulo: string, gente: Member[]) {
    const abiertoEste = abierto === id;
    return (
      <section className="rounded-xl bg-surface shadow-card">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between px-4 text-left"
          aria-expanded={abiertoEste}
          onClick={() => setAbierto(abiertoEste ? null : id)}
        >
          <span className="text-sm font-semibold">{titulo}</span>
          <span className="text-sm text-muted">{abiertoEste ? "Cerrar" : gente.length}</span>
        </button>
        {abiertoEste && gente.length > 0 ? <ul className="space-y-1 px-4 pb-3">{gente.map(fila)}</ul> : null}
        {abiertoEste && gente.length === 0 ? <p className="px-4 pb-3 text-sm text-muted">Nadie en este grupo.</p> : null}
      </section>
    );
  }

  return (
    <div className="mt-4 space-y-4 desk:mt-0 desk:max-h-[calc(100dvh-8rem)] desk:overflow-y-auto desk:rounded-3xl desk:bg-bg/80 desk:p-4">
      <Bench names={banco.map((id) => byId.get(id)).filter((person): person is Member => Boolean(person))} staff={staff} onRemove={(id) => actuar(setSuplente(event.id, id, false))} />

      {sinAsignar.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-warning">Sin asignar</p>
          <ul className="mt-2 space-y-1">
            {sinAsignar.map((id) => {
              const person = byId.get(id);
              if (!person) return null;
              return (
                <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
                  <span className="truncate text-sm">{person.nick}</span>
                  {staff ? (
                    <button
                      type="button"
                      className="h-10 shrink-0 rounded-md bg-bg px-3 text-xs font-semibold"
                      onClick={() => actuar(setSuplente(event.id, id, true))}
                    >
                      Al banco
                    </button>
                  ) : (
                    <span className="text-xs text-muted">Convocado</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        {staff ? (
          <button
            type="button"
            className="h-11 w-full rounded-md bg-accent text-sm font-semibold text-accent-fg"
            onClick={() => actuar(convocarLosQueVan(event.id))}
          >
            Convocar a los que van
          </button>
        ) : null}
        {grupo("van", "Van", van)}
        {grupo("falta", "Sin contestar", sinContestar)}
        {grupo("no", "No van", noVan)}
      </section>
    </div>
  );
}

function Bench({
  names,
  staff,
  onRemove,
}: {
  names: Member[];
  staff: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Banco de suplentes</p>
      {names.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No hay suplentes.</p>
      ) : (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {names.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                disabled={!staff}
                onClick={() => onRemove(person.id)}
                className="flex w-24 flex-col items-center rounded-lg bg-surface px-2 py-2 text-left disabled:opacity-100"
              >
                <span className="h-2 w-16 rounded-full bg-[#6b4a2b]" />
                <span className="mt-2 h-1.5 w-20 rounded-sm bg-[#8a6239]" />
                <span className="mt-2 w-full truncate text-center text-xs font-semibold">{person.nick}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
