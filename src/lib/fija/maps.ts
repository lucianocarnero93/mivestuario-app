export type PlaceRef = {
  place: string;
  mapsQuery?: string;
  lat?: number | null;
  lng?: number | null;
};

export function parseMapsInput(raw: string): {
  mapsQuery: string;
  lat: number | null;
  lng: number | null;
} {
  const t = raw.trim();
  if (!t) return { mapsQuery: "", lat: null, lng: null };

  const at = t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    return { mapsQuery: t, lat: Number(at[1]), lng: Number(at[2]) };
  }

  const pair = t.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (pair) {
    return { mapsQuery: t, lat: Number(pair[1]), lng: Number(pair[2]) };
  }

  try {
    const url = new URL(t);
    const q = url.searchParams.get("q") ?? url.searchParams.get("query") ?? url.searchParams.get("daddr");
    if (q) {
      const inner = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (inner) return { mapsQuery: q, lat: Number(inner[1]), lng: Number(inner[2]) };
      return { mapsQuery: q, lat: null, lng: null };
    }
  } catch {
    /* not a URL */
  }

  return { mapsQuery: t, lat: null, lng: null };
}

export function mapsSearchQuery(place: PlaceRef): string {
  return (place.mapsQuery || place.place).trim();
}

export function hasMapsTarget(place: PlaceRef): boolean {
  const q = mapsSearchQuery(place);
  if (place.lat != null && place.lng != null) return true;
  return Boolean(q) && !/^a confirmar$/i.test(q);
}

export function mapsHref(place: PlaceRef): string {
  if (!hasMapsTarget(place)) return "";
  const query = mapsSearchQuery(place);
  const encoded = encodeURIComponent(query);
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios = /iPad|iPhone|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const lat = place.lat;
  const lng = place.lng;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  if (hasCoords) {
    const label = encoded || `${lat},${lng}`;
    if (ios) return `https://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
    if (android) return `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  if (ios) return `https://maps.apple.com/?q=${encoded}`;
  if (android) return `geo:0,0?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
