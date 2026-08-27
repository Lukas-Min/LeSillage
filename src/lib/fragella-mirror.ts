import "server-only";
import { and, asc, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { fragellaMirror, type FragellaMirrorEntry } from "@/db/schema";
import { lookupFragella, searchFragella, type FragellaRecord } from "@/lib/fragella";

export interface MirrorSearchHit {
  id: string;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  imageUrl: string | null;
  lastFetchedAt: Date;
}

function deriveId(record: FragellaRecord) {
  return record.id;
}

function deriveSearchTerm(query: string) {
  return query.trim().toLowerCase();
}

function entryToHit(entry: FragellaMirrorEntry): MirrorSearchHit {
  return {
    id: entry.id,
    name: entry.name,
    brand: entry.brand,
    year: entry.year,
    gender: entry.gender,
    imageUrl: entry.imageUrl,
    lastFetchedAt: entry.lastFetchedAt,
  };
}

export async function searchFragellaMirror(
  query: string,
  options: { limit?: number } = {},
): Promise<{ hits: MirrorSearchHit[]; filledFromFragella: number }> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { hits: [], filledFromFragella: 0 };
  const limit = Math.min(20, options.limit ?? 10);
  const needle = `%${trimmed.toLowerCase().replace(/%/g, "\\%")}%`;
  const rows = await db()
    .select()
    .from(fragellaMirror)
    .where(
      and(
        or(
          ilike(fragellaMirror.name, needle),
          ilike(fragellaMirror.brand, needle),
          ilike(fragellaMirror.searchName, needle),
        ),
      ),
    )
    .orderBy(asc(fragellaMirror.name))
    .limit(limit);
  if (rows.length > 0) {
    return { hits: rows.map(entryToHit), filledFromFragella: 0 };
  }
  // Mirror empty — fall back to Fragella and warm the mirror with the result.
  const records = await searchFragella(trimmed, { limit });
  if (records.length === 0) {
    return { hits: [], filledFromFragella: 0 };
  }
  let filled = 0;
  for (const record of records) {
    const stored = await upsertFragellaMirrorRow(record);
    if (stored) filled += 1;
  }
  const freshRows = await db()
    .select()
    .from(fragellaMirror)
    .where(
      or(
        ilike(fragellaMirror.name, needle),
        ilike(fragellaMirror.brand, needle),
        ilike(fragellaMirror.searchName, needle),
      ),
    )
    .orderBy(asc(fragellaMirror.name))
    .limit(limit);
  return { hits: freshRows.map(entryToHit), filledFromFragella: filled };
}

export async function getFragellaMirrorEntry(id: string): Promise<FragellaMirrorEntry | null> {
  const rows = await db()
    .select()
    .from(fragellaMirror)
    .where(eq(fragellaMirror.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertFragellaMirrorRow(record: FragellaRecord): Promise<FragellaMirrorEntry | null> {
  if (!record.id || !record.name || !record.brand) return null;
  const id = deriveId(record);
  const searchName = `${record.brand} ${record.name}`.toLowerCase();
  const existing = await getFragellaMirrorEntry(id);
  const now = new Date();
  if (!existing) {
    const inserted = await db()
      .insert(fragellaMirror)
      .values({
        id,
        name: record.name,
        brand: record.brand,
        year: record.year ?? null,
        gender: record.gender ?? null,
        imageUrl: record.imageUrl ?? null,
        searchName,
        payload: record.raw,
        requestCount: 1,
        lastFetchedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return inserted[0] ?? null;
  }
  const updated = await db()
    .update(fragellaMirror)
    .set({
      name: record.name,
      brand: record.brand,
      year: record.year ?? null,
      gender: record.gender ?? null,
      imageUrl: record.imageUrl ?? null,
      searchName,
      payload: record.raw,
      requestCount: existing.requestCount + 1,
      lastFetchedAt: now,
      updatedAt: now,
    })
    .where(eq(fragellaMirror.id, id))
    .returning();
  return updated[0] ?? null;
}

export async function refreshFragellaMirrorStaleRows(budget: number): Promise<{
  refreshed: number;
  checked: number;
  failed: number;
}> {
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const candidates = await db()
    .select()
    .from(fragellaMirror)
    .where(lt(fragellaMirror.lastFetchedAt, cutoff))
    .orderBy(asc(fragellaMirror.lastFetchedAt))
    .limit(budget);
  let refreshed = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      const records = await searchFragella(`${candidate.brand} ${candidate.name}`, { limit: 1 });
      const record = records[0];
      if (!record) continue;
      await upsertFragellaMirrorRow(record);
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }
  return { refreshed, checked: candidates.length, failed };
}

export async function listRecentFragellaMirrorEntries(limit = 20): Promise<MirrorSearchHit[]> {
  const rows = await db()
    .select()
    .from(fragellaMirror)
    .orderBy(desc(fragellaMirror.lastFetchedAt))
    .limit(limit);
  return rows.map(entryToHit);
}

export async function countFragellaMirror(): Promise<number> {
  const row = await db()
    .select({ value: sql<number>`count(*)::int` })
    .from(fragellaMirror);
  return Number(row[0]?.value ?? 0);
}

export async function ensureFragellaRecordByName(
  query: string,
): Promise<FragellaMirrorEntry | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;
  const records = await searchFragella(trimmed, { limit: 1 });
  const record = records[0];
  if (!record) return null;
  return upsertFragellaMirrorRow(record);
}

export async function findFragellaMirrorEntryByQuery(
  query: string,
): Promise<FragellaMirrorEntry | null> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;
  const candidates = await db()
    .select()
    .from(fragellaMirror)
    .where(
      or(
        eq(fragellaMirror.id, trimmed),
        and(
          ilike(fragellaMirror.name, trimmed),
          ilike(fragellaMirror.brand, trimmed),
        ),
      ),
    )
    .limit(1);
  if (candidates[0]) return candidates[0];
  return ensureFragellaRecordByName(trimmed);
}

// Re-export for consumers that want to map payload -> record shape.
export { lookupFragella };