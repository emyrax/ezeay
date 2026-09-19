export interface Bounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
  bounds?: Bounds;
}

export interface UniversitySuggestion {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  university?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  boundingbox: [string, string, string, string];
  address?: NominatimAddress;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

async function nominatimFetch<T>(path: "search" | "reverse", params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "en",
    ...params,
  }).toString();
  const res = await fetch(`${NOMINATIM_BASE}/${path}?${qs}`, {
    signal,
    headers: { "User-Agent": "Yuinx/1.0 (learning companion)" },
  });
  if (!res.ok) throw new Error(`Location service error (${res.status})`);
  return (await res.json()) as T;
}

function toBounds(boundingbox: [string, string, string, string] | undefined): Bounds | undefined {
  if (!boundingbox) return undefined;
  const [south, north, west, east] = boundingbox.map(Number);
  if ([south, north, west, east].some((v) => Number.isNaN(v))) return undefined;
  return { south, north, west, east };
}

const KM_PER_DEG_LAT = 111.0;

export function expandBoundsForSearch(bounds: Bounds | undefined, lat: number, lng: number, minRadiusKm = 20): Bounds {
  const halfLat = minRadiusKm / KM_PER_DEG_LAT;
  const cosLat = Math.max(0.05, Math.cos(lat * (Math.PI / 180)));
  const halfLng = minRadiusKm / (KM_PER_DEG_LAT * cosLat);
  const north = Math.min(90, Math.max(-90, Math.max(bounds?.north ?? -Infinity, lat + halfLat)));
  const south = Math.max(-90, Math.min(90, Math.min(bounds?.south ?? Infinity, lat - halfLat)));
  const east = Math.min(180, Math.max(-180, Math.max(bounds?.east ?? -Infinity, lng + halfLng)));
  const west = Math.max(-180, Math.min(180, Math.min(bounds?.west ?? Infinity, lng - halfLng)));
  return { south, north, west, east };
}

function labelFromAddress(address: NominatimAddress | undefined, displayName: string): string {
  const parts = [
    address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.county,
    address?.state,
    address?.country,
  ]
    .map((p) => p?.trim())
    .filter((p, i, arr) => p && arr.indexOf(p) === i);
  return parts.length > 0 ? parts.join(", ") : displayName;
}

export async function searchPlaces(query: string, limit = 6, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const data = await nominatimFetch<NominatimResult[]>(
    "search",
    { q: query, limit: String(limit) },
    signal,
  );
  return data.map((r) => ({
    label: labelFromAddress(r.address, r.display_name),
    lat: Number(r.lat),
    lng: Number(r.lon),
    bounds: toBounds(r.boundingbox),
  }));
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<PlaceSuggestion> {
  const r = await nominatimFetch<NominatimResult>(
    "reverse",
    { lat: String(lat), lon: String(lng) },
    signal,
  );
  return {
    label: labelFromAddress(r.address, r.display_name),
    lat: Number(r.lat),
    lng: Number(r.lon),
    bounds: toBounds(r.boundingbox),
  };
}

const UNIVERSITY_LIKE = /university|college|institute|polytechnic|academy|campus|school/i;

export async function searchUniversities(
  opts: { query?: string; bounds?: Bounds; limit?: number; signal?: AbortSignal },
): Promise<UniversitySuggestion[]> {
  const { query, bounds, limit = 12, signal } = opts;
  const params: Record<string, string> = { limit: String(limit) };
  if (bounds) {
    params.viewbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    params.bounded = "1";
  }
  params.q = query?.trim() ? query.trim() : "university";
  const data = await nominatimFetch<NominatimResult[]>("search", params, signal);
  const mapped = data.map((r) => {
    const name = r.address?.university ?? r.display_name.split(",")[0].trim();
    return {
      name,
      city: r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.county ?? "",
      country: r.address?.country ?? "",
      lat: Number(r.lat),
      lng: Number(r.lon),
    };
  });
  const keep = mapped.filter((u) => UNIVERSITY_LIKE.test(u.name));
  const results = keep.length > 0 ? keep : mapped;
  const seen = new Set<string>();
  return results.filter((u) => {
    const key = u.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}