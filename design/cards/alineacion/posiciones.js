/* Genera posiciones.json (x/y/ancho/alto de cada slot, por formato de imagen y formación).
   node alineacion/posiciones.js  → incluye F6 y F10 marcados como "propuesta" (no existen en la app). */
var A = require("./alineacion.js"), fs = require("fs");
var out = { _nota: "x,y = centro del chip (px del lienzo); w,h = tamaño final. Claves 'fN/id'. F6 y F10 = propuesta, no existen en la app.", _propuestas: [] };
Object.keys(A.FORMATOS).forEach(function (fmt) {
  out[fmt] = {};
  ["f5", "f6", "f7", "f8", "f9", "f10", "f11"].forEach(function (m) {
    var lista = A.FORMATIONS[m] || A.PROPUESTAS[m];
    lista.forEach(function (f) {
      var key = m + "/" + f.id;
      if (!A.FORMATIONS[m] && out._propuestas.indexOf(key) < 0) out._propuestas.push(key);
      out[fmt][key] = A.layout(f.slots, fmt, m).map(function (q) {
        return { key: q.key, label: q.label, x: q.x, y: q.y, w: q.w, h: q.h, k: q.k };
      });
    });
  });
});
fs.writeFileSync(__dirname + "/posiciones.json", JSON.stringify(out, null, 1));
console.log("ok", Object.keys(out.whatsapp).length, "formaciones x", Object.keys(A.FORMATOS).length, "formatos");
