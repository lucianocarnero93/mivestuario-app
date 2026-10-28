#!/usr/bin/env node
// Levanta la app con datos de ejemplo. No usa la base real.
import { spawn } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const env = { ...process.env, VITE_DEMO: "1" };
delete env.DATABASE_URL;
env.PATH = `${join(root, "node_modules/.bin")}${delimiter}${env.PATH ?? ""}`;

const child = spawn(
  process.execPath,
  [join(root, "scripts/with-app-env.mjs"), "vite", "dev", "--host", "0.0.0.0", "--port", "8080"],
  { cwd: root, env, stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
