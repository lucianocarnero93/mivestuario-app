import type {
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

const IDEAS: Record<PlanId, string> = {
  a: "Salida",
  b: "Si vamos perdiendo",
  c: "Cerrar el partido",
};

const TRAZOS = new Set<Trazo>(["flecha", "pase", "zona", "circulo"]);

export function planVisible(event: ClubEvent, id: PlanId): PlanPizarra {
  const saved = event.planes?.find((plan) => plan.id === id);
  if (id === "a") {
    return {
      id: "a",
      idea: saved?.idea || IDEAS.a,
      cambio: saved?.cambio || "Los de siempre.",
      lineup: event.lineup ?? {},
      dibujos: saved?.dibujos ?? [],
    };
  }
  return {
    id,
    idea: saved?.idea || IDEAS[id],
    cambio: saved?.cambio || "",
    lineup: saved?.lineup ? { ...saved.lineup } : { ...(event.lineup ?? {}) },
    dibujos: saved?.dibujos ?? [],
  };
}

function guardarPlan(event: ClubEvent, siguiente: PlanPizarra): ClubEvent {
  const planes = (["a", "b", "c"] as PlanId[]).map((id) => (id === siguiente.id ? siguiente : planVisible(event, id)));
  return {
    ...event,
    lineup: siguiente.id === "a" ? siguiente.lineup : event.lineup,
    planes: planes.map((plan) => (plan.id === "a" ? { ...plan, lineup: {} } : plan)),
  };
}

export function editarPlan(event: ClubEvent, id: PlanId, patch: Partial<Pick<PlanPizarra, "idea" | "cambio" | "lineup" | "dibujos">>): ClubEvent {
  const actual = planVisible(event, id);
  return guardarPlan(event, {
    ...actual,
    idea: patch.idea !== undefined ? patch.idea.slice(0, 40) : actual.idea,
    cambio: patch.cambio !== undefined ? patch.cambio.slice(0, 80) : actual.cambio,
    lineup: patch.lineup ?? actual.lineup,
    dibujos: (patch.dibujos ?? actual.dibujos).slice(0, 30),
  });
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

const TIPOS = new Set<TipoPelota>(["jugada", "corned", "tiro", "lateral", "salida"]);

export function plantillaPelota(tipo: TipoPelota, fichas: { memberId: string; x: number; y: number }[]): JugadaPaso {
  const seguro = TIPOS.has(tipo) ? tipo : "jugada";
  const pelota = seguro === "salida" ? { x: 50, y: 88 } : { x: 92, y: 8 };
  const base = fichas.slice(0, 8);
  const movidas = base.map((ficha, index) => ({ ...ficha, x: numero(ficha.x + (index % 2 === 0 ? 6 : -4)), y: numero(ficha.y - 8) }));
  const nombres: Record<TipoPelota, string> = {
    jugada: "Jugada",
    corned: "Córner",
    tiro: "Tiro libre",
    lateral: "Lateral",
    salida: "Salida",
  };
  return {
    id: seguro,
    nombre: nombres[seguro],
    tipo: seguro,
    cuadros: [
      { texto: "Así arranca.", pelota, fichas: base },
      { texto: "El movimiento.", pelota: { x: numero(pelota.x - 10), y: numero(pelota.y + 8) }, fichas: movidas },
    ],
  };
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

export function aplicarVistosJugador(base: ClubEvent[], incoming: ClubEvent[], memberId: string | undefined): ClubEvent[] {
  if (!memberId) return base;
  const map = new Map(incoming.map((event) => [event.id, event]));
  return base.map((event) => {
    const extra = (map.get(event.id)?.vistos ?? []).filter((item) => item.memberId === memberId);
    return { ...event, vistos: juntarVistos(event.vistos, extra) };
  });
}
