import type { ReactNode } from "react";
import { initials } from "@/lib/fija/format";
import { teamRecord, type PlayerRow } from "@/lib/fija/stats";
import type { Member, PlayerMatchStat } from "@/lib/fija/types";
import { cn } from "@/lib/utils";

export function RecordStrip({
  record,
}: {
  record: ReturnType<typeof teamRecord>;
}) {
  const total = Math.max(record.played, 1);
  return (
    <section className="rounded-xl bg-surface p-4 shadow-card">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Rendimiento</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatTile value={record.won} label="Ganados" tone="win" />
        <StatTile value={record.drawn} label="Empatados" tone="draw" />
        <StatTile value={record.lost} label="Perdidos" tone="loss" />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
        <div className="flex h-full">
          <span className="bg-accent" style={{ width: `${(record.won / total) * 100}%` }} />
          <span className="bg-warning" style={{ width: `${(record.drawn / total) * 100}%` }} />
          <span className="bg-danger" style={{ width: `${(record.lost / total) * 100}%` }} />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        {record.played} PJ · {record.gf} GF · {record.ga} GC · Dif.{" "}
        {record.gf - record.ga > 0 ? "+" : ""}
        {record.gf - record.ga}
      </p>
    </section>
  );
}

function StatTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "win" | "draw" | "loss";
}) {
  return (
    <div className="rounded-lg bg-bg px-2 py-3">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "win" && "text-accent",
          tone === "draw" && "text-warning",
          tone === "loss" && "text-danger",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function RankBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      {count === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-2 divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-card">
          {children}
        </ol>
      )}
    </section>
  );
}

export function RankRow({
  rank,
  member,
  value,
  unit,
}: {
  rank: number;
  member: Member | undefined;
  value: number;
  unit: string;
}) {
  if (!member) return null;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="w-6 text-sm font-semibold tabular-nums text-subtle">{rank}</span>
      <PlayerAvatar name={member.name} photo={member.photo} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{member.nick}</span>
        <span className="text-xs text-muted">{member.name}</span>
      </span>
      <span className="text-right">
        <span className="block text-lg font-semibold tabular-nums text-accent">{value}</span>
        <span className="text-xs text-subtle">{unit}</span>
      </span>
    </li>
  );
}

export function CardRow({ member, row }: { member: Member | undefined; row: PlayerMatchStat }) {
  if (!member) return null;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <PlayerAvatar name={member.name} photo={member.photo} />
      <span className="min-w-0 flex-1 truncate font-medium">{member.nick}</span>
      <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
        {row.yellow > 0 ? (
          <span className="flex items-center gap-1 text-warning">
            <span className="inline-block h-4 w-3 rounded-sm bg-warning" />
            {row.yellow}
          </span>
        ) : null}
        {row.red > 0 ? (
          <span className="flex items-center gap-1 text-danger">
            <span className="inline-block h-4 w-3 rounded-sm bg-danger" />
            {row.red}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function PlayerAvatar({
  name,
  accent,
  photo,
}: {
  name: string;
  accent?: boolean;
  photo?: string | null;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={cn("size-11 rounded-full object-cover", accent && "ring-2 ring-accent")}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid size-11 place-items-center rounded-full text-xs font-bold",
        accent ? "bg-accent text-accent-fg" : "bg-wood text-chalk",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function PlayerMarks({ row }: { row: PlayerRow | undefined }) {
  if (!row || row.goals + row.assists + row.yellow + row.red === 0) {
    return <span className="text-xs text-subtle">—</span>;
  }
  return (
    <span className="text-right text-xs tabular-nums text-muted">
      <span className="block font-semibold text-fg">
        {row.goals} G · {row.assists} A
      </span>
      {row.yellow > 0 || row.red > 0 ? (
        <span>
          {row.yellow > 0 ? `${row.yellow} TA` : ""}
          {row.yellow > 0 && row.red > 0 ? " · " : ""}
          {row.red > 0 ? `${row.red} TR` : ""}
        </span>
      ) : null}
    </span>
  );
}

export function MyNumbers({
  member,
  row,
}: {
  member: Member;
  row: PlayerRow | undefined;
}) {
  if (member.role !== "jugador") return null;
  const stats = row ?? {
    memberId: member.id,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    matches: 0,
  };
  return (
    <section className="rounded-xl bg-surface p-4 shadow-card">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Tus números</h2>
      <p className="mt-1 font-medium">{member.nick}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <MiniTile value={stats.goals} label="Goles" />
        <MiniTile value={stats.assists} label="Asist." />
        <MiniTile value={stats.yellow} label="Amarillas" warn={stats.yellow > 0} />
        <MiniTile value={stats.red} label="Rojas" danger={stats.red > 0} />
      </div>
    </section>
  );
}

function MiniTile({
  value,
  label,
  warn,
  danger,
}: {
  value: number;
  label: string;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg bg-bg px-1 py-2">
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          warn && "text-warning",
          danger && "text-danger",
        )}
      >
        {value}
      </p>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
