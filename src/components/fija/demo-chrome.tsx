import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEMO } from "@/lib/fija/demo-flag";

export function DemoChrome() {
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    if (!DEMO) return;
    const onAviso = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") setAviso(detail);
    };
    window.addEventListener("mv-demo-aviso", onAviso);
    return () => window.removeEventListener("mv-demo-aviso", onAviso);
  }, []);
  if (!DEMO) return null;
  return (
    <div className="z-40 border-b border-line/20 bg-black/50 px-3 py-2 text-xs">
      <div className="mx-auto flex max-w-phone items-center justify-between gap-2">
        <span className="font-semibold text-accent">Datos de ejemplo</span>
        <span className="flex gap-3 font-semibold">
          <Link to="/demo" search={{ como: "dt" }}>DT</Link>
          <Link to="/demo" search={{ como: "ayudante" }}>Ayudante</Link>
          <Link to="/demo" search={{ como: "jugador" }}>Jugador</Link>
        </span>
      </div>
      {aviso ? <p className="mt-1 text-center text-accent">{aviso}</p> : null}
    </div>
  );
}
