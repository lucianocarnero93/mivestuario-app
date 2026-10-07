/* Mi Vestuario · Alineación para compartir (estilo FUT)
   Fuente de verdad del LAYOUT: líneas, perspectiva de la cancha, posición y tamaño de cada chip.
   Sin dependencias. Navegador (window.MVAlineacion) y Node (require). Ver SPEC.md § "Alineación para compartir".

   - FORMATIONS: copia de src/lib/fija/formations.ts (mismas keys y x/y).
   - layout(slots, formato, modalidad): devuelve { x, y, s } por slot (px del lienzo), listo para canvas.
   - pitchSvg(formato, tema): la cancha en perspectiva como SVG (en canvas: mismos puntos con moveTo/lineTo).
   - render(datos): arma los chips en el HTML (solo para las piezas de diseño). */
(function (root) {
  "use strict";

  var FORMATIONS = {
    f5: [
      { id: "diamante", name: "1-2-2", slots: [["ARQ","ARQ",50,86],["LI","DEF",28,62],["LD","DEF",72,62],["EI","DEL",30,24],["ED","DEL",70,24]] },
      { id: "rombo", name: "Rombo", slots: [["ARQ","ARQ",50,86],["DEF","DEF",50,64],["AI","ALA",22,42],["AD","ALA",78,42],["PIV","PIV",50,18]] },
      { id: "1-1-1-2", name: "1-1-1-2", slots: [["ARQ","ARQ",50,86],["DEF","DEF",50,64],["VOL","VOL",50,42],["EI","DEL",32,18],["ED","DEL",68,18]] }
    ],
    f7: [
      { id: "1-2-3-1", name: "1-2-3-1", slots: [["ARQ","ARQ",50,86],["LI","DEF",30,68],["LD","DEF",70,68],["MI","VOL",22,46],["MC","VOL",50,48],["MD","VOL",78,46],["DC","DEL",50,22]] },
      { id: "1-3-2-1", name: "1-3-2-1", slots: [["ARQ","ARQ",50,86],["LI","DEF",18,68],["DF","DEF",50,70],["LD","DEF",82,68],["MI","VOL",32,44],["MD","VOL",68,44],["DC","DEL",50,22]] }
    ],
    f8: [
      { id: "clasica", name: "1-3-3-1 (clásica)", slots: [["ARQ","ARQ",50,86],["LI","LI",18,68],["DF","DF",50,70],["LD","LD",82,68],["MI","VOL",24,44],["MC","VOL",50,48],["MD","VOL",76,44],["DC","DEL",50,22]] },
      { id: "ofensiva", name: "1-2-3-2 (ofensiva)", slots: [["ARQ","ARQ",50,86],["LI","DEF",30,72],["LD","DEF",70,72],["MI","VOL",18,50],["MC","VOL",50,52],["MD","VOL",82,50],["DC1","DEL",35,24],["DC2","DEL",65,24]] },
      { id: "equilibrada", name: "1-3-2-2 (equilibrada)", slots: [["ARQ","ARQ",50,86],["LI","LI",18,68],["DF","DF",50,70],["LD","LD",82,68],["MI","VOL",30,44],["MD","VOL",70,44],["DC1","DEL",35,22],["DC2","DEL",65,22]] }
    ],
    f9: [
      { id: "clasica", name: "1-3-3-2 (clásica)", slots: [["ARQ","ARQ",50,86],["LI","LI",16,64],["DFI","DF",38,76],["DFD","DF",62,76],["LD","LD",84,64],["MI","VOL",24,44],["MC","VOL",50,46],["MD","VOL",76,44],["DC","DEL",50,20]] },
      { id: "defensiva", name: "1-4-3-1 (defensiva)", slots: [["ARQ","ARQ",50,86],["LI","LI",14,68],["DFI","DF",34,72],["DFD","DF",66,72],["LD","LD",86,68],["MI","VOL",24,42],["MC","VOL",50,46],["MD","VOL",76,42],["DC","DEL",50,20]] },
      { id: "ofensiva", name: "1-3-4-1 (ofensiva)", slots: [["ARQ","ARQ",50,86],["LI","DEF",25,72],["DF","DEF",50,74],["LD","DEF",75,72],["MI","VOL",14,46],["MC1","VOL",38,48],["MC2","VOL",62,48],["MD","VOL",86,46],["DC","DEL",50,20]] }
    ],
    f11: [
      { id: "4-4-2", name: "4-4-2 (clásica)", slots: [["ARQ","ARQ",50,88],["LI","LI",14,68],["DFI","DF",34,74],["DFD","DF",66,74],["LD","LD",86,68],["MI","MI",14,46],["MC1","MC",38,50],["MC2","MC",62,50],["MD","MD",86,46],["DC1","DC",38,20],["DC2","DC",62,20]] },
      { id: "4-3-3", name: "4-3-3 (ofensiva)", slots: [["ARQ","ARQ",50,88],["LI","LI",14,68],["DFI","DF",34,74],["DFD","DF",66,74],["LD","LD",86,68],["MC1","VOL",28,48],["MC2","VOL",50,52],["MC3","VOL",72,48],["EI","EI",22,22],["DC","DC",50,18],["ED","ED",78,22]] },
      { id: "4-2-3-1", name: "4-2-3-1 (moderna)", slots: [["ARQ","ARQ",50,88],["LI","LI",14,68],["DFI","DF",34,74],["DFD","DF",66,74],["LD","LD",86,68],["MC1","VOL",38,56],["MC2","VOL",62,56],["MI","EI",22,36],["MCO","MCO",50,36],["MD","ED",78,36],["DC","DC",50,18]] },
      { id: "3-5-2", name: "3-5-2 (con carrileros)", slots: [["ARQ","ARQ",50,88],["DFI","DF",28,72],["DFC","DF",50,74],["DFD","DF",72,72],["MI","CAR",12,46],["MC1","VOL",38,50],["MC2","VOL",62,50],["MD","CAR",88,46],["MCO","MCO",50,32],["DC1","DC",38,18],["DC2","DC",62,18]] }
    ]
  };
  /* F6 y F10 NO existen en la app (types.ts: Modality = f5 | f7 | f8 | f9 | f11). Propuesta por si se suman:
     mismas reglas de coordenadas (x, y en % de la cancha, y grande = arco propio). */
  var PROPUESTAS = {
    f6: [
      { id: "1-2-2-1", name: "1-2-2-1", slots: [["ARQ","ARQ",50,86],["LI","DEF",30,66],["LD","DEF",70,66],["MI","VOL",26,44],["MD","VOL",74,44],["DC","DEL",50,22]] },
      { id: "1-2-1-2", name: "1-2-1-2", slots: [["ARQ","ARQ",50,86],["LI","DEF",30,66],["LD","DEF",70,66],["VOL","VOL",50,46],["EI","DEL",32,22],["ED","DEL",68,22]] }
    ],
    f10: [
      { id: "1-4-3-2", name: "1-4-3-2", slots: [["ARQ","ARQ",50,88],["LI","LI",14,68],["DFI","DF",36,74],["DFD","DF",64,74],["LD","LD",86,68],["MI","VOL",24,46],["MC","VOL",50,50],["MD","VOL",76,46],["DC1","DEL",38,20],["DC2","DEL",62,20]] },
      { id: "1-3-4-2", name: "1-3-4-2", slots: [["ARQ","ARQ",50,88],["DFI","DF",28,72],["DFC","DF",50,74],["DFD","DF",72,72],["MI","VOL",14,46],["MC1","VOL",38,50],["MC2","VOL",62,50],["MD","VOL",86,46],["DC1","DEL",38,20],["DC2","DEL",62,20]] }
    ]
  };
  [FORMATIONS, PROPUESTAS].forEach(function (G) { Object.keys(G).forEach(function (m) {
    G[m].forEach(function (f) {
      f.slots = f.slots.map(function (s) { return { key: s[0], label: s[1], x: s[2], y: s[3] }; });
    });
  }); });

  /* ------------------------------------------------------------------ formatos (px del lienzo)
     pitch: top/bottom = línea de fondo lejana / cercana · wFar/wNear = ancho de la cancha arriba/abajo
     rows: tAtk/tArq = altura (0 arriba … 1 abajo, dentro de la cancha) de la línea más ofensiva y del arquero
     chip: ancho base por modalidad (alto = ancho × 1,28). sFar = escala del chip en la línea de fondo lejana */
  var FORMATOS = {
    whatsapp: { w: 1080, h: 1350, pitch: { cx: 540, top: 292, bottom: 1124, wFar: 700, wNear: 1010 },
                rows: { tAtk: 0.085, tArq: 0.9 }, spread: 0.94, sFar: 0.88,
                chip: { f5: 180, f6: 175, f7: 170, f8: 156, f9: 146, f10: 140, f11: 136 }, kind: "card" },
    story:    { w: 1080, h: 1920, pitch: { cx: 540, top: 562, bottom: 1352, wFar: 720, wNear: 1010 },
                rows: { tAtk: 0.085, tArq: 0.9 }, spread: 0.94, sFar: 0.88,
                chip: { f5: 176, f6: 171, f7: 166, f8: 152, f9: 142, f10: 136, f11: 132 }, kind: "card" },
    og:       { w: 1200, h: 630, pitch: { cx: 892, top: 60, bottom: 596, wFar: 430, wNear: 540 },
                rows: { tAtk: 0.10, tArq: 0.86 }, spread: 0.92, sFar: 0.9,
                chip: { f5: 64, f6: 62, f7: 60, f8: 56, f9: 54, f10: 53, f11: 52 }, kind: "disc" }
  };
  var ASPECT = 1.28;

  /* ------------------------------------------------------------------ líneas
     Se ordenan los slots de atrás (y grande = arco propio) hacia adelante y se cortan en "líneas"
     cuando la distancia en y con el anterior pasa de 9. Cada línea va a una fila pareja en pantalla.
     Excepción: laterales sueltos (ver abajo). */
  function lineas(slots) {
    var s = slots.slice().sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var out = [];
    s.forEach(function (slot) {
      var g = out[out.length - 1];
      if (!g || g[g.length - 1].y - slot.y > 9) out.push([slot]);
      else g.push(slot);
    });
    // Laterales sueltos (línea solo de jugadores abiertos, |x − 50| ≥ 30) se suman a la línea de atrás si están a ≤ 12:
    // quedan apenas adelantados por el escalón y no agregan una fila (ej. F9 1-3-3-2: LI/LD con DFI/DFD).
    for (var i = out.length - 1; i > 0; i--) {
      var g = out[i], atras = out[i - 1];
      var abiertos = g.every(function (q) { return Math.abs(q.x - 50) >= 30; });
      if (abiertos && g[0].y >= atras[atras.length - 1].y - 12 && atras[0].key !== "ARQ") { out[i - 1] = atras.concat(g); out.splice(i, 1); }
    }
    return out;
  }

  /* Proyección: u (0 izq … 1 der), t (0 fondo lejano … 1 fondo cercano) → px */
  function proyectar(P, u, t) {
    var w = P.wFar + (P.wNear - P.wFar) * t;
    return { x: P.cx + (u - 0.5) * w, y: P.top + t * (P.bottom - P.top), w: w };
  }
  /* Perspectiva real para las líneas de la cancha: v (0 … 1 a lo largo de la cancha) → t de pantalla */
  function tDeV(P, v) {
    var r = P.wFar / P.wNear;
    var z = 1 / r + (1 - 1 / r) * v;
    return (1 / z - r) / (1 - r);
  }

  function layout(slots, formato, modalidad) {
    var F = typeof formato === "string" ? FORMATOS[formato] : formato;
    var P = F.pitch, L = lineas(slots), n = L.length;
    var base = F.chip[modalidad] || F.chip.f7;
    var out = [];
    L.forEach(function (g, i) {
      var tRow = n === 1 ? F.rows.tArq : F.rows.tArq - i * (F.rows.tArq - F.rows.tAtk) / (n - 1);
      var media = g.reduce(function (a, s) { return a + s.y; }, 0) / g.length;
      g.forEach(function (slot) {
        var t = tRow + (slot.y - media) / 100 * 0.55;          // escalón suave dentro de la línea (laterales más arriba)
        var u = 0.5 + (slot.x - 50) / 100 * F.spread;
        var p = proyectar(P, u, t);
        var s = F.sFar + (1 - F.sFar) * t;
        out.push({ key: slot.key, label: slot.label, x: Math.round(p.x), y: Math.round(p.y), s: +s.toFixed(3),
                   w: base * s, h: base * ASPECT * s, linea: i });
      });
    });
    // Si dos chips se pisan, se achican TODOS por igual (nunca se mueven): factor = el peor caso, con 8px de aire.
    var GAP = F.kind === "disc" ? 6 : 8, k = 1;
    for (var a = 0; a < out.length; a++) for (var b = a + 1; b < out.length; b++) {
      var A = out[a], B = out[b];
      var fx = Math.abs(A.x - B.x) / ((A.w + B.w) / 2 + GAP), fy = Math.abs(A.y - B.y) / ((A.h + B.h) / 2 + GAP);
      if (fx < 1 && fy < 1) k = Math.min(k, Math.max(fx, fy));
    }
    out.forEach(function (q) { q.w = Math.round(q.w * k); q.h = Math.round(q.h * k); q.k = +k.toFixed(3); });
    return out;
  }

  /* ------------------------------------------------------------------ cancha en perspectiva (SVG) */
  function pt(P, u, v) { var p = proyectar(P, u, tDeV(P, v)); return p.x.toFixed(1) + " " + p.y.toFixed(1); }
  function poly(P, pts) { return "M" + pts.map(function (q) { return pt(P, q[0], q[1]); }).join(" L") + " Z"; }
  function line(P, pts) { return "M" + pts.map(function (q) { return pt(P, q[0], q[1]); }).join(" L"); }
  function elipse(P, cu, cv, ru, rv, a0, a1) {
    var pts = [], N = 48;
    for (var i = 0; i <= N; i++) { var a = a0 + (a1 - a0) * i / N; pts.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]); }
    return line(P, pts);
  }

  function pitchSvg(formato, tema) {
    var F = typeof formato === "string" ? FORMATOS[formato] : formato;
    var P = F.pitch, W = F.w, H = F.h;
    // medidas en unidades de cancha (como pitch.tsx: 90×130 → u 0..1, v 0..1)
    var m = 0.035;                       // margen de césped fuera de las líneas
    var bandas = 14, s = "";
    for (var i = 0; i < bandas; i++) {
      var v0 = -m + (1 + 2 * m) * i / bandas, v1 = -m + (1 + 2 * m) * (i + 1) / bandas;
      s += '<path class="banda b' + (i % 2) + '" d="' + poly(P, [[-m, v0], [1 + m, v0], [1 + m, v1], [-m, v1]]) + '"/>';
    }
    var areaU = 0.622 / 2, areaV = 0.138, chicaU = 0.4 / 2, chicaV = 0.0615, ru = 0.133, rv = 0.092;
    var lineas = [
      poly(P, [[0, 0], [1, 0], [1, 1], [0, 1]]),
      line(P, [[0, 0.5], [1, 0.5]]),
      elipse(P, 0.5, 0.5, ru, rv, 0, Math.PI * 2),
      poly(P, [[0.5 - areaU, 0], [0.5 + areaU, 0], [0.5 + areaU, areaV], [0.5 - areaU, areaV]]),
      poly(P, [[0.5 - chicaU, 0], [0.5 + chicaU, 0], [0.5 + chicaU, chicaV], [0.5 - chicaU, chicaV]]),
      poly(P, [[0.5 - areaU, 1], [0.5 + areaU, 1], [0.5 + areaU, 1 - areaV], [0.5 - areaU, 1 - areaV]]),
      poly(P, [[0.5 - chicaU, 1], [0.5 + chicaU, 1], [0.5 + chicaU, 1 - chicaV], [0.5 - chicaU, 1 - chicaV]]),
    ].concat(F.kind === "disc" ? [] : [
      elipse(P, 0.5, areaV, ru * 0.62, rv * 0.62, 0.18 * Math.PI, 0.82 * Math.PI),
      elipse(P, 0.5, 1 - areaV, ru * 0.62, rv * 0.62, 1.18 * Math.PI, 1.82 * Math.PI)
    ]).map(function (d) { return '<path d="' + d + '"/>'; }).join("");
    var c = proyectar(P, 0.5, tDeV(P, 0.5));
    var borde = poly(P, [[-m, -m], [1 + m, -m], [1 + m, 1 + m], [-m, 1 + m]]);
    return '<svg class="pitch" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<defs><linearGradient id="pitch-fade" x1="0" y1="' + P.top + '" x2="0" y2="' + P.bottom + '" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".22" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
      '<mask id="pitch-mask"><rect width="' + W + '" height="' + H + '" fill="url(#pitch-fade)"/></mask>' +
      '<radialGradient id="pitch-light" cx="' + c.x + '" cy="' + (P.top - 60) + '" r="' + (P.bottom - P.top) + '" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<path class="sombra" d="' + borde + '"/>' +
      '<g mask="url(#pitch-mask)">' + s + '<path d="' + borde + '" fill="url(#pitch-light)"/>' +
      '<g class="lineas">' + lineas + '</g></g></svg>';
  }

  /* ------------------------------------------------------------------ colores (tema del equipo) */
  function hex(c) { c = c.replace("#", ""); if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join(""); return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function toHex(a) { return "#" + a.map(function (x) { return Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"); }).join(""); }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return toHex(A.map(function (x, i) { return x + (B[i] - x) * t; })); }
  function lum(c) { var a = hex(c).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  function contraste(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* Tema "neon" = marca. Tema "equipo" = Club.colores {primary, secondary}.
     Devuelve variables CSS (en canvas: los mismos valores para los gradientes). */
  function tema(nombre, colores) {
    if (nombre !== "equipo" || !colores) {
      return { nombre: "neon", frame: ["#f6ffd9", "#b8f25a", "#6aa824", "#d9ff9a"], body: ["#24603a", "#0f2c1b", "#061109"],
               ink: "#eef6ef", inkSoft: "#b9d4c2", num: "#b8f25a", ribbon: "#b8f25a", ribbonInk: "#0c1a10",
               glow: "rgba(184,242,90,.45)", trim: "rgba(184,242,90,.55)", silueta: "#2c6a42", fondo: "#24603a",
               grass: ["#1d5c36", "#195231"], lines: "rgba(232,243,234,.62)", accent: "#b8f25a",
               avatar: { primary: "#1f6f3f", secondary: "#b8f25a" } };
    }
    var p = colores.primary, s = colores.secondary;
    // si el primario es casi negro, el cuerpo del chip usa el secundario oscurecido para no perder el chip
    var cuerpo = lum(p) < 0.02 ? mix(p, s, 0.28) : p;
    var acento = contraste(s, "#0b1c12") >= 3 ? s : mix(s, "#ffffff", 0.45);
    var ribbonInk = contraste(acento, "#0c1a10") >= 4.5 ? "#0c1a10" : "#ffffff";
    var cuerpoMedio = mix(cuerpo, "#000", 0.38);
    var numero = contraste(acento, cuerpoMedio) >= 3 ? acento : mix(acento, "#fff", 0.82);
    return { nombre: "equipo",
             frame: [mix(acento, "#fff", 0.72), acento, mix(acento, "#000", 0.42), mix(acento, "#fff", 0.4)],
             body: [mix(cuerpo, "#fff", 0.12), mix(cuerpo, "#000", 0.38), mix(cuerpo, "#000", 0.78)],
             ink: "#ffffff", inkSoft: mix(acento, "#fff", 0.55), num: numero, ribbon: acento, ribbonInk: ribbonInk,
             glow: "rgba(" + hex(acento).join(",") + ",.42)", trim: "rgba(" + hex(acento).join(",") + ",.6)",
             silueta: mix(cuerpo, "#fff", 0.18), fondo: cuerpo,
             grass: ["#1b5332", "#174a2c"], lines: "rgba(240,244,240,.6)", accent: acento,
             avatar: { primary: p, secondary: s } };
  }

  /* ------------------------------------------------------------------ imagen de la persona (regla imagenDe)
     foto → avatar → iniciales. Menores: nunca foto (aunque venga en los datos). */
  function imagenDe(p) {
    var img = p.imagen || {};
    if (img.tipo === "foto" && !p.menor && img.src) return img;
    if (img.tipo === "foto" && p.menor) return p.avatar ? { tipo: "avatar", cfg: p.avatar } : { tipo: "iniciales", letras: p.iniciales };
    if (img.tipo === "avatar" && img.cfg) return img;
    return { tipo: "iniciales", letras: img.letras || p.iniciales || "J" };
  }

  // forma de la card de premios (720×1000) para el chip: misma muesca arriba y punta abajo
  var MARCO = "M 36 0 H 262 L 290 22 H 430 L 458 0 H 684 Q 720 0 720 36 V 800 Q 720 858 664 886 L 398 992 Q 360 1006 322 992 L 56 886 Q 0 858 0 800 V 36 Q 0 0 36 0 Z";
  var CUERPO = "M 46 12 H 257 L 285 34 H 435 L 463 12 H 674 Q 708 12 708 46 V 796 Q 708 850 656 876 L 394 980 Q 360 993 326 980 L 64 876 Q 12 850 12 796 V 46 Q 12 12 46 12 Z";
  var TRIM = "M 56 24 H 252 L 280 46 H 440 L 468 24 H 664 Q 696 24 696 56 V 792 Q 696 842 648 866 L 390 968 Q 360 980 330 968 L 72 866 Q 24 842 24 792 V 56 Q 24 24 56 24 Z";
  var SILUETA = '<svg viewBox="0 0 400 490" preserveAspectRatio="xMidYMax meet"><circle cx="200" cy="150" r="92"/><path d="M20 490 C 26 360 96 290 200 288 C 304 290 374 360 380 490 Z"/></svg>';

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var uidN = 0;
  function picHtml(p, T, modo) {
    var im = imagenDe(p);
    if (im.tipo === "foto") return '<div class="pic st-foto"><img src="' + esc(im.src) + '" alt="">' + (p.ejemplo ? '<i class="tag">' + (modo === "chip" ? "Foto ejemplo" : "Ejemplo") + "</i>" : "") + "</div>";
    if (im.tipo === "avatar" && root.MVAvatar) {
      var svg = root.MVAvatar.svg(im.cfg, T.avatar, { bg: null, uid: "av" + (uidN++) });
      return '<div class="pic st-avatar"><img src="data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '" alt=""></div>';
    }
    return '<div class="pic st-ini">' + (modo === "chip" ? SILUETA : "") + '<b>' + esc(im.letras) + "</b></div>";
  }

  function chipHtml(p, pos, T) {
    return '<div class="chip" style="left:' + pos.x + 'px;top:' + pos.y + 'px;--w:' + pos.w + 'px;z-index:' + (100 + pos.y) + '">' +
      '<div class="sombra-piso"></div>' +
      '<svg class="shape" viewBox="0 0 720 1000" preserveAspectRatio="none">' +
      '<path d="' + MARCO + '" fill="url(#g-frame)"/><path d="' + CUERPO + '" fill="url(#g-body)"/>' +
      '<path d="' + CUERPO + '" fill="url(#g-rayas)"/></svg>' +
      '<div class="clip">' + picHtml(p, T, "chip") + '<div class="shine"></div></div>' +
      '<svg class="trim" viewBox="0 0 720 1000" preserveAspectRatio="none"><path d="' + TRIM + '"/></svg>' +
      (p.numero != null ? '<div class="num">' + esc(p.numero) + "</div>" : "") +
      '<div class="ribbon"><span class="fit" data-min="0.95">' + esc(p.nombre) + '</span></div>' +
      '<div class="pos">' + esc(pos.label) + "</div></div>";
  }

  function discHtml(p, pos) {
    var conNumero = p && !p.menor && p.numero != null;
    return '<div class="disc' + (p ? "" : " vacio") + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px;--w:' + pos.w + 'px">' +
      '<div class="d-ring"><b>' + (conNumero ? esc(p.numero) : "") + '</b></div><span>' + esc(pos.label) + "</span></div>";
  }

  function benchHtml(p, T, dt) {
    return '<div class="sub' + (dt ? " dt" : "") + '"><div class="ring">' + picHtml(p, T, "sub") +
      (dt ? '<i class="badge">DT</i>' : (p.numero != null ? '<i class="badge">' + esc(p.numero) + "</i>" : "")) +
      '</div><span class="fit" data-min="16">' + esc(p.nombre) + "</span></div>";
  }

  function defs(T) {
    return '<svg class="defs" width="0" height="0" style="position:absolute"><defs>' +
      '<linearGradient id="g-frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + T.frame[0] + '"/><stop offset=".45" stop-color="' + T.frame[1] + '"/><stop offset=".72" stop-color="' + T.frame[2] + '"/><stop offset="1" stop-color="' + T.frame[3] + '"/></linearGradient>' +
      '<linearGradient id="g-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + T.body[0] + '"/><stop offset=".55" stop-color="' + T.body[1] + '"/><stop offset="1" stop-color="' + T.body[2] + '"/></linearGradient>' +
      '<pattern id="g-rayas" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><rect width="40" height="40" fill="none"/><rect width="14" height="40" fill="rgba(255,255,255,.035)"/></pattern>' +
      '<linearGradient id="g-dt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8f25a"/><stop offset=".55" stop-color="#3a5c46"/><stop offset="1" stop-color="#0b1c12"/></linearGradient>' +
      "</defs></svg>";
  }

  function fit(scope) {
    scope.querySelectorAll(".fit").forEach(function (el) {
      var box = el.parentElement, cs = getComputedStyle(el);
      var size = parseFloat(cs.fontSize), min = parseFloat(el.dataset.min || 12);
      if (el.dataset.min && parseFloat(el.dataset.min) < 4) min = parseFloat(el.dataset.min) * parseFloat(getComputedStyle(box).fontSize);
      el.style.display = "block"; el.style.whiteSpace = "nowrap";
      while (el.scrollWidth > el.clientWidth + 1 && size > min) { size -= 1; el.style.fontSize = size + "px"; }
      if (el.scrollWidth > el.clientWidth + 1) { el.style.overflow = "hidden"; el.style.textOverflow = "ellipsis"; el.dataset.cortado = "1"; }
    });
  }

  /* QA de las piezas: chips que se pisan, textos cortados, cosas fuera del lienzo o en zonas seguras */
  function qa(stage, F, safe) {
    var r0 = stage.getBoundingClientRect(), out = [];
    var rects = Array.prototype.map.call(stage.querySelectorAll(".chip,.disc"), function (el) {
      var r = el.querySelector(".shape,.d-ring").getBoundingClientRect();
      return { el: el, l: r.left - r0.left, t: r.top - r0.top, r: r.right - r0.left, b: r.bottom - r0.top };
    });
    for (var i = 0; i < rects.length; i++) for (var j = i + 1; j < rects.length; j++) {
      var a = rects[i], b = rects[j];
      var ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ix > 2 && iy > 2) out.push("PISA " + a.el.textContent.trim().slice(0, 12) + " / " + b.el.textContent.trim().slice(0, 12) + " " + Math.round(ix) + "x" + Math.round(iy));
    }
    Array.prototype.forEach.call(stage.querySelectorAll(".head,.banco,.pills,.left .og-pill,.left .meta,.left .rival"), function (z) {
      var r = z.getBoundingClientRect(), zl = r.left - r0.left, zt = r.top - r0.top, zr = zl + r.width, zb = zt + r.height;
      rects.forEach(function (a) {
        if (Math.min(a.r, zr) - Math.max(a.l, zl) > 2 && Math.min(a.b, zb) - Math.max(a.t, zt) > 2) out.push("PISA ZONA " + z.className + " / " + a.el.textContent.trim().slice(0, 12));
      });
    });
    rects.forEach(function (a) { if (a.l < 0 || a.t < 0 || a.r > F.w || a.b > F.h) out.push("FUERA " + a.el.textContent.trim().slice(0, 12)); });
    stage.querySelectorAll("[data-cortado]").forEach(function (el) { out.push("CORTADO " + el.textContent); });
    stage.querySelectorAll(".key").forEach(function (el) {
      var r = el.getBoundingClientRect(), t = r.top - r0.top, b = r.bottom - r0.top;
      if (r.width && safe && (t < safe.top || b > F.h - safe.bottom)) out.push("ZONA SEGURA " + el.className + " " + Math.round(t) + "-" + Math.round(b));
      if (r.width && (r.left - r0.left < 0 || r.right - r0.left > F.w)) out.push("FUERA " + el.className);
    });
    return out;
  }

  function render(d) {
    var F = FORMATOS[d.formato];
    var G = FORMATIONS[d.modalidad] || PROPUESTAS[d.modalidad] || FORMATIONS.f7;
    var forma = G.filter(function (f) { return f.id === d.formacion; })[0] || G[0];
    var T = tema(d.tema, d.colores);
    var stage = document.querySelector(".stage");
    stage.insertAdjacentHTML("afterbegin", defs(T));
    var vars = { "--frame-1": T.frame[0], "--frame-2": T.frame[1], "--frame-3": T.frame[2], "--ink": T.ink, "--ink-soft": T.inkSoft,
                 "--num": T.num, "--ribbon": T.ribbon, "--ribbon-ink": T.ribbonInk, "--glow": T.glow, "--trim": T.trim,
                 "--silueta": T.silueta, "--fondo": T.fondo, "--grass-0": T.grass[0], "--grass-1": T.grass[1], "--lines": T.lines, "--accent": T.accent };
    Object.keys(vars).forEach(function (k) { stage.style.setProperty(k, vars[k]); });
    stage.classList.add("tema-" + T.nombre);
    document.querySelector(".pitch-holder").innerHTML = pitchSvg(F, T);
    var pos = layout(forma.slots, F, d.modalidad);
    var byKey = {}; (d.titulares || []).forEach(function (p) { byKey[p.slot] = p; });
    var html = pos.map(function (q) {
      var p = byKey[q.key];
      if (F.kind === "disc") return discHtml(p && !p.oculto ? p : null, q);
      return p ? chipHtml(p, q, T) : "";
    }).join("");
    document.querySelector(".players").innerHTML = html;
    var banco = document.querySelector(".banco-lista");
    // Banco: entran 7. Si hay más, 6 + una burbuja "+N".
    var lista = d.banco || [], MAX = 7;
    if (banco) banco.innerHTML = (lista.length > MAX ? lista.slice(0, MAX - 1) : lista).map(function (p) { return benchHtml(p, T, false); }).join("") +
      (lista.length > MAX ? '<div class="sub mas"><div class="ring"><div class="pic st-ini"><b>+' + (lista.length - MAX + 1) + '</b></div></div><span>más</span></div>' : "");
    var dt = document.querySelector(".dt-lista");
    if (dt) dt.innerHTML = (d.dt || []).map(function (p) { return benchHtml(p, T, true); }).join("");
    if (!(d.banco || []).length && document.querySelector(".banco")) document.querySelector(".banco").classList.add("sin-banco");
    fit(stage);
    var res = qa(stage, F, d.formato === "story" ? { top: 250, bottom: 300 } : null);
    var pre = document.createElement("pre"); pre.id = "qa"; pre.style.display = "none";
    pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
    return res;
  }

  var API = { FORMATIONS: FORMATIONS, PROPUESTAS: PROPUESTAS, FORMATOS: FORMATOS, ASPECT: ASPECT, lineas: lineas, layout: layout, proyectar: proyectar,
              tDeV: tDeV, pitchSvg: pitchSvg, tema: tema, imagenDe: imagenDe, mix: mix, contraste: contraste, render: render, fit: fit };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MVAlineacion = API;
})(typeof window !== "undefined" ? window : globalThis);
