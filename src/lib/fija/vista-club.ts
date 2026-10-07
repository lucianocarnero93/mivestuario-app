import { clasificarAgenda, contarConfirmaciones, rachaInvicto, rachaVoy } from "./fecha.ts";
import { figuraDe, mesDe, vecesFigura } from "./figura.ts";
import { golesEnAnio, partidosValidos, premiosDelMes, premiosDelPartido, type Premio } from "./premios.ts";
import { playerRows, teamRecord } from "./stats.ts";
import type { ClubBundle, ClubEvent } from "./types.ts";
import { avisosDe } from "./vista.ts";

function premioPlano(premio: Premio) {
  return {
    id: premio.id,
    tipo: premio.tipo,
    memberId: premio.memberId,
    eventId: premio.eventId,
    mes: premio.mes,
    titulo: premio.titulo,
    stat: premio.stat,
    n: premio.n,
  };
}

function aniosDe(events: ClubEvent[]): string[] {
  return [...new Set(events.map((event) => event.startsAt.slice(0, 4)))].sort();
}

export function vistaDelClub(bundle: ClubBundle, ahora: number) {
  const events = [...bundle.events].sort((a, b) => a.id.localeCompare(b.id));
  const sheets = bundle.matchSheets;
  const votes = bundle.figuraVotes ?? [];
  const rsvps = bundle.rsvps;
  const players = bundle.members.filter((person) => person.juega ?? person.role === "jugador");
  const ctx = {
    members: bundle.members,
    events: bundle.events,
    sheets,
    votes,
    rsvps,
    club: bundle.club,
    tournaments: bundle.tournaments,
    now: ahora,
  };
  const validos = partidosValidos(bundle.events, sheets);
  const meses = [...new Set(bundle.events.map((event) => mesDe(event.startsAt)).filter(Boolean))].sort();
  const agenda = clasificarAgenda(bundle.events, sheets, ahora);
  const enAgenda = [...agenda.proximos, ...agenda.falta, ...agenda.jugados, ...agenda.entrenamientos];
  const rows = playerRows(sheets, bundle.members);
  const veces = vecesFigura(votes, bundle.events, ahora);

  return {
    rachas: players
      .map((person) => ({
        id: person.id,
        rachaVoy: rachaVoy(bundle.events, rsvps, person.id, sheets),
        vecesFigura: veces.find((row) => row.memberId === person.id)?.veces ?? 0,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    premiosPartido: validos.map((event) => ({
      id: event.id,
      premios: premiosDelPartido(event.id, ctx).map(premioPlano),
    })),
    premiosMes: meses.map((mes) => ({
      mes,
      premios: premiosDelMes(mes, ctx).map(premioPlano),
    })),
    agenda: enAgenda
      .map((event) => {
        const delEvento = rsvps.filter((row) => row.eventId === event.id);
        const confirmaciones = contarConfirmaciones(players, delEvento);
        const van = delEvento
          .filter((row) => row.status === "voy")
          .map((row) => row.memberId)
          .sort();
        return { id: event.id, confirmaciones, van };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
    figuras: events
      .filter((event) => event.kind === "partido")
      .map((event) => ({ id: event.id, figura: figuraDe(votes, event.id) })),
    general: { record: teamRecord(sheets), rows },
    porTorneo: [...bundle.tournaments]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((torneo) => {
        const ids = new Set(bundle.events.filter((event) => event.tournamentId === torneo.id).map((event) => event.id));
        const delTorneo = sheets.filter((sheet) => ids.has(sheet.eventId));
        return { id: torneo.id, record: teamRecord(delTorneo), rows: playerRows(delTorneo, bundle.members) };
      }),
    golesEnAnio: players
      .flatMap((person) =>
        aniosDe(validos).map((anio) => ({
          id: person.id,
          anio,
          goles: golesEnAnio(ctx, validos, person.id, anio),
        })),
      )
      .sort((a, b) => a.id.localeCompare(b.id) || a.anio.localeCompare(b.anio)),
    rachaInvicto: rachaInvicto(sheets, bundle.events),
    avisos: avisosDe({
      now: ahora,
      memberId: players[0]?.id ?? "",
      events: bundle.events,
      votes,
      rows,
      racha: players[0] ? rachaVoy(bundle.events, rsvps, players[0].id, sheets) : 0,
      puestoAsistenciasAntes: null,
    }),
  };
}
