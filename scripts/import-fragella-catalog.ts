/**
 * Bulk-warm the `fragella_mirror` cache for a fixed catalog of fragrances.
 *
 * Fragella facts (verified live): every request returns at most 10 records,
 * a `search` term of ≥3 chars is mandatory (no browse mode), and the free
 * tier allows 20 requests/month. So the catalog is grouped by *line* (one
 * search per brand + line, e.g. "Rasasi Hawas" covers Kobra/Ice/Malibu) and
 * a second page is only fetched when a wanted fragrance is still missing.
 *
 * Usage:
 *   npx tsx scripts/import-fragella-catalog.ts --dry-run          # plan only, no API calls
 *   npx tsx scripts/import-fragella-catalog.ts --budget=18        # spend at most 18 requests
 *   npx tsx scripts/import-fragella-catalog.ts --reset            # forget page progress
 *
 * Safe to re-run: groups whose wanted fragrances are already in the mirror are
 * skipped (0 requests), and page progress is kept in scripts/.fragella-import-state.json
 * so an interrupted run resumes where it stopped instead of re-buying page 1.
 *
 * `@/lib/fragella-mirror` imports `server-only`, which crashes a plain script,
 * so the upsert is inlined here (same approach as scripts/seed.ts).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ilike, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { fragellaMirror } from "../src/db/schema";
import { searchFragella, type FragellaRecord } from "../src/lib/fragella";

interface Group {
  /** Brand as Fragella spells it, used to narrow the "already in mirror" check. */
  brand: string;
  /** Search term sent to Fragella. ASCII only — its ids are ASCII slugs. */
  search: string;
  /**
   * Fragrances we want from this search, spelled the way Fragella names them
   * (brand and "for men/women" may be omitted — they're ignored when matching).
   * Use `a|b` to accept either spelling when Fragella's isn't known yet.
   */
  wants: string[];
  /** Max pages to fetch while wants are still missing. Default 2. */
  maxPages?: number;
}

const PAGE_SIZE = 10; // Fragella's hard cap — `limit` above this is ignored server-side.
const DEFAULT_BUDGET = 18;
const STATE_PATH = "scripts/.fragella-import-state.json";

