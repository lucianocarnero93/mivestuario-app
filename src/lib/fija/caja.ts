import type { Caja, CategoriaGasto, Cobro, Cupon, Gasto } from "./types.ts";

export const CATEGORIAS: CategoriaGasto[] = ["cancha", "arbitro", "indumentaria", "social", "otro"];

export const CATEGORIA_LABEL: Record<CategoriaGasto, string> = {
  cancha: "Cancha",
  arbitro: "Árbitro",
  indumentaria: "Indumentaria",
  social: "Social",
  otro: "Otro",
};

export function cajaVacia(tesoreroId = ""): Caja {
  return { tesoreroId, gastos: [], cobros: [] };
}

export function partesIguales(monto: number, ids: string[]): { memberId: string; monto: number }[] {
  const gente = [...new Set(ids)].filter(Boolean);
  const total = Math.round(monto);
  if (gente.length === 0 || total <= 0) return [];
  const base = Math.floor(total / gente.length);
  let resto = total - base * gente.length;
  return gente.map((memberId) => {
    const extra = resto > 0 ? 1 : 0;
    resto -= extra;
    return { memberId, monto: base + extra };
  });
}

export function armarCupones(input: {
  modo: "iguales" | "fijo" | "propio";
  monto: number;
  gente: { id: string; nombre?: string; monto?: number; exento?: boolean }[];
}): Cupon[] | null {
  const vistos = new Set<string>();
  const gente = input.gente.filter((persona) => {
    const id = persona.id.trim();
    if (!id || vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
  if (gente.length === 0 || gente.length > 80) return null;
  const libres = gente
    .filter((persona) => persona.exento)
    .map((persona) => ({ id: persona.id, nombre: persona.nombre?.trim().slice(0, 40) || undefined, monto: 0, exento: true }));
  const pagan = gente.filter((persona) => !persona.exento);
  if (pagan.length === 0) return null;
  if (input.modo === "iguales") {
    const partes = partesIguales(input.monto, pagan.map((persona) => persona.id));
    if (partes.length === 0) return null;
    return [
      ...partes.map((parte) => ({
        id: parte.memberId,
        nombre: pagan.find((persona) => persona.id === parte.memberId)?.nombre?.trim().slice(0, 40) || undefined,
        monto: parte.monto,
      })),
      ...libres,
    ];
  }
  if (input.modo === "fijo") {
    const cada = Math.round(input.monto);
    if (cada < 1 || cada > 10_000_000) return null;
    return [
      ...pagan.map((persona) => ({ id: persona.id, nombre: persona.nombre?.trim().slice(0, 40) || undefined, monto: cada })),
      ...libres,
    ];
  }
  const propios = pagan.map((persona) => ({
    id: persona.id,
    nombre: persona.nombre?.trim().slice(0, 40) || undefined,
    monto: Math.round(persona.monto ?? 0),
  }));
  if (propios.some((cupon) => cupon.monto < 1 || cupon.monto > 10_000_000)) return null;
  return [...propios, ...libres];
}

export function armarGasto(input: {
  id: string;
  titulo: string;
  monto: number;
  categoria: CategoriaGasto;
  fecha: string;
  pagadoPor: string;
  personas: string[];
  cupones?: Cupon[];
  at: string;
}): Gasto | null {
  const titulo = input.titulo.trim().slice(0, 60);
  const cupones = input.cupones?.length
    ? input.cupones.slice(0, 80).map((cupon) => ({
        id: cupon.id,
        nombre: cupon.nombre,
        monto: cupon.exento ? 0 : Math.round(cupon.monto),
        exento: cupon.exento || undefined,
      }))
    : undefined;
  const monto = cupones ? cupones.reduce((suma, cupon) => suma + cupon.monto, 0) : Math.round(input.monto);
  const personas = cupones ? cupones.map((cupon) => cupon.id) : [...new Set(input.personas)].filter(Boolean).slice(0, 80);
  if (!titulo || monto < 1 || monto > 10_000_000) return null;
  if (!input.pagadoPor || personas.length === 0) return null;
  if (!CATEGORIAS.includes(input.categoria)) return null;
  return {
    id: input.id.slice(0, 40),
    titulo,
    monto,
    categoria: input.categoria,
    fecha: input.fecha.slice(0, 40),
    pagadoPor: input.pagadoPor,
    personas,
    cupones,
    at: input.at,
  };
}

export function saldosDe(caja: Caja): { memberId: string; saldo: number }[] {
  const map = new Map<string, number>();
  const sumar = (id: string, monto: number) => {
    if (!id || !monto) return;
    map.set(id, (map.get(id) ?? 0) + monto);
  };
  for (const gasto of caja.gastos) {
    if (gasto.anulado) continue;
    const partes = cuponesDe(gasto);
    sumar(gasto.pagadoPor, gasto.monto);
    for (const parte of partes) {
      if (parte.exento) continue;
      sumar(parte.id, -parte.monto);
    }
    for (const cobro of caja.cobros) {
      if (cobro.gastoId !== gasto.id || cobro.estado !== "confirmado") continue;
      const parte = partes.find((item) => item.id === cobro.memberId);
      if (!parte) continue;
      const monto = Math.min(cobro.monto, parte.monto);
      sumar(parte.id, monto);
      sumar(gasto.pagadoPor, -monto);
    }
  }
  return [...map.entries()]
    .map(([memberId, saldo]) => ({ memberId, saldo }))
    .filter((row) => row.saldo !== 0);
}

export function liquidar(filas: { memberId: string; saldo: number }[]): { de: string; a: string; monto: number }[] {
  const deuda = filas
    .filter((row) => row.saldo < 0)
    .map((row) => ({ memberId: row.memberId, saldo: -row.saldo }))
    .sort((a, b) => b.saldo - a.saldo);
  const haber = filas
    .filter((row) => row.saldo > 0)
    .map((row) => ({ memberId: row.memberId, saldo: row.saldo }))
    .sort((a, b) => b.saldo - a.saldo);
  const pasos: { de: string; a: string; monto: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < deuda.length && j < haber.length) {
    const monto = Math.min(deuda[i]!.saldo, haber[j]!.saldo);
    if (monto > 0) pasos.push({ de: deuda[i]!.memberId, a: haber[j]!.memberId, monto });
    deuda[i]!.saldo -= monto;
    haber[j]!.saldo -= monto;
    if (deuda[i]!.saldo === 0) i += 1;
    if (haber[j]!.saldo === 0) j += 1;
  }
  return pasos;
}

export function aplicarCobro(caja: Caja, cobro: Cobro): Caja {
  if (cobro.paymentId && caja.cobros.some((item) => item.paymentId === cobro.paymentId)) return caja;
  const ya = caja.cobros.find((item) => item.gastoId === cobro.gastoId && item.memberId === cobro.memberId);
  const cobros = ya
    ? caja.cobros.map((item) => (item === ya ? { ...cobro, id: ya.id } : item))
    : [...caja.cobros, cobro];
  return { ...caja, cobros: cobros.slice(-400), gastos: conCierre({ ...caja, cobros }).gastos };
}

export function cobrosConfiables(previous: Cobro[] | undefined, incoming: Cobro[] | undefined): Cobro[] {
  const conocidos = new Set((previous ?? []).map((item) => item.paymentId).filter((id): id is string => Boolean(id)));
  return (incoming ?? []).filter((cobro) => {
    if (cobro.medio === "mp" || cobro.paymentId) return Boolean(cobro.paymentId && conocidos.has(cobro.paymentId));
    return cobro.estado === "confirmado";
  });
}

export function cobrosDelJugador(previous: Cobro[] | undefined, incoming: Cobro[] | undefined, memberId: string): Cobro[] {
  if (!memberId) return [];
  const previos = previous ?? [];
  const conocidos = new Set(previos.map((item) => item.paymentId).filter((id): id is string => Boolean(id)));
  return (incoming ?? []).filter((cobro) => {
    if (cobro.memberId !== memberId) return false;
    if (cobro.medio === "mp" || cobro.paymentId) return Boolean(cobro.paymentId && conocidos.has(cobro.paymentId));
    if (cobro.estado !== "marcado") return false;
    const viejo = previos.find(
      (item) => item.id === cobro.id || (item.gastoId === cobro.gastoId && item.memberId === memberId),
    );
    return viejo?.estado !== "confirmado";
  });
}

export function mergeCaja(previous?: Caja, incoming?: Caja): Caja {
  if (!incoming) return previous ?? cajaVacia();
  if (!previous) return incoming;
  const gastos = new Map<string, Gasto>();
  for (const gasto of [...previous.gastos, ...incoming.gastos]) {
    const viejo = gastos.get(gasto.id);
    if (!viejo || Date.parse(gasto.at) >= Date.parse(viejo.at)) gastos.set(gasto.id, gasto);
    if (viejo?.anulado && Date.parse(viejo.at) >= Date.parse(gasto.at)) gastos.set(gasto.id, viejo);
  }
  const cobros = new Map<string, Cobro>();
  for (const cobro of [...previous.cobros, ...incoming.cobros]) {
    if (cobro.paymentId && [...cobros.values()].some((item) => item.paymentId === cobro.paymentId && item.id !== cobro.id)) {
      continue;
    }
    const viejo = cobros.get(cobro.id);
    if (!viejo || Date.parse(cobro.at) >= Date.parse(viejo.at)) cobros.set(cobro.id, cobro);
  }
  return {
    tesoreroId: incoming.tesoreroId || previous.tesoreroId,
    alias: incoming.alias || previous.alias,
    gastos: [...gastos.values()].slice(-80),
    cobros: [...cobros.values()].slice(-400),
  };
}

export function cuponesDe(gasto: Gasto): Cupon[] {
  if (gasto.cupones?.length) return gasto.cupones;
  return partesIguales(gasto.monto, gasto.personas).map((parte) => ({ id: parte.memberId, monto: parte.monto }));
}

export function pagoAlcanza(deuda: number, amount: number): boolean {
  return deuda >= 1 && Math.round(amount) === deuda;
}

export function deudaDe(caja: Caja, gastoId: string, memberId: string): number {
  const gasto = caja.gastos.find((item) => item.id === gastoId && !item.anulado);
  if (!gasto || gasto.pagadoPor === memberId) return 0;
  const parte = cuponesDe(gasto).find((item) => item.id === memberId);
  if (!parte || parte.exento) return 0;
  const pago = caja.cobros.find((item) => item.gastoId === gastoId && item.memberId === memberId && item.estado === "confirmado");
  return Math.max(parte.monto - (pago?.monto ?? 0), 0);
}

export function conCierre(caja: Caja): Caja {
  let cambio = false;
  const gastos = caja.gastos.map((gasto) => {
    if (gasto.anulado) return gasto;
    const cerrado = cuponesDe(gasto).every((cupon) => deudaDe(caja, gasto.id, cupon.id) === 0);
    if (Boolean(gasto.cerrado) === cerrado) return gasto;
    cambio = true;
    return { ...gasto, cerrado };
  });
  return cambio ? { ...caja, gastos } : caja;
}

export function textoCupones(
  caja: Caja,
  gasto: Gasto,
  nombre: (cupon: Cupon) => string,
): string {
  const faltan = cuponesDe(gasto)
    .map((cupon) => ({ cupon, deuda: deudaDe(caja, gasto.id, cupon.id) }))
    .filter((fila) => fila.deuda > 0);
  const alias = caja.alias ? `\nAlias Mercado Pago: ${caja.alias}` : "";
  if (faltan.length === 0) return `${gasto.titulo}: todos pagaron.`;
  const lineas = faltan.map((fila) => `${nombre(fila.cupon)} $${fila.deuda}`);
  return `${gasto.titulo}${alias}\nFalta pagar:\n${lineas.join("\n")}`;
}

export function textoLiquidacion(
  pasos: { de: string; a: string; monto: number }[],
  nombre: (id: string) => string,
): string {
  if (pasos.length === 0) return "La caja está al día.";
  const lineas = pasos.map((paso) => `${nombre(paso.de)} le pasa $${paso.monto} a ${nombre(paso.a)}`);
  return `Caja del equipo\n${lineas.join("\n")}`;
}

export function cajaCsv(caja: Caja): string {
  const lineas = ["fecha,titulo,categoria,monto,pagado_por,personas,anulado"];
  for (const gasto of caja.gastos) {
    const celdas = [
      gasto.fecha,
      gasto.titulo.replaceAll(",", " "),
      gasto.categoria,
      String(gasto.monto),
      gasto.pagadoPor,
      gasto.personas.join("|"),
      gasto.anulado ? "si" : "no",
    ];
    lineas.push(celdas.join(","));
  }
  return lineas.join("\n");
}
