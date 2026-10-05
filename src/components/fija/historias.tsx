import { useRef, type ReactNode } from "react";

export function Historias({
  pagina,
  titulos,
  onPagina,
  children,
}: {
  pagina: number;
  titulos: string[];
  onPagina: (pagina: number) => void;
  children: ReactNode;
}) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const ultima = titulos.length - 1;

  function ir(siguiente: number) {
    onPagina(Math.min(ultima, Math.max(0, siguiente)));
  }

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-card"
      onTouchStart={(event) => {
        const toque = event.changedTouches[0];
        if (!toque) return;
        inicio.current = { x: toque.clientX, y: toque.clientY };
      }}
      onTouchEnd={(event) => {
        const toque = event.changedTouches[0];
        const desde = inicio.current;
        inicio.current = null;
        if (!toque || !desde) return;
        const dx = toque.clientX - desde.x;
        const dy = toque.clientY - desde.y;
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy)) return;
        ir(pagina + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex gap-1 px-3 pt-3">
        {titulos.map((titulo, indice) => (
          <button
            key={titulo}
            type="button"
            aria-label={titulo}
            className="h-1 flex-1 overflow-hidden rounded-full bg-border"
            onClick={() => ir(indice)}
          >
            <span className={`block h-full rounded-full bg-accent ${indice <= pagina ? "w-full" : "w-0"}`} />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          className="grid size-11 place-items-center text-lg text-muted disabled:opacity-30"
          disabled={pagina === 0}
          onClick={() => ir(pagina - 1)}
          aria-label="Anterior"
        >
          ‹
        </button>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{titulos[pagina]}</p>
        <button
          type="button"
          className="grid size-11 place-items-center text-lg text-muted disabled:opacity-30"
          disabled={pagina === ultima}
          onClick={() => ir(pagina + 1)}
          aria-label="Siguiente"
        >
          ›
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-3 pb-4">{children}</div>
    </section>
  );
}