const CATALOG: Group[] = [
  // --- Designer ---
  // "Carolina Herrera Good Girl" returned 20 collector editions and never the original — try the bare name.
  { brand: "Carolina Herrera", search: "Good Girl", wants: ["Good Girl"] },
  { brand: "Carolina Herrera", search: "Carolina Herrera 212 Heroes", wants: ["212 Heroes Forever Young"] },
  { brand: "Coach", search: "Coach Dreams", wants: ["Dreams", "Dreams Sunset"] },
  // "Gucci Guilty" gave 20 flankers without the 2022 Parfum — search for it by full name.
  { brand: "Gucci", search: "Gucci Guilty Pour Homme Parfum", wants: ["Guilty Pour Homme Parfum"] },
  { brand: "Moschino", search: "Moschino Toy Boy", wants: ["Toy Boy"] },
  { brand: "Nautica", search: "Nautica Voyage", wants: ["Voyage Sport"] },
  {
    brand: "Valentino",
    search: "Valentino Born in Roma",
    wants: ["Uomo Born in Roma", "Uomo Born in Roma Coral Fantasy"],
  },
  { brand: "Valentino", search: "Valentino Donna", wants: ["Donna"] },
  { brand: "Versace", search: "Versace Eros", wants: ["Eros Energy"] },
  // "Yves Saint Laurent Y" gave 20 rows (EDT, Le Parfum, Eau Fraiche…) but not the 2018 EDP.
  { brand: "Yves Saint Laurent", search: "Y Eau de Parfum Yves Saint Laurent", wants: ["Y Eau de Parfum"] },
  {
    brand: "Yves Saint Laurent",
    search: "Yves Saint Laurent Libre",
    wants: ["Libre Flowers & Flames", "Libre L'Eau Nue"],
  },
  { brand: "Yves Saint Laurent", search: "Yves Saint Laurent MYSLF", wants: ["MYSLF Absolu"] },
  { brand: "Giorgio Armani", search: "Armani Stronger With You", wants: ["Emporio Armani Stronger With You"] },
  {
    brand: "Giorgio Armani",
    search: "Acqua di Gio",
    // "EDP Intense" on the list: Fragella has "Parfum" (2023); the 2024 "Eau de Parfum" may be on a later page.
    wants: ["Acqua di Gio", "Acqua di Gio Eau de Parfum|Acqua di Gio Parfum", "Acqua di Gio Profondo"],
    maxPages: 3,
  },
  { brand: "Jo Malone", search: "Jo Malone English Pear", wants: ["English Pear & Freesia"] },
  { brand: "Jo Malone", search: "Jo Malone Wild Bluebell", wants: ["Wild Bluebell"] },
  { brand: "Jo Malone", search: "Jo Malone Peony", wants: ["Peony & Blush Suede"] },
  { brand: "Lanvin", search: "Lanvin Eclat d'Arpege", wants: ["Eclat d'Arpege"] },
  { brand: "Prada", search: "Prada Paradoxe", wants: ["Paradoxe"] },
  { brand: "Prada", search: "Prada Paradigme", wants: ["Paradigme"] },
  {
    brand: "Azzaro",
    search: "Azzaro The Most Wanted",
    // Fragella lists a single "The Most Wanted Intense" (2024) — it covers both the EDT and EDP Intense on the list.
    wants: ["The Most Wanted Intense", "The Most Wanted Parfum"],
  },
  // 20 "Ralph Lauren Polo" results had Polo Blue (as "Polo Blue Edt 2") but never Black or Sport — those get their own searches.
  { brand: "Ralph Lauren", search: "Ralph Lauren Polo", wants: ["Polo Blue|Polo Blue Edt 2"] },
  { brand: "Ralph Lauren", search: "Ralph Lauren Polo Black", wants: ["Polo Black"] },
  { brand: "Ralph Lauren", search: "Ralph Lauren Polo Sport", wants: ["Polo Sport"] },
  { brand: "Ralph Lauren", search: "Ralph Lauren Ralph", wants: ["Ralph"] },
  { brand: "Ralph Lauren", search: "Ralph Lauren Romance", wants: ["Romance"] },
  { brand: "Mugler", search: "Mugler Angel Nova", wants: ["Angel Nova"] },
  { brand: "Mugler", search: "Mugler Alien", wants: ["Alien Pulp"] },
  { brand: "Xerjoff", search: "Xerjoff Kemi", wants: ["Kemi"] },
  { brand: "Xerjoff", search: "Xerjoff Holysm", wants: ["Holysm"] },
  { brand: "Xerjoff", search: "Xerjoff NeoRio", wants: ["NeoRio|Duran Duran NeoRio"] },
  { brand: "Giorgio Armani", search: "Armani Prive Bleu Lazuli", wants: ["Armani Prive Bleu Lazuli"] },
  { brand: "Giorgio Armani", search: "Armani Prive Cuir Zerzura", wants: ["Armani Prive Cuir Zerzura"] },
  // --- Niche ---
  { brand: "Nishane", search: "Nishane Wulong Cha", wants: ["Wulong Cha|Wulong Cha Extrait de Parfum"] },
  { brand: "Sospiro", search: "Sospiro", wants: ["Baso", "Vibrato"] },
  { brand: "Parfums de Marly", search: "Parfums de Marly Valaya", wants: ["Valaya", "Valaya Exclusif"] },
  // --- Middle Eastern & others ---
  { brand: "Afnan", search: "Afnan Mystique Bouquet", wants: ["Mystique Bouquet"] },
  { brand: "Afnan", search: "Afnan Turathi Blue", wants: ["Turathi Blue|Turathi Homme Blue"] },
  {
    brand: "Armaf",
    search: "Armaf Club de Nuit",
    wants: ["Club de Nuit Maleka", "Club de Nuit Intense Man", "Club de Nuit Intense Man Parfum", "Club de Nuit Women|Club de Nuit Woman"],
  },
  { brand: "French Avenue", search: "French Avenue", wants: ["Vulcan Feu", "Liquid Brun"] },
  { brand: "Lattafa", search: "Lattafa Raed", wants: ["Raed Luxe"] },
  { brand: "Lattafa", search: "Lattafa Asad", wants: ["Asad Elixir|Asad Elixir Black|Asad Black Elixir"] },
  { brand: "Lattafa", search: "Lattafa Yara", wants: ["Yara", "Yara Elixir"] },
  {
    brand: "Lattafa",
    search: "Lattafa Fakhar",
    wants: ["Fakhar Black|Fakhar", "Fakhar Gold|Fakhar Gold Extrait|Fakhar Extrait Gold", "Fakhar Rose|Fakhar Rose White|Fakhar White Rose"],
  },
  { brand: "Lattafa", search: "Lattafa Khamrah", wants: ["Khamrah", "Khamrah Dukhan", "Khamrah Qahwa"] },
  { brand: "Mykonos", search: "Mykonos Milk Drops", wants: ["Milk Drops|Milk Drops Extrait de Parfum"] },
  { brand: "Rasasi", search: "Rasasi Hawas", wants: ["Hawas Kobra", "Hawas Ice", "Hawas Malibu"] },
  {
    brand: "Rayhaan",
    search: "Rayhaan",
    wants: ["Tera", "Pacific Aura", "Lion", "Wolf", "Aquatica", "Obsidian", "Floriana", "Ayka"],
    maxPages: 3,
  },
];

