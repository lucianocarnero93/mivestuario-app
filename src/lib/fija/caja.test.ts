import assert from "node:assert/strict";
import test from "node:test";
import { aplicarCobro, armarCupones, armarGasto, cajaVacia, cobrosConfiables, cobrosDelJugador, deudaDe, liquidar, pagoAlcanza, partesIguales, saldosDe } from "./caja.ts";

test("reparte en partes iguales y el resto va a los primeros", () => {
  assert.deepEqual(partesIguales(10, ["a", "b", "c"]), [
    { memberId: "a", monto: 4 },
    { memberId: "b", monto: 3 },
    { memberId: "c", monto: 3 },
  ]);
});

test("el que pagó queda a favor y un cobro confirmado lo baja", () => {
  const gasto = armarGasto({
    id: "g1",
    titulo: "Cancha",
    monto: 9,
    categoria: "cancha",
    fecha: "2026-10-05",
    pagadoPor: "dt",
    personas: ["dt", "a", "b"],
    at: "2026-10-05T20:00:00Z",
  });
  assert.ok(gasto);
  let caja = { ...cajaVacia("dt"), gastos: [gasto] };
  assert.equal(deudaDe(caja, "g1", "a"), 3);
  assert.equal(deudaDe(caja, "g1", "dt"), 0);
  caja = aplicarCobro(caja, {
    id: "c1",
    gastoId: "g1",
    memberId: "a",
    monto: 3,
    medio: "mp",
    estado: "confirmado",
    paymentId: "pay-1",
    at: "2026-10-05T21:00:00Z",
  });
  const otra = aplicarCobro(caja, {
    id: "c2",
    gastoId: "g1",
    memberId: "a",
    monto: 3,
    medio: "mp",
    estado: "confirmado",
    paymentId: "pay-1",
    at: "2026-10-05T21:01:00Z",
  });
  assert.equal(otra, caja);
  assert.equal(deudaDe(caja, "g1", "a"), 0);
  const saldos = saldosDe(caja);
  assert.equal(saldos.find((row) => row.memberId === "a"), undefined);
  assert.equal(saldos.find((row) => row.memberId === "b")?.saldo, -3);
  assert.equal(saldos.find((row) => row.memberId === "dt")?.saldo, 3);
});

test("liquida con la menor cantidad de transferencias", () => {
  const pasos = liquidar([
    { memberId: "a", saldo: -3 },
    { memberId: "b", saldo: -3 },
    { memberId: "dt", saldo: 6 },
  ]);
  assert.equal(pasos.length, 2);
  assert.equal(pasos.every((paso) => paso.a === "dt" && paso.monto === 3), true);
});

test("un gasto sin monto o sin gente no se crea", () => {
  assert.equal(
    armarGasto({
      id: "g",
      titulo: "  ",
      monto: 0,
      categoria: "otro",
      fecha: "",
      pagadoPor: "dt",
      personas: [],
      at: "",
    }),
    null,
  );
});

test("el cupón fijo y el exento no deben", () => {
  const cupones = armarCupones({
    modo: "fijo",
    monto: 3000,
    gente: [
      { id: "a" },
      { id: "inv-1", nombre: "Gabi", exento: true },
    ],
  });
  assert.ok(cupones);
  const gasto = armarGasto({
    id: "g2",
    titulo: "Cancha",
    monto: 1,
    categoria: "cancha",
    fecha: "2026-10-08",
    pagadoPor: "dt",
    personas: [],
    cupones: cupones!,
    at: "2026-10-08T20:00:00Z",
  });
  assert.equal(gasto?.monto, 3000);
  const caja = { ...cajaVacia("dt"), gastos: [gasto!] };
  assert.equal(deudaDe(caja, "g2", "a"), 3000);
  assert.equal(deudaDe(caja, "g2", "inv-1"), 0);
  assert.equal(pagoAlcanza(3000, 2999), false);
  assert.equal(pagoAlcanza(3000, 3000), true);
  const paga = aplicarCobro(caja, {
    id: "c1",
    gastoId: "g2",
    memberId: "a",
    monto: 3000,
    medio: "mp",
    estado: "confirmado",
    paymentId: "pay-2",
    at: "2026-10-08T21:00:00Z",
  });
  assert.equal(paga.gastos[0]?.cerrado, true);
});

test("un cobro de Mercado Pago nuevo no se confirma solo", () => {
  const previo = {
    id: "c1",
    gastoId: "g",
    memberId: "a",
    monto: 3,
    medio: "mp" as const,
    estado: "confirmado" as const,
    paymentId: "pay-1",
    at: "t",
  };
  const falso = { ...previo, id: "c2", memberId: "b", paymentId: "pay-nuevo", at: "t2" };
  assert.equal(cobrosConfiables([previo], [falso]).length, 0);
  assert.equal(cobrosConfiables([previo], [previo]).length, 1);
  assert.equal(cobrosConfiables([], [{ ...previo, medio: "manual", paymentId: undefined, estado: "confirmado" }]).length, 1);
});

test("un jugador solo marca el suyo y no lo confirma", () => {
  const marcado = {
    id: "c1",
    gastoId: "g",
    memberId: "a",
    monto: 3,
    medio: "manual" as const,
    estado: "marcado" as const,
    at: "t",
  };
  assert.equal(cobrosDelJugador([], [marcado], "a").length, 1);
  assert.equal(cobrosDelJugador([], [{ ...marcado, estado: "confirmado" }], "a").length, 0);
  assert.equal(cobrosDelJugador([], [{ ...marcado, memberId: "b" }], "a").length, 0);
  assert.equal(
    cobrosDelJugador([{ ...marcado, estado: "confirmado" }], [marcado], "a").length,
    0,
  );
});
