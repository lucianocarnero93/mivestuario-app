import { useEffect, useRef, useState } from "react";
import { notasVisibles, type Jugada, type NotaJugada } from "@/lib/fija/jugada";
import { loadAudioJugada, saveAudioJugada } from "@/lib/fija/cloud";
import { uid } from "@/lib/fija/format";

const VACIA: NotaJugada = { id: "n1", texto: "", audio: false };
const TOPE = 20_000;

export function JugadaPanel({
  staff,
  code,
  eventId,
  jugada,
  onChange,
}: {
  staff: boolean;
  code: string;
  eventId: string;
  jugada?: Jugada;
  onChange: (notas: NotaJugada[]) => void;
}) {
  const guardadas = jugada?.notas ?? [];
  const notas = guardadas.length ? guardadas : staff ? [VACIA] : [];
  const visibles = notasVisibles(jugada);
  const [indice, setIndice] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const corte = useRef<number | null>(null);
  const nota = notas[Math.min(indice, Math.max(notas.length - 1, 0))];

  useEffect(() => {
    let cancel = false;
    setAudioUrl(null);
    if (!nota?.audio || !code) return;
    void loadAudioJugada({ data: { code, eventId, notaId: nota.id } })
      .then((result) => {
        if (!cancel) setAudioUrl(result.audio);
      })
      .catch(() => {
        if (!cancel) setAviso("No se pudo cargar el audio.");
      });
    return () => {
      cancel = true;
    };
  }, [code, eventId, nota?.id, nota?.audio]);

  useEffect(() => {
    return () => {
      if (corte.current) window.clearTimeout(corte.current);
      rec.current?.stop();
    };
  }, []);

  if (!staff && visibles.length === 0) return null;

  function guardar(siguientes: NotaJugada[]) {
    onChange(siguientes);
  }

  async function grabar() {
    if (!nota || grabando) return;
    setAviso(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAviso("Este celular no puede grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let media: MediaRecorder;
      try {
        media = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 16_000 })
          : new MediaRecorder(stream);
      } catch {
        media = new MediaRecorder(stream);
      }
      const partes: Blob[] = [];
      media.ondataavailable = (event) => {
        if (event.data.size) partes.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setGrabando(false);
        const blob = new Blob(partes, { type: media.mimeType || "audio/webm" });
        if (blob.size > 60_000) {
          setAviso("Quedó muy largo. Hablá menos de 20 segundos.");
          return;
        }
        const lector = new FileReader();
        lector.onload = () => {
          const data = typeof lector.result === "string" ? lector.result : "";
          if (!data.startsWith("data:audio/")) {
            setAviso("No se pudo guardar el audio.");
            return;
          }
          setAudioUrl(data);
          void saveAudioJugada({ data: { code, eventId, notaId: nota.id, audio: data } })
            .then((result) => {
              if (!result.ok) {
                setAviso("No se pudo guardar el audio.");
                return;
              }
              guardar(notas.map((item) => (item.id === nota.id ? { ...item, audio: true } : item)));
            })
            .catch(() => setAviso("No se pudo guardar el audio."));
        };
        lector.readAsDataURL(blob);
      };
      rec.current = media;
      media.start();
      setGrabando(true);
      corte.current = window.setTimeout(() => media.stop(), TOPE);
    } catch {
      setAviso("El celular no dejó usar el micrófono.");
    }
  }

  function parar() {
    if (corte.current) window.clearTimeout(corte.current);
    rec.current?.stop();
  }

  function borrarAudio() {
    if (!nota) return;
    setAudioUrl(null);
    void saveAudioJugada({ data: { code, eventId, notaId: nota.id, audio: null } }).catch(() => undefined);
    guardar(notas.map((item) => (item.id === nota.id ? { ...item, audio: false } : item)));
  }

  return (
    <section className="chalkboard mt-4 rounded-xl p-4">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-chalk/70">Jugadas</p>
      {notas.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {notas.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`h-11 shrink-0 rounded-md px-3 text-xs font-semibold ${i === Math.min(indice, notas.length - 1) ? "bg-accent text-accent-fg" : "bg-black/30 text-chalk"}`}
              onClick={() => setIndice(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
      {nota ? (
        staff ? (
          <textarea
            className="mano mt-3 min-h-28 w-full resize-none bg-transparent outline-none placeholder:text-chalk/40"
            maxLength={160}
            value={nota.texto}
            placeholder="Escribí la jugada como en el pizarrón."
            onChange={(event) => {
              const texto = event.target.value;
              guardar(notas.map((item) => (item.id === nota.id ? { ...item, texto } : item)));
            }}
          />
        ) : (
          <p className="mano mt-3 whitespace-pre-wrap">{nota.texto}</p>
        )
      ) : (
        <p className="mano mt-3">Todavía no hay jugadas.</p>
      )}
      {audioUrl ? <audio className="mt-3 w-full" controls src={audioUrl} preload="none" /> : null}
      {aviso ? <p className="mt-2 text-sm text-chalk">{aviso}</p> : null}
      {staff && nota ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="h-11 rounded-md bg-black/30 px-3 text-xs font-semibold text-chalk" onClick={grabando ? parar : () => void grabar()}>
            {grabando ? "Parar" : nota.audio || audioUrl ? "Grabar de nuevo" : "Grabar audio"}
          </button>
          {nota.audio || audioUrl ? (
            <button type="button" className="h-11 rounded-md bg-black/30 px-3 text-xs font-semibold text-chalk" onClick={borrarAudio}>
              Borrar audio
            </button>
          ) : null}
          <button
            type="button"
            className="h-11 rounded-md bg-black/30 px-3 text-xs font-semibold text-chalk"
            disabled={notas.length >= 6}
            onClick={() => {
              const siguiente = { id: uid("n").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16), texto: "", audio: false };
              const lista = [...notas, siguiente];
              setIndice(lista.length - 1);
              guardar(lista);
            }}
          >
            Otra jugada
          </button>
          {notas.length > 1 ? (
            <button
              type="button"
              className="h-11 rounded-md bg-black/30 px-3 text-xs font-semibold text-chalk"
              onClick={() => {
                if (nota.audio) void saveAudioJugada({ data: { code, eventId, notaId: nota.id, audio: null } }).catch(() => undefined);
                const lista = notas.filter((item) => item.id !== nota.id);
                setIndice(0);
                guardar(lista);
              }}
            >
              Borrar jugada
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
