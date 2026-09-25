import { CalendarDays, ChartColumn, House, Lock, MessageCircle, Shield, Users } from "lucide-react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ROLE_LABEL } from "@/lib/fija/format";
import { useFija, useMe } from "@/lib/fija/store";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ClubGate } from "./club-gate";
import { InboxBell } from "./inbox-bell";
import { BrandLockup } from "./logo";
import { PushBanner } from "./push-banner";
import { PwaRegister } from "./pwa-register";
import { SignInPanel } from "./sign-in-panel";
import { TeamCrest } from "./team-crest";

const NAV = [
  { to: "/", label: "Inicio", icon: House, exact: true },
  { to: "/agenda", label: "Agenda", icon: CalendarDays, exact: false },
  { to: "/cancha", label: "Pizarra", icon: Shield, exact: false },
  { to: "/stats", label: "Stats", icon: ChartColumn, exact: false },
  { to: "/chat", label: "Charla", icon: MessageCircle, exact: false },
  { to: "/equipo", label: "Equipo", icon: Users, exact: false },
] as const;

/** Rutas "peladas": sin AppBar ni BottomNav ni ClubGate. */
const BARE_PATHS = [
  "/olvide",
  "/reset",
  "/reset-password",
  "/login",
  "/privacidad",
  "/contacto",
  "/terminos",
] as const;

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

function isBarePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (BARE_PATHS as readonly string[]).some(
    (bare) => path === bare || path.startsWith(`${bare}/`),
  );
}

export function PhoneShell() {
  const setHydrated = useFija((s) => s.setHydrated);
  const tickAlerts = useFija((s) => s.tickAlerts);
  const club = useFija((s) => s.club);
  const hydrated = useFija((s) => s.hydrated);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    void Promise.resolve(useFija.persist.rehydrate()).then(() => {
      setHydrated();
      void useFija.getState().syncFromCloud();
    });
    tickAlerts();
    const id = window.setInterval(() => tickAlerts(), 30_000);
    return () => window.clearInterval(id);
  }, [setHydrated, tickAlerts]);

  useEffect(() => {
    const path = normalizePath(pathname);
    const params = new URLSearchParams(
      searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
    );
    const token = params.get("token");
    const error = params.get("error");
    const shouldOpenReset =
      path === "/reset-password" ||
      ((Boolean(token) || error === "INVALID_TOKEN") &&
        path !== "/reset" &&
        path !== "/olvide" &&
        path !== "/login");
    if (!shouldOpenReset) return;
    const next = new URL("/reset", window.location.origin);
    if (token) next.searchParams.set("token", token);
    if (error) next.searchParams.set("error", error);
    window.location.replace(`${next.pathname}${next.search}`);
  }, [pathname, searchStr]);

  const isBare = isBarePath(pathname);

  return (
    <div className="min-h-dvh bg-void text-fg">
      <div className="app-titlebar" aria-hidden="true" />
      <PwaRegister />
      <div className="pitch-shell mx-auto flex min-h-dvh w-full max-w-phone flex-col shadow-card">
        <div className="grass-strip" aria-hidden="true" />
        {isBare ? (
          <Outlet />
        ) : (
          <AuthFrame>
            {hydrated && !club ? (
              <ClubGate />
            ) : (
              <>
                <AppBar />
                <PushBanner />
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
                  <Outlet />
                </div>
                <BottomNav />
              </>
            )}
          </AuthFrame>
        )}
      </div>
    </div>
  );
}

function AuthFrame({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <SignInPanel opening />;
  }
  if (!user) {
    return <SignInPanel opening={false} />;
  }
  return children;
}

function AppBar() {
  const me = useMe();
  const club = useFija((s) => s.club);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-2">
        <BrandLockup />
        <div className="flex items-center">
          <InboxBell />
          <Link to="/seguridad" className="grid size-11 place-items-center text-muted">
            <Lock className="size-4" />
            <span className="sr-only">Seguridad</span>
          </Link>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <TeamCrest src={club?.crest} name={club?.name} className="size-8 text-xs" />
        <p className="text-xs text-muted">
          {club?.name ?? "Sin equipo"} · {me.nick} · {ROLE_LABEL[me.role]}
        </p>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-6">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                search={
                  item.to === "/stats"
                    ? { partido: undefined, torneo: "general" }
                    : item.to === "/chat"
                      ? { title: undefined, text: undefined, url: undefined }
                      : undefined
                }
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
