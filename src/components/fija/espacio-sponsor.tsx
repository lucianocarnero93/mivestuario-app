import { useState } from "react";
import { SPONSORS_ACTIVO, logoPropio, type Sponsor } from "@/lib/fija/sponsors";
import { useFija, useIsStaff } from "@/lib/fija/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EspacioSponsor({
  sponsors,
  lugar,
}: {
  sponsors: { nombre: string; logoUrl: string; link?: string }[];
  lugar: "franja" | "cierre";
}) {
  const uno = sponsors[0];
  if (!uno) return null;
  const cuerpo = (
    <span className="flex items-center gap-3">
      <img src={uno.logoUrl} alt="" className="h-8 w-auto max-w-24 object-contain" />
      <span className="text-sm">
        {lugar === "franja" ? "Auspicia" : "Auspicia este equipo"}: {uno.nombre}
      </span>
    </span>
  );
  return (
    <aside className={lugar === "cierre" ? "mt-4 rounded-xl bg-surface p-4" : "mt-4"}>
      {uno.link ? (
        <a href={uno.link} rel="sponsored noopener" target="_blank" className="text-fg">
          {cuerpo}
        </a>
      ) : (
        cuerpo
      )}
    </aside>
  );
}

export function PanelSponsors() {
  const staff = useIsStaff();
  const club = useFija((s) => s.club);
  const setSponsors = useFija((s) => s.setSponsors);
  const [nombre, setNombre] = useState("");
  if (!SPONSORS_ACTIVO || !staff || !club || !setSponsors) return null;
  const lista = club.sponsors ?? [];

  function guardar(next: Sponsor[]) {
    setSponsors?.(next.slice(0, 3));
  }

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Sponsors</h2>
      <p className="mt-1 text-sm text-muted">Hasta 3. El logo queda en el vestuario, sin redes de anuncios.</p>
      <ul className="mt-2 space-y-2">
        {lista.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
            <span>{item.nombre}</span>
            <button type="button" className="font-semibold text-danger" onClick={() => guardar(lista.filter((row) => row.id !== item.id))}>
              Sacar
            </button>
          </li>
        ))}
      </ul>
      {lista.length < 3 ? (
        <form
          className="mt-2 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const file = (event.currentTarget.elements.namedItem("logo") as HTMLInputElement).files?.[0];
            if (!nombre.trim() || !file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const logoUrl = String(reader.result ?? "");
              if (!logoPropio(logoUrl) || logoUrl.length > 80_000) return;
              guardar([
                ...lista,
                { id: `sp-${Date.now()}`, nombre: nombre.trim(), logoUrl, activo: true },
              ]);
              setNombre("");
            };
            reader.readAsDataURL(file);
          }}
        >
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" aria-label="Nombre del sponsor" />
          <Input name="logo" type="file" accept="image/*" aria-label="Logo del sponsor" />
          <Button type="submit" className="h-12">Sumar sponsor</Button>
        </form>
      ) : null}
    </section>
  );
}
