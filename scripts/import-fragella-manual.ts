/**
 * Hand-enter fragrances into `fragella_mirror` that Fragella's API doesn't
 * have (too new, too small a brand, or quota exhausted) but that were looked
 * up manually on Fragrantica.
 *
 * Input is a JSON array matching scripts/manual-fragrances.example.json:
 *   [{ id?, name, brand, year?, gender?, notes?: {top,middle,base}, accords?, perfumers?, sourceUrl? }]
 *
 * `id` is optional — omit it and one is derived as "<brand>-<name>-manual".
 * Provide it explicitly only to control the slug or to intentionally update
 * a row created by an earlier run.
 *
 * Usage:
 *   npx tsx scripts/import-fragella-manual.ts path/to/fragrances.json
 *   npx tsx scripts/import-fragella-manual.ts                # defaults to scripts/manual-fragrances.json
 *
 * Stores only structured facts (name/brand/year/gender/notes/accords/perfumers)
 * plus the source URL for traceability — never Fragrantica's marketing prose
 * or product photography (imageUrl is left null; not ours to hotlink).
 *
 * The `-manual` id suffix is intentional: if Fragella later indexes the same
 * fragrance, a future `fragella:import` run creates a *separate* row under
 * Fragella's own id (upsert matches by id, and a manual id will never equal
 * a real Fragella one). Delete the `-manual` row by hand once that happens.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { db } from "../src/db/client";
import { fragellaMirror } from "../src/db/schema";

interface ManualEntry {
  id?: string;
  name: string;
  brand: string;
  year?: number;
  gender?: string;
  notes?: { top?: string[]; middle?: string[]; base?: string[] };
  accords?: string[];
  perfumers?: string[];
  sourceUrl?: string;
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveId(entry: ManualEntry) {
  if (entry.id) return entry.id.endsWith("-manual") ? entry.id : `${entry.id}-manual`;
  return `${slug(entry.brand)}-${slug(entry.name)}-manual`;
}

async function main() {
  const path = process.argv[2] ?? "scripts/manual-fragrances.json";
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`Can't read ${path}. Pass a path, or create it (see scripts/manual-fragrances.example.json for the shape).`);
  }
  const entries = JSON.parse(raw) as ManualEntry[];
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${path} must be a non-empty JSON array.`);
  }

  let stored = 0;
  for (const entry of entries) {
    if (!entry.name || !entry.brand) {
      console.warn(`! skip   missing name/brand: ${JSON.stringify(entry)}`);
      continue;
    }
    const id = deriveId(entry);
    const searchName = `${entry.brand} ${entry.name}`.toLowerCase();
    const payload = {
      Name: entry.name,
      Brand: entry.brand,
      Year: entry.year !== undefined ? String(entry.year) : undefined,
      Gender: entry.gender,
      Notes: entry.notes
        ? { Top: entry.notes.top ?? [], Middle: entry.notes.middle ?? [], Base: entry.notes.base ?? [] }
        : undefined,
      "Main Accords": entry.accords,
      Perfumers: entry.perfumers,
      _source: "fragrantica-manual",
      _sourceUrl: entry.sourceUrl,
      _note: "Hand-entered via scripts/import-fragella-manual.ts — not (yet) in Fragella's own database.",
    };
    const now = new Date();
    await db()
      .insert(fragellaMirror)
      .values({
        id,
        name: entry.name,
        brand: entry.brand,
        year: entry.year ?? null,
        gender: entry.gender ?? null,
        imageUrl: null,
        searchName,
        payload,
        requestCount: 0,
        lastFetchedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: fragellaMirror.id,
        set: {
          name: entry.name,
          brand: entry.brand,
          year: entry.year ?? null,
          gender: entry.gender ?? null,
          searchName,
          payload,
          updatedAt: now,
        },
      });
    stored += 1;
    console.log(`✓ ${entry.brand} — ${entry.name} → ${id}`);
  }

  console.log(`\nStored/updated ${stored} of ${entries.length} manual entries.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
