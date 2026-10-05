import { CalendarDays, ChartColumn, House, Lock, MessageCircle, Shield, Users } from "lucide-react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ROLE_LABEL } from "@/lib/fija/format";
import { readPedirEdad } from "@/lib/fija/edad";
import { rememberInvite } from "@/lib/fija/share";
import { registerTeamPush } from "@/lib/fija/push-client";
import { useFija, useIsStaff, useMe, currentAccount, wipeLocalTeamData } from "@/lib/fija/store";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ClubGate } from "./club-gate";
import { InboxBell } from "./inbox-bell";
import { BrandLockup } from "./logo";
import { PushBanner, AvisosPrompt } from "./push-banner";
import { PwaRegister } from "./pwa-register";
import { SignInPanel } from "./sign-in-panel";
import { EdadGate } from "./edad-gate";
import { TeamCrest } from "./team-crest";

const NAV = [
  { to: "/", label: "Inicio", icon: House, exact: true },
  { to: "/agenda", label: "Agenda", icon: CalendarDays, exact: false },
  { to: "/cancha", label: "Pizarra", icon: Shield, exact: false },
  { to: "/stats", label: "Stats", icon: ChartColumn, exact: false },
  { to: "/chat", label: "Técnica", icon: MessageCircle, exact: false },
  { to: "/equipo", label: "Equipo", icon: Users, exact: false },
] as const;

/** Rutas "peladas": sin AppBar ni BottomNav. */
const BARE_PATHS = [
  "/olvide",
  "/reset",
  "/login",
  "/privacidad",
  "/eliminar-cuenta",
  "/contacto",
  "/terminos",
  "/vivo",
] as const;

export function PhoneShell() {
  const setHydrated = useFija((s) => s.setHydrated);
  const tickAlerts = useFija((s) => s.tickAlerts);
  const club = useFija((s) => s.club);
  const hydrated = useFija((s) => s.hydrated);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    rememberInvite(new URLSearchParams(window.location.search).get("invite"));
  }, []);

  useEffect(() => {
    if (isPending || !user?.id) return;
    let cancel = false;
    void Promise.resolve(useFija.persist.rehydrate()).then(async () => {
      if (cancel) return;
      setHydrated();
      const account = await currentAccount();
      if (cancel) return;
      if (account) {
        const owner = useFija.getState().ownerAccountId;
        if (owner && owner !== account.id) wipeLocalTeamData({ keepInvite: true });
        if (useFija.getState().ownerAccountId !== account.id) {
          useFija.setState({ ownerAccountId: account.id });
        }
      }
      await useFija.getState().syncFromCloud();
      await useFija.getState().restoreMyClubs();
      await useFija.getState().ensureMySpot();
      await useFija.getState().applySharedPhoto();
    });
    tickAlerts();
    const id = window.setInterval(() => tickAlerts(), 30_000);
    const refresh = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!useFija.getState().club) return;
      void useFija.getState().syncFromCloud();
    }, 5_000);
    const onFocus = () => {
      if (!useFija.getState().club) return;
      void useFija.getState().syncFromCloud();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const listen = () => {
      const current = useFija.getState();
      if (!current.club) return;
      void registerTeamPush(current.club.inviteCode, current.activeId);
    };
    window.addEventListener("vestuario-notifications-granted", listen);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") listen();
    return () => {
      cancel = true;
      window.clearInterval(id);
      window.clearInterval(refresh);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("vestuario-notifications-granted", listen);
    };
  }, [setHydrated, tickAlerts, user?.id, isPending]);

  const isBare = (BARE_PATHS as readonly string[]).includes(pathname);

  return (
    <div className="min-h-dvh bg-void text-fg">
      <div className="app-titlebar" aria-hidden="true" />
      <PwaRegister />
      <div className="pitch-shell mx-auto flex min-h-dvh w-full max-w-phone flex-col shadow-card desk:h-dvh desk:max-w-none desk:flex-row desk:shadow-none">
        <div className="grass-strip desk:hidden" aria-hidden="true" />
        {isBare ? (
          <div className="contents desk:mx-auto desk:flex desk:w-full desk:max-w-xl desk:flex-1 desk:flex-col">
            <Outlet />
          </div>
        ) : (
          <AuthFrame>
            {hydrated && !club ? (
              <div className="contents desk:mx-auto desk:flex desk:w-full desk:max-w-md desk:flex-1 desk:items-center">
                <ClubGate />
              </div>
            ) : (
              <>
                <SideNav />
                <div className="desk-stage contents desk:flex desk:min-h-0 desk:min-w-0 desk:flex-1 desk:flex-col">
                  <AppBar />
                  <CloudBanner />
                  <AvisosPrompt />
                  <PushBanner />
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2 desk:px-8 desk:pb-10">
                    <div className="contents desk:mx-auto desk:block desk:w-full desk:max-w-6xl">
                      <Outlet />
                    </div>
                  </div>
                  <BottomNav />
                </div>
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
  const club = useFija((s) => s.club);
  const hydrated = useFija((s) => s.hydrated);
  const [pedirEdad, setPedirEdad] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    setPedirEdad(readPedirEdad());
  }, [user]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (isPending && !user) {
    return <p className="grid min-h-dvh place-items-center px-6 text-center text-sm text-muted">Abriendo el vestuario…</p>;
  }
  if (user && pedirEdad) return <EdadGate />;
  if (user) return children;
  if (!online && hydrated && club) return children;
  return <SignInPanel />;
}

function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const me = useMe();
  const club = useFija((s) => s.club);
  const otherClubs = useFija((s) => s.otherClubs);

  return (
    <aside className="desk-rail hidden desk:flex desk:h-dvh desk:w-72 desk:shrink-0 desk:flex-col">
      <div className="px-5 pb-4 pt-6">
        <BrandLockup />
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 shadow-card">
          <TeamCrest src={club?.crest} name={club?.name} className="size-11 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold leading-none">{club?.name ?? "Sin equipo"}</p>
            <p className="mt-1 truncate text-xs text-muted">
              {me.nick} · {ROLE_LABEL[me.role]}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Vestuario</p>
        <ul className="space-y-1">
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
                    "flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                    active
                      ? "bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent shadow-[inset_3px_0_0_var(--color-accent)]"
                      : "text-muted hover:bg-surface hover:text-fg",
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
      <div className="p-3">
        {otherClubs.length > 0 ? (
          <Link to="/equipo" className="mb-1 flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-accent">
            Cambiar de equipo
          </Link>
        ) : null}
        <Link
          to="/seguridad"
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
            pathname.startsWith("/seguridad")
              ? "bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent"
              : "text-muted hover:bg-surface hover:text-fg",
          )}
        >
          <Lock className="size-4" />
          Seguridad
        </Link>
      </div>
    </aside>
  );
}

