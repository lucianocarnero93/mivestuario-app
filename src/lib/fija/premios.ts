import { estaJugado } from "./fecha.ts";
import { figuraDe, liderDelMes, mesDe, votacionAbierta, FIGURA_CIERRE_HORAS } from "./figura.ts";
import { inicialesDe, imagenDe, type ImagenPersona } from "./imagen.ts";
import { alumniMember, teamRecord } from "./stats.ts";
import { nombreEnTarjeta, puestoEnTarjeta } from "./tarjeta.ts";
import { initials } from "./format.ts";
import type { AvatarPersona } from "./avatar.ts";
import type { Club, ClubEvent, FiguraVote, MatchSheet, Member, Rsvp, Tournament } from "./types.ts";

const TZ = "America/Argentina/Buenos_Aires";
const HORA = 3_600_000;

export { FIGURA_CIERRE_HORAS };
export const TRATO_DEFAULT = "neutro";
export const FIGURA_MIN_VOTOS = 2;
export const CAPITAN_ACTIVO = false;
export const PRESENTE_MIN = 3;
export const PRESENTE_EXIGE_JUGADO = true;
export const TITULOS_POKER = false;
export const COLORES_EQUIPO = { primary: "#1f6f3f", secondary: "#b8f25a" };

export type Tier = "neon" | "oro" | "esmeralda" | "hielo" | "plata" | "fuego" | "bronce" | "cancha" | "pizarra";
export type TipoPremio =
  | "figura"
  | "hat-trick"
  | "valla"
  | "debut"
  | "goleador"
  | "asistidor"
  | "presente"
  | "dt";

export type Deco =
  | { tipo: "pelotas"; n: number }
  | { tipo: "etiqueta"; texto: string }
  | { tipo: "checks"; n: number };

export type StatCard = { valor: string; etiqueta: string };

export type Premio = {
  id: string;
  tipo: TipoPremio;
  tier: Tier;
  memberId: string;
  eventId: string | null;
  mes: string | null;
  titulo: string;
  tituloCorto: string;
  stat: string;
  statLabel: string;
  stats: StatCard[];
  deco: Deco | null;
  nombre: string;
  rival: string;
  resultado: string;
  equipo: string;
  cuando: string;
  mesNombre: string;
  n: number;
};

export type ContextoPremios = {
  members: Member[];
  alumni?: { id: string; name: string; nick: string }[];
  events: ClubEvent[];
  sheets: MatchSheet[];
  votes?: FiguraVote[];
  rsvps?: Rsvp[];
  club?: Club | null;
  tournaments?: Tournament[];
  now?: number;
};

export type DatosCard = {
  tier: Tier;
  titulo: string;
  contexto: string;
  stat: string;
  statLabel: string;
  puesto: string | null;
  dorsal: string | null;
  nombre: string;
  equipo: string;
  equipoIniciales: string;
  escudo: string | null;
  imagen: ImagenPersona;
  colores: { primary: string; secondary: string };
  stats: StatCard[];
  deco: Deco | null;
  uid: string;
  letras: string;
};

type MemberPremio = Member & { trato?: "femenino" | "masculino" | "neutro"; avatar?: AvatarPersona | null };
type SheetPremio = MatchSheet & { arqueroId?: string | null };
type ClubPremio = Club & { colores?: { primary: string; secondary: string } | null };

