import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listarFotos, moderarFoto, subirFoto, type FotoFecha } from "@/lib/fija/fotos";
import { useFija, useIsStaff, useMe } from "@/lib/fija/store";

export function FotosFecha({ eventId, abierta }: { eventId: string; abierta: boolean }) {
  const club = useFija((s) => s.club);
  const staff = useIsStaff();
  const me = useMe();
  const [fotos, setFotos] = useState<FotoFecha[]>([]);
  const [nota, setNota] = useState("");

  async function cargar() {
    if (!club) return;
    try {
      setFotos(await listarFotos({ data: { code: club.inviteCode, eventId } }));
    } catch {
      setNota("No se pudieron ver las fotos.");
    }
  }

  useEffect(() => {
    void cargar();
  }, [club?.inviteCode, eventId]);

  async function elegir(file: File) {
    if (!club || me.menor) return;
    const image = await comprimir(file);
    if (!image) {
      setNota("Esa foto es muy pesada.");
      return;
    }
    const result = await subirFoto({ data: { code: club.inviteCode, eventId, image } });
    setNota(result.ok ? "Foto enviada. El DT la aprueba." : "No se pudo subir.");
    await cargar();
  }

  async function moderar(photoId: string, status: "ok" | "oculta") {
    if (!club) return;
    await moderarFoto({ data: { code: club.inviteCode, eventId, photoId, status } });
    await cargar();
  }

  const visibles = fotos.filter((foto) => foto.status === "ok");
  const cola = fotos.filter((foto) => foto.status === "pendiente");

  return (
    <section className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Fotos</p>
      <p className="mt-1 text-sm text-muted">Las ve el equipo. No salen en el link de la familia.</p>
      {visibles.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {visibles.map((foto) => (
            <img key={foto.id} src={foto.image} alt="" className="aspect-square w-full rounded-md object-cover" />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Todavía no hay fotos aprobadas.</p>
      )}
      {abierta && !me.menor ? (
        <label className="mt-3 flex h-12 cursor-pointer items-center justify-center rounded-md bg-bg text-sm font-semibold">
          Subir foto
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void elegir(file);
            }}
          />
        </label>
      ) : null}
      {staff && cola.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {cola.map((foto) => (
            <li key={foto.id} className="flex items-center gap-2">
              <img src={foto.image} alt="" className="size-14 rounded-md object-cover" />
              <Button className="h-11" onClick={() => void moderar(foto.id, "ok")}>Aprobar</Button>
              <Button variant="outline" className="h-11" onClick={() => void moderar(foto.id, "oculta")}>Ocultar</Button>
            </li>
          ))}
        </ul>
      ) : null}
      {nota ? <p className="mt-2 text-sm text-accent">{nota}</p> : null}
    </section>
  );
}

async function comprimir(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("foto"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const escala = Math.min(1, 800 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * escala));
    canvas.height = Math.max(1, Math.round(image.height * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.6);
    return data.length <= 80_000 ? data : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
