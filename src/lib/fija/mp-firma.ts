import { createHmac, timingSafeEqual } from "node:crypto";

/** Mercado Pago firma el aviso con la clave del webhook. Sin esa firma no se marca el pago. */
export function firmaMpValida(input: {
  secret: string;
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = input.secret.trim();
  if (!secret || !input.signature) return false;
  let ts = "";
  let v1 = "";
  for (const piece of input.signature.split(",")) {
    const [key, ...rest] = piece.split("=");
    const value = rest.join("=").trim();
    if (key?.trim() === "ts") ts = value;
    if (key?.trim() === "v1") v1 = value;
  }
  if (!ts || !v1) return false;
  const id = (input.dataId ?? "").trim().toLowerCase();
  const parts = [];
  if (id) parts.push(`id:${id}`);
  if (input.requestId) parts.push(`request-id:${input.requestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(";")};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(v1);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
