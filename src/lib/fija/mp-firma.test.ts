import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { firmaMpValida } from "./mp-firma.ts";

test("acepta la firma de Mercado Pago y rechaza una distinta", () => {
  const secret = "clave-de-prueba";
  const dataId = "99";
  const requestId = "req-1";
  const ts = "1700000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(
    firmaMpValida({ secret, signature: `ts=${ts},v1=${v1}`, requestId, dataId }),
    true,
  );
  assert.equal(
    firmaMpValida({ secret, signature: `ts=${ts},v1=${"0".repeat(v1.length)}`, requestId, dataId }),
    false,
  );
  assert.equal(firmaMpValida({ secret: "", signature: `ts=${ts},v1=${v1}`, requestId, dataId }), false);
});
