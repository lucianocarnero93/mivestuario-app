import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { sanitizeCode } from "./sanitize";
import {
  aplicarReaccionFamiliar,
  elegirPartidoEquipo,
  vivoReactKey,
  vivoReadLimited,
  VIVO_REACT_LIMIT,
  type ConteosFamilia,
  type DocFamilia,
} from "./vivo";
import type { ClubBundle } from "./types";

const FAMILIA = "familia-reaccion";
const VIVO = "vivo";
const VIVO_EQUIPO = "vivo-equipo";
const VACIO: ConteosFamilia = { pelota: 0, aplauso: 0, fuego: 0 };
const cupos = new Map<string, { n: number; since: number }>();
const VENTANA = 15 * 60 * 1000;

type Fila = { data: unknown };

function parse(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function docDe(raw: unknown): DocFamilia {
  const data = parse(raw);
  const por = data?.por as Partial<ConteosFamilia> | undefined;
  if (por && typeof por === "object") {
    return {
      por: {
        pelota: Number(por.pelota) || 0,
        aplauso: Number(por.aplauso) || 0,
        fuego: Number(por.fuego) || 0,
      },
      marcas: marcasLimpias(data?.marcas),
    };
  }
  const n = typeof data?.n === "number" ? data.n : 0;
  return { por: { pelota: 0, aplauso: 0, fuego: n }, marcas: [] };
}

function marcasLimpias(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && /^[a-f0-9]{40}:(pelota|aplauso|fuego)$/.test(item))
    .slice(-300);
}

async function sqlDe() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

export async function contarDetalle(id: string): Promise<ConteosFamilia> {
  if (!id) return { ...VACIO };
  const sql = await sqlDe();
  const rows = await sql.query<Fila>("select data from vestuario_docs where collection = $1 and id = $2", [FAMILIA, id]);
  return docDe(rows[0]?.data).por;
}

export async function contarFamilia(token: string): Promise<number> {
  const por = await contarDetalle(token);
  return por.pelota + por.aplauso + por.fuego;
}

async function ipDe(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const real = request?.headers?.get("x-real-ip")?.trim() ?? "";
    const forwarded = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    return (real || forwarded || "comun").slice(0, 80);
  } catch {
    return "comun";
  }
}

async function userIdDe(context: { userId?: string } | undefined): Promise<string> {
  return String(context?.userId ?? "");
}

async function clubDe(code: string): Promise<ClubBundle | null> {
  if (!code) return null;
  const sql = await sqlDe();
  const rows = await sql.query<Fila>("select data from vestuario_docs where collection = $1 and id = $2", ["clubs", code]);
  const data = parse(rows[0]?.data) as ClubBundle | null;
  if (!data?.club || !Array.isArray(data.members) || !Array.isArray(data.events)) return null;
  return data;
}

async function codigoDe(id: string): Promise<string | null> {
  const sql = await sqlDe();
  if (/^[a-f0-9]{32}$/.test(id)) {
    const rows = await sql.query<Fila>("select data from vestuario_docs where collection = $1 and id = $2", [VIVO, id]);
    const data = parse(rows[0]?.data);
    return sanitizeCode(String(data?.code ?? "")) || null;
  }
  const equipo = /^eq:([a-f0-9]{32}):/.exec(id);
  if (!equipo) return null;
  const rows = await sql.query<Fila>("select data from vestuario_docs where collection = $1 and id = $2", [
    VIVO_EQUIPO,
    equipo[1],
  ]);
  const data = parse(rows[0]?.data);
  return sanitizeCode(String(data?.code ?? "")) || null;
}

async function tokenActivo(id: string): Promise<boolean> {
  const sql = await sqlDe();
  if (/^[a-f0-9]{32}$/.test(id)) {
    const rows = await sql.query<Fila>("select data from vestuario_docs where collection = $1 and id = $2", [VIVO, id]);
    const data = parse(rows[0]?.data);
    const code = sanitizeCode(String(data?.code ?? ""));
    const eventId = String(data?.eventId ?? "");
    if (!code || !eventId) return false;
    const bundle = await clubDe(code);
    const event = bundle?.events.find((item) => item.id === eventId);
    return Boolean(event && event.kind === "partido" && event.liveToken === id);
  }
  const equipo = /^eq:([a-f0-9]{32}):([A-Za-z0-9_-]{1,40})$/.exec(id);
  if (!equipo) return false;
  const rows = await sql.query<Fila>("select data from vestuario_docs where collection = $1 and id = $2", [
    VIVO_EQUIPO,
    equipo[1],
  ]);
  const data = parse(rows[0]?.data);
  const code = sanitizeCode(String(data?.code ?? ""));
  if (!code) return false;
  const bundle = await clubDe(code);
  if (!bundle) return false;
  return elegirPartidoEquipo(bundle.events)?.id === equipo[2];
}

function limitado(key: string): boolean {
  const now = Date.now();
  const row = cupos.get(key);
  if (!row || now - row.since >= VENTANA) {
    cupos.set(key, { n: 1, since: now });
    return false;
  }
  row.n += 1;
  return vivoReadLimited(row.n, VIVO_REACT_LIMIT);
}

export const leerFamilia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((token: string) => String(token ?? "").slice(0, 90))
  .handler(async ({ data, context }): Promise<ConteosFamilia & { n: number }> => {
    const userId = await userIdDe(context as { userId?: string });
    const code = await codigoDe(data);
    const bundle = code ? await clubDe(code) : null;
    const miembro = bundle?.members.some((person) => person.accountId === userId || person.id === userId);
    if (!userId || !miembro) return { n: 0, ...VACIO };
    const por = await contarDetalle(data);
    return { n: por.pelota + por.aplauso + por.fuego, ...por };
  });

export const reaccionarFamilia = createServerFn({ method: "POST" })
  .validator((input: { token?: string; tipo?: string }) => ({
    token: String(input?.token ?? "").slice(0, 90),
    tipo: input?.tipo === "pelota" || input?.tipo === "aplauso" || input?.tipo === "fuego" ? input.tipo : "",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; n: number; por: ConteosFamilia }> => {
    if (!data.token || !data.tipo) return { ok: false, n: 0, por: { ...VACIO } };
    const ip = await ipDe();
    if (limitado(vivoReactKey(ip, data.token))) return { ok: false, n: 0, por: { ...VACIO } };
    if (!(await tokenActivo(data.token))) return { ok: false, n: 0, por: { ...VACIO } };
    const { hashIp } = await import("./vivo-ip");
    const hash = hashIp(ip);
    const { withTransaction } = await import("@/lib/db");
    let por = { ...VACIO };
    let ok = false;
    await withTransaction(async (query) => {
      const rows = await query<Fila>("select data from vestuario_docs where collection = $1 and id = $2 for update", [
        FAMILIA,
        data.token,
      ]);
      const actual = docDe(rows[0]?.data);
      const next = aplicarReaccionFamiliar(actual, hash, data.tipo as keyof ConteosFamilia);
      por = next.por;
      ok = true;
      if (!next.nueva) return;
      await query(
        `insert into vestuario_docs (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [FAMILIA, data.token, JSON.stringify({ por: next.por, marcas: next.marcas, n: next.por.pelota + next.por.aplauso + next.por.fuego })],
      );
    });
    return { ok, n: por.pelota + por.aplauso + por.fuego, por };
  });
