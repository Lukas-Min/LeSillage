import { getEnv } from "./env";

const DEFAULT_BASE = "https://api.fragella.com/api/v1";

export interface FragellaNote {
  name: string;
  description?: string | null;
  occurrence?: number | null;
}

export interface FragellaAccord {
  name: string;
  strength?: number;
  color?: string | null;
}

export type FragellaAccordInput = {
  name: string;
  strength?: number | null;
  color?: string | null;
};

export interface FragellaBreakoutEntry {
  label: string;
  count: number;
}

export interface FragellaRecord {
  id: string;
  name: string;
  brand: string;
  year?: number | null;
  gender?: string | null;
  perfumers?: string[];
  description?: string | null;
  notes?: { top: string[]; middle: string[]; base: string[] };
  accords?: FragellaAccord[];
  longevity?: string | null;
  sillage?: string | null;
  priceValue?: string | null;
  longevityBreakout?: Record<string, number>;
  sillageBreakout?: Record<string, number>;
  priceValueBreakout?: Record<string, number>;
  seasonBreakout?: Record<string, number>;
  genderBreakout?: Record<string, number>;
  relationBreakout?: Record<string, number>;
  ratingValue?: number | null;
  ratingCount?: number | null;
  reviewsCount?: number | null;
  imageUrl?: string | null;
  popularityTier?: string | null;
  raw: Record<string, unknown>;
}

export interface FragellaUsage {
  periodStart?: string;
  periodEnd?: string;
  requestLimit?: number;
  requestsUsed?: number;
  remaining?: number;
  plan?: string;
  raw: Record<string, unknown>;
}

function baseUrl() {
  const env = getEnv();
  return (env.FRAGELLA_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
}

function apiKey() {
  const env = getEnv();
  if (!env.FRAGELLA_API_KEY) {
    throw new Error("FRAGELLA_API_KEY is not set in the environment");
  }
  return env.FRAGELLA_API_KEY;
}

const memoryCache = new Map<string, { value: unknown; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) {
    return hit.value as T;
  }
  const value = await loader();
  memoryCache.set(key, { value, cachedAt: Date.now() });
  return value;
}

