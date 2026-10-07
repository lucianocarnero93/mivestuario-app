import { FORMATIONS, type Formation } from "./formations.ts";
import type {
  ClubBundle,
  ClubEvent,
  CuadroPaso,
  Dibujo,
  JugadaGuardada,
  JugadaPaso,
  PlanId,
  PlanPizarra,
  TipoPelota,
  Trazo,
} from "./types.ts";

const IDEAS: Record<PlanId, string> = { a: "", b: "", c: "" };

const RELLENO = new Set(["Salida", "Si vamos perdiendo", "Cerrar el partido", "Los de siempre.", "Los de siempre"]);

function textoPropio(value: string | undefined): string {
  const texto = value?.trim() ?? "";
  return RELLENO.has(texto) ? "" : texto;
}

const TRAZOS = new Set<Trazo>(["flecha", "pase", "zona", "circulo"]);

export function planVisible(event: ClubEvent, id: PlanId): PlanPizarra {
  const saved = event.planes?.find((plan) => plan.id === id);
  if (id === "a") {
    return {
      id: "a",
      idea: textoPropio(saved?.idea) || IDEAS.a,
      cambio: textoPropio(saved?.cambio),
      lineup: event.lineup ?? {},
      dibujos: saved?.dibujos ?? [],
      formacion: saved?.formacion || event.formacion,
    };
  }
  return {
    id,
    idea: textoPropio(saved?.idea) || IDEAS[id],
    cambio: textoPropio(saved?.cambio),
    lineup: saved?.lineup ? { ...saved.lineup } : { ...(event.lineup ?? {}) },
    dibujos: saved?.dibujos ?? [],
    formacion: saved?.formacion || event.formacion,
  };
}

export function formacionDelPlan(event: ClubEvent, plan: { formacion?: string }): Formation {
  const lista = FORMATIONS[event.modality];
  const id = plan.formacion || event.formacion;
  return lista.find((item) => item.id === id) ?? lista[0];
}

function guardarPlan(event: ClubEvent, siguiente: PlanPizarra): ClubEvent {
  const planes = (["a", "b", "c"] as PlanId[]).map((id) => (id === siguiente.id ? siguiente : planVisible(event, id)));
  return {
    ...event,
    lineup: siguiente.id === "a" ? siguiente.lineup : event.lineup,
    formacion: siguiente.id === "a" && siguiente.formacion ? siguiente.formacion : event.formacion,
    planes: planes.map((plan) => (plan.id === "a" ? { ...plan, lineup: {} } : plan)),
  };
}

export function editarPlan(event: ClubEvent, id: PlanId, patch: Partial<Pick<PlanPizarra, "idea" | "cambio" | "lineup" | "dibujos" | "formacion">>): ClubEvent {
  const actual = planVisible(event, id);
  return guardarPlan(event, {
    ...actual,
    idea: patch.idea !== undefined ? patch.idea.slice(0, 40) : actual.idea,
    cambio: patch.cambio !== undefined ? patch.cambio.slice(0, 80) : actual.cambio,
    lineup: patch.lineup ?? actual.lineup,
    dibujos: (patch.dibujos ?? actual.dibujos).slice(0, 30),
    formacion: patch.formacion !== undefined ? patch.formacion : actual.formacion,
  });
}

function slotsDe(modality: ClubEvent["modality"], formacionId?: string) {
  const lista = FORMATIONS[modality];
  return (lista.find((item) => item.id === formacionId) ?? lista[0]).slots;
}

export function cambiarEsquema(event: ClubEvent, planId: PlanId, formacionId: string): ClubEvent {
  let base = event;
  for (const id of ["a", "b", "c"] as PlanId[]) {
    const guardado = base.planes?.find((plan) => plan.id === id)?.formacion;
    if (!guardado) base = editarPlan(base, id, { formacion: planVisible(base, id).formacion || base.formacion });
  }
  const actual = planVisible(base, planId);
  const ordered = slotsDe(base.modality, actual.formacion)
    .map((slot) => actual.lineup[slot.key])
    .filter((id): id is string => Boolean(id));
  const lineup: Record<string, string> = {};
  const used = new Set<string>();
  slotsDe(base.modality, formacionId).forEach((slot, index) => {
    const id = ordered[index];
    if (!id || used.has(id)) return;
    lineup[slot.key] = id;
    used.add(id);
  });
  return editarPlan(base, planId, { lineup, formacion: formacionId });
}

