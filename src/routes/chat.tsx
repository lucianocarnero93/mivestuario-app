// Indicaciones del cuerpo técnico. El plantel las lee. No hay chat del grupo.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Chalkboard } from "@/components/fija/chalkboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/fija/format";
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
    <main className="flex min-h-[calc(100dvh-13rem)] flex-col px-4 py-5">
      <h1 className="text-3xl font-semibold">Indicaciones</h1>
      <p className="text-sm text-muted">Las escribe el cuerpo técnico. El plantel las lee.</p>
      <CharlaWall />
    </main>
  );
}

function CharlaWall() {
  const staff = useIsStaff();
  const members = useFija((s) => s.members);
  const charla = useFija((s) => s.charla);
  const postCharla = useFija((s) => s.postCharla);
  const [text, setText] = useState("");
  const [posted, setPosted] = useState(false);
  const byId = new Map(members.map((m) => [m.id, m]));
  const posts = [...charla].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Chalkboard title="Indicaciones">
        {posts.length === 0 ? (
          <p>El cuerpo técnico todavía no dejó una indicación.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => {
              const author = byId.get(post.memberId);
              return (
                <li key={post.id}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-chalk/70">
                    {author?.nick ?? "Cuerpo técnico"} · {formatTime(post.at)}
                  </p>
                  <p className="mt-1 leading-relaxed">{post.text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Chalkboard>
      {staff ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            postCharla(text);
            setText("");
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
            {posted && !text.trim() ? "Publicado" : "Publicar y avisar"}
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
