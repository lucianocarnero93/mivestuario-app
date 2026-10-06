import type { AvatarPersona } from "./avatar.ts";
import { initials } from "./format.ts";

export type ImagenPersona =
  | { tipo: "foto"; src: string }
  | { tipo: "avatar"; avatar: AvatarPersona }
  | { tipo: "iniciales"; letras: string };

export function inicialesDe(member: { name?: string; nick?: string; menor?: boolean }): string {
  if (member.menor) return initials((member.nick ?? "").trim() || "Jugador") || "J";
  return initials(((member.name || member.nick) ?? "").trim() || "Jugador") || "J";
}

export function imagenDe(member: {
  id?: string;
  name?: string;
  nick?: string;
  menor?: boolean;
  photo?: string | null;
  avatar?: AvatarPersona | null;
}): ImagenPersona {
  if (!member.menor && member.photo?.startsWith("data:image/")) return { tipo: "foto", src: member.photo };
  if (member.avatar) return { tipo: "avatar", avatar: member.avatar };
  return { tipo: "iniciales", letras: inicialesDe(member) };
}