export function partidosValidos(events: ClubEvent[], sheets: MatchSheet[]): ClubEvent[] {
  const conPlanilla = new Set(sheets.map((sheet) => sheet.eventId));
  return events
    .filter((event) => estaJugado(event) && conPlanilla.has(event.id))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function estadoFigura(event: ClubEvent, votes: FiguraVote[] | undefined, now: number): "abierta" | "cerrada" | "sin-votos" {
  if (votacionAbierta(event, now)) return "abierta";
  const figura = figuraDe(votes, event.id);
  if (!figura || figura.votos < FIGURA_MIN_VOTOS) return "sin-votos";
  return "cerrada";
}

export function puedeCompartirPremio(member: { menor?: boolean }): boolean {
  return !member.menor;
}

export function premiosDelPartido(eventId: string, ctx: ContextoPremios): Premio[] {
  const event = ctx.events.find((item) => item.id === eventId);
  if (!event || !partidosValidos(ctx.events, ctx.sheets).some((item) => item.id === eventId)) return [];
  const sheet = sheetDe(ctx.sheets, eventId);
  if (!sheet) return [];
  const validos = partidosValidos(ctx.events, ctx.sheets);
  const ahora = ctx.now ?? Date.now();
  const premios: Premio[] = [];
  const estado = estadoFigura(event, ctx.votes, ahora);
  if (estado === "cerrada") {
    const figura = figuraDe(ctx.votes, event.id);
    if (figura && figura.votos >= FIGURA_MIN_VOTOS) {
      for (const memberId of figura.ids) {
        const fila = sheet.players.find((row) => row.memberId === memberId);
        premios.push(
          armar(ctx, {
            tipo: "figura",
            tier: "neon",
            memberId,
            event,
            sheet,
            titulo: "FIGURA DEL PARTIDO",
            tituloCorto: "figura",
            stat: String(figura.votos),
            statLabel: "VOTOS",
            n: figura.votos,
            stats: [
              { valor: String(fila?.goals ?? 0), etiqueta: "GOLES" },
              { valor: String(fila?.assists ?? 0), etiqueta: "ASIST." },
              { valor: marcador(sheet), etiqueta: "RESULT." },
            ],
            deco: null,
          }),
        );
      }
    }
  }
  const goleadores = [...sheet.players].filter((row) => row.goals >= 3).sort((a, b) => b.goals - a.goals);
  for (const fila of goleadores) {
    const pelotas = Math.min(fila.goals, 5);
    const titulo = TITULOS_POKER && fila.goals >= 4 ? "POKER" : "HAT-TRICK";
    premios.push(
      armar(ctx, {
        tipo: "hat-trick",
        tier: "fuego",
        memberId: fila.memberId,
        event,
        sheet,
        titulo,
        tituloCorto: "hat-trick",
        stat: String(fila.goals),
        statLabel: "GOLES",
        n: fila.goals,
        stats: [
          { valor: marcador(sheet), etiqueta: "RESULT." },
          { valor: String(fila.assists), etiqueta: "ASIST." },
          { valor: String(golesEnAnio(ctx, validos, fila.memberId, anioDe(event.startsAt))), etiqueta: "GOLES AÑO" },
        ],
        deco: { tipo: "pelotas", n: pelotas },
      }),
    );
  }
  if (sheet.goalsAgainst === 0) {
    const arqueroId = arqueroDe(event, sheet);
    if (arqueroId) {
      const alcance = validos.filter((item) => mismoAlcance(event, item));
      let vallas = 0;
      let pj = 0;
      for (const item of alcance) {
        const planilla = sheetDe(ctx.sheets, item.id);
        if (!planilla || arqueroDe(item, planilla) !== arqueroId) continue;
        pj += 1;
        if (planilla.goalsAgainst === 0) vallas += 1;
      }
      premios.push(
        armar(ctx, {
          tipo: "valla",
          tier: "hielo",
          memberId: arqueroId,
          event,
          sheet,
          titulo: "VALLA INVICTA",
          tituloCorto: "valla invicta",
          stat: "0",
          statLabel: "GOLES EN CONTRA",
          n: 0,
          stats: [
            { valor: marcador(sheet), etiqueta: "RESULT." },
            { valor: String(vallas), etiqueta: "VALLAS" },
            { valor: String(pj), etiqueta: "PJ ARCO" },
          ],
          deco: null,
        }),
      );
    }
  }
  for (const memberId of debutantes(validos, ctx.sheets, eventId)) {
    const fila = sheet.players.find((row) => row.memberId === memberId);
    premios.push(
      armar(ctx, {
        tipo: "debut",
        tier: "bronce",
        memberId,
        event,
        sheet,
        titulo: "DEBUT",
        tituloCorto: "debut",
        stat: "1°",
        statLabel: "PARTIDO",
        n: 1,
        stats: [
          { valor: marcador(sheet), etiqueta: "RESULT." },
          { valor: String(fila?.goals ?? 0), etiqueta: "GOLES" },
          { valor: String(fila?.assists ?? 0), etiqueta: "ASIST." },
        ],
        deco: { tipo: "etiqueta", texto: "PRIMER PARTIDO" },
      }),
    );
  }
  if (CAPITAN_ACTIVO) premios.push(...([] as Premio[]));
  return premios;
}

export function premiosDelMes(mes: string, ctx: ContextoPremios): Premio[] {
  const ahora = ctx.now ?? Date.now();
  if (!mes || mes >= mesDe(new Date(ahora).toISOString())) return [];
  const validos = partidosValidos(ctx.events, ctx.sheets).filter((event) => mesDe(event.startsAt) === mes);
  const sheets = validos
    .map((event) => sheetDe(ctx.sheets, event.id))
    .filter((sheet): sheet is MatchSheet => Boolean(sheet));
  const premios: Premio[] = [];
  const goles = liderEn(sheets, validos, "goals");
  if (goles) {
    for (const memberId of goles.ids) {
      const member = personaDe(ctx, memberId);
      const trato = titulos(member.trato, "goles");
      const pj = partidosDe(validos, ctx.sheets, memberId);
      const otro = totalDe(sheets, memberId, "assists");
      premios.push(
        mesPremio(ctx, {
          tipo: "goleador",
          tier: "oro",
          memberId,
          mes,
          titulo: trato.titulo,
          tituloCorto: trato.corto,
          stat: String(goles.total),
          statLabel: "GOLES",
          n: goles.total,
          stats: [
            { valor: String(pj), etiqueta: "PJ" },
            { valor: promedio(goles.total, pj), etiqueta: "PROM." },
            { valor: String(otro), etiqueta: "ASIST." },
          ],
          deco: null,
        }),
      );
    }
  }
  const asistencias = liderEn(sheets, validos, "assists");
  if (asistencias) {
    for (const memberId of asistencias.ids) {
      const member = personaDe(ctx, memberId);
      const trato = titulos(member.trato, "asistencias");
      const pj = partidosDe(validos, ctx.sheets, memberId);
      const otro = totalDe(sheets, memberId, "goals");
      premios.push(
        mesPremio(ctx, {
          tipo: "asistidor",
          tier: "esmeralda",
          memberId,
          mes,
          titulo: trato.titulo,
          tituloCorto: trato.corto,
          stat: String(asistencias.total),
          statLabel: "ASISTENCIAS",
          n: asistencias.total,
          stats: [
            { valor: String(pj), etiqueta: "PJ" },
            { valor: promedio(asistencias.total, pj), etiqueta: "PROM." },
            { valor: String(otro), etiqueta: "GOLES" },
          ],
          deco: null,
        }),
      );
    }
  }
  for (const memberId of presentes(validos, ctx, mes)) {
    const n = llamadosDe(validos, ctx, memberId).length;
    const jugados = llamadosDe(validos, ctx, memberId).filter((event) => jugo(event, sheetDe(ctx.sheets, event.id), memberId)).length;
    premios.push(
      mesPremio(ctx, {
        tipo: "presente",
        tier: "plata",
        memberId,
        mes,
        titulo: "PRESENTE SIEMPRE",
        tituloCorto: "presente siempre",
        stat: String(n),
        statLabel: `DE ${n}`,
        n,
        stats: [
          { valor: `${n}/${n}`, etiqueta: "VOY" },
          { valor: String(jugados), etiqueta: "JUGADOS" },
          { valor: String(n), etiqueta: "RACHA" },
        ],
        deco: { tipo: "checks", n: Math.min(n, 8) },
      }),
    );
  }
  const record = teamRecord(sheets);
  const dtMerece = record.played >= 2 && (record.won / record.played >= 0.5 || record.lost === 0);
  if (dtMerece) {
    for (const member of ctx.members.filter((person) => person.role === "dt")) {
      premios.push(
        mesPremio(ctx, {
          tipo: "dt",
          tier: "pizarra",
          memberId: member.id,
          mes,
          titulo: "DT DEL MES",
          tituloCorto: "DT del mes",
          stat: String(record.won),
          statLabel: "GANADOS",
          n: record.won,
          stats: [
            { valor: String(record.played), etiqueta: "PJ" },
            { valor: `${record.drawn}-${record.lost}`, etiqueta: "E / P" },
            { valor: `${record.gf}-${record.ga}`, etiqueta: "GOLES" },
          ],
          deco: null,
        }),
      );
    }
  }
  return premios;
}

export function esPrimerValidoDelMes(eventId: string, events: ClubEvent[], sheets: MatchSheet[]): boolean {
  const validos = partidosValidos(events, sheets);
  const event = validos.find((item) => item.id === eventId);
  if (!event) return false;
  const mes = mesDe(event.startsAt);
  return validos.find((item) => mesDe(item.startsAt) === mes)?.id === eventId;
}

export function mesAnterior(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return mesDe(new Date(Date.UTC(anio, numero - 2, 15, 15)).toISOString());
}

export function nombreMes(mes: string): string {
  const crudo = mesLargo(mes);
  return crudo ? crudo.charAt(0).toLocaleUpperCase("es-AR") + crudo.slice(1) : mes;
}

export function textoVotacionAbierta(event: ClubEvent): string {
  const cierre = Date.parse(event.resultClosedAt ?? event.startsAt) + FIGURA_CIERRE_HORAS * HORA;
  return `Figura: votación abierta hasta ${diaHora(cierre)}`;
}

export function etiquetaPremio(tipo: TipoPremio): string {
  if (tipo === "figura") return "Figura";
  if (tipo === "hat-trick") return "Hat-trick";
  if (tipo === "valla") return "Valla invicta";
  if (tipo === "debut") return "Debut";
  if (tipo === "goleador") return "Goleador";
  if (tipo === "asistidor") return "Asistidor";
  if (tipo === "presente") return "Presente";
  return "DT del mes";
}

export function datosCard(premio: Premio, ctx: ContextoPremios): DatosCard {
  const member = personaDe(ctx, premio.memberId);
  const event = premio.eventId ? (ctx.events.find((item) => item.id === premio.eventId) ?? null) : eventoParaPuesto(premio, ctx);
  const sheet = event ? sheetDe(ctx.sheets, event.id) : undefined;
  const rival = sheet ? sheet.opponent.trim() || event?.title || premio.rival : premio.rival;
  const contexto = event
    ? `vs. ${rival} · ${fechaCorta(event.startsAt)}`
    : premio.mes
      ? `${nombreMes(premio.mes)} ${premio.mes.slice(0, 4)}`
      : premio.cuando;
  let puesto: string | null = premio.tipo === "dt" ? "DT" : null;
  if (premio.tipo !== "dt" && event) {
    const label = puestoEnTarjeta(event, member.id);
    puesto = label || null;
  }
  const dorsal = premio.tipo === "dt" || member.number == null ? null : `#${member.number}`;
  const equipo = (ctx.club?.name || premio.equipo || "Mi Vestuario").trim() || "Mi Vestuario";
  const letrasEquipo = initials(equipo) || "MV";
  return {
    tier: premio.tier,
    titulo: premio.titulo,
    contexto: premio.tipo === "goleador" || premio.tipo === "asistidor" || premio.tipo === "presente" || premio.tipo === "dt"
      ? premio.mes
        ? `${nombreMes(premio.mes)} ${premio.mes.slice(0, 4)}`
        : contexto
      : contexto,
    stat: premio.stat,
    statLabel: premio.statLabel,
    puesto,
    dorsal,
    nombre: nombreEnTarjeta(member).toUpperCase(),
    equipo,
    equipoIniciales: letrasEquipo,
    escudo: ctx.club?.crest ?? null,
    imagen: imagenDe(member),
    colores: (ctx.club as ClubPremio | null | undefined)?.colores ?? COLORES_EQUIPO,
    stats: premio.stats.slice(0, 3),
    deco: premio.deco,
    uid: member.id,
    letras: inicialesDe(member),
  };
}

export function textoCompartir(premio: Premio): string {
  const { nombre, rival, resultado, equipo, tituloCorto, n, cuando } = premio;
  if (premio.tipo === "figura") return `${nombre} fue la figura vs. ${rival} (${resultado}). Mi Vestuario`;
  if (premio.tipo === "goleador") return `${nombre}, ${tituloCorto}: ${n} goles en ${cuando}.`;
  if (premio.tipo === "hat-trick") return `${nombre} hizo ${n} goles vs. ${rival} (${resultado}).`;
  if (premio.tipo === "valla") return `${nombre} dejó la valla invicta vs. ${rival} (${resultado}).`;
  if (premio.tipo === "debut") return `${nombre} debutó en ${equipo} vs. ${rival}.`;
  if (premio.tipo === "asistidor") return `${nombre}, ${tituloCorto}: ${n} asistencias en ${cuando}.`;
  if (premio.tipo === "presente") return `${nombre}, presente siempre: ${n} de ${n} en ${cuando}.`;
  return `${nombre}, DT del mes: ${n} ganados en ${cuando}.`;
}

export function fraseStory(premio: Premio): { kicker: string; frase: string; sub: string; nombreResaltado: string } {
  const nombre = premio.nombre;
  if (premio.tipo === "figura") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, figura`,
      sub: `${premio.equipo} ${premio.resultado} ${premio.rival}`,
      nombreResaltado: nombre,
    };
  }
  if (premio.tipo === "goleador") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, ${premio.tituloCorto}`,
      sub: `${premio.n} goles en ${premio.mesNombre}`,
      nombreResaltado: nombre,
    };
  }
  if (premio.tipo === "asistidor") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, ${premio.tituloCorto}`,
      sub: `${premio.n} asistencias en ${premio.mesNombre}`,
      nombreResaltado: nombre,
    };
  }
  if (premio.tipo === "hat-trick") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, hat-trick`,
      sub: `${premio.n} goles vs. ${premio.rival}`,
      nombreResaltado: nombre,
    };
  }
  if (premio.tipo === "valla") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, valla invicta`,
      sub: `vs. ${premio.rival} (${premio.resultado})`,
      nombreResaltado: nombre,
    };
  }
  if (premio.tipo === "debut") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, debut`,
      sub: `en ${premio.equipo} vs. ${premio.rival}`,
      nombreResaltado: nombre,
    };
  }
  if (premio.tipo === "presente") {
    return {
      kicker: `${premio.equipo} · ${premio.cuando}`,
      frase: `${nombre}, presente siempre`,
      sub: `${premio.n} de ${premio.n} en ${premio.mesNombre}`,
      nombreResaltado: nombre,
    };
  }
  return {
    kicker: `${premio.equipo} · ${premio.cuando}`,
    frase: `${nombre}, DT del mes`,
    sub: `${premio.n} ganados en ${premio.mesNombre}`,
    nombreResaltado: nombre,
  };
}

