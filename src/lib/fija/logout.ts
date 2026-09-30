import { signOut } from "@/lib/auth/client";
import { dropPushSubscription } from "./push";
import { useFija, wipeLocalTeamData } from "./store";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function browserPush(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const ready = await Promise.race([navigator.serviceWorker.ready, wait(1500).then(() => null)]);
    if (!ready) return null;
    return await ready.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function signOutAndWipe(): Promise<void> {
  const state = useFija.getState();
  if (state.dirty) {
    await Promise.race([state.flushCloud(), wait(3000)]);
  }
  const fresh = useFija.getState();
  const codes = [fresh.club?.inviteCode, ...fresh.otherClubs.map((item) => item.bundle.club.inviteCode)].filter(
    (code): code is string => Boolean(code),
  );
  const subscription = await browserPush();
  if (subscription?.endpoint && codes.length > 0) {
    try {
      await dropPushSubscription({ data: { endpoint: subscription.endpoint, codes } });
    } catch {
      // Igual borramos la copia de este celular.
    }
  }
  try {
    await subscription?.unsubscribe();
  } catch {
    // El navegador a veces no deja desuscribir.
  }
  wipeLocalTeamData();
  await signOut();
}