export function ponerEnPlan(event: ClubEvent, id: PlanId, slot: string, memberId: string | null): ClubEvent {
  const actual = planVisible(event, id);
  const lineup = { ...actual.lineup };
  if (!memberId) delete lineup[slot];
  else {
    for (const key of Object.keys(lineup)) {
      if (lineup[key] === memberId) delete lineup[key];
    }
    lineup[slot] = memberId;
  }
  return editarPlan(event, id, { lineup });
}

function numero(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function sumarDibujo(event: ClubEvent, id: PlanId, dibujo: Dibujo): ClubEvent {
  if (!TRAZOS.has(dibujo.trazo)) return event;
  const limpio: Dibujo = {
    id: dibujo.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16),
    trazo: dibujo.trazo,
    x1: numero(dibujo.x1),
    y1: numero(dibujo.y1),
    x2: numero(dibujo.x2),
    y2: numero(dibujo.y2),
  };
  if (!limpio.id) return event;
  const actual = planVisible(event, id);
  return editarPlan(event, id, { dibujos: [...actual.dibujos, limpio].slice(-30) });
}

export function deshacerDibujo(event: ClubEvent, id: PlanId): ClubEvent {
  const actual = planVisible(event, id);
  return editarPlan(event, id, { dibujos: actual.dibujos.slice(0, -1) });
}

export function limpiarDibujos(event: ClubEvent, id: PlanId): ClubEvent {
  return editarPlan(event, id, { dibujos: [] });
}

export function juntarVistos(
  anterior: { memberId: string; at: string }[] | undefined,
  extra: { memberId: string; at: string }[] | undefined,
): { memberId: string; at: string }[] {
  const map = new Map<string, { memberId: string; at: string }>();
  for (const item of [...(anterior ?? []), ...(extra ?? [])]) {
    if (!item?.memberId) continue;
    const previo = map.get(item.memberId);
    if (!previo || item.at > previo.at) map.set(item.memberId, { memberId: item.memberId, at: item.at });
  }
  return [...map.values()].slice(-80);
}

export function marcarVisto(event: ClubEvent, memberId: string, at: string): ClubEvent {
  if (!memberId || event.vistos?.some((item) => item.memberId === memberId)) return event;
  return { ...event, vistos: juntarVistos(event.vistos, [{ memberId, at }]) };
}

export function faltanVer(event: ClubEvent, memberIds: string[]): string[] {
  const vistos = new Set((event.vistos ?? []).map((item) => item.memberId));
  return memberIds.filter((id) => !vistos.has(id));
}

function cuadro(raw: CuadroPaso): CuadroPaso {
  return {
    texto: String(raw.texto ?? "").slice(0, 80),
    pelota: { x: numero(raw.pelota?.x ?? 50), y: numero(raw.pelota?.y ?? 50) },
    fichas: (raw.fichas ?? []).slice(0, 14).map((ficha) => ({
      memberId: String(ficha.memberId ?? "").slice(0, 40),
      x: numero(ficha.x),
      y: numero(ficha.y),
    })).filter((ficha) => ficha.memberId),
  };
}

export function guardarPasos(event: ClubEvent, pasos: JugadaPaso): ClubEvent {
  const cuadros = (pasos.cuadros ?? []).slice(0, 4).map(cuadro);
  if (cuadros.length < 2) return event;
  return {
    ...event,
    pasos: {
      id: String(pasos.id || "jugada").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16) || "jugada",
      nombre: String(pasos.nombre || "Jugada").slice(0, 40),
      tipo: pasos.tipo,
      cuadros,
    },
  };
}