function armar(
  ctx: ContextoPremios,
  input: {
    tipo: TipoPremio;
    tier: Tier;
    memberId: string;
    event: ClubEvent;
    sheet: MatchSheet;
    titulo: string;
    tituloCorto: string;
    stat: string;
    statLabel: string;
    n: number;
    stats: StatCard[];
    deco: Deco | null;
  },
): Premio {
  const member = personaDe(ctx, input.memberId);
  return {
    id: `${input.tipo}:${input.event.id}:${input.memberId}`,
    tipo: input.tipo,
    tier: input.tier,
    memberId: input.memberId,
    eventId: input.event.id,
    mes: null,
    titulo: input.titulo,
    tituloCorto: input.tituloCorto,
    stat: input.stat,
    statLabel: input.statLabel,
    stats: input.stats,
    deco: input.deco,
    nombre: nombreEnTarjeta(member),
    rival: input.sheet.opponent.trim() || input.event.title,
    resultado: marcador(input.sheet),
    equipo: (ctx.club?.name || "Mi Vestuario").trim() || "Mi Vestuario",
    cuando: fechaCorta(input.event.startsAt),
    mesNombre: "",
    n: input.n,
  };
}

function mesPremio(
  ctx: ContextoPremios,
  input: {
    tipo: TipoPremio;
    tier: Tier;
    memberId: string;
    mes: string;
    titulo: string;
    tituloCorto: string;
    stat: string;
    statLabel: string;
    n: number;
    stats: StatCard[];
    deco: Deco | null;
  },
): Premio {
  const member = personaDe(ctx, input.memberId);
  const mesNombre = mesLargo(input.mes);
  return {
    id: `${input.tipo}:${input.mes}:${input.memberId}`,
    tipo: input.tipo,
    tier: input.tier,
    memberId: input.memberId,
    eventId: null,
    mes: input.mes,
    titulo: input.titulo,
    tituloCorto: input.tituloCorto,
    stat: input.stat,
    statLabel: input.statLabel,
    stats: input.stats,
    deco: input.deco,
    nombre: nombreEnTarjeta(member),
    rival: "",
    resultado: "",
    equipo: (ctx.club?.name || "Mi Vestuario").trim() || "Mi Vestuario",
    cuando: `${mesNombre} ${input.mes.slice(0, 4)}`.trim(),
    mesNombre,
    n: input.n,
  };
}