function AppBar() {
  const me = useMe();
  const club = useFija((s) => s.club);
  const otherClubs = useFija((s) => s.otherClubs);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] desk:static desk:border-0 desk:bg-transparent desk:px-8 desk:pb-0 desk:pt-5">
      <div className="flex items-center justify-between gap-2 desk:justify-end">
        <div className="desk:hidden">
          <BrandLockup />
        </div>
        <div className="flex items-center">
          <InboxBell />
          <Link to="/seguridad" className="grid size-11 place-items-center text-muted desk:hidden">
            <Lock className="size-4" />
            <span className="sr-only">Seguridad</span>
          </Link>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 desk:hidden">
        <TeamCrest src={club?.crest} name={club?.name} className="size-8 text-xs" />
        <p className="min-w-0 flex-1 truncate text-xs text-muted">
          {club?.name ?? "Sin equipo"} · {me.nick} · {ROLE_LABEL[me.role]}
        </p>
        {otherClubs.length > 0 ? (
          <Link to="/equipo" className="shrink-0 text-xs font-semibold text-accent">
            Cambiar
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function CloudBanner() {
  const status = useFija((s) => s.cloudStatus);
  const error = useFija((s) => s.cloudError);
  const flushCloud = useFija((s) => s.flushCloud);
  const staff = useIsStaff();
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (!online) {
    return (
      <p className="bg-surface px-4 py-2 text-center text-sm text-muted">
        Sin conexión. Lo que cargues se guarda cuando vuelva la red.
      </p>
    );
  }
  if (status !== "off" || !error) return null;
  const full = error.includes("pesa demasiado");
  const text = full
    ? staff
      ? "El equipo está lleno: sacá fotos o el escudo para seguir guardando."
      : "No se pudo guardar. Avisale al DT que el equipo está lleno."
    : error;
  return (
    <p className="flex items-center justify-between gap-2 bg-surface px-4 py-2 text-sm">
      <span>{text}</span>
      <button type="button" className="h-10 shrink-0 font-semibold text-accent" onClick={() => void flushCloud()}>
        Reintentar
      </button>
    </p>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] desk:hidden">
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