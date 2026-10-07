import { useEffect, useRef, useState } from "react";
import { leerMarcador, type MarcadorPublico } from "@/lib/fija/cloud";
import { reaccionarFamilia } from "@/lib/fija/familia";
import { logo, png } from "@/lib/fija/lienzo";
import { LogoMark } from "@/components/fija/logo";
import { EspacioSponsor } from "@/components/fija/espacio-sponsor";
import {
  cercaDelSaque,
  conservarFotos,
  diaVolver,
  intervaloVivo,
  textoActualizado,
  textoArranca,
  textoCompartirResultado,
  textoFalta,
  textoResultado,
  type ConteosFamilia,
  type MarcadorOk,
} from "@/lib/fija/vivo";
import type { DatosAlineacion } from "@/lib/fija/alineacion";

export function VivoPantalla({
  t,
  e,
  inicial,
}: {
  t: string;
  e: string;
  inicial: MarcadorPublico | null;
}) {
  const [marcador, setMarcador] = useState<MarcadorPublico | null>(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [grito, setGrito] = useState("");
  const [pop, setPop] = useState(false);
  const previo = useRef<{ gf: number; gc: number } | null>(null);
  const cardRef = useRef(inicial?.ok ? inicial.card : null);

  useEffect(() => {
    if (!t && !e) return;
    let cancel = false;
    let timer = 0;
    let intento = 0;
    async function tick() {
      if (cancel) return;
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(tick, 30_000);
        return;
      }
      let next: MarcadorPublico | null = null;
      let fallo = false;
      try {
        next = await leerMarcador({ data: { t, e, ligero: Boolean(cardRef.current) } });
        if (next?.ok && next.card && cardRef.current) {
          const conservada = conservarFotos(next.card, cardRef.current);
          if (conservada.falta) {
            const completo = await leerMarcador({ data: { t, e } });
            if (completo) next = completo;
          } else {
            next = { ...next, card: conservada.card };
          }
        }
      } catch {
        fallo = true;
      }
      if (cancel) return;
      if (fallo || !next) {
        setMarcador((anterior) => anterior ?? { ok: false, reason: "missing" });
        timer = window.setTimeout(tick, 12_000);
        return;
      }
      const recibido = next;
      const cerca = recibido.ok && recibido.estado === "espera" && cercaDelSaque(recibido.startsAt);
      if (!recibido.ok && recibido.reason === "limited") {
        setMarcador((anterior) => (anterior?.ok ? anterior : recibido));
      } else {
        setMarcador(recibido);
        if (recibido.ok) cardRef.current = recibido.card;
      }
      setAhora(Date.now());
      const limited = !recibido.ok && recibido.reason === "limited";
      intento = limited ? intento + 1 : 0;
      const espera = intervaloVivo({
        estado: limited ? "limited" : recibido.ok ? recibido.estado : "espera",
        ahora: Date.now(),
        cerrado: recibido.ok ? recibido.cerrado : null,
        figuraLista: recibido.ok && recibido.estado === "final" && recibido.figura.estado !== "abierta",
        intentoLimited: intento,
        cerca,
      });
      if (espera <= 0) return;
      timer = window.setTimeout(tick, espera);
    }
    void tick();
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [t, e]);

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!marcador?.ok || marcador.sinPartido) return;
    const antes = previo.current;
    previo.current = { gf: marcador.goalsFor, gc: marcador.goalsAgainst };
    if (!antes || marcador.estado !== "juego") return;
    if (marcador.goalsFor > antes.gf) {
      setGrito(`¡Gooool! ${marcador.goalsFor}–${marcador.goalsAgainst}`);
      setPop(true);
      const id = window.setTimeout(() => {
        setGrito("");
        setPop(false);
      }, 3000);
      return () => window.clearTimeout(id);
    }
    if (marcador.goalsAgainst > antes.gc) setPop(false);
  }, [marcador]);

  if (!t && !e) return <Vacio texto="Pedile al DT el link del equipo." />;
  if (!marcador) return <Vacio texto="Cargando el partido…" />;
  if (!marcador.ok) {
    return (
      <Vacio
        texto={
          marcador.reason === "limited"
            ? "Hay demasiada gente mirando desde la misma red. Probá de nuevo en un rato."
            : "Este link no está activo. Pedile al DT que lo comparta de nuevo."
        }
      />
    );
  }

  const m = marcador;
  const escudo = m.escudo ? `/api/vivo/escudo?${e ? `e=${e}` : `t=${t}`}` : "";
  const previa = m.estado === "espera" && cercaDelSaque(m.startsAt, ahora);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-4 py-6">
      <header className="flex items-center gap-3">
        <LogoMark className="size-9" />
        <div>
          <p className="font-display text-lg font-bold leading-none">Mi Vestuario</p>
          <p className="text-sm text-muted">{m.club}</p>
        </div>
      </header>

      {m.sinPartido ? (
        <h1 className="mt-8 text-4xl font-bold">Todavía no hay un partido</h1>
      ) : (
        <>
          <Estado m={m} ahora={ahora} previa={previa} />
          <Escudos club={m.club} rival={m.rival} escudo={escudo} />
          {m.estado === "espera" && !previa ? (
            <section className="mt-6">
              <p className="text-sm text-muted">{textoArranca(m.startsAt)}</p>
              <p className="mt-1 font-display text-5xl font-bold leading-none">{textoFalta(m.startsAt, ahora)}</p>
              {m.maps ? (
                <a href={m.maps} className="mt-4 block text-sm font-semibold text-accent" target="_blank" rel="noreferrer">
                  {m.place || "Ver la cancha en el mapa"}
                </a>
              ) : null}
            </section>
          ) : m.estado === "oficial" ? (
            <section className="mt-6">
              <h1 className="text-3xl font-bold">Terminó · esperando el resultado oficial</h1>
              <MarcadorGrande m={m} pop={false} />
            </section>
          ) : (
            <section className="mt-6">
              {m.estado === "final" ? (
                <h1 className="text-3xl font-bold">{textoResultado(m.goalsFor, m.goalsAgainst)}</h1>
              ) : previa ? (
                <>
                  <p className="text-sm text-muted">{textoArranca(m.startsAt)}</p>
                  <p className="mt-1 font-display text-5xl font-bold leading-none">{textoFalta(m.startsAt, ahora)}</p>
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <span className="vivo-punto size-2 rounded-full bg-accent" />
                  {textoActualizado(m.actualizado, ahora)}
                </p>
              )}
              <MarcadorGrande m={m} pop={pop} />
              {grito ? (
                <p className="mt-3 text-2xl font-bold text-accent" role="status">
                  {grito}
                </p>
              ) : null}
              {previa && m.maps ? (
                <a href={m.maps} className="mt-4 block text-sm font-semibold text-accent" target="_blank" rel="noreferrer">
                  {m.place || "Ver la cancha en el mapa"}
                </a>
              ) : null}
            </section>
          )}

          <EspacioSponsor sponsors={m.sponsors} lugar="franja" />

          {m.lineas.length > 0 ? (
            <ol className="mt-6 space-y-2">
              {m.lineas.map((linea) => (
                <li key={linea.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{linea.texto}</span>
                  <span className="tabular-nums text-muted">{linea.marca}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {m.card ? (
            <FormacionCard datos={m.card} />
          ) : m.titulares.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Mirá cómo salen</h2>
              <div className="relative mt-2 aspect-[5/7] overflow-hidden rounded-2xl bg-linear-to-b from-pitch-top to-pitch-deep">
                <CanchaLineas />
                {m.titulares.map((puesto) => (
                  <div
                    key={`${puesto.puesto}-${puesto.x}-${puesto.y}`}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${puesto.x}%`, top: `${puesto.y}%` }}
                  >
                    <span className="grid h-12 w-11 place-items-center rounded-t-xl rounded-b-md bg-[#b8f25a] text-lg font-bold leading-none text-[#0b1c12]">
                      {puesto.numero || puesto.puesto}
                    </span>
                    <span className="mt-1 max-w-20 truncate text-[13px] font-semibold uppercase tracking-wide text-[#e8f3ea]">
                      {puesto.puesto}
                    </span>
                    <span className="max-w-20 truncate text-[13px] text-[#e8f3ea]">{puesto.nick}</span>
                  </div>
                ))}
              </div>
              {m.banco.length > 0 ? <p className="mt-3 text-sm text-muted">Banco: {m.banco.join(", ")}</p> : null}
            </section>
          ) : m.estado === "espera" ? (
            <p className="mt-6 text-sm text-muted">Cuando el DT publique la formación, la ves acá.</p>
          ) : null}

          {m.estado !== "espera" || previa ? (
            m.reaccion ? <Reacciones token={m.reaccion} inicial={m.familia} /> : null
          ) : null}

          {m.estado === "final" ? (
            <section className="mt-6">
              {m.goleadores.length > 0 ? (
                <p className="text-sm">Goles: {m.goleadores.join(", ")}</p>
              ) : null}
              <Figura m={m} />
              <button
                type="button"
                className="mt-3 h-14 w-full rounded-md bg-accent text-base font-semibold text-accent-fg"
                onClick={() => void compartir(m, escudo)}
              >
                Compartir resultado
              </button>
              <EspacioSponsor sponsors={m.sponsors} lugar="cierre" />
            </section>
          ) : null}
        </>
      )}

      {m.proximo ? (
        <p className="mt-6 text-sm">
          Próximo partido: {m.proximo.cuando} vs {m.proximo.rival}
        </p>
      ) : null}
      {m.resultados.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Últimos resultados</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {m.resultados.map((row) => (
              <li key={`${row.fecha}-${row.rival}`}>
                {row.fecha} · {row.gf}–{row.gc} vs {row.rival}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-8 space-y-2 text-sm text-muted">
        <p>
          <a href="https://www.mivestuario.com.ar" className="font-semibold text-accent">
            ¿Tu equipo no lo tiene? Armalo gratis en mivestuario.com.ar
          </a>
        </p>
        <p>Se ven el resultado y la formación, con foto y nombre.</p>
      </footer>
    </main>
  );
}

function FormacionCard({ datos }: { datos: DatosAlineacion }) {
  const [url, setUrl] = useState<string | null>(null);
  const clave = [
    datos.rival,
    datos.esquema,
    datos.fecha,
    datos.titulares.map((ficha) => `${ficha.key}:${ficha.nombre}:${ficha.numero ?? ""}:${ficha.imagen?.tipo === "foto" ? (ficha.imagen.src ? "f" : "0") : "i"}`).join("|"),
    datos.banco.map((ficha) => `${ficha.id}:${ficha.nombre}:${ficha.numero ?? ""}:${ficha.imagen?.tipo === "foto" ? (ficha.imagen.src ? "f" : "0") : "i"}`).join("|"),
    datos.dt.map((ficha) => `${ficha.id}:${ficha.nombre}:${ficha.imagen?.tipo === "foto" ? (ficha.imagen.src ? "f" : "0") : "i"}`).join("|"),
  ].join("~");
  useEffect(() => {
    let cancel = false;
    void import("@/lib/fija/alineacion-dibujo")
      .then((mod) => mod.dibujarAlineacion(datos))
      .then((blob) => {
        const next = URL.createObjectURL(blob);
        if (cancel) {
          URL.revokeObjectURL(next);
          return;
        }
        setUrl((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
    // clave resume la formación. El objeto cambia en cada poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  if (!url) return <p className="mt-6 text-sm text-muted">Armando la formación…</p>;
  return <img src={url} alt={`Formación contra ${datos.rival}`} className="mt-6 w-full rounded-2xl" />;
}

function Estado({ m, ahora, previa }: { m: MarcadorOk; ahora: number; previa: boolean }) {
  const texto = previa
    ? "En vivo"
    : m.estado === "espera"
      ? "Antes del partido"
      : m.estado === "juego"
        ? "En juego"
        : m.estado === "oficial"
          ? "Esperando el resultado"
          : "Final";
  return (
    <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-accent">
      {texto}
      {m.estado === "juego" ? <span className="sr-only"> {textoActualizado(m.actualizado, ahora)}</span> : null}
    </p>
  );
}

function Escudos({ club, rival, escudo }: { club: string; rival: string; escudo: string }) {
  if (!rival) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Lado nombre={club} imagen={escudo} />
      <span className="text-sm text-muted">vs</span>
      <Lado nombre={rival} imagen="" />
    </div>
  );
}

function Lado({ nombre, imagen }: { nombre: string; imagen: string }) {
  const letras = nombre
    .replace(/^vs\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      {imagen ? (
        <img src={imagen} alt="" className="size-16 rounded-full object-cover" />
      ) : (
        <span className="grid size-16 place-items-center rounded-full bg-surface text-lg font-bold">{letras || "VS"}</span>
      )}
      <span className="max-w-full truncate text-sm font-semibold">{nombre.replace(/^vs\.?\s+/i, "")}</span>
    </div>
  );
}

function MarcadorGrande({ m, pop }: { m: MarcadorOk; pop: boolean }) {
  return (
    <p className={`mt-2 font-display text-7xl font-bold tracking-tight tabular-nums ${pop ? "vivo-pop" : ""}`}>
      {m.goalsFor}–{m.goalsAgainst}
    </p>
  );
}

function Figura({ m }: { m: MarcadorOk }) {
  if (m.figura.estado === "abierta") {
    return <p className="mt-3 text-sm">El plantel está votando la figura. Volvé el {diaVolver(m.figura.hasta)} para verla.</p>;
  }
  if (m.figura.estado === "lista") return <p className="mt-3 text-lg font-semibold">Figura: {m.figura.apodo}</p>;
  if (m.figura.estado === "oculta") return <p className="mt-3 text-lg font-semibold">Figura: elegida por el plantel</p>;
  return null;
}

function Reacciones({ token, inicial }: { token: string; inicial: ConteosFamilia }) {
  const [por, setPor] = useState(inicial);
  const [hechas, setHechas] = useState<Record<string, boolean>>({});
  const [pulso, setPulso] = useState("");
  useEffect(() => {
    setPor(inicial);
  }, [inicial]);
  const tipos = [
    { id: "pelota" as const, emoji: "⚽", n: por.pelota },
    { id: "aplauso" as const, emoji: "👏", n: por.aplauso },
    { id: "fuego" as const, emoji: "🔥", n: por.fuego },
  ];
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {tipos.map((tipo) => (
        <button
          key={tipo.id}
          type="button"
          disabled={hechas[tipo.id]}
          className={`h-14 rounded-md bg-surface text-base font-semibold disabled:opacity-60 ${pulso === tipo.id ? "vivo-tap" : ""}`}
          onClick={() => {
            setPulso(tipo.id);
            void reaccionarFamilia({ data: { token, tipo: tipo.id } }).then((result) => {
              if (!result.ok) return;
              setPor(result.por);
              setHechas((prev) => ({ ...prev, [tipo.id]: true }));
            });
          }}
        >
          {tipo.emoji} {tipo.n}
        </button>
      ))}
    </div>
  );
}

function CanchaLineas() {
  return (
    <svg viewBox="0 0 100 140" className="pointer-events-none absolute inset-0 h-full w-full opacity-80" aria-hidden="true">
      <rect x="6" y="6" width="88" height="128" fill="none" stroke="#e8f3ea" strokeWidth="0.8" />
      <line x1="6" y1="70" x2="94" y2="70" stroke="#e8f3ea" strokeWidth="0.8" />
      <circle cx="50" cy="70" r="10" fill="none" stroke="#e8f3ea" strokeWidth="0.8" />
    </svg>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-4 py-8">
      <LogoMark className="size-9" />
      <h1 className="mt-4 text-3xl font-bold">{texto}</h1>
    </main>
  );
}

async function dibujarEscudo(ctx: CanvasRenderingContext2D, url: string, x: number, y: number) {
  if (!url) return;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 48, y + 48, 48, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, 96, 96);
    ctx.restore();
  } catch {
    /* sin escudo, quedan las iniciales */
  }
}

function iniciales(nombre: string): string {
  return nombre
    .replace(/^vs\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase() || "VS";
}

async function compartir(m: MarcadorOk, escudo: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0b1c12";
  ctx.fillRect(0, 0, 1080, 1920);
  logo(ctx, 80, 140, 120);
  ctx.fillStyle = "#eef6ef";
  ctx.font = "700 54px sans-serif";
  ctx.fillText("Mi Vestuario", 230, 220);
  ctx.beginPath();
  ctx.arc(180, 480, 70, 0, Math.PI * 2);
  ctx.fillStyle = "#163326";
  ctx.fill();
  await dibujarEscudo(ctx, escudo, 110, 410);
  ctx.fillStyle = "#b8f25a";
  ctx.font = "700 42px sans-serif";
  ctx.textAlign = "center";
  if (!escudo) ctx.fillText(iniciales(m.club), 180, 496);
  ctx.beginPath();
  ctx.arc(900, 480, 70, 0, Math.PI * 2);
  ctx.fillStyle = "#163326";
  ctx.fill();
  ctx.fillStyle = "#eef6ef";
  ctx.fillText(iniciales(m.rival || "VS"), 900, 496);
  ctx.textAlign = "left";
  ctx.font = "800 150px sans-serif";
  ctx.fillStyle = "#b8f25a";
  ctx.fillText(`${m.goalsFor}–${m.goalsAgainst}`, 80, 760);
  ctx.fillStyle = "#eef6ef";
  ctx.font = "700 64px sans-serif";
  ctx.fillText(textoResultado(m.goalsFor, m.goalsAgainst), 80, 880);
  ctx.font = "600 48px sans-serif";
  ctx.fillStyle = "#9bb5a4";
  ctx.fillText(`${m.club} vs ${m.rival}`.slice(0, 36), 80, 980);
  if (m.goleadores.length > 0) {
    ctx.fillStyle = "#eef6ef";
    ctx.fillText(m.goleadores.join(" · ").slice(0, 40), 80, 1100);
  }
  const sponsor = m.sponsors[0];
  if (sponsor) {
    if (sponsor.logoUrl.startsWith("data:image/")) {
      const img = new Image();
      img.src = sponsor.logoUrl;
      try {
        await img.decode();
        ctx.drawImage(img, 80, 1600, 160, 64);
      } catch {
        /* el nombre alcanza */
      }
    }
    ctx.fillStyle = "#9bb5a4";
    ctx.font = "600 36px sans-serif";
    ctx.fillText(`Auspicia: ${sponsor.nombre}`.slice(0, 40), 260, 1644);
  }
  ctx.fillStyle = "#6e8a78";
  ctx.font = "500 32px sans-serif";
  ctx.fillText(new Date(m.startsAt).toLocaleDateString("es-AR"), 80, 1760);
  const blob = await png(ctx);
  const texto = textoCompartirResultado(m.goalsFor, m.goalsAgainst, window.location.href);
  const file = new File([blob], "resultado.png", { type: "image/png" });
  if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], text: texto });
    return;
  }
  await navigator.clipboard?.writeText(texto);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "resultado.png";
  link.click();
}