export function moverEnCuadro(pasos: JugadaPaso, indice: number, quien: string, x: number, y: number): JugadaPaso {
  if (!pasos.cuadros[indice]) return pasos;
  const px = numero(x);
  const py = numero(y);
  return {
    ...pasos,
    cuadros: pasos.cuadros.map((item, i) => {
      if (i !== indice) return item;
      if (quien === "pelota") return { ...item, pelota: { x: px, y: py } };
      return { ...item, fichas: item.fichas.map((ficha) => (ficha.memberId === quien ? { ...ficha, x: px, y: py } : ficha)) };
    }),
  };
}

export function textoDePaso(pasos: JugadaPaso, indice: number, texto: string): JugadaPaso {
  return { ...pasos, cuadros: pasos.cuadros.map((item, i) => (i === indice ? { ...item, texto: texto.slice(0, 80) } : item)) };
}

export function nombreDeJugada(pasos: JugadaPaso, nombre: string): JugadaPaso {
  return { ...pasos, nombre: nombre.slice(0, 40) };
}

export function sumarPaso(pasos: JugadaPaso): JugadaPaso {
  if (pasos.cuadros.length >= 4) return pasos;
  const ultimo = pasos.cuadros[pasos.cuadros.length - 1];
  if (!ultimo) return pasos;
  return {
    ...pasos,
    cuadros: [...pasos.cuadros, { texto: "El siguiente movimiento.", pelota: { ...ultimo.pelota }, fichas: ultimo.fichas.map((ficha) => ({ ...ficha })) }],
  };
}

export function sacarPaso(pasos: JugadaPaso, indice: number): JugadaPaso {
  if (pasos.cuadros.length <= 2) return pasos;
  return { ...pasos, cuadros: pasos.cuadros.filter((_, i) => i !== indice) };
}

export type PuestoJugada = { key: string; x: number; y: number; memberId?: string };

export type ClaveJugada =
  | "presion"
  | "transicion"
  | "salida"
  | "pelotazo"
  | "corner-favor"
  | "corner-contra"
  | "tiro"
  | "tiro-izq"
  | "tiro-der"
  | "corto";

export const JUGADAS_ABIERTAS: { id: ClaveJugada; nombre: string }[] = [
  { id: "presion", nombre: "Presión" },
  { id: "transicion", nombre: "Transición" },
  { id: "salida", nombre: "Salida corta" },
  { id: "pelotazo", nombre: "Pelotazo" },
];

export const PELOTAS_PARADAS: { id: ClaveJugada; nombre: string }[] = [
  { id: "corner-favor", nombre: "Córner a favor" },
  { id: "corner-contra", nombre: "Córner en contra" },
  { id: "tiro", nombre: "Tiro libre" },
  { id: "tiro-izq", nombre: "Tiro libre desde la izquierda" },
  { id: "tiro-der", nombre: "Tiro libre desde la derecha" },
  { id: "corto", nombre: "Córner corto" },
];

function elegir(puestos: PuestoJugada[], keys: string[], usado: Set<string>): string | undefined {
  for (const key of keys) {
    if (puestos.some((puesto) => puesto.key === key) && !usado.has(key)) return key;
  }
  return puestos.find((puesto) => puesto.key !== "ARQ" && !usado.has(puesto.key))?.key;
}

function armarCuadros(
  puestos: PuestoJugada[],
  pasos: { texto: string; pelota: { x: number; y: number }; cambios: Record<string, { x: number; y: number }> }[],
): CuadroPaso[] {
  return pasos.map((paso) => ({
    texto: paso.texto,
    pelota: { x: numero(paso.pelota.x), y: numero(paso.pelota.y) },
    fichas: puestos.map((puesto) => ({
      memberId: puesto.memberId || `puesto:${puesto.key}`,
      x: numero(paso.cambios[puesto.key]?.x ?? puesto.x),
      y: numero(paso.cambios[puesto.key]?.y ?? puesto.y),
    })),
  }));
}

