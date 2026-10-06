#!/usr/bin/env node
/* CLI: lee de stdin un JSON [{cfg, team, opts, mode?}] y devuelve un JSON [svg | paleta, ...].
   mode "palette" devuelve los colores derivados (para usar con las partes SVG sueltas).
   Lo usa build.py para meter los avatares en los HTML (sin JS en tiempo de render). */
const A = require("./avatar.js");
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const jobs = JSON.parse(input || "[]");
  const out = jobs.map((j, i) => j.mode === "palette" ? Object.assign(A.palette(A.normalize(j.cfg), j.team), { buzz: A.mix(A.palette(A.normalize(j.cfg), j.team).skin, A.palette(A.normalize(j.cfg), j.team).hair, 0.72) }) : A.svg(j.cfg, j.team, Object.assign({ uid: "a" + i }, j.opts || {})));
  process.stdout.write(JSON.stringify(out));
});