async function fragellaFetch<T>(
  path: string,
  search: Record<string, string | number | undefined>,
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const url = `${baseUrl()}${path}${params.size > 0 ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: {
      "x-api-key": apiKey(),
      Accept: "application/json",
      "User-Agent": "Le-Sillage/1.0 (+https://le-sillage.vercel.app)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fragella ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "Name" in value) {
    const name = (value as { Name?: unknown }).Name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function asAccordList(value: unknown): FragellaAccord[] {
  if (!Array.isArray(value)) return [];
  const items: FragellaAccord[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = asString(record.name ?? record.Name);
    if (!name) continue;
    const strengthRaw =
      typeof record.strength === "number"
        ? record.strength
        : typeof record.Strength === "number"
          ? record.Strength
          : typeof record.Percentage === "number"
            ? record.Percentage
            : undefined;
    const colorValue =
      typeof record.color === "string"
        ? record.color
        : typeof record.Color === "string"
          ? record.Color
          : null;
    items.push({ name, strength: strengthRaw, color: colorValue });
  }
  return items;
}

function asNoteList(value: unknown): string[] {
  return asStringList(value);
}

function asBreakout(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number") out[key] = raw;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function firstNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  return null;
}

function normalize(raw: Record<string, unknown>): FragellaRecord {
  const notes = (raw.notes ?? raw.Notes) as Record<string, unknown> | undefined;
  const normalizedNotes = notes
    ? {
        top: asNoteList(notes.top ?? notes.Top),
        middle: asNoteList(notes.middle ?? notes.Middle),
        base: asNoteList(notes.base ?? notes.Base),
      }
    : undefined;
  const name = asString(raw.Name ?? raw.name) ?? "Untitled";
  const brand = asString(raw.Brand ?? raw.brand) ?? "";
  const idRaw = raw.id ?? raw.Id ?? raw.uuid ?? raw.UUID;
  const id = typeof idRaw === "string" ? idRaw : `${brand}::${name}`;
  const yearRaw = raw.Year ?? raw.year;
  const year = typeof yearRaw === "number" ? yearRaw : null;
  return {
    id,
    name,
    brand,
    year,
    gender: asString(raw.Gender ?? raw.gender),
    perfumers: asStringList(raw.Perfumers ?? raw.perfumers),
    description: asString(raw.Description ?? raw.description),
    notes: normalizedNotes,
    accords: asAccordList(raw.MainAccords ?? raw.accords ?? raw.Accords),
    longevity: asString(raw.Longevity ?? raw.longevity),
    sillage: asString(raw.Sillage ?? raw.sillage),
    priceValue: asString(raw.PriceValue ?? raw.priceValue),
    longevityBreakout: asBreakout(raw.LongevityBreakout ?? raw.longevityBreakout),
    sillageBreakout: asBreakout(raw.SillageBreakout ?? raw.sillageBreakout),
    priceValueBreakout: asBreakout(raw.PriceValueBreakout ?? raw.priceValueBreakout),
    seasonBreakout: asBreakout(raw.SeasonBreakout ?? raw.seasonBreakout),
    genderBreakout: asBreakout(raw.GenderBreakout ?? raw.genderBreakout),
    relationBreakout: asBreakout(raw.RelationBreakout ?? raw.relationBreakout),
    ratingValue: firstNumber(raw.RatingValue ?? raw.ratingValue ?? raw.rating_value),
    ratingCount: firstNumber(raw.RatingCount ?? raw.ratingCount),
    reviewsCount: firstNumber(raw.ReviewsCount ?? raw.reviewsCount),
    imageUrl: asString(raw.ImageURL ?? raw.imageUrl ?? raw.image_url ?? raw.Image),
    popularityTier: asString(raw.Popularity ?? raw.popularity),
    raw,
  };
}

export async function searchFragella(
  query: string,
  options: { limit?: number; page?: number } = {},
): Promise<FragellaRecord[]> {
  const term = query.trim();
  if (term.length < 3) return [];
  const limit = Math.min(10, options.limit ?? 5);
  return cached(`search:${term}:${limit}:${options.page ?? 1}`, async () => {
    const data = await fragellaFetch<unknown>("/fragrances", {
      search: term,
      limit,
      page: options.page,
    });
    return extractRecords(data);
  });
}

export async function lookupFragella(query: string): Promise<FragellaRecord | null> {
  const records = await searchFragella(query, { limit: 1 });
  return records[0] ?? null;
}

export async function getFragellaUsage(): Promise<FragellaUsage> {
  return cached("usage", async () => {
    const data = await fragellaFetch<Record<string, unknown>>("/usage", {});
    const current = (data.current_period as Record<string, unknown> | undefined) ?? {};
    const limit = (current.request_limit as number | undefined) ?? null;
    const used = (current.requests_used as number | undefined) ?? null;
return {
    periodStart: typeof current.period_start === "string" ? current.period_start : undefined,
    periodEnd: typeof current.period_end === "string" ? current.period_end : undefined,
    requestLimit: limit ?? undefined,
    requestsUsed: used ?? undefined,
    remaining: limit !== null && used !== null ? Math.max(0, limit - used) : undefined,
    plan: typeof current.plan === "string" ? current.plan : undefined,
    raw: data,
  } satisfies FragellaUsage;
  });
}

function extractRecords(data: unknown): FragellaRecord[] {
  if (!data) return [];
  const list: unknown[] = Array.isArray(data)
    ? (data as unknown[])
    : Array.isArray((data as { results?: unknown[] }).results)
      ? ((data as { results: unknown[] }).results)
      : Array.isArray((data as { data?: unknown[] }).data)
        ? ((data as { data: unknown[] }).data)
        : [];
  return list
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => normalize(entry));
}

export function buildFragellaQuery(record: { brand: string; name: string }) {
  return `${record.brand} ${record.name}`.trim();
}