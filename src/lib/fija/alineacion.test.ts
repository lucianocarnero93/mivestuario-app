import assert from "node:assert/strict";
import test from "node:test";
import { FORMATIONS } from "./formations.ts";
import type { Modality } from "./types.ts";
import {
  archivoAlineacion,
  armarAlineacion,
  coloresDelEquipo,
  coloresValidos,
  cuandoTexto,
  FORMATOS,
  layout,
  mix,
  rivalDe,
  tema,
  textoAlineacion,
  type FormatoAlineacion,
  type PersonaEntrada,
} from "./alineacion.ts";

function puesto(mod: Modality, id: string, formato: FormatoAlineacion, key: string) {
  const forma = FORMATIONS[mod].find((item) => item.id === id);
  if (!forma) throw new Error(id);
  const slot = layout(forma.slots, formato, mod).find((item) => item.key === key);
  if (!slot) throw new Error(key);
  return slot;
}

function cerca(slot: { x: number; y: number; w: number }, x: number, y: number, w: number) {
  assert.ok(Math.abs(slot.x - x) <= 1, `x ${slot.x} ≠ ${x}`);
  assert.ok(Math.abs(slot.y - y) <= 1, `y ${slot.y} ≠ ${y}`);
  assert.ok(Math.abs(slot.w - w) <= 1, `w ${slot.w} ≠ ${w}`);
}

test("WhatsApp F11 4-3-3 coincide con la SPEC", () => {
  const dc = puesto("f11", "4-3-3", "whatsapp", "DC");
  const ei = puesto("f11", "4-3-3", "whatsapp", "EI");
  const ed = puesto("f11", "4-3-3", "whatsapp", "ED");
  const arq = puesto("f11", "4-3-3", "whatsapp", "ARQ");
  cerca(dc, 540, 351, 121);
  cerca(ei, 348, 369, 121);
  cerca(ed, 732, 369, 121);
  cerca(arq, 540, 1041, 134);
  assert.equal(dc.k, 1);
});

test("WhatsApp y story del 3-5-2 achican todos los chips", () => {
  const wa = puesto("f11", "3-5-2", "whatsapp", "DFC");
  assert.ok(Math.abs(wa.k - 0.9) < 0.005, String(wa.k));
  cerca(wa, 540, 877, 119);
  const st = puesto("f11", "3-5-2", "story", "DFC");
  assert.ok(Math.abs(st.k - 0.88) < 0.005, String(st.k));
});

test("story F5 rombo", () => {
  const piv = puesto("f5", "rombo", "story", "PIV");
  assert.ok(Math.abs(piv.k - 0.95) < 0.005, String(piv.k));
  cerca(piv, 540, 629, 148);
});

test("OG F7 1-2-3-1", () => {
  const dc = puesto("f7", "1-2-3-1", "og", "DC");
  const arq = puesto("f7", "1-2-3-1", "og", "ARQ");
  cerca(dc, 892, 114, 55);
  cerca(arq, 892, 521, 59);
});

test("WhatsApp F9 clásica deja a los laterales apenas arriba", () => {
  cerca(puesto("f9", "clasica", "whatsapp", "LI"), 257, 787, 139);
  cerca(puesto("f9", "clasica", "whatsapp", "DFI"), 438, 842, 140);
});

test("4-4-2 con enganche sale del mismo algoritmo", () => {
  const eng = puesto("f11", "4-4-2-enganche", "whatsapp", "ENG");
  const mc = puesto("f11", "4-4-2-enganche", "whatsapp", "MC");
  assert.equal(eng.k, 0.97);
  cerca(eng, 540, 532, 121);
  cerca(mc, 540, 726, 124);
  const story = puesto("f11", "4-4-2-enganche", "story", "ENG");
  assert.equal(story.k, 0.95);
  cerca(story, 540, 790, 115);
  cerca(puesto("f11", "4-4-2-enganche", "og", "ENG"), 892, 215, 48);
});