function titulos(trato: MemberPremio["trato"], clase: "goles" | "asistencias"): { titulo: string; corto: string } {
  const modo = trato ?? TRATO_DEFAULT;
  if (clase === "goles") {
    if (modo === "femenino") return { titulo: "GOLEADORA DEL MES", corto: "goleadora del mes" };
    if (modo === "masculino") return { titulo: "GOLEADOR DEL MES", corto: "goleador del mes" };
    return { titulo: "MÁS GOLES DEL MES", corto: "más goles del mes" };
  }
  if (modo === "femenino") return { titulo: "ASISTIDORA DEL MES", corto: "asistidora del mes" };
  if (modo === "masculino") return { titulo: "ASISTIDOR DEL MES", corto: "asistidor del mes" };
  return { titulo: "MÁS ASISTENCIAS DEL MES", corto: "más asistencias del mes" };
}

function liderEn(sheets: MatchSheet[], events: ClubEvent[], key: "goals" | "assists"): { ids: string[]; total: number } | null {
  const mes = events[0] ? mesDe(events[0].startsAt) : "";
  if (!mes) return null;
  return liderDelMes(sheets, events, mes, key);
}

function presentes(validos: ClubEvent[], ctx: ContextoPremios, mes: string): string[] {
  const delMes = validos.filter((event) => mesDe(event.startsAt) === mes);
  const ids = new Set<string>();
  for (const member of ctx.members) ids.add(member.id);
  for (const event of delMes) for (const id of event.convocados ?? []) ids.add(id);
  const ganadores: string[] = [];
  for (const memberId of ids) {
    const llamados = llamadosDe(delMes, ctx, memberId);
    if (llamados.length < PRESENTE_MIN) continue;
    const todosVoy = llamados.every((event) => rsvpDe(ctx, event.id, memberId) === "voy");
    if (!todosVoy) continue;
    if (PRESENTE_EXIGE_JUGADO && !llamados.every((event) => jugo(event, sheetDe(ctx.sheets, event.id), memberId))) continue;
    ganadores.push(memberId);
  }
  return ganadores;
}

