import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORIA_LABEL, CATEGORIAS, armarCupones, cajaCsv, cuponesDe, deudaDe, liquidar, saldosDe, textoCupones, textoLiquidacion } from "@/lib/fija/caja";
import { uid } from "@/lib/fija/format";
import { crearLinkPago, empezarMp, estadoMp } from "@/lib/fija/mercadopago";
import { useFija, useMe } from "@/lib/fija/store";
import type { Caja, CategoriaGasto, Cupon, Gasto } from "@/lib/fija/types";

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
  const definirAlias = useFija((s) => s.definirAlias);
  const crearGasto = useFija((s) => s.crearGasto);
  const anularGasto = useFija((s) => s.anularGasto);
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
    setNota("Abriendo Mercado Pago…");
    const result = await empezarMp({ data: club.inviteCode });
    if (result.url) {
      window.location.assign(result.url);
      return;
    }
    setNota(
      result.reason === "sin-mp"
        ? "Falta la clave de Mercado Pago en el servidor."
        : "Solo el tesorero puede conectar su cuenta.",
    );
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
      {mp === "error" ? <p className="mt-2 text-sm text-muted">Mercado Pago no dejó conectar. Entrá con la cuenta del tesorero y aceptá.</p> : null}
      {tesorero ? (
        <div className="mt-4 grid gap-2">
          {me.role === "dt" ? (
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
          ) : null}
          <Button className="h-12" onClick={() => void conectar()}>
            {conectado ? "Reconectar la cuenta del tesorero" : "Conectar la cuenta del tesorero"}
          </Button>
        </div>
      ) : null}
      {tesorero ? (
        <label className="mt-4 block text-sm">
          Alias de Mercado Pago
          <input
            className="mt-1 h-12 w-full rounded-md bg-surface px-3"
            placeholder="equipo.mp"
            defaultValue={caja?.alias ?? ""}
            maxLength={40}
            onBlur={(event) => definirAlias(event.target.value)}
          />
        </label>
      ) : null}
      {tesorero ? <NuevoGasto members={members} events={events} rsvps={rsvps} onCreate={crearGasto} onSave={() => void flushCloud()} /> : null}
      <ul className="mt-4 space-y-3">
        {(caja?.gastos ?? []).filter((gasto) => !gasto.anulado).map((gasto) => (
          <GastoCard
            key={gasto.id}
            gasto={gasto}
            meId={me.id}
            tesorero={Boolean(tesorero)}
            code={club?.inviteCode ?? ""}
            nombre={nombre}
            alias={caja?.alias ?? ""}
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
  onCreate: (input: {
    titulo: string;
    monto: number;
    categoria: CategoriaGasto;
    fecha: string;
    pagadoPor: string;
    personas: string[];
    cupones?: Cupon[];
  }) => boolean;
  onSave: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto>("cancha");
  const [pagadoPor, setPagadoPor] = useState(members[0]?.id ?? "");
  const [reparto, setReparto] = useState<"iguales" | "fijo" | "propio">("iguales");
  const [modo, setModo] = useState<"plantel" | "voy" | "elegir">("plantel");
  const [partido, setPartido] = useState(events.find((event) => event.kind === "partido")?.id ?? "");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [exentos, setExentos] = useState<string[]>([]);
  const [propios, setPropios] = useState<Record<string, string>>({});
  const [invitados, setInvitados] = useState<{ id: string; nombre: string }[]>([]);
  const [invitado, setInvitado] = useState("");
  const [error, setError] = useState("");
  const plantel = members.filter((person) => person.juega ?? person.role === "jugador");
  const base = modo === "voy"
    ? rsvps.filter((row) => row.eventId === partido && row.status === "voy").map((row) => row.memberId)
    : modo === "elegir"
      ? elegidos
      : plantel.map((person) => person.id);
  const ids = [...base, ...invitados.map((persona) => persona.id)];

  function etiqueta(id: string) {
    return invitados.find((persona) => persona.id === id)?.nombre ?? plantel.find((persona) => persona.id === id)?.nick ?? id;
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Nuevo gasto</p>
      <input className="mt-2 h-12 w-full rounded-md bg-bg px-3" placeholder="Qué se pagó" value={titulo} maxLength={60} onChange={(event) => setTitulo(event.target.value)} />
      <input className="mt-2 h-12 w-full rounded-md bg-bg px-3" inputMode="numeric" placeholder={reparto === "fijo" ? "Monto por persona" : "Monto total"} value={monto} onChange={(event) => setMonto(event.target.value)} />
      <select className="mt-2 h-12 w-full rounded-md bg-bg px-3" value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaGasto)}>
        {CATEGORIAS.map((item) => <option key={item} value={item}>{CATEGORIA_LABEL[item]}</option>)}
      </select>
      <select className="mt-2 h-12 w-full rounded-md bg-bg px-3" value={pagadoPor} onChange={(event) => setPagadoPor(event.target.value)}>
        {members.map((person) => <option key={person.id} value={person.id}>Pagó {person.nick}</option>)}
      </select>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["iguales", "fijo", "propio"] as const).map((item) => (
          <button key={item} type="button" className={`h-11 rounded-md text-xs font-semibold ${reparto === item ? "bg-accent text-accent-fg" : "bg-bg"}`} onClick={() => setReparto(item)}>
            {item === "iguales" ? "Iguales" : item === "fijo" ? "Fijo" : "Cada uno"}
          </button>
        ))}
      </div>
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
            <li key={person.id} className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={elegidos.includes(person.id)}
                onChange={() => setElegidos((list) => list.includes(person.id) ? list.filter((id) => id !== person.id) : [...list, person.id])}
              />
              <span className="flex-1">{person.nick}</span>
              <button type="button" className="text-xs text-muted" onClick={() => setExentos((list) => list.includes(person.id) ? list.filter((id) => id !== person.id) : [...list, person.id])}>
                {exentos.includes(person.id) ? "Exento" : "Eximir"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex gap-2">
        <input className="h-12 flex-1 rounded-md bg-bg px-3" placeholder="Invitado" value={invitado} maxLength={40} onChange={(event) => setInvitado(event.target.value)} />
        <Button
          variant="outline"
          className="h-12"
          onClick={() => {
            const nombre = invitado.trim();
            if (!nombre) return;
            setInvitados((list) => [...list, { id: uid("inv"), nombre }]);
            setInvitado("");
          }}
        >
          Sumar
        </Button>
      </div>
      {ids.length > 0 && reparto === "propio" ? (
        <ul className="mt-2 space-y-1">
          {ids.map((id) => (
            <li key={id} className="flex items-center gap-2">
              <span className="w-28 truncate text-sm">{etiqueta(id)}</span>
              <input className="h-10 flex-1 rounded-md bg-bg px-3" inputMode="numeric" placeholder="Monto" value={propios[id] ?? ""} onChange={(event) => setPropios((map) => ({ ...map, [id]: event.target.value }))} />
            </li>
          ))}
        </ul>
      ) : null}
      {invitados.length > 0 ? <p className="mt-2 text-sm text-muted">Invitados: {invitados.map((persona) => persona.nombre).join(", ")}</p> : null}
      {error ? <p className="mt-2 text-sm text-muted">{error}</p> : null}
      <Button
        className="mt-3 h-12 w-full"
        onClick={() => {
          const cupones = armarCupones({
            modo: reparto,
            monto: Number(monto),
            gente: ids.map((id) => ({
              id,
              nombre: invitados.find((persona) => persona.id === id)?.nombre,
              monto: Number(propios[id] ?? 0),
              exento: modo === "elegir" && exentos.includes(id),
            })),
          });
          if (!cupones) {
            setError("Revisá el monto y quiénes entran.");
            return;
          }
          const ok = onCreate({
            titulo,
            monto: cupones.reduce((suma, cupon) => suma + cupon.monto, 0),
            categoria,
            fecha: new Date().toISOString().slice(0, 10),
            pagadoPor,
            personas: cupones.map((cupon) => cupon.id),
            cupones,
          });
          if (!ok) {
            setError("No se pudo guardar el gasto.");
            return;
          }
          setTitulo("");
          setMonto("");
          setError("");
          setInvitados([]);
          onSave();
        }}
      >
        Armar cupones
      </Button>
    </section>
  );
}

