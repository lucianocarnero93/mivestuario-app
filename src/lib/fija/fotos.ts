import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isClubMember, readClub } from "./cloud";
import { sanitizeCode } from "./sanitize";

const FOTOS = "fotos";
const MAX = 12;

export type FotoFecha = {
  id: string;
  memberId: string;
  status: "pendiente" | "ok" | "oculta";
  image: string;
  at: string;
};

function fotoId(code: string, eventId: string, photoId: string) {
  return `${code}:${eventId}:${photoId}`.slice(0, 140);
}

function asFoto(value: unknown): FotoFecha | null {
  if (!value || typeof value !== "object") return null;
  const row = value as FotoFecha;
  if (!row.image?.startsWith("data:image/") || row.image.length > 80_000) return null;
  const status = row.status === "ok" || row.status === "oculta" ? row.status : "pendiente";
  return {
    id: String(row.id ?? "").slice(0, 40),
    memberId: String(row.memberId ?? "").slice(0, 80),
    status,
    image: row.image,
    at: String(row.at ?? ""),
  };
}

async function listar(code: string, eventId: string): Promise<FotoFecha[]> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ id: string; data: FotoFecha | string }>(
    "select id, data from vestuario_docs where collection = $1 and id like $2",
    [FOTOS, `${code}:${eventId}:%`],
  );
  return rows
    .map((row) => {
      const raw = typeof row.data === "string" ? safeParse(row.data) : row.data;
      const foto = asFoto(raw);
      return foto ? { ...foto, id: row.id.split(":").at(-1) || foto.id } : null;
    })
    .filter((foto): foto is FotoFecha => Boolean(foto));
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const listarFotos = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; eventId?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    eventId: String(input?.eventId ?? "").slice(0, 40),
  }))
  .handler(async ({ data, context }): Promise<FotoFecha[]> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    if (!data.code || !data.eventId || !(await isClubMember(data.code, userId))) return [];
    const bundle = await readClub(data.code);
    const me = bundle?.members.find((person) => person.accountId === userId || person.id === userId);
    const staff = me?.role === "dt" || me?.role === "ayudante";
    const fotos = await listar(data.code, data.eventId);
    if (staff) return fotos.filter((foto) => foto.status !== "oculta" || staff);
    return fotos.filter((foto) => foto.status === "ok" || foto.memberId === me?.id);
  });

export const subirFoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; eventId?: string; image?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    eventId: String(input?.eventId ?? "").slice(0, 40),
    image: String(input?.image ?? ""),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    if (!data.code || !data.eventId || !data.image.startsWith("data:image/") || data.image.length > 80_000) return { ok: false };
    if (!(await isClubMember(data.code, userId))) return { ok: false };
    const bundle = await readClub(data.code);
    const me = bundle?.members.find((person) => person.accountId === userId || person.id === userId);
    if (!me || me.menor) return { ok: false };
    const actuales = await listar(data.code, data.eventId);
    if (actuales.filter((foto) => foto.status !== "oculta").length >= MAX) return { ok: false };
    const photoId = crypto.randomUUID().slice(0, 8);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const foto: FotoFecha = {
      id: photoId,
      memberId: me.id,
      status: "pendiente",
      image: data.image,
      at: new Date().toISOString(),
    };
    await sql.query(
      `insert into vestuario_docs (collection, id, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (collection, id) do nothing`,
      [FOTOS, fotoId(data.code, data.eventId, photoId), JSON.stringify(foto)],
    );
    return { ok: true };
  });

export const moderarFoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string; eventId?: string; photoId?: string; status?: string }) => ({
    code: sanitizeCode(String(input?.code ?? "")),
    eventId: String(input?.eventId ?? "").slice(0, 40),
    photoId: String(input?.photoId ?? "").slice(0, 40),
    status: input?.status === "ok" || input?.status === "oculta" ? input.status : "pendiente",
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const userId = String((context as { userId?: string }).userId ?? "");
    if (!data.code || !data.eventId || !data.photoId) return { ok: false };
    const bundle = await readClub(data.code);
    const me = bundle?.members.find((person) => person.accountId === userId || person.id === userId);
    if (me?.role !== "dt" && me?.role !== "ayudante") return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = fotoId(data.code, data.eventId, data.photoId);
    const rows = await sql.query<{ data: FotoFecha | string }>(
      "select data from vestuario_docs where collection = $1 and id = $2",
      [FOTOS, id],
    );
    const raw = rows[0]?.data;
    const foto = asFoto(typeof raw === "string" ? safeParse(raw) : raw);
    if (!foto) return { ok: false };
    await sql.query(
      `update vestuario_docs set data = $3::jsonb, updated_at = now() where collection = $1 and id = $2`,
      [FOTOS, id, JSON.stringify({ ...foto, status: data.status })],
    );
    return { ok: true };
  });