test("las 16 formaciones no se pisan y entran en el lienzo", () => {
  const formatos: FormatoAlineacion[] = ["whatsapp", "story", "og"];
  let formas = 0;
  for (const mod of Object.keys(FORMATIONS) as Modality[]) {
    for (const forma of FORMATIONS[mod]) {
      formas += 1;
      for (const formato of formatos) {
        const puestos = layout(forma.slots, formato, mod);
        assert.equal(puestos.length, forma.slots.length);
        const F = FORMATOS[formato];
        const gap = F.kind === "disc" ? 6 : 8;
        for (const slot of puestos) {
          assert.ok(slot.x - slot.w / 2 >= -0.5 && slot.y - slot.h / 2 >= -0.5, `${forma.id} ${slot.key} arriba`);
          assert.ok(slot.x + slot.w / 2 <= F.w + 0.5 && slot.y + slot.h / 2 <= F.h + 0.5, `${forma.id} ${slot.key} abajo`);
        }
        for (let a = 0; a < puestos.length; a++) {
          for (let b = a + 1; b < puestos.length; b++) {
            const A = puestos[a];
            const B = puestos[b];
            const fx = Math.abs(A.x - B.x) / ((A.w + B.w) / 2 + gap);
            const fy = Math.abs(A.y - B.y) / ((A.h + B.h) / 2 + gap);
            assert.equal(fx < 0.99 && fy < 0.99, false, `${formato} ${forma.id} ${A.key}/${B.key} ${fx.toFixed(3)} ${fy.toFixed(3)}`);
          }
        }
      }
    }
  }
  assert.equal(formas, 16);
});

function persona(parcial: Partial<PersonaEntrada> & { id: string }): PersonaEntrada {
  return { role: "jugador", number: 10, nick: "Tobi", ...parcial };
}

const FOTO = "data:image/png;base64,aaaa";

function armar(parcial: Parameters<typeof armarAlineacion>[0]["event"] extends infer _ ? Partial<Parameters<typeof armarAlineacion>[0]> : never) {
  return armarAlineacion({
    formato: "whatsapp",
    event: {
      title: "vs Racing del Bajo",
      startsAt: "2026-10-10T18:00:00.000Z",
      modality: "f11",
      place: "El Potrero",
      suplentes: [],
    },
    plan: { id: "a", lineup: { DC: "a1" }, formacion: "4-3-3" },
    members: [persona({ id: "a1", nick: "Tobi", number: 9 })],
    club: { name: "Los Pibes" },
    tema: "neon",
    ...parcial,
  });
}

test("un adulto sin apodo sale como Jugador y nunca con el nombre", () => {
  const datos = armar({
    members: [persona({ id: "a1", nick: "  ", name: "Juan Pérez", number: 9 })],
  });
  assert.equal(datos.titulares[0]?.nombre, "Jugador");
  assert.equal(JSON.stringify(datos).includes("Juan"), false);
});

test("a un menor no le toca foto, y sin fotos no hay foto de nadie", () => {
  const menor = armar({
    formato: "whatsapp",
    conFotos: true,
    fotosCard: { a1: FOTO },
    members: [persona({ id: "a1", nick: "Theo", menor: true, photo: FOTO })],
  });
  assert.notEqual(menor.titulares[0]?.imagen?.tipo, "foto");
  assert.equal(menor.titulares[0]?.nombre, "Theo");
  const story = armar({
    formato: "story",
    conFotos: true,
    fotosCard: { a1: FOTO },
    members: [persona({ id: "a1", nick: "Theo", menor: true, photo: FOTO, number: 7 })],
  });
  assert.equal(story.titulares[0]?.anonimo, true);
  assert.equal(story.titulares[0]?.nombre, "");
  assert.equal(story.titulares[0]?.numero, null);
  assert.equal(story.titulares[0]?.imagen, null);
  const sin = armar({
    conFotos: false,
    fotosCard: { a1: FOTO },
    members: [persona({ id: "a1", nick: "Tobi", photo: FOTO })],
  });
  assert.notEqual(sin.titulares[0]?.imagen?.tipo, "foto");
});

test("el OG no lleva nombres ni banco, y el menor queda sin número", () => {
  const datos = armar({
    formato: "og",
    conFotos: true,
    fotosCard: { a1: FOTO, s1: FOTO },
    event: {
      title: "vs Racing",
      startsAt: "2026-10-10T18:00:00.000Z",
      modality: "f5",
      suplentes: ["s1"],
      convocados: ["a1", "s1"],
    },
    plan: { id: "a", lineup: { PIV: "a1" }, formacion: "rombo" },
    members: [
      persona({ id: "a1", nick: "Theo", menor: true, number: 11, photo: FOTO }),
      persona({ id: "s1", nick: "Nico", number: 4 }),
      persona({ id: "dt", nick: "Profe", role: "dt", number: null }),
    ],
  });
  assert.equal(datos.banco.length, 0);
  assert.equal(datos.dt.length, 0);
  const piv = datos.titulares.find((item) => item.key === "PIV");
  assert.equal(piv?.numero, null);
  assert.equal(piv?.nombre, "");
  assert.equal(piv?.imagen, null);
  assert.equal(datos.titulares.every((item) => item.nombre === "" && item.imagen === null), true);
  assert.ok(datos.titulares.some((item) => item.vacio));
});

