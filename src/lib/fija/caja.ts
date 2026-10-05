import type { Caja, CategoriaGasto, Cobro, Gasto } from "./types.ts";

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

export function armarGasto(input: {
  id: string;
  titulo: string;
  monto: number;
  categoria: CategoriaGasto;
  fecha: string;
  pagadoPor: string;
  personas: string[];
  at: string;
}): Gasto | null {
  const titulo = input.titulo.trim().slice(0, 60);
  const monto = Math.round(input.monto);
  const personas = [...new Set(input.personas)].filter(Boolean).slice(0, 80);
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
    const partes = partesIguales(gasto.monto, gasto.personas);
    sumar(gasto.pagadoPor, gasto.monto);
    for (const parte of partes) sumar(parte.memberId, -parte.monto);
    for (const cobro of caja.cobros) {
      if (cobro.gastoId !== gasto.id || cobro.estado !== "confirmado") continue;
      const parte = partes.find((item) => item.memberId === cobro.memberId);
      if (!parte) continue;
      const monto = Math.min(cobro.monto, parte.monto);
      sumar(cobro.memberId, monto);
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
  return { ...caja, cobros: cobros.slice(-400) };
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
    gastos: [...gastos.values()].slice(-80),
    cobros: [...cobros.values()].slice(-400),
  };
}

export function deudaDe(caja: Caja, gastoId: string, memberId: string): number {
  const gasto = caja.gastos.find((item) => item.id === gastoId && !item.anulado);
  if (!gasto || gasto.pagadoPor === memberId) return 0;
  const parte = partesIguales(gasto.monto, gasto.personas).find((item) => item.memberId === memberId);
  if (!parte) return 0;
  const pago = caja.cobros.find((item) => item.gastoId === gastoId && item.memberId === memberId && item.estado === "confirmado");
  return Math.max(parte.monto - (pago?.monto ?? 0), 0);
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