function llamadosDe(events: ClubEvent[], ctx: ContextoPremios, memberId: string): ClubEvent[] {
  return events.filter((event) => convocado(event, personaDe(ctx, memberId), memberId));
}

function convocado(event: ClubEvent, member: Member, memberId: string): boolean {
  if (event.convocados && event.convocados.length > 0) return event.convocados.includes(memberId);
  return member.juega ?? member.role === "jugador";
}

function jugo(event: ClubEvent, sheet: MatchSheet | undefined, memberId: string): boolean {
  if (sheet?.players.some((row) => row.memberId === memberId)) return true;
  if ((event.suplentes ?? []).includes(memberId)) return true;
  return Object.values(event.lineup ?? {}).includes(memberId);
}

function rsvpDe(ctx: ContextoPremios, eventId: string, memberId: string): string | undefined {
  return ctx.rsvps?.find((row) => row.eventId === eventId && row.memberId === memberId)?.status;
}

function partidosDe(events: ClubEvent[], sheets: MatchSheet[], memberId: string): number {
  return events.filter((event) => jugo(event, sheetDe(sheets, event.id), memberId)).length;
}

function totalDe(sheets: MatchSheet[], memberId: string, key: "goals" | "assists"): number {
  return sheets.reduce((sum, sheet) => sum + (sheet.players.find((row) => row.memberId === memberId)?.[key] ?? 0), 0);
}