// ---------- matching ----------

/** Filler words that appear inconsistently in Fragella names. */
const NOISE = new Set(["for", "men", "women", "unisex", "the", "and", "de", "d", "l"]);

function ascii(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Distinguishing words of a fragrance name: brand phrases removed, filler and
 * years dropped. "Libre Flowers & Flames Yves Saint Laurent" → libre flowers flames.
 */
function nameKey(value: string, brands: string[]) {
  let text = ascii(value);
  for (const brand of brands) text = text.split(ascii(brand)).join(" ");
  return text
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 0 && !NOISE.has(t) && !/^(19|20)\d\d$/.test(t))
    .sort()
    .join(" ");
}

/** A want matches a record when the two names agree word-for-word once brand/filler are ignored. */
function matches(want: string, record: { brand: string; name: string }, groupBrand: string) {
  const brands = [record.brand, groupBrand];
  const key = nameKey(record.name, brands);
  return want.split("|").some((alt) => nameKey(alt, brands) === key);
}

// ---------- state ----------

interface GroupState {
  pagesFetched: number;
  /** True once the last fetched page came back short — nothing more to fetch. */
  exhausted: boolean;
}
type State = Record<string, GroupState>;

function loadState(): State {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as State;
  } catch {
    return {};
  }
}

function saveState(state: State) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

// ---------- db ----------

async function mirrorRowsForBrand(brand: string) {
  return db()
    .select({ brand: fragellaMirror.brand, name: fragellaMirror.name })
    .from(fragellaMirror)
    .where(ilike(fragellaMirror.searchName, `%${ascii(brand).split(" ")[0]}%`));
}

/** Same write as upsertFragellaMirrorRow in @/lib/fragella-mirror, as a single upsert. */
async function upsertMirror(record: FragellaRecord) {
  if (!record.id || !record.name || !record.brand) return false;
  const now = new Date();
  await db()
    .insert(fragellaMirror)
    .values({
      id: record.id,
      name: record.name,
      brand: record.brand,
      year: record.year ?? null,
      gender: record.gender ?? null,
      imageUrl: record.imageUrl ?? null,
      searchName: `${record.brand} ${record.name}`.toLowerCase(),
      payload: record.raw,
      requestCount: 1,
      lastFetchedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: fragellaMirror.id,
      set: {
        name: record.name,
        brand: record.brand,
        year: record.year ?? null,
        gender: record.gender ?? null,
        imageUrl: record.imageUrl ?? null,
        searchName: `${record.brand} ${record.name}`.toLowerCase(),
        payload: record.raw,
        requestCount: sql`${fragellaMirror.requestCount} + 1`,
        lastFetchedAt: now,
        updatedAt: now,
      },
    });
  return true;
}

// ---------- main ----------

