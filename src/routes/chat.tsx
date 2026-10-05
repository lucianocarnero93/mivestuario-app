// Indicaciones del cuerpo técnico. El plantel las lee. No hay chat del grupo.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Chalkboard } from "@/components/fija/chalkboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatTime } from "@/lib/fija/format";
import { useFija, useIsStaff } from "@/lib/fija/store";

type ShareSearch = {
  title?: string;
  text?: string;
  url?: string;
};

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>): ShareSearch => ({
    title: typeof search.title === "string" ? search.title : undefined,
    text: typeof search.text === "string" ? search.text : undefined,
    url: typeof search.url === "string" ? search.url : undefined,
  }),
});

function ChatPage() {
  return (
    <main className="px-4 py-5">
      <h1 className="text-3xl font-semibold">Eso se mudó</h1>
      <p className="mt-2 text-sm text-muted">Las indicaciones están en la pizarra. El partido se sigue en Fecha.</p>
      <div className="mt-4 grid gap-2">
        <Button asChild className="h-14">
          <Link to="/cancha">Ir a la pizarra</Link>
        </Button>
        <Button asChild variant="secondary" className="h-12">
          <Link to="/fecha" search={{ partido: undefined }}>Ir a Fecha</Link>
        </Button>
      </div>
    </main>
  );
}

function CharlaWall() {
  const staff = useIsStaff();
  const members = useFija((s) => s.members);
  const charla = useFija((s) => s.charla);
  const postCharla = useFija((s) => s.postCharla);
  const deleteCharla = useFija((s) => s.deleteCharla);
  const updateCharla = useFija((s) => s.updateCharla);
  const [text, setText] = useState("");
  const [posted, setPosted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const ordered = [...charla].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const latest = ordered[0];
  const older = ordered.slice(1);

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Chalkboard title="Ahora">
        {!latest ? (
          <p>El cuerpo técnico todavía no dejó una indicación.</p>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-chalk/70">
              {byId.get(latest.memberId)?.nick ?? "Cuerpo técnico"} · {formatDay(latest.at)} · {formatTime(latest.at)}
            </p>
            <p className="mt-1 text-lg leading-relaxed">{latest.text}</p>
            {staff ? (
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  className="h-10 text-xs text-chalk/70 underline"
                  onClick={() => {
                    setEditingId(latest.id);
                    setText(latest.text);
                    setPosted(false);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="h-10 text-xs text-chalk/70 underline"
                  onClick={() => {
                    if (!window.confirm("¿Borrar esta indicación?")) return;
                    deleteCharla(latest.id);
                    if (editingId === latest.id) {
                      setEditingId(null);
                      setText("");
                    }
                  }}
                >
                  Borrar
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Chalkboard>
      {older.length > 0 ? (
        <Chalkboard title="Anteriores" className="mt-4">
          <ul className="space-y-4">
            {older.map((post) => (
              <li key={post.id}>
                <p className="text-xs font-semibold uppercase tracking-widest text-chalk/70">
                  {byId.get(post.memberId)?.nick ?? "Cuerpo técnico"} · {formatDay(post.at)} · {formatTime(post.at)}
                </p>
                <p className="mt-1 leading-relaxed">{post.text}</p>
                {staff ? (
                  <div className="mt-1 flex gap-3">
                    <button
                      type="button"
                      className="h-10 text-xs text-chalk/70 underline"
                      onClick={() => {
                        setEditingId(post.id);
                        setText(post.text);
                        setPosted(false);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="h-10 text-xs text-chalk/70 underline"
                      onClick={() => {
                        if (!window.confirm("¿Borrar esta indicación?")) return;
                        deleteCharla(post.id);
                      }}
                    >
                      Borrar
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Chalkboard>
      ) : null}
      {staff ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) updateCharla(editingId, text);
            else postCharla(text);
            setText("");
            setEditingId(null);
            setPosted(true);
          }}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Indicación para todo el plantel…"
            className="min-h-24"
          />
          <Button type="submit" className="h-14 w-full" disabled={!text.trim()}>
            {editingId ? "Guardar corrección" : posted && !text.trim() ? "Publicado" : "Publicar y avisar"}
          </Button>
          <p className="text-xs text-muted">
            {posted && !text.trim() ? "El plantel ya puede leerlo." : "Lo ven todos los del equipo."}
          </p>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted">Solo el DT y el ayudante dejan indicaciones.</p>
      )}
    </div>
  );
}
