import { createHash } from "node:crypto";

const SAL_IP = "mv-vivo-familia-v1";

export function hashIp(ip: string, sal = SAL_IP): string {
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 40);
}
