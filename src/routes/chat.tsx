// Charla del vestuario. El DT también publica avisos técnicos.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Chalkboard } from "@/components/fija/chalkboard";
import { Segmented } from "@/components/fija/segmented";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/fija/format";
import { useFija, useIsStaff, useMe } from "@/lib/fija/store";
import { cn } from "@/lib/utils";

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
  const [tab, setTab] = useState<"tecnica" | "grupo">("tecnica");
  return (
    <main className="flex min-h-[calc(100dvh-13rem)] flex-col px-4 py-5">
      <h1 className="text-3xl font-semibold">Charla</h1>
      <p className="text-sm text-muted">Pizarra del DT y chat del plantel.</p>
      <Segmented
        className="mt-4"
        value={tab}
        onChange={setTab}
        options={[
          { id: "tecnica", label: "Técnica" },
          { id: "grupo", label: "Grupo" },
        ]}
      />
      {tab === "tecnica" ? <CharlaWall /> : <GroupChat />}
    </main>
  );
}

function CharlaWall() {
  const me = useMe();
  const staff = useIsStaff();
  const members = useFija((s) => s.members);
  const charla = useFija((s) => s.charla);
  const postCharla = useFija((s) => s.postCharla);
  const [text, setText] = useState("");
  const byId = new Map(members.map((m) => [m.id, m]));
  const posts = [...charla].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Chalkboard title="Muro del vestuario">
        {posts.length === 0 ? (
          <p>El DT todavía no dejó un comunicado.</p>
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
          }}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Comunicado para todo el plantel…"
            className="min-h-24"
          />
          <Button type="submit" className="h-14 w-full" disabled={!text.trim()}>
            Publicar y avisar
          </Button>
          <p className="text-xs text-muted">
            Se dispara una alerta interna a {me.role === "dt" ? "todo el plantel" : "el resto"}.
          </p>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted">Solo el DT y el ayudante publican en la pizarra.</p>
      )}
    </div>
  );
}

function GroupChat() {
  const me = useMe();
  const members = useFija((s) => s.members);
  const messages = useFija((s) => s.messages);
  const sendChat = useFija((s) => s.sendChat);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const hydrated = useFija((s) => s.hydrated);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const consumedShare = useRef(false);
  const byId = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!hydrated || consumedShare.current) return;
    const parts = [search.title, search.text, search.url].filter(
      (part): part is string => Boolean(part && part.trim()),
    );
    if (!parts.length) return;
    consumedShare.current = true;
    sendChat(parts.join("\n"));
    void navigate({ to: "/chat", search: {}, replace: true });
  }, [hydrated, navigate, search.text, search.title, search.url, sendChat]);

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3">
        {messages.map((m) => {
          const author = byId.get(m.memberId);
          const mine = m.memberId === me.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  mine ? "rounded-br-sm bg-accent text-accent-fg" : "rounded-bl-sm bg-surface text-fg shadow-card",
                )}
              >
                {!mine ? (
                  <p className="mb-0.5 text-xs font-semibold text-accent">{author?.nick ?? "Club"}</p>
                ) : null}
                <p>{m.text}</p>
                <p className={cn("mt-1 text-xs", mine ? "text-accent-fg/70" : "text-subtle")}>
                  {formatTime(m.at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="sticky bottom-0 mt-4 flex gap-2 bg-bg pb-1"
        onSubmit={(e) => {
          e.preventDefault();
          sendChat(text);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí al grupo…"
          className="h-14 flex-1 rounded-lg border border-border bg-surface px-4 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <Button type="submit" className="h-14 px-5" disabled={!text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