export function armarJugada(clave: ClaveJugada, puestos: PuestoJugada[]): JugadaPaso {
  const usados = new Set<string>();
  const tomar = (keys: string[]) => {
    const key = elegir(puestos, keys, usados);
    if (key) usados.add(key);
    return key;
  };
  const delantero = tomar(["DC", "PIV", "EI", "ED"]);
  const segundo = tomar(["EI", "ED", "MI", "MD", "AI", "AD"]);
  const volante = tomar(["MC", "VOL", "MI", "MD"]);
  const costado = tomar(["LD", "LI", "MD", "MI"]);
  const arquero = puestos.some((puesto) => puesto.key === "ARQ") ? "ARQ" : undefined;
  const a = (key: string | undefined, x: number, y: number) => (key ? { [key]: { x, y } } : {});

  const recetas: Record<ClaveJugada, { nombre: string; tipo: TipoPelota; cuadros: CuadroPaso[] }> = {
    presion: {
      nombre: "Presión",
      tipo: "jugada",
      cuadros: armarCuadros(puestos, [
        { texto: "Ellos tienen la pelota. Subimos juntos, no se queda nadie atrás.", pelota: { x: 50, y: 42 }, cambios: { ...a(delantero, 50, 30), ...a(volante, 42, 48), ...a(costado, 70, 46) } },
        { texto: "El más cercano va a la pelota. El resto le cierra el pase.", pelota: { x: 48, y: 38 }, cambios: { ...a(delantero, 48, 34), ...a(segundo, 62, 36), ...a(volante, 36, 44) } },
      ]),
    },
    transicion: {
      nombre: "Transición",
      tipo: "jugada",
      cuadros: armarCuadros(puestos, [
        { texto: "La recuperamos. El primer pase es para adelante, no para atrás.", pelota: { x: 46, y: 58 }, cambios: { ...a(volante, 46, 56), ...a(delantero, 58, 28) } },
        { texto: "El 9 pica al espacio. Llegamos antes de que se ordenen.", pelota: { x: 64, y: 22 }, cambios: { ...a(delantero, 66, 16), ...a(segundo, 74, 28), ...a(volante, 52, 36) } },
      ]),
    },
    salida: {
      nombre: "Salida corta",
      tipo: "jugada",
      cuadros: armarCuadros(puestos, [
        { texto: "Sale el arquero, corto, a un defensor. No la tires larga si nadie te apura.", pelota: { x: 50, y: 84 }, cambios: { ...a(arquero, 50, 86), ...a(costado, 30, 70) } },
        { texto: "El volante viene a buscarla y la abre al costado.", pelota: { x: 32, y: 62 }, cambios: { ...a(volante, 40, 58), ...a(costado, 28, 68) } },
        { texto: "Salimos jugando por afuera.", pelota: { x: 18, y: 40 }, cambios: { ...a(segundo, 16, 36) } },
      ]),
    },
    pelotazo: {
      nombre: "Pelotazo",
      tipo: "jugada",
      cuadros: armarCuadros(puestos, [
        { texto: "Si te apuran, no la pierdas atrás. Mirá al delantero.", pelota: { x: 50, y: 78 }, cambios: { ...a(arquero, 50, 86) } },
        { texto: "Pelotazo al espacio, a la espalda de ellos. El 9 arranca antes del pase.", pelota: { x: 62, y: 18 }, cambios: { ...a(delantero, 64, 16) } },
      ]),
    },
    "corner-favor": {
      nombre: "Córner a favor",
      tipo: "corned",
      cuadros: armarCuadros(puestos, [
        { texto: "Córner a favor. El 9 al área, uno al segundo palo y otro al borde.", pelota: { x: 94, y: 6 }, cambios: { ...a(delantero, 70, 14), ...a(segundo, 36, 16), ...a(volante, 80, 24) } },
        { texto: "Centro al área. El que llega, define. El del borde, al rebote.", pelota: { x: 62, y: 12 }, cambios: { ...a(delantero, 64, 12), ...a(volante, 72, 22) } },
      ]),
    },
    corto: {
      nombre: "Córner corto",
      tipo: "corned",
      cuadros: armarCuadros(puestos, [
        { texto: "No centres de una. Corto al que está en el vértice.", pelota: { x: 94, y: 6 }, cambios: { ...a(volante, 82, 16), ...a(delantero, 58, 20) } },
        { texto: "Se la devuelve o entra. El 9 ataca el área.", pelota: { x: 78, y: 18 }, cambios: { ...a(volante, 80, 20), ...a(delantero, 60, 16) } },
      ]),
    },
    tiro: {
      nombre: "Tiro libre",
      tipo: "tiro",
      cuadros: armarCuadros(puestos, [
        { texto: "Uno sobre la pelota. Otro abierto, por si tapan el tiro. El 9 en el segundo palo.", pelota: { x: 50, y: 32 }, cambios: { ...a(volante, 50, 34), ...a(costado, 72, 34), ...a(delantero, 34, 16) } },
        { texto: "Si la barrera cierra el tiro, pase al que está abierto.", pelota: { x: 70, y: 32 }, cambios: { ...a(costado, 74, 32) } },
        { texto: "De ahí, centro al segundo palo.", pelota: { x: 36, y: 14 }, cambios: { ...a(delantero, 34, 14) } },
      ]),
    },
    "tiro-izq": {
      nombre: "Tiro libre desde la izquierda",
      tipo: "tiro",
      cuadros: armarCuadros(puestos, [
        { texto: "Tiro libre desde la izquierda. Uno patea y el 9 al segundo palo.", pelota: { x: 28, y: 30 }, cambios: { ...a(volante, 28, 32), ...a(delantero, 62, 14), ...a(costado, 48, 28) } },
        { texto: "Si tapan el tiro, pase al que está libre y centro.", pelota: { x: 50, y: 26 }, cambios: { ...a(costado, 52, 24), ...a(delantero, 64, 14) } },
      ]),
    },
    "tiro-der": {
      nombre: "Tiro libre desde la derecha",
      tipo: "tiro",
      cuadros: armarCuadros(puestos, [
        { texto: "Tiro libre desde la derecha. El que patea y el 9 al palo de atrás.", pelota: { x: 72, y: 30 }, cambios: { ...a(volante, 72, 32), ...a(delantero, 38, 14), ...a(costado, 54, 28) } },
        { texto: "Si no hay tiro, la abrís al segundo palo.", pelota: { x: 40, y: 16 }, cambios: { ...a(delantero, 38, 14) } },
      ]),
    },
    "corner-contra": {
      nombre: "Córner en contra",
      tipo: "corned",
      cuadros: armarCuadros(puestos, [
        { texto: "Córner en contra. Uno en cada palo. El resto marca a su hombre.", pelota: { x: 6, y: 6 }, cambios: { ...a(delantero, 70, 12), ...a(segundo, 34, 12), ...a(volante, 52, 20), ...a(costado, 78, 22) } },
        { texto: "Si la rechazamos, salimos. Nadie se queda mirando.", pelota: { x: 50, y: 32 }, cambios: { ...a(volante, 48, 40), ...a(delantero, 60, 28) } },
      ]),
    },
  };
  const receta = recetas[clave];
  return { id: clave, nombre: receta.nombre, tipo: receta.tipo, cuadros: receta.cuadros };
}