function GastoCard({
  gasto,
  meId,
  tesorero,
  code,
  nombre,
  alias,
  cobros,
  onConfirmar,
  onAnular,
}: {
  gasto: Gasto;
  meId: string;
  tesorero: boolean;
  code: string;
  nombre: (id: string) => string;
  alias: string;
  cobros: { gastoId: string; memberId: string; estado: string; monto: number }[];
  onConfirmar: (memberId: string) => void;
  onAnular: () => void;
}) {
  const [aviso, setAviso] = useState("");
  const caja: Caja = { tesoreroId: "", alias, gastos: [gasto], cobros: cobros as Caja["cobros"] };
  const cupones = cuponesDe(gasto);
  const pagables = cupones.filter((cupon) => cupon.id !== gasto.pagadoPor && !cupon.exento && cupon.monto > 0);
  const pagos = pagables.filter((cupon) => deudaDe(caja, gasto.id, cupon.id) === 0).length;
  const deuda = deudaDe(caja, gasto.id, meId);
  const mia = cupones.find((cupon) => cupon.id === meId);
  const recaudado = pagables.reduce((suma, cupon) => suma + (deudaDe(caja, gasto.id, cupon.id) === 0 ? cupon.monto : 0), 0);
  const ancho = pagables.length === 0 ? 100 : Math.round((pagos / pagables.length) * 100);

  function etiqueta(cupon: Cupon) {
    return cupon.nombre || nombre(cupon.id);
  }

  async function pagar(memberId: string) {
    setAviso("Abriendo Mercado Pago…");
    try {
      await useFija.getState().flushCloud();
      const result = await crearLinkPago({ data: { code, gastoId: gasto.id, memberId } });
      if (!result.url) {
        setAviso(
          result.reason === "sin-deuda"
            ? "Ese cupón no tiene nada para cobrar."
            : "No se abrió Mercado Pago. El tesorero tiene que conectar su cuenta.",
        );
        return;
      }
      window.location.assign(result.url);
    } catch {
      setAviso("No se pudo abrir Mercado Pago.");
    }
  }

  function avisar() {
    const texto = textoCupones(caja, gasto, etiqueta);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <li className="rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs text-muted">{CATEGORIA_LABEL[gasto.categoria]} · pagó {nombre(gasto.pagadoPor)}</p>
      <p className="text-lg font-semibold">{gasto.titulo}</p>
      <p className="text-sm">{gasto.cerrado ? "Cerrado" : `$${recaudado} de $${pagables.reduce((suma, cupon) => suma + cupon.monto, 0)}`}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
        <div className="h-full bg-accent" style={{ width: `${ancho}%` }} />
      </div>
      {alias ? <p className="mt-2 text-sm">Alias {alias}</p> : null}
      <ul className="mt-2 space-y-1 text-sm">
        {cupones.map((cupon) => {
          const debe = deudaDe(caja, gasto.id, cupon.id);
          const estado = cupon.exento ? "Exento" : cupon.id === gasto.pagadoPor ? "Puso la plata" : debe === 0 ? "Pagó" : "Debe";
          return (
            <li key={cupon.id} className="flex items-center justify-between gap-2">
              <span>{etiqueta(cupon)} · ${cupon.monto} · {estado}</span>
              {tesorero && debe > 0 ? (
                <button type="button" className="h-10 shrink-0 font-semibold text-accent" onClick={() => onConfirmar(cupon.id)}>Ya cobré</button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {mia && deuda > 0 ? (
        <Button className="mt-3 h-12 w-full" onClick={() => void pagar(meId)}>Pagar ${deuda}</Button>
      ) : null}
      {tesorero && !gasto.cerrado ? (
        <div className="mt-3 grid gap-2">
          <Button variant="outline" className="h-12" onClick={avisar}>Avisar por WhatsApp</Button>
          {pagables.filter((cupon) => deudaDe(caja, gasto.id, cupon.id) > 0).map((cupon) => (
            <Button key={cupon.id} variant="secondary" className="h-12" onClick={() => void pagar(cupon.id)}>
              Cobrar ${cupon.monto} a {etiqueta(cupon)}
            </Button>
          ))}
        </div>
      ) : null}
      {aviso ? <p className="mt-2 text-sm text-muted">{aviso}</p> : null}
      {tesorero ? <Button variant="ghost" className="mt-2 h-11" onClick={onAnular}>Anular gasto</Button> : null}
    </li>
  );
}