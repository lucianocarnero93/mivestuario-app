import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Mi Vestuario App"
    >
      <rect width="32" height="32" rx="7" fill="#0b1c12" />
      <rect x="4" y="6" width="10" height="20" rx="2" fill="#b8f25a" />
      <rect x="18" y="6" width="10" height="20" rx="2" fill="#b8f25a" />
      <rect x="6" y="8" width="6" height="2" rx="1" fill="#0b1c12" />
      <rect x="6" y="12" width="6" height="2" rx="1" fill="#0b1c12" />
      <rect x="20" y="8" width="6" height="2" rx="1" fill="#0b1c12" />
      <rect x="20" y="12" width="6" height="2" rx="1" fill="#0b1c12" />
      <circle cx="12" cy="22" r="1.5" fill="#0b1c12" />
      <circle cx="20" cy="22" r="1.5" fill="#0b1c12" />
      <circle cx="16" cy="16" r="6" fill="#0b1c12" />
      <circle cx="16" cy="16" r="5.2" fill="#eef6ef" />
      <polygon fill="#0b1c12" points="16,12.85 19,15.03 17.85,18.55 14.15,18.55 13,15.03" />
    </svg>
  );
}

export function BrandLockup({
  kicker,
  compact,
}: {
  kicker?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark className={compact ? "size-8" : "size-10"} />
      <div className="min-w-0">
        {kicker ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">{kicker}</p>
        ) : null}
        <p
          className={cn(
            "truncate font-display font-semibold leading-tight",
            compact ? "text-base" : "text-lg",
          )}
        >
          Mi Vestuario
        </p>
      </div>
    </div>
  );
}