export function plantillaPelota(tipo: TipoPelota, fichas: { memberId: string; x: number; y: number }[]): JugadaPaso {
  const clave: ClaveJugada = tipo === "tiro" ? "tiro" : tipo === "salida" ? "salida" : tipo === "jugada" ? "presion" : tipo === "lateral" ? "tiro" : "corner-favor";
  const puestos = fichas.map((ficha, index) => ({ key: `f${index}`, x: ficha.x, y: ficha.y, memberId: ficha.memberId }));
  return armarJugada(clave, puestos);
}

export function videoLimpio(value: string): string {
  const texto = value.trim().slice(0, 200);
  if (!/^https:\/\/[^\s]+$/i.test(texto)) return "";
  return texto;
}

export function duplicarJugada(lista: JugadaGuardada[] | undefined, id: string, nuevoId: string): JugadaGuardada[] {
  const item = (lista ?? []).find((row) => row.id === id);
  if (!item) return lista ?? [];
  return [...(lista ?? []), { ...item, id: nuevoId, nombre: `${item.nombre} (copia)`.slice(0, 40) }].slice(-30);
}

function marca(value: string | undefined): number {
  const time = value ? Date.parse(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

function elegirCampo<T>(newer: T | null | undefined, older: T | null | undefined): T | null | undefined {
  if (newer === null) return null;
  if (newer !== undefined) return newer;
  return older === null ? null : older;
}

/** La jugada y la pelota se mezclan aparte de la formación. null borra y no vuelve. */
export function camposDePizarra(previous: ClubEvent, incoming: ClubEvent): Pick<ClubEvent, "pasos" | "pelotaParada" | "jugadaVisible" | "pelotaVisible" | "videoUrl" | "notas" | "tactics" | "audioDe"> {
  const newer = marca(incoming.pizarraUpdatedAt) >= marca(previous.pizarraUpdatedAt) ? incoming : previous;
  const older = newer === incoming ? previous : incoming;
  return {
    pasos: elegirCampo(newer.pasos, older.pasos),
    pelotaParada: elegirCampo(newer.pelotaParada, older.pelotaParada),
    jugadaVisible: newer.jugadaVisible !== undefined ? newer.jugadaVisible : older.jugadaVisible,
    pelotaVisible: newer.pelotaVisible !== undefined ? newer.pelotaVisible : older.pelotaVisible,
    videoUrl: elegirCampo(newer.videoUrl, older.videoUrl),
    notas: newer.notas ?? older.notas,
    tactics: newer.tactics ?? older.tactics,
    audioDe: newer.audioDe ?? older.audioDe,
  };
}

/** Lo que puede llegar al teléfono de un jugador. Sin archivo del DT ni indicaciones ajenas. */
export function recortarParaJugador(bundle: ClubBundle, memberId: string): ClubBundle {
  return {
    ...bundle,
    bannedAccounts: undefined,
    biblioteca: [],
    bibliotecaAt: undefined,
    events: bundle.events.map((event) => ({
      ...event,
      notas: event.notas?.[memberId] ? { [memberId]: event.notas[memberId] } : undefined,
      pasos: event.jugadaVisible === false ? null : event.pasos,
      pelotaParada: event.pelotaVisible === false ? null : event.pelotaParada,
      vistos: undefined,
    })),
  };
}

export function aplicarVistosJugador(base: ClubEvent[], incoming: ClubEvent[], memberId: string | undefined): ClubEvent[] {
  if (!memberId) return base;
  const map = new Map(incoming.map((event) => [event.id, event]));
  return base.map((event) => {
    const extra = (map.get(event.id)?.vistos ?? []).filter((item) => item.memberId === memberId);
    return { ...event, vistos: juntarVistos(event.vistos, extra) };
  });
}

/** El jugador solo puede dejar su reacción. El resto del partido no se toca. */
export function aplicarReaccionesJugador(base: ClubEvent[], incoming: ClubEvent[], memberId: string | undefined): ClubEvent[] {
  const withVistos = aplicarVistosJugador(base, incoming, memberId);
  if (!memberId) return withVistos;
  const map = new Map(incoming.map((event) => [event.id, event]));
  return withVistos.map((event) => {
    const propias = (map.get(event.id)?.reacciones ?? []).filter((item) => item.memberId === memberId);
    if (propias.length === 0) return event;
    const mia = propias[propias.length - 1];
    const resto = (event.reacciones ?? []).filter((item) => item.memberId !== memberId);
    return { ...event, reacciones: [...resto, mia].slice(-80) };
  });
}