function parseArgs() {
  const args = process.argv.slice(2);
  const budgetArg = args.find((a) => a.startsWith("--budget="));
  return {
    dryRun: args.includes("--dry-run"),
    reset: args.includes("--reset"),
    budget: budgetArg ? Number(budgetArg.slice("--budget=".length)) : DEFAULT_BUDGET,
  };
}

async function main() {
  const { dryRun, reset, budget } = parseArgs();
  if (!Number.isInteger(budget) || budget < 0) throw new Error(`Bad --budget: ${budget}`);
  const state: State = reset ? {} : loadState();

  let spent = 0;
  let stored = 0;
  let plannedMin = 0;
  let plannedMax = 0;
  const stillMissing: string[] = [];
  let stopReason: "budget" | "quota" | null = null;

  for (const group of CATALOG) {
    const maxPages = group.maxPages ?? 2;
    const gs = state[group.search] ?? { pagesFetched: 0, exhausted: false };

    // Already have everything we wanted from this line? Skip — costs nothing.
    const existing = await mirrorRowsForBrand(group.brand);
    let missing = group.wants.filter((w) => !existing.some((r) => matches(w, r, group.brand)));
    if (missing.length === 0) {
      console.log(`✓ skip   ${group.search} — all ${group.wants.length} already in mirror`);
      continue;
    }
    if (gs.exhausted || gs.pagesFetched >= maxPages) {
      console.log(`✗ done   ${group.search} — searched ${gs.pagesFetched} page(s), still missing: ${missing.join(", ")}`);
      stillMissing.push(...missing.map((m) => `${group.brand} ${m}`));
      continue;
    }

    if (dryRun) {
      const pagesLeft = maxPages - gs.pagesFetched;
      plannedMin += 1;
      plannedMax += pagesLeft;
      const from = gs.pagesFetched > 0 ? ` (from page ${gs.pagesFetched + 1})` : "";
      console.log(`· plan   ${group.search} — 1${pagesLeft > 1 ? `–${pagesLeft}` : ""} request(s)${from} for: ${missing.join(", ")}`);
      continue;
    }

    while (missing.length > 0 && !gs.exhausted && gs.pagesFetched < maxPages) {
      if (spent >= budget) {
        stopReason = "budget";
        break;
      }
      const page = gs.pagesFetched + 1;
      let records: FragellaRecord[];
      try {
        records = await searchFragella(group.search, { limit: PAGE_SIZE, page });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Fragella 429")) {
          stopReason = "quota";
          break;
        }
        // Anything else (auth, network) would repeat for every group — stop rather than burn retries.
        console.error(`! error  ${group.search} p${page}: ${message}`);
        saveState(state);
        throw error;
      }
      spent += 1;
      gs.pagesFetched = page;
      gs.exhausted = records.length < PAGE_SIZE;
      state[group.search] = gs;
      saveState(state);

      for (const record of records) {
        if (await upsertMirror(record)) stored += 1;
      }
      const found = missing.filter((w) => records.some((r) => matches(w, r, group.brand)));
      missing = missing.filter((w) => !found.includes(w));
      console.log(
        `→ p${page}     ${group.search} — ${records.length} rows stored` +
          (found.length ? `, found: ${found.join(", ")}` : "") +
          (missing.length ? ` (still missing: ${missing.join(", ")})` : ""),
      );
    }
    if (stopReason) {
      console.log(`■ stop   ${group.search} — ${stopReason === "budget" ? `budget of ${budget} reached` : "Fragella monthly quota exhausted"}, resume later`);
      break;
    }
    if (missing.length > 0) stillMissing.push(...missing.map((m) => `${group.brand} ${m}`));
  }

  console.log("");
  if (dryRun) {
    console.log(`Dry run: ${plannedMin}–${plannedMax} requests needed (${plannedMin} first pages, up to ${plannedMax - plannedMin} extra pages). Budget per run: ${budget}.`);
  } else {
    console.log(`Spent ${spent}/${budget} requests, stored/refreshed ${stored} mirror rows.`);
    if (stopReason) console.log("Stopped early — re-run next period to continue where this left off.");
  }
  if (stillMissing.length > 0) {
    console.log(`Not found by Fragella under those names (${stillMissing.length}):\n  - ${stillMissing.join("\n  - ")}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