function promedio(total: number, pj: number): string {
  if (pj <= 0) return "0";
  return (total / pj).toFixed(1).replace(".", ",");
}

function debutantes(validos: ClubEvent[], sheets: MatchSheet[], eventId: string): string[] {
  const vistos = new Map<string, string>();
  for (const event of validos) {
    const sheet = sheetDe(sheets, event.id);
    if (!sheet) continue;
    const ids = new Set<string>([
      ...sheet.players.map((row) => row.memberId),
      ...(event.suplentes ?? []),
    ]);
    for (const memberId of ids) {
      if (!vistos.has(memberId)) vistos.set(memberId, event.id);
    }
  }
  const index = validos.findIndex((event) => event.id === eventId);
  if (index <= 0) return [];
  return [...vistos.entries()].filter(([, primero]) => primero === eventId).map(([memberId]) => memberId);
}

function golesEnAnio(ctx: ContextoPremios, validos: ClubEvent[], memberId: string, anio: string): number {
  let total = 0;
  for (const event of validos) {
    if (anioDe(event.startsAt) !== anio) continue;
    total += sheetDe(ctx.sheets, event.id)?.players.find((row) => row.memberId === memberId)?.goals ?? 0;
  }
  return total;
}

function arqueroDe(event: ClubEvent, sheet: MatchSheet): string | null {
  const id = ((sheet as SheetPremio).arqueroId || event.lineup?.ARQ || "").trim();
  return id || null;
}