test("con oculto el menor no aparece ni en la cancha ni en el banco", () => {
  const datos = armar({
    menores: "oculto",
    event: {
      title: "vs Racing",
      startsAt: "2026-10-10T18:00:00.000Z",
      modality: "f11",
      suplentes: ["s1"],
      convocados: ["a1", "s1"],
    },
    plan: { id: "a", lineup: { DC: "a1" }, formacion: "4-3-3" },
    members: [
      persona({ id: "a1", nick: "Theo", menor: true }),
      persona({ id: "s1", nick: "Luchi", menor: true }),
    ],
  });
  assert.equal(datos.titulares.length, 0);
  assert.equal(datos.banco.length, 0);
});

test("el rival sale del campo, de la planilla o del título", () => {
  assert.equal(rivalDe({ title: "vs. Racing del Bajo", opponent: "  Los de arriba " }), "Los de arriba");
  assert.equal(rivalDe({ title: "vs. Racing del Bajo" }, { opponent: "Defensores" }), "Defensores");
  assert.equal(rivalDe({ title: "vs. Racing del Bajo" }), "Racing del Bajo");
});

test("cuándo se dice en hora de Buenos Aires, también cerca de la medianoche", () => {
  const noche = Date.parse("2026-10-11T02:30:00.000Z");
  assert.equal(cuandoTexto("2026-10-11T01:00:00.000Z", noche), "hoy");
  assert.equal(cuandoTexto("2026-10-11T04:00:00.000Z", noche), "mañana");
  assert.equal(cuandoTexto("2026-10-16T18:00:00.000Z", noche), "el viernes");
  assert.equal(cuandoTexto("2026-10-24T18:00:00.000Z", noche), "el 24/10");
});

test("el archivo pierde tildes y eñes", () => {
  assert.equal(
    archivoAlineacion({
      equipo: "Ñandú Café",
      rival: "Racing del Bajo",
      startsAt: "2026-10-10T18:00:00.000Z",
      formato: "whatsapp",
    }),
    "mi-vestuario-formacion-nandu-cafe-vs-racing-del-bajo-2026-10-10-whatsapp.png",
  );
});

test("el texto para WhatsApp nombra el día y el link", () => {
  const texto = textoAlineacion({
    rival: "Racing del Bajo",
    startsAt: "2026-10-10T18:00:00.000Z",
    now: Date.parse("2026-10-08T15:00:00.000Z"),
    link: "https://www.mivestuario.com.ar/vivo?t=abc",
  });
  assert.equal(texto, "Así salimos el sábado vs Racing del Bajo ⚽ Mirá la formación: https://www.mivestuario.com.ar/vivo?t=abc");
  assert.match(textoAlineacion({ rival: "Racing", startsAt: "2026-10-10T18:00:00.000Z", now: Date.parse("2026-10-10T12:00:00.000Z") }), /Armado en Mi Vestuario\.$/);
});

test("tema equipo con primario casi negro usa la mezcla", () => {
  const t = tema("equipo", { primary: "#111111", secondary: "#d4202a" });
  assert.equal(t.fondo, mix("#111111", "#d4202a", 0.28));
  assert.equal(t.nombre, "equipo");
});

test("coloresValidos rechaza lo que no es #rrggbb y no pisa un color válido", () => {
  assert.equal(coloresValidos("red"), null);
  assert.equal(coloresValidos("#12345"), null);
  assert.equal(coloresValidos({ primary: "#fff", secondary: "#000000" }), null);
  const validos = { primary: "#112233", secondary: "#abcdef" };
  assert.deepEqual(coloresDelEquipo({ primary: "red", secondary: "#112233" }, validos), validos);
  assert.deepEqual(coloresDelEquipo({ primary: "#AABBCC", secondary: "#112233" }, validos), { primary: "#aabbcc", secondary: "#112233" });
  assert.equal(coloresDelEquipo(null, validos), null);
  assert.deepEqual(coloresDelEquipo(undefined, validos), validos);
});

test("el banco no repite titulares y respeta convocados", () => {
  const datos = armar({
    event: {
      title: "vs Racing",
      startsAt: "2026-10-10T18:00:00.000Z",
      modality: "f11",
      suplentes: ["a1", "s1", "s2", "fuera", "no"],
      convocados: ["a1", "s1", "s2"],
    },
    plan: { id: "b", lineup: { DC: "a1" }, formacion: "4-3-3" },
    members: [
      persona({ id: "a1", nick: "Tobi" }),
      persona({ id: "s1", nick: "Nico" }),
      persona({ id: "s2", nick: "Fran" }),
      persona({ id: "no", nick: "Guille" }),
    ],
  });
  assert.deepEqual(datos.banco.map((f) => f.id), ["s1", "s2"]);
  assert.equal(datos.kicker, "PLAN B");
  assert.equal(datos.banco.some((f) => f.id === "a1"), false);
});
