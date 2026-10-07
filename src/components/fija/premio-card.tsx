import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { alumniMember } from "@/lib/fija/stats";
import { compartirPremio, dibujarPremio } from "@/lib/fija/premios-dibujo";
import { datosCard, puedeCompartirPremio, type ContextoPremios, type Premio } from "@/lib/fija/premios";

const AVISO_FOTO = "mv-aviso-foto-card";

export function PremioMini({
  premio,
  ctx,
  abrir,
}: {
  premio: Premio;
  ctx: ContextoPremios;
  abrir?: boolean;
}) {
  const datos = datosCard(premio, ctx);
  const clave = `${premio.id}:${JSON.stringify(datos.imagen)}:${datos.nombre}:${datos.stat}:${datos.titulo}:${datos.contexto}:${datos.dorsal ?? ""}`;
  const [paquete, setPaquete] = useState({ clave: "", datos });
  if (paquete.clave !== clave) setPaquete({ clave, datos });
  const [src, setSrc] = useState("");
  const [abierta, setAbierta] = useState(Boolean(abrir));
  const [aviso, setAviso] = useState("");
  const member = ctx.members.find((item) => item.id === premio.memberId) ?? alumniMember(ctx.alumni, premio.memberId);

  useEffect(() => {
    let cancel = false;
    let url = "";
    void dibujarPremio(paquete.datos)
      .then((blob) => {
        if (cancel) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (!cancel) setSrc("");
      });
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [paquete]);

  async function compartir(modo: "card" | "story") {
    setAviso("");
    try {
      const result = await compartirPremio(premio, ctx, modo);
      let nota = "";
      if (paquete.datos.imagen.tipo === "foto") {
        try {
          if (!localStorage.getItem(AVISO_FOTO)) {
            localStorage.setItem(AVISO_FOTO, "1");
            nota = "Tu card sale con tu foto.";
          }
        } catch {
          nota = "";
        }
      }
      if (result === "saved") nota = nota ? `${nota} Imagen guardada.` : "Imagen guardada.";
      if (nota) setAviso(nota);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAviso("No se pudo compartir.");
    }
  }

  return (
    <>
      <button type="button" className="shrink-0" onClick={() => setAbierta(true)}>
        {src ? (
          <img src={src} alt={`Card ${datos.titulo} de ${datos.nombre}`} className="h-[250px] w-[180px] object-contain" />
        ) : (
          <span className="grid h-[250px] w-[180px] place-items-center rounded-xl bg-surface px-3 text-center text-xs font-semibold">
            {datos.nombre}
          </span>
        )}
      </button>
      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent title={datos.titulo} className="max-h-[92vh] overflow-y-auto">
          {src ? <img src={src} alt={`Card ${datos.titulo} de ${datos.nombre}`} className="mx-auto w-full" /> : null}
          {puedeCompartirPremio(member) ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Compartir</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button className="h-12" onClick={() => void compartir("story")}>
                  Story
                </Button>
                <Button variant="outline" className="h-12" onClick={() => void compartir("card")}>
                  Card
                </Button>
              </div>
            </div>
          ) : null}
          {aviso ? <p className="mt-3 text-sm text-accent">{aviso}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
