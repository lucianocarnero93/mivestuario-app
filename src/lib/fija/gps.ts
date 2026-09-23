export type GpsPermission = "unknown" | "prompt" | "granted" | "denied" | "unavailable";

export type GpsFix = {
  lat: number;
  lng: number;
  accuracy: number;
};

export async function queryGpsPermission(): Promise<GpsPermission> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unavailable";
  const permissions = navigator.permissions;
  if (!permissions?.query) return "unknown";
  try {
    const status = await permissions.query({ name: "geolocation" as PermissionName });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

export function readGpsFix(): Promise<GpsFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Tu celular no da ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error("denied"));
        else if (err.code === err.TIMEOUT) reject(new Error("No llegamos a leer el GPS. Probá de nuevo."));
        else reject(new Error("No se pudo leer la ubicación."));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    );
  });
}

export function mapsQueryFromFix(fix: GpsFix): string {
  return `${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)}`;
}
