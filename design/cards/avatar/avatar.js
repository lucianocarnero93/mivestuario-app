/* Mi Vestuario · Avatar (estilo plano, busto de frente)
   Fuente de verdad del dibujo. Sin dependencias. Funciona en el navegador (window.MVAvatar)
   y en Node (require). viewBox 0 0 400 400.

   Uso:
     MVAvatar.svg({ skin:"t4", hair:"colita", hairColor:"castano", facial:"ninguno",
                    extras:["vincha"], shirtPattern:"bastones", collar:"redondo" },
                  { primary:"#1f6f3f", secondary:"#b8f25a" },   // colores del equipo
                  { bg:null, uid:"a1" })
*/
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ catálogo
  var SKINS = {
    t1: "#f7dcc8", t2: "#efc4a3", t3: "#e0aa83", t4: "#c98d63",
    t5: "#ad7148", t6: "#8d5636", t7: "#6e3f26", t8: "#4b2a1a"
  };
  var HAIR_COLORS = {
    negro: "#1d1715", "castano-oscuro": "#3b2519", castano: "#70462b",
    rubio: "#d4a95c", colorado: "#b0502b", canoso: "#bcb7af"
  };
  var HAIRS = ["pelado", "rapado", "corto", "medio", "largo", "colita", "rodete",
               "trenzas", "rulos", "afro", "melena", "rastas"];
  var FACIALS = ["ninguno", "barba-corta", "barba", "bigote", "candado"];
  var EXTRAS = ["vincha", "anteojos"];
  var PATTERNS = ["lisa", "bastones", "banda", "franja", "mitades"];
  var COLLARS = ["redondo", "v", "polo", "campera"];

  var LABELS = {
    hair: { pelado: "Pelado", rapado: "Rapado", corto: "Corto", medio: "Medio", largo: "Largo",
            colita: "Colita", rodete: "Rodete", trenzas: "Trenzas", rulos: "Rulos", afro: "Afro",
            melena: "Melena", rastas: "Rastas" },
    hairColor: { negro: "Negro", "castano-oscuro": "Castaño oscuro", castano: "Castaño",
                 rubio: "Rubio", colorado: "Colorado", canoso: "Canoso" },
    facial: { ninguno: "Nada", "barba-corta": "Barba de días", barba: "Barba", bigote: "Bigote", candado: "Candado" },
    extras: { vincha: "Vincha", anteojos: "Anteojos" },
    shirtPattern: { lisa: "Lisa", bastones: "Bastones", banda: "Banda", franja: "Franja", mitades: "Mitades" },
    collar: { redondo: "Redondo", v: "En V", polo: "Polo", campera: "Campera" }
  };

  var DEFAULT = { v: 1, skin: "t3", hair: "corto", hairColor: "castano-oscuro", facial: "ninguno",
                  extras: [], shirtPattern: "lisa", collar: "redondo" };
  var DEFAULT_TEAM = { primary: "#1f6f3f", secondary: "#b8f25a" };

  // ------------------------------------------------------------------ color
  function hex(c) { c = c.replace("#", ""); if (c.length === 3) c = c.replace(/(.)/g, "$1$1");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function toHex(a) { return "#" + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v)));
    return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return toHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function lum(c) { var x = hex(c); return (0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]) / 255; }

  /** Paleta derivada. En el código de la app: mismas fórmulas. */
  function palette(cfg, team) {
    var skin = SKINS[cfg.skin] || SKINS.t3;
    var hair = HAIR_COLORS[cfg.hairColor] || HAIR_COLORS["castano-oscuro"];
    var primary = (team && team.primary) || DEFAULT_TEAM.primary;
    var secondary = (team && team.secondary) || DEFAULT_TEAM.secondary;
    var light = lum(hair) > 0.45;
    return {
      skin: skin,
      skinShade: mix(skin, "#3b1a0e", 0.2),
      skinDeep: mix(skin, "#3b1a0e", 0.34),
      lip: mix(skin, "#5c1f1c", lum(skin) > 0.5 ? 0.42 : 0.5),
      mouth: mix(skin, "#2a0c0a", 0.62),
      blush: lum(skin) > 0.45 ? "rgba(224,90,72,.16)" : "rgba(160,40,30,.16)",
      eye: "#1e1613",
      hair: hair,
      hairDark: mix(hair, "#000000", light ? 0.2 : 0.28),
      hairLight: mix(hair, "#ffffff", light ? 0.28 : 0.16),
      brow: light ? mix(hair, "#2a1a10", 0.38) : mix(hair, "#000000", 0.1),
      stubble: mix(skin, hair, light ? 0.3 : 0.24),
      primary: primary,
      primaryDark: mix(primary, "#000000", 0.24),
      secondary: secondary,
      secondaryDark: mix(secondary, "#000000", 0.2),
      band: secondary
    };
  }

  // ------------------------------------------------------------------ helpers
  function el(tag, attrs, inner) {
    var s = "<" + tag;
    for (var k in attrs) if (attrs[k] != null) s += " " + k + '="' + attrs[k] + '"';
    return inner == null ? s + "/>" : s + ">" + inner + "</" + tag + ">";
  }
  function path(d, fill, extra) { var a = { d: d, fill: fill }; for (var k in extra || {}) a[k] = extra[k]; return el("path", a); }
  function circles(list, fill) { return list.map(function (c) { return el("circle", { cx: c[0], cy: c[1], r: c[2], fill: fill }); }).join(""); }
  function g(id, inner, extra) { var a = { id: id }; for (var k in extra || {}) a[k] = extra[k]; return el("g", a, inner); }
  function r1(n) { return Math.round(n * 10) / 10; }
  /** puntos sobre una elipse, ángulo en grados (0 = derecha, 90 = abajo) */
  function ring(cx, cy, rx, ry, from, to, step, r, jitter) {
    var out = [], i = 0;
    for (var a = from; a <= to + 0.01; a += step, i++) {
      var t = a * Math.PI / 180, rr = r + (jitter ? ((i % 3) - 1) * jitter : 0);
      out.push([r1(cx + Math.cos(t) * rx), r1(cy + Math.sin(t) * ry), rr]);
    }
    return out;
  }

  // ------------------------------------------------------------------ geometría base
  var HEAD = "M200 80 C 246 80 266 114 266 162 C 266 202 254 230 236 244 C 222 254 212 258 200 258 C 188 258 178 254 164 244 C 146 230 134 202 134 162 C 134 114 154 80 200 80 Z";
  var SHIRT = {
    redondo: "M28 400 C 32 326 82 292 150 280 C 166 292 182 300 200 300 C 218 300 234 292 250 280 C 318 292 368 326 372 400 Z",
    v: "M28 400 C 32 326 82 292 150 280 L 200 334 L 250 280 C 318 292 368 326 372 400 Z",
    polo: "M28 400 C 32 326 82 292 150 280 C 166 292 182 300 200 302 C 218 300 234 292 250 280 C 318 292 368 326 372 400 Z",
    campera: "M28 400 C 32 326 82 292 150 280 C 166 286 182 288 200 288 C 218 288 234 286 250 280 C 318 292 368 326 372 400 Z"
  };
  var NECKLINE = {
    redondo: "M150 280 C 166 292 182 300 200 300 C 218 300 234 292 250 280",
    v: "M150 280 L 200 334 L 250 280"
  };

  // ------------------------------------------------------------------ capas
  function layerNeck(P) {
    return path("M174 210 L 174 290 Q 200 304 226 290 L 226 210 Z", P.skin) +
      path("M160 278 L 240 278 L 200 338 Z", P.skin) +
      path("M174 232 C 186 258 214 258 226 232 L 226 262 C 214 278 186 278 174 262 Z", P.skinShade);
  }

  function layerShirt(cfg, P, uid) {
    var collar = SHIRT[cfg.collar] ? cfg.collar : "redondo";
    var body = SHIRT[collar];
    var clip = uid + "-shirt";
    var pat = "";
    var sec = P.secondary;
    switch (cfg.shirtPattern) {
      case "bastones":
        [-160, -96, -32, 32, 96, 160].forEach(function (x) { pat += el("rect", { x: 200 + x - 16, y: 266, width: 32, height: 140, fill: sec }); });
        break;
      case "banda":
        pat = path("M60 310 L 122 284 L 400 404 L 400 430 L 330 430 Z", sec);
        break;
      case "franja":
        pat = el("rect", { x: 0, y: 328, width: 400, height: 36, fill: sec });
        break;
      case "mitades":
        pat = el("rect", { x: 200, y: 266, width: 200, height: 140, fill: sec });
        break;
      default:
        pat = path("M107 300 C 96 332 92 360 92 400", "none", { stroke: sec, "stroke-width": 6 }) +
              path("M293 300 C 304 332 308 360 308 400", "none", { stroke: sec, "stroke-width": 6 });
    }
    var shade =
      path("M28 400 C 32 326 82 292 150 280 L 108 300 C 96 330 90 360 90 400 Z", "rgba(0,0,0,.16)") +
      path("M372 400 C 368 326 318 292 250 280 L 292 300 C 304 330 310 360 310 400 Z", "rgba(0,0,0,.16)") +
      path("M150 280 C 166 292 182 300 200 302 C 218 300 234 292 250 280 L 262 284 C 244 302 222 314 200 314 C 178 314 156 302 138 284 Z", "rgba(0,0,0,.10)");
    var trim = "";
    if (collar === "redondo" || collar === "v") {
      trim = path(NECKLINE[collar], "none", { stroke: sec, "stroke-width": 10, "stroke-linejoin": "round", "stroke-linecap": "round" });
    } else if (collar === "polo") {
      trim = el("rect", { x: 193, y: 298, width: 14, height: 46, rx: 3, fill: P.secondaryDark }) +
        el("circle", { cx: 200, cy: 314, r: 2.6, fill: P.primary }) + el("circle", { cx: 200, cy: 330, r: 2.6, fill: P.primary }) +
        path("M144 276 C 160 290 180 298 200 302 L 186 330 C 168 316 152 298 144 276 Z", sec) +
        path("M256 276 C 240 290 220 298 200 302 L 214 330 C 232 316 248 298 256 276 Z", sec);
    } else if (collar === "campera") {
      trim = path("M150 280 C 150 262 158 250 172 244 L 228 244 C 242 250 250 262 250 280 C 234 288 218 291 200 291 C 182 291 166 288 150 280 Z", sec) +
        path("M172 244 L 228 244 C 230 252 230 258 228 264 C 216 260 184 260 172 264 C 170 258 170 252 172 244 Z", P.secondaryDark) +
        path("M200 262 L 200 400", "none", { stroke: "rgba(0,0,0,.38)", "stroke-width": 3 }) +
        el("rect", { x: 195, y: 284, width: 10, height: 18, rx: 3, fill: "#d9dfdb" });
    }
    return el("defs", {}, el("clipPath", { id: clip }, path(body, "#000"))) +
      path(body, P.primary) +
      el("g", { "clip-path": "url(#" + clip + ")" }, pat + shade) +
      trim;
  }

  function layerHead(P) {
    return el("ellipse", { cx: 136, cy: 178, rx: 13, ry: 21, fill: P.skin }) +
      el("ellipse", { cx: 264, cy: 178, rx: 13, ry: 21, fill: P.skin }) +
      el("ellipse", { cx: 138, cy: 179, rx: 6, ry: 11, fill: P.skinShade }) +
      el("ellipse", { cx: 262, cy: 179, rx: 6, ry: 11, fill: P.skinShade }) +
      path(HEAD, P.skin) +
      path("M244 106 C 260 124 266 146 266 162 C 266 202 254 230 236 244 C 222 254 212 258 200 258 C 224 248 244 224 250 194 C 255 166 254 132 244 106 Z", P.skinShade, { opacity: 0.5 });
  }

  function layerFace(cfg, P) {
    var browW = 6;
    return el("ellipse", { cx: 165, cy: 206, rx: 13, ry: 7, fill: P.blush }) +
      el("ellipse", { cx: 235, cy: 206, rx: 13, ry: 7, fill: P.blush }) +
      el("ellipse", { cx: 176, cy: 176, rx: 6.5, ry: 8, fill: P.eye }) +
      el("ellipse", { cx: 224, cy: 176, rx: 6.5, ry: 8, fill: P.eye }) +
      el("circle", { cx: 178.4, cy: 173, r: 2, fill: "#fff", opacity: 0.9 }) +
      el("circle", { cx: 226.4, cy: 173, r: 2, fill: "#fff", opacity: 0.9 }) +
      path("M162 157 Q 175 148 190 154", "none", { stroke: P.brow, "stroke-width": browW, "stroke-linecap": "round" }) +
      path("M210 154 Q 225 148 238 157", "none", { stroke: P.brow, "stroke-width": browW, "stroke-linecap": "round" }) +
      path("M202 180 C 201 190 197 196 195 200 C 199 205 205 205 208 201", "none", { stroke: P.skinDeep, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" });
  }

  function layerMouth(cfg, P) {
    var beard = cfg.facial === "barba" || cfg.facial === "candado";
    return (beard ? path("M184 219 Q 200 215 216 219 Q 200 236 184 219 Z", P.lip) : "") +
      path("M185 220 Q 200 232 215 220", "none", { stroke: P.mouth, "stroke-width": 4.5, "stroke-linecap": "round" });
  }

  function layerFacial(cfg, P) {
    switch (cfg.facial) {
      case "barba-corta":
        return path("M135 176 C 137 210 149 234 165 246 C 179 256 189 259 200 259 C 211 259 221 256 235 246 C 251 234 263 210 265 176 L 259 176 C 257 198 249 212 236 214 C 226 214 216 208 200 208 C 184 208 174 214 164 214 C 151 212 143 198 141 176 Z", P.stubble);
      case "barba":
        return path("M134 170 C 132 218 146 250 166 266 C 180 276 190 280 200 280 C 210 280 220 276 234 266 C 254 250 268 218 266 170 L 259 170 C 257 194 250 208 237 211 C 226 213 214 205 200 205 C 186 205 174 213 163 211 C 150 208 143 194 141 170 Z", P.hair) +
          path("M150 230 C 160 250 176 262 200 266", "none", { stroke: P.hairLight, "stroke-width": 3, "stroke-linecap": "round", opacity: 0.5 });
      case "bigote":
        return path("M172 220 C 176 204 192 200 200 207 C 208 200 224 204 228 220 C 220 223 209 219 200 214 C 191 219 180 223 172 220 Z", P.hair);
      case "candado":
        return path("M178 216 C 184 206 195 205 200 210 C 205 205 216 206 222 216 C 215 219 207 217 200 214 C 193 217 185 219 178 216 Z", P.hair) +
          path("M182 232 C 188 240 194 242 200 242 C 206 242 212 240 218 232 L 222 238 C 220 254 212 262 200 262 C 188 262 180 254 178 238 Z", P.hair) +
          path("M180 218 L 178 238", "none", { stroke: P.hair, "stroke-width": 5, "stroke-linecap": "round" }) +
          path("M220 218 L 222 238", "none", { stroke: P.hair, "stroke-width": 5, "stroke-linecap": "round" });
    }
    return "";
  }

  // ---- pelo: cada estilo tiene back (detrás de la cabeza/cuerpo) y front (encima de la cara)
  var CAP_PULLED = "M131 176 C 122 110 156 68 200 68 C 244 68 278 110 269 176 C 265 152 258 134 246 124 C 230 115 214 112 198 113 C 178 115 160 121 150 132 C 141 144 135 158 131 176 Z";
  var CAP_PART = "M130 178 C 121 108 158 66 200 66 C 242 66 279 108 270 178 C 266 152 258 132 244 121 C 230 112 214 108 200 102 C 186 108 170 112 156 121 C 142 132 134 152 130 178 Z";

  function strands(list, P, w, op) {
    return list.map(function (d) { return path(d, "none", { stroke: P.hairDark, "stroke-width": w || 3, "stroke-linecap": "round", opacity: op == null ? 0.55 : op }); }).join("");
  }

  function braid(x0, y0, n, P, dx) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var y = y0 + i * 21, x = x0 + (dx || 0) * i, w = 14 - i * 0.8;
      s += path("M" + r1(x - w) + " " + y + " C " + r1(x - w) + " " + (y + 14) + " " + r1(x + w * 0.2) + " " + (y + 24) + " " + r1(x + w) + " " + (y + 20) +
        " C " + r1(x + w) + " " + (y + 6) + " " + r1(x - w * 0.2) + " " + (y - 4) + " " + r1(x - w) + " " + y + " Z", P.hair, { stroke: P.hairDark, "stroke-width": 2.2 });
    }
    return s;
  }

  function loc(d, color, w) { return path(d, "none", { stroke: color, "stroke-width": w || 15, "stroke-linecap": "round" }); }

  function hairParts(cfg, P) {
    var H = P.hair, D = P.hairDark, L = P.hairLight;
    var back = "", front = "";
    var shine = function (d, op) { return path(d, "none", { stroke: L, "stroke-width": 4, "stroke-linecap": "round", opacity: op == null ? 0.55 : op }); };
    switch (cfg.hair) {
      case "pelado":
        front = el("ellipse", { cx: 176, cy: 104, rx: 24, ry: 11, fill: "#fff", opacity: 0.14, transform: "rotate(-24 176 104)" });
        break;
      case "rapado": {
        var buzz = mix(P.skin, H, 0.72);
        front = path("M134 170 C 127 108 158 74 200 74 C 242 74 273 108 266 170 C 262 148 256 132 246 124 C 232 116 216 113 200 113 C 184 113 168 116 154 124 C 144 132 138 148 134 170 Z", buzz) +
          path("M134 168 L 136 186 L 142 186 L 141 160 Z", buzz) + path("M266 168 L 264 186 L 258 186 L 259 160 Z", buzz);
        break;
      }
      case "corto":
        front = path("M128 184 C 118 122 136 74 186 62 C 222 54 262 64 274 100 C 282 126 278 160 272 184 L 263 184 C 263 162 259 144 252 134 C 244 124 232 122 220 120 C 206 118 194 112 186 104 C 178 116 166 124 154 130 C 146 136 141 148 139 162 L 137 184 Z", H) +
          shine("M150 92 C 170 76 200 70 228 76", 0.6) +
          strands(["M186 104 C 204 100 226 104 246 114", "M200 86 C 222 84 244 92 258 106"], P, 3, 0.45);
        break;
      case "medio":
        back = path("M130 176 C 122 108 160 74 200 74 C 240 74 278 108 270 176 L 266 214 L 134 214 Z", D);
        front = path("M126 206 C 112 126 146 66 202 64 C 254 62 290 112 276 206 L 270 196 L 265 208 L 262 186 C 262 164 260 150 254 140 C 244 128 232 124 222 122 C 204 136 178 144 154 146 C 146 150 140 156 138 166 L 137 186 L 133 208 L 130 196 Z", H) +
          strands(["M222 122 C 214 102 196 88 172 86", "M246 132 C 244 114 232 98 214 90", "M196 134 C 186 120 170 112 154 112"], P, 3, 0.45) +
          shine("M156 86 C 176 74 206 70 232 78");
        break;
      case "largo":
        back = path("M130 170 C 122 100 160 68 200 68 C 240 68 278 100 270 170 C 272 232 288 298 296 360 L 104 360 C 112 298 128 232 130 170 Z", D);
        front = path("M200 66 C 154 64 121 96 119 152 C 117 214 126 272 116 334 C 132 341 148 337 160 327 C 152 284 148 236 149 192 C 150 150 166 116 200 102 Z", H) +
          path("M200 66 C 246 64 279 96 281 152 C 283 214 274 272 284 334 C 268 341 252 337 240 327 C 248 284 252 236 251 192 C 250 150 234 116 200 102 Z", H) +
          strands(["M138 160 C 136 220 140 270 134 320", "M262 160 C 264 220 260 270 266 320"], P, 3, 0.4) +
          shine("M162 84 C 176 75 190 72 198 73");
        break;
      case "colita":
        back = path("M236 84 C 290 74 318 118 312 184 C 308 230 294 266 278 290 C 282 252 284 214 274 180 C 266 150 254 122 236 104 Z", H) +
          strands(["M258 100 C 290 120 298 170 290 230"], P, 3, 0.45);
        front = path(CAP_PULLED, H) +
          strands(["M150 132 C 168 104 200 90 238 92", "M198 113 C 214 100 232 94 246 96"], P, 3, 0.4) +
          el("rect", { x: 236, y: 82, width: 20, height: 26, rx: 7, fill: P.band, transform: "rotate(28 246 95)" });
        break;
      case "rodete":
        back = el("circle", { cx: 200, cy: 66, r: 28, fill: H }) +
          shine("M182 58 C 188 48 204 44 216 50", 0.6) +
          path("M174 66 C 186 80 214 80 226 66", "none", { stroke: D, "stroke-width": 3, "stroke-linecap": "round", opacity: 0.6 });
        front = path(CAP_PULLED, H) +
          el("rect", { x: 180, y: 76, width: 40, height: 9, rx: 4.5, fill: P.band }) +
          strands(["M150 132 C 166 108 184 94 200 88", "M246 124 C 236 106 220 94 202 88"], P, 3, 0.4);
        break;
      case "trenzas":
        back = path("M130 160 C 124 100 160 66 200 66 C 240 66 276 100 270 160 L 268 214 L 132 214 Z", D);
        front = path(CAP_PART, H) +
          strands(["M200 102 C 180 92 158 98 142 118", "M200 102 C 220 92 242 98 258 118"], P, 3, 0.45) +
          braid(140, 198, 7, P, -1) + braid(260, 198, 7, P, 1) +
          el("rect", { x: 122, y: 344, width: 22, height: 8, rx: 4, fill: P.band }) +
          el("rect", { x: 256, y: 344, width: 22, height: 8, rx: 4, fill: P.band }) +
          path("M125 352 C 124 364 130 374 136 376 C 138 368 138 358 141 352 Z", H) +
          path("M275 352 C 276 364 270 374 264 376 C 262 368 262 358 259 352 Z", H);
        break;
      case "rulos":
        back = path("M126 166 C 122 100 160 66 200 66 C 240 66 278 100 274 166 L 278 240 L 122 240 Z", D) +
          circles(ring(200, 156, 84, 92, 150, 390, 20, 28, 2), D) +
          circles([[134, 232, 22], [266, 232, 22], [126, 206, 24], [274, 206, 24]], D);
        front = circles(ring(200, 150, 80, 90, 160, 380, 18, 30, 3).filter(function (c) { return c[1] < 150; }), H) +
          path("M132 168 C 124 104 160 70 200 70 C 240 70 276 104 268 168 C 262 146 252 130 240 124 C 226 118 214 116 200 116 C 186 116 174 118 160 124 C 148 130 138 146 132 168 Z", H) +
          circles([[150, 132, 15], [172, 121, 15], [196, 117, 15], [220, 119, 15], [244, 127, 15], [258, 144, 12], [141, 150, 12]], H) +
          strands(["M160 100 q 8 -8 16 0", "M204 86 q 8 -8 16 0", "M236 104 q 8 -8 16 0", "M180 120 q 7 -7 14 0", "M226 122 q 7 -7 14 0", "M140 128 q 7 -7 14 0"], P, 3, 0.5);
        break;
      case "afro":
        back = el("ellipse", { cx: 200, cy: 142, rx: 112, ry: 104, fill: H }) +
          circles(ring(200, 142, 108, 100, 0, 350, 15, 22, 2), H) +
          strands(["M140 74 q 9 -9 18 0", "M222 58 q 9 -9 18 0", "M270 104 q 9 -9 18 0", "M106 128 q 9 -9 18 0", "M184 46 q 8 -8 16 0", "M290 160 q 8 -8 16 0", "M96 176 q 8 -8 16 0"], P, 3, 0.5);
        front = path("M134 176 C 130 140 150 118 172 116 C 184 112 192 116 200 114 C 208 116 216 112 228 116 C 250 118 270 140 266 176 C 272 150 276 110 246 90 L 154 90 C 124 110 128 150 134 176 Z", H) +
          circles([[150, 128, 11], [168, 118, 11], [186, 114, 11], [204, 112, 11], [222, 114, 11], [240, 120, 11], [254, 132, 10], [138, 144, 10], [262, 148, 9], [134, 162, 9]], H);
        break;
      case "melena":
        back = path("M126 166 C 120 102 158 70 200 70 C 242 70 280 102 274 166 C 276 200 278 230 284 258 C 262 268 238 264 226 254 L 174 254 C 162 264 138 268 116 258 C 122 230 124 200 126 166 Z", D);
        front = path("M120 258 C 114 210 110 150 130 110 C 148 76 176 64 200 64 C 224 64 252 76 270 110 C 290 150 286 210 280 258 C 268 263 257 262 248 256 C 254 216 256 180 254 146 C 238 140 220 138 200 138 C 180 138 162 140 146 146 C 144 180 146 216 152 256 C 143 262 132 263 120 258 Z", H) +
          strands(["M174 138 C 176 110 186 90 200 80", "M226 138 C 224 110 214 90 200 80", "M134 170 C 132 210 134 236 138 254", "M266 170 C 268 210 266 236 262 254"], P, 3, 0.4) +
          shine("M160 92 C 176 78 196 74 214 76");
        break;
      case "rastas": {
        var bl = [[-80, 300, -6], [-66, 322, -2], [-50, 306, 2], [50, 306, -2], [66, 322, 2], [80, 300, 6]];
        back = path("M126 166 C 118 100 158 66 200 66 C 242 66 282 100 274 166 L 274 236 L 126 236 Z", D) +
          bl.map(function (b) { var x = 200 + b[0]; return loc("M" + x + " 130 C " + (x + b[2]) + " 200 " + (x + b[2] * 2) + " 250 " + (x + b[2] * 3) + " " + b[1], D, 16); }).join("");
        var fl = [["M146 124 C 130 170 128 240 134 322", H], ["M132 146 C 120 196 118 250 120 300", D], ["M254 124 C 270 170 272 240 266 322", H], ["M268 146 C 280 196 282 250 280 300", D]];
        front = path(CAP_PART, H) +
          strands(["M200 102 C 186 92 166 94 150 108", "M200 102 C 214 92 234 94 250 108", "M176 74 L 172 98", "M224 74 L 228 98", "M200 70 L 200 96"], P, 3, 0.45) +
          fl.map(function (f) { return loc(f[0], f[1], 15); }).join("") +
          [[131, 200], [133, 250], [134, 296], [269, 200], [267, 250], [266, 296]].map(function (p) {
            return path("M" + (p[0] - 6) + " " + p[1] + " q 6 5 12 0", "none", { stroke: D, "stroke-width": 2.4, "stroke-linecap": "round", opacity: 0.8 });
          }).join("") +
          el("rect", { x: 124, y: 312, width: 20, height: 7, rx: 3.5, fill: P.band }) +
          el("rect", { x: 256, y: 312, width: 20, height: 7, rx: 3.5, fill: P.band });
        break;
      }
    }
    return { back: back, front: front };
  }

  function layerExtras(cfg, P) {
    var ex = cfg.extras || [];
    var s = { band: "", glasses: "" };
    if (ex.indexOf("vincha") >= 0) {
      var top = cfg.hair === "afro" ? 104 : (cfg.hair === "pelado" ? 112 : 104);
      s.band = path("M131 " + (top + 30) + " C 146 " + (top + 4) + " 174 " + (top - 6) + " 200 " + (top - 6) + " C 226 " + (top - 6) + " 254 " + (top + 4) + " 269 " + (top + 30) +
        " L 270 " + (top + 48) + " C 254 " + (top + 22) + " 226 " + (top + 12) + " 200 " + (top + 12) + " C 174 " + (top + 12) + " 146 " + (top + 22) + " 130 " + (top + 48) + " Z", P.band) +
        path("M150 " + (top + 18) + " C 166 " + (top + 6) + " 182 " + (top + 2) + " 200 " + (top + 2), "none", { stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.35 });
    }
    if (ex.indexOf("anteojos") >= 0) {
      var f = "#16120f";
      s.glasses = el("rect", { x: 157, y: 161, width: 37, height: 29, rx: 10, fill: "rgba(255,255,255,.14)", stroke: f, "stroke-width": 4.5 }) +
        el("rect", { x: 206, y: 161, width: 37, height: 29, rx: 10, fill: "rgba(255,255,255,.14)", stroke: f, "stroke-width": 4.5 }) +
        path("M194 172 Q 200 166 206 172", "none", { stroke: f, "stroke-width": 4.5, "stroke-linecap": "round" }) +
        path("M157 170 L 137 166", "none", { stroke: f, "stroke-width": 4.5, "stroke-linecap": "round" }) +
        path("M243 170 L 263 166", "none", { stroke: f, "stroke-width": 4.5, "stroke-linecap": "round" }) +
        path("M164 166 L 172 166", "none", { stroke: "#fff", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.5 }) +
        path("M213 166 L 221 166", "none", { stroke: "#fff", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.5 });
    }
    return s;
  }

  /** Encuadre: el dibujo usa coordenadas 0–400; se muestra el cuadrado 20,24 → 380,384 (cabeza más grande). */
  var VIEWBOX = "20 24 360 360";

  // ------------------------------------------------------------------ composición
  /** Orden de capas (de atrás hacia adelante). */
  var LAYER_ORDER = ["fondo", "pelo-atras", "cuello", "camiseta", "cabeza", "cara", "barba", "boca", "pelo-adelante", "vincha", "anteojos"];

  function normalize(cfg) {
    var c = {};
    for (var k in DEFAULT) c[k] = DEFAULT[k];
    for (var j in cfg || {}) if (cfg[j] != null) c[j] = cfg[j];
    if (!SKINS[c.skin]) c.skin = DEFAULT.skin;
    if (HAIRS.indexOf(c.hair) < 0) c.hair = DEFAULT.hair;
    if (!HAIR_COLORS[c.hairColor]) c.hairColor = DEFAULT.hairColor;
    if (FACIALS.indexOf(c.facial) < 0) c.facial = "ninguno";
    if (PATTERNS.indexOf(c.shirtPattern) < 0) c.shirtPattern = "lisa";
    if (COLLARS.indexOf(c.collar) < 0) c.collar = "redondo";
    c.extras = (c.extras || []).filter(function (e) { return EXTRAS.indexOf(e) >= 0; });
    return c;
  }

  function layers(cfg, team, opts) {
    cfg = normalize(cfg); opts = opts || {};
    var P = palette(cfg, team);
    var uid = opts.uid || ("av" + Math.random().toString(36).slice(2, 7));
    var hp = hairParts(cfg, P);
    var ex = layerExtras(cfg, P);
    var bg = "";
    if (opts.bg) bg = el("rect", { x: 0, y: 0, width: 400, height: 400, fill: opts.bg });
    return [
      ["fondo", bg],
      ["pelo-atras", hp.back],
      ["cuello", layerNeck(P)],
      ["camiseta", layerShirt(cfg, P, uid)],
      ["cabeza", layerHead(P)],
      ["cara", layerFace(cfg, P)],
      ["barba", layerFacial(cfg, P)],
      ["boca", layerMouth(cfg, P)],
      ["pelo-adelante", hp.front],
      ["vincha", ex.band],
      ["anteojos", ex.glasses]
    ];
  }

  function svg(cfg, team, opts) {
    opts = opts || {};
    var ls = layers(cfg, team, opts);
    var inner = ls.filter(function (l) { return l[1]; }).map(function (l) { return g("mv-" + l[0], l[1]); }).join("");
    var uid = opts.uid || "av";
    if (opts.bg && opts.circle !== false) {
      inner = el("defs", {}, el("clipPath", { id: uid + "-circle" }, el("circle", { cx: 200, cy: 204, r: 180 }))) +
        el("g", { "clip-path": "url(#" + uid + "-circle)" }, inner);
    }
    return el("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: opts.viewBox || VIEWBOX, preserveAspectRatio: opts.par || null, width: opts.size || null, height: opts.size || null,
      role: "img", "aria-label": opts.label || "Avatar" }, inner);
  }

  var API = { svg: svg, layers: layers, palette: palette, normalize: normalize, mix: mix,
    SKINS: SKINS, HAIR_COLORS: HAIR_COLORS, HAIRS: HAIRS, FACIALS: FACIALS, EXTRAS: EXTRAS,
    PATTERNS: PATTERNS, COLLARS: COLLARS, LABELS: LABELS, DEFAULT: DEFAULT, DEFAULT_TEAM: DEFAULT_TEAM,
    LAYER_ORDER: LAYER_ORDER, VIEWBOX: VIEWBOX, _hairParts: hairParts, _layerShirt: layerShirt, _layerFacial: layerFacial, _layerExtras: layerExtras,
    _layerNeck: layerNeck, _layerHead: layerHead, _layerFace: layerFace, _layerMouth: layerMouth };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MVAvatar = API;
})(this);
