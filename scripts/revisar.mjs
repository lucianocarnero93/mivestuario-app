#!/usr/bin/env node
const base = (process.env.VESTUARIO_URL || "https://www.mivestuario.com.ar").replace(/\/$/, "");

const checks = [];

async function check(name, run) {
  try {
    const detail = await run();
    checks.push({ name, ok: true, detail });
    console.log(`ok   ${name}${detail ? `  ${detail}` : ""}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "falló";
    checks.push({ name, ok: false, detail });
    console.log(`no   ${name}  ${detail}`);
  }
}

await check("inicio", async () => {
  const response = await fetch(base, { redirect: "follow" });
  if (!response.ok) throw new Error(`respondió ${response.status}`);
  const text = await response.text();
  if (!text.includes("Mi Vestuario")) throw new Error("la página no es la app");
  return String(response.status);
});

await check("sesion", async () => {
  const response = await fetch(`${base}/api/auth/get-session`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`respondió ${response.status}`);
  const text = await response.text();
  if (text !== "null" && !text.includes("session")) throw new Error("respuesta rara");
  return text === "null" ? "sin sesión" : "hay sesión";
});

await check("login", async () => {
  const response = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ email: "nadie@example.com", password: "no-existe-1" }),
  });
  if (response.status >= 500) throw new Error(`el servidor respondió ${response.status}`);
  if (response.status !== 401 && response.status !== 400) {
    throw new Error(`esperaba un rechazo, respondió ${response.status}`);
  }
  return `rechaza con ${response.status}`;
});

await check("app", async () => {
  const response = await fetch(`${base}/sw.js`, { cache: "no-store" });
  if (!response.ok) throw new Error(`respondió ${response.status}`);
  const text = await response.text();
  const version = text.match(/mi-vestuario-v\d+/)?.[0];
  if (!version) throw new Error("no aparece la versión de la app");
  return version;
});

const failed = checks.filter((item) => !item.ok);
console.log(failed.length ? `\n${failed.length} chequeo${failed.length === 1 ? "" : "s"} en rojo.` : "\nTodo responde.");
process.exit(failed.length ? 1 : 0);
