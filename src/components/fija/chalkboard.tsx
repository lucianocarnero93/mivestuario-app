import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chalkboard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("chalkboard rounded-xl p-4", className)}>
      {title ? (
        <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-chalk/70">
          {title}
        </p>
      ) : null}
      <div className={cn("text-sm leading-relaxed text-chalk", title && "mt-2")}>{children}</div>
    </section>
  );
}