function mismoAlcance(event: ClubEvent, other: ClubEvent): boolean {
  if (event.tournamentId) return other.tournamentId === event.tournamentId;
  return anioDe(other.startsAt) === anioDe(event.startsAt);
}

function eventoParaPuesto(premio: Premio, ctx: ContextoPremios): ClubEvent | null {
  if (!premio.mes) return null;
  const validos = partidosValidos(ctx.events, ctx.sheets).filter((event) => mesDe(event.startsAt) === premio.mes);
  for (let index = validos.length - 1; index >= 0; index -= 1) {
    const event = validos[index];
    if (jugo(event, sheetDe(ctx.sheets, event.id), premio.memberId)) return event;
  }
  return null;
}

function personaDe(ctx: ContextoPremios, id: string): MemberPremio {
  return (ctx.members.find((item) => item.id === id) ?? alumniMember(ctx.alumni, id)) as MemberPremio;
}

function sheetDe(sheets: MatchSheet[], eventId: string): MatchSheet | undefined {
  return sheets.find((sheet) => sheet.eventId === eventId);
}

function marcador(sheet: MatchSheet): string {
  return `${sheet.goalsFor}-${sheet.goalsAgainst}`;
}

function anioDe(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(date);
}

function fechaCorta(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const valor = (tipo: string) => parts.find((part) => part.type === tipo)?.value ?? "";
  return `${valor("day")}/${valor("month")}/${valor("year")}`;
}

function diaHora(ms: number): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const valor = (tipo: string) => parts.find((part) => part.type === tipo)?.value ?? "";
  return `${valor("day")}/${valor("month")} ${valor("hour")}:${valor("minute")}`;
}

function mesLargo(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  if (!anio || !numero) return "";
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, month: "long" }).format(new Date(Date.UTC(anio, numero - 1, 15, 15)));
}
