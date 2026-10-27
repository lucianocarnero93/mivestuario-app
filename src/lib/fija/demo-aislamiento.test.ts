import assert from "node:assert/strict";
import test from "node:test";
import { CLAVE_DEMO, CLAVE_REAL, cortarNube, intentosDemo, ponerDoble, simularDemo, storageDemo } from "./demo-puente.ts";

test("en demo la nube no se llama y el doble sí", async () => {
  simularDemo(true);
  let llamadas = 0;
  const guardar = cortarNube("saveClubDoc", async (..._args: unknown[]) => {
    llamadas += 1;
    return { ok: true };
  });
  const cortado = await guardar({ data: { code: "PIBES" } });
  assert.equal(llamadas, 0);
  assert.deepEqual(cortado, { ok: false, error: "Modo demo: no se guarda nada" });
  assert.deepEqual(intentosDemo(), ["saveClubDoc"]);

  ponerDoble("saveClubDoc", async (..._args: unknown[]) => ({ ok: true, doble: true }));
  const conDoble = await guardar({ data: {} });
  assert.equal(llamadas, 0);
  assert.deepEqual(conDoble, { ok: true, doble: true });
  ponerDoble("saveClubDoc", null);
  simularDemo(false);
});

test("fuera del demo la función real sí corre", async () => {
  simularDemo(false);
  let llamadas = 0;
  const guardar = cortarNube("loadClubDoc", async (..._args: unknown[]) => {
    llamadas += 1;
    return { ok: true };
  });
  await guardar("PIBES");
  assert.equal(llamadas, 1);
  simularDemo(null);
});

test("el storage del demo no es mi-vestuario-v6", () => {
  const escrito = new Map<string, string>();
  const caja = {
    getItem: (key: string) => escrito.get(key) ?? null,
    setItem: (key: string, value: string) => {
      escrito.set(key, value);
    },
    removeItem: (key: string) => {
      escrito.delete(key);
    },
  };
  const storage = storageDemo(caja);
  storage.setItem(CLAVE_REAL, "{\"club\":1}");
  assert.equal(escrito.get(CLAVE_DEMO), "{\"club\":1}");
  assert.equal(escrito.has(CLAVE_REAL), false);
  assert.equal(storage.getItem(CLAVE_REAL), "{\"club\":1}");
  storage.removeItem(CLAVE_REAL);
  assert.equal(escrito.has(CLAVE_DEMO), false);
  assert.equal(CLAVE_DEMO, "mi-vestuario-demo");
  assert.notEqual(CLAVE_DEMO as string, CLAVE_REAL as string);
});
