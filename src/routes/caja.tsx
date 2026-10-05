import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORIA_LABEL, CATEGORIAS, cajaCsv, deudaDe, liquidar, partesIguales, saldosDe, textoLiquidacion } from "@/lib/fija/caja";
import { crearLinkPago, empezarMp, estadoMp } from "@/lib/fija/mercadopago";
import { useFija, useMe } from "@/lib/fija/store";
import type { CategoriaGasto, Gasto } from "@/lib/fija/types";

export const Route = createFileRoute("/caja")({
  component: CajaPage,
  validateSearch: (search: Record<string, unknown>) => ({
    mp: search.mp === "ok" || search.mp === "error" ? search.mp : undefined,
  }),
});

function CajaPage() {
  const me = useMe();
  const club = useFija((s) => s.club);
  const members = useFija((s) => s.members);
  const caja = useFija((s) => s.caja);
  const events = useFija((s) => s.events);
  const rsvps = useFija((s) => s.rsvps);
  const definirTesorero = useFija((s) => s.definirTesorero);
  const crearGasto = useFija((s) => s.crearGasto);
  const anularGasto = useFija((s) => s.anularGasto);
  const marcarPagado = useFija((s) => s.marcarPagado);
  const confirmarCobro = useFija((s) => s.confirmarCobro);
  const flushCloud = useFija((s) => s.flushCloud);
  const { mp } = Route.useSearch();
  const [conectado, setConectado] = useState(false);
  const [nota, setNota] = useState("");
  const tesorero = me.role === "dt" || (caja?.tesoreroId && caja.tesoreroId === me.id);
  const saldos = saldosDe(caja ?? { tesoreroId: "", gastos: [], cobros: [] });
  const mio = saldos.find((row) => row.memberId === me.id)?.saldo ?? 0;
  const nombre = (id: string) => members.find((person) => person.id === id)?.nick ?? "Alguien que se fue";

  useEffect(() => {
    if (!club) return;
    void estadoMp({ data: club.inviteCode }).then((estado) => setConectado(estado.conectado)).catch(() => setConectado(false));
  }, [club?.inviteCode, mp]);

  async function conectar() {
    if (!club) return;
    const result = await empezarMp({ data: club.inviteCode });
    if (result.url) window.location.href = result.url;
    else setNota("Sin Mercado Pago igual podés marcar los pagos a mano.");
  }

  function copiar() {
    const texto = textoLiquidacion(liquidar(saldos), nombre);
    void navigator.clipboard?.writeText(texto);
    setNota("Pedido copiado para WhatsApp.");
  }

  function exportar() {
    const blob = new Blob([cajaCsv(caja ?? { tesoreroId: "", gastos: [], cobros: [] })], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "caja.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="px-4 py-5">
      <h1 className="text-2xl font-semibold">Caja</h1>
      <p className="mt-1 text-sm text-muted">
        {mio < 0 ? `Debés $${Math.abs(mio)}` : mio > 0 ? `Te deben $${mio}` : "Estás al día"}
        {" · "}
        {conectado ? "Mercado Pago conectado" : "Mercado Pago no conectado"}
      </p>
      {mp === "ok" ? <p className="mt-2 text-sm text-accent">Cuenta conectada.</p> : null}
      {mp === "error" ? <p className="mt-2 text-sm text-muted">No se pudo conectar Mercado Pago.</p> : null}
      {me.role === "dt" ? (
        <div className="mt-4 grid gap-2">
          <label className="text-sm">
            Tesorero
            <select
              className="mt-1 h-12 w-full rounded-md bg-surface px-3"
              value={caja?.tesoreroId || me.id}
              onChange={(event) => definirTesorero(event.target.value)}
            >
              {members.map((person) => (
                <option key={person.id} value={person.id}>{person.nick}</option>
              ))}
            </select>
          </label>
          <Button variant="outline" className="h-12" onClick={() => void conectar()}>
            {conectado ? "Reconectar Mercado Pago" : "Conectar Mercado Pago"}
          </Button>
        </div>
      ) : null}
      {tesorero ? <NuevoGasto members={members} events={events} rsvps={rsvps} onCreate={crearGasto} onSave={() => void flushCloud()} /> : null}
      <ul className="mt-4 space-y-3">
        {(caja?.gastos ?? []).filter((gasto) => !gasto.anulado).map((gasto) => (
          <GastoCard
            key={gasto.id}
            gasto={gasto}
            meId={me.id}
            tesorero={Boolean(tesorero)}
            conectado={conectado}
            code={club?.inviteCode ?? ""}
            nombre={nombre}
            onMarcar={() => {
              marcarPagado(gasto.id);
              void flushCloud();
            }}
            onConfirmar={(memberId) => {
              confirmarCobro(gasto.id, memberId);
              void flushCloud();
            }}
            onAnular={() => {
              anularGasto(gasto.id);
              void flushCloud();
            }}
            cobros={caja?.cobros ?? []}
          />
        ))}
      </ul>
      <section className="mt-6 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Saldos</p>
        {saldos.length === 0 ? <p className="mt-2 text-sm text-muted">Nadie debe nada.</p> : null}
        <ul className="mt-2 space-y-1 text-sm">
          {saldos.map((row) => (
            <li key={row.memberId}>
              {nombre(row.memberId)} {row.saldo < 0 ? `debe $${Math.abs(row.saldo)}` : `cobra $${row.saldo}`}
            </li>
          ))}
        </ul>
        <Button className="mt-3 h-12 w-full" onClick={copiar}>Copiar pedido</Button>
        {tesorero ? (
          <Button variant="outline" className="mt-2 h-12 w-full" onClick={exportar}>Exportar CSV</Button>
        ) : null}
      </section>
      {nota ? <p className="mt-3 text-sm text-accent">{nota}</p> : null}
    </main>
  );
}

function NuevoGasto({
  members,
  events,
  rsvps,
  onCreate,
  onSave,
}: {
  members: { id: string; nick: string; role: string; juega?: boolean }[];
  events: { id: string; title: string; kind: string }[];
  rsvps: { eventId: string; memberId: string; status: string }[];
  onCreate: (input: { titulo: string; monto: number; categoria: CategoriaGasto; fecha: string; pagadoPor: string; personas: string[] }) => boolean;
  onSave: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto>("cancha");
  const [pagadoPor, setPagadoPor] = useState(members[0]?.id ?? "");
  const [modo, setModo] = useState<"plantel" | "voy" | "elegir">("plantel");
  const [partido, setPartido] = useState(events.find((event) => event.kind === "partido")?.id ?? "");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const plantel = members.filter((person) => person.juega ?? person.role === "jugador");
  const personas = modo === "voy"
    ? rsvps.filter((row) => row.eventId === partido && row.status === "voy").map((row) => row.memberId)
    : modo === "elegir"
      ? elegidos
      : plantel.map((person) => person.id);

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Nuevo gasto</p>
      <input className="mt-2 h-12 w-full rounded-md bg-bg px-3" placeholder="Qué se pagó" value={titulo} maxLength={60} onChange={(event) => setTitulo(event.target.value)} />
      <input className="mt-2 h-12 w-full rounded-md bg-bg px-3" inputMode="numeric" placeholder="Monto" value={monto} onChange={(event) => setMonto(event.target.value)} />
      <select className="mt-2 h-12 w-full rounded-md bg-bg px-3" value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaGasto)}>
        {CATEGORIAS.map((item) => <option key={item} value={item}>{CATEGORIA_LABEL[item]}</option>)}
      </select>
      <select className="mt-2 h-12 w-full rounded-md bg-bg px-3" value={pagadoPor} onChange={(event) => setPagadoPor(event.target.value)}>
        {members.map((person) => <option key={person.id} value={person.id}>Pagó {person.nick}</option>)}
      </select>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["plantel", "voy", "elegir"] as const).map((item) => (
          <button key={item} type="button" className={`h-11 rounded-md text-xs font-semibold ${modo === item ? "bg-accent text-accent-fg" : "bg-bg"}`} onClick={() => setModo(item)}>
            {item === "plantel" ? "Plantel" : item === "voy" ? "Los que fueron" : "Elegir"}
          </button>
        ))}
      </div>
      {modo === "voy" ? (
        <select className="mt-2 h-12 w-full rounded-md bg-bg px-3" value={partido} onChange={(event) => setPartido(event.target.value)}>
          {events.filter((event) => event.kind === "partido").map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </select>
      ) : null}
      {modo === "elegir" ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
          {plantel.map((person) => (
            <li key={person.id}>
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={elegidos.includes(person.id)}
                  onChange={() => setElegidos((list) => list.includes(person.id) ? list.filter((id) => id !== person.id) : [...list, person.id])}
                />
                {person.nick}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        className="mt-3 h-12 w-full"
        onClick={() => {
          const ok = onCreate({
            titulo,
            monto: Number(monto),
            categoria,
            fecha: new Date().toISOString().slice(0, 10),
            pagadoPor,
            personas,
          });
          if (ok) {
            setTitulo("");
            setMonto("");
            onSave();
          }
        }}
      >
        Guardar gasto
      </Button>
    </section>
  );
}

function GastoCard({
  gasto,
  meId,
  tesorero,
  conectado,
  code,
  nombre,
  cobros,
  onMarcar,
  onConfirmar,
  onAnular,
}: {
  gasto: Gasto;
  meId: string;
  tesorero: boolean;
  conectado: boolean;
  code: string;
  nombre: (id: string) => string;
  cobros: { gastoId: string; memberId: string; estado: string }[];
  onMarcar: () => void;
  onConfirmar: (memberId: string) => void;
  onAnular: () => void;
}) {
  const partes = partesIguales(gasto.monto, gasto.personas);
  const mia = partes.find((parte) => parte.memberId === meId);
  const mio = cobros.find((cobro) => cobro.gastoId === gasto.id && cobro.memberId === meId);
  const deuda = deudaDe({ tesoreroId: "", gastos: [gasto], cobros: cobros as never }, gasto.id, meId);

  async function pagar() {
    const result = await crearLinkPago({ data: { code, gastoId: gasto.id, memberId: meId } });
    if (result.url) window.location.href = result.url;
  }

  return (
    <li className="rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs text-muted">{CATEGORIA_LABEL[gasto.categoria]} · pagó {nombre(gasto.pagadoPor)}</p>
      <p className="text-lg font-semibold">{gasto.titulo}</p>
      <p className="text-sm">${gasto.monto} entre {gasto.personas.length}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {partes.map((parte) => {
          const cobro = cobros.find((item) => item.gastoId === gasto.id && item.memberId === parte.memberId);
          const estado = cobro?.estado === "confirmado" ? "Pagó" : cobro?.estado === "marcado" ? "Avisó" : "Pendiente";
          return (
            <li key={parte.memberId} className="flex items-center justify-between gap-2">
              <span>{nombre(parte.memberId)} · ${parte.monto} · {estado}</span>
              {tesorero && cobro?.estado === "marcado" ? (
                <button type="button" className="h-10 font-semibold text-accent" onClick={() => onConfirmar(parte.memberId)}>Confirmar</button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {mia && gasto.pagadoPor !== meId && deuda > 0 ? (
        <div className="mt-3 grid gap-2">
          {conectado ? <Button className="h-12" onClick={() => void pagar()}>Pagar con Mercado Pago</Button> : null}
          {mio?.estado === "marcado" ? <p className="text-sm text-muted">Avisaste que pagaste. Falta que el tesorero lo confirme.</p> : (
            <Button variant="outline" className="h-12" onClick={onMarcar}>Marqué que pagué</Button>
          )}
        </div>
      ) : null}
      {tesorero ? <Button variant="ghost" className="mt-2 h-11" onClick={onAnular}>Anular gasto</Button> : null}
    </li>
  );
}
