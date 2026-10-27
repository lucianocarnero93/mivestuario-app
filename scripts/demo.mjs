#!/usr/bin/env node
// Levanta la app con datos de ejemplo. No usa la base real.
import { spawn } from "node:child_process";
import os from "node:os";
import { dirname, delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const env = { ...process.env, VITE_DEMO: "1" };
delete env.DATABASE_URL;
env.PATH = `${join(root, "node_modules/.bin")}${delimiter}${env.PATH ?? ""}`;

function ipLan() {
  const redes = os.networkInterfaces();
  for (const lista of Object.values(redes)) {
    for (const red of lista ?? []) {
      const familia = red.family === "IPv4" || red.family === 4;
      if (familia && !red.internal) return red.address;
    }
  }
  return "127.0.0.1";
}

console.log(`Mi Vestuario · modo demo (datos de ejemplo)
En esta compu:   http://localhost:8080/demo
En tu celular:   http://${ipLan()}:8080/demo  (misma red Wi-Fi)`);

const child = spawn(
  process.execPath,
  [join(root, "scripts/with-app-env.mjs"), "vite", "dev", "--host", "0.0.0.0", "--port", "8080"],
  { cwd: root, env, stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
