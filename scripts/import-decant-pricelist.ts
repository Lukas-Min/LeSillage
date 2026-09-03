/**
 * One-time load of the "Le Sillage Pricelist - Decants" (as of 2026-08-09)
 * into `product`/`sku`. SKU retail prices are taken verbatim from that
 * pricelist — they are NOT derived from the product-level pricing formula
 * (product.costPrice/pricingMode/pricingInput), because the real pricing
 * isn't linear: 5ml sells at exactly the raw per-ml rate off the reference
 * spreadsheet's Discounted Full Bottle Price, but 3ml/10ml/30ml carry
 * roughly a 30% markup over that same rate. The single reference price ÷
 * size × size formula (src/domain/pricing.ts computeSkuRetailPrice) cannot
 * reproduce that in one shot, so exact prices are written directly per SKU
 * (pricingMode "DIRECT") instead of relying on the cascade.
 *
 * Product-level costPrice/pricingMode/pricingInput/sourceMl below use each
 * fragrance's Base Full Bottle Price (not Discounted — Base is the correct
 * cost-basis reference per the user) purely for cost/margin bookkeeping;
 * they do not feed the SKU prices above.
 *
 * IMPORTANT — known limitation: `resyncSkuPricesForProduct` (called by the
 * admin product edit form on every save, see src/actions/admin-catalog-actions.ts)
 * overwrites every SKU's retailPrice from the product's reference formula.
 * Since Base Full Bottle Price = Discounted price × 13/10 on every row, and
 * 3ml/10ml/30ml already carry ~30% over the Discounted-based raw rate, a
 * Base-based linear resync happens to land within rounding of the correct
 * 3ml/10ml/30ml prices — but 5ml (which carries zero markup) would jump
 * ~30% too high. If this product is ever re-saved via the admin UI, check
 * the 5ml price and correct it by hand afterward (re-running this script
 * also fixes it).
 *
 * Usage: npx tsx scripts/import-decant-pricelist.ts
 * Safe to re-run: upserts by deterministic sku code, does not duplicate.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { products, skus, productImages, fragellaMirror } from "../src/db/schema";
import type { Concentration, FragranceCategory } from "../src/db/schema";
import { normalize } from "../src/lib/fragella";

type Gender = "male" | "female" | "unisex";

interface DecantEntry {
  brand: string;
  name: string;
  concentration: Concentration;
  category: FragranceCategory;
  gender: Gender;
  /** ml, 3/5/10/30 prices in PHP (not centavos — converted below) */
  prices: { 3: number; 5: number; 10: number; 30: number };
  /** From the reference formula spreadsheet — full bottle size and its
   *  Base Full Bottle Price in PHP (not the Discounted price — per the
   *  user, Base is the correct cost-basis reference), used only for
   *  cost-basis bookkeeping (see file header). Does not affect the actual
   *  SKU retail prices, which come from `prices` above regardless. Omit
   *  when the spreadsheet has no row for this fragrance. */
  fullBottle?: { sizeMl: number; basePricePhp: number };
  /** Set when fullBottle is a guess, not from the spreadsheet. */
  costBasisEstimated?: boolean;
  /** id in fragella_mirror to pull notes/accords/image from, when a
   *  confident unambiguous match exists. Left unset when the brand has many
   *  same-named flankers and picking wrong would show the wrong fragrance. */
  fragellaMirrorId?: string;
}

// Prices are the pricelist's own numbers (source of truth for what customers
// pay). fullBottle figures are cross-checked against the formula spreadsheet
// and matched on every row except Nishane (see NISHANE NOTE below).
const CATALOG: DecantEntry[] = [
  // --- Designer ---
  {
    brand: "Carolina Herrera", name: "Good Girl", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    prices: { 3: 270, 5: 345, 10: 895, 30: 2680 },
    fullBottle: { sizeMl: 80, basePricePhp: 7150 },
    fragellaMirrorId: "carolina-herrera-good-girl-manual",
  },
  {
    brand: "Coach", name: "Dreams", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    prices: { 3: 135, 5: 170, 10: 450, 30: 1345 },
    fullBottle: { sizeMl: 90, basePricePhp: 4030 },
    fragellaMirrorId: "Coach::Coach Dreams",
  },
  {
    brand: "Coach", name: "Dreams Sunset", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    prices: { 3: 135, 5: 170, 10: 450, 30: 1345 },
    fullBottle: { sizeMl: 90, basePricePhp: 4030 },
    fragellaMirrorId: "Coach::Coach Dreams Sunset",
  },
  {
    // Confirmed by the user: "Guilty Pour Homme Parfum" (2022), fragrance id 71378.
    brand: "Gucci", name: "Guilty Pour Homme Parfum", concentration: "PARFUM", category: "DESIGNER", gender: "male",
    prices: { 3: 120, 5: 155, 10: 405, 30: 1215 },
    fullBottle: { sizeMl: 90, basePricePhp: 3640 },
    fragellaMirrorId: "gucci-guilty-pour-homme-parfum-manual",
  },
  {
    brand: "Moschino", name: "Toy Boy", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "male",
    prices: { 3: 115, 5: 145, 10: 375, 30: 1130 },
    fullBottle: { sizeMl: 100, basePricePhp: 3770 },
    fragellaMirrorId: "Moschino::Moschino Toy Boy",
  },
  {
    brand: "Nautica", name: "Voyage Sport", concentration: "EAU_DE_TOILETTE", category: "DESIGNER", gender: "male",
    prices: { 3: 55, 5: 70, 10: 180, 30: 545 },
    fullBottle: { sizeMl: 100, basePricePhp: 1820 },
    fragellaMirrorId: "Nautica::Nautica Voyage Sport",
  },
  {
    brand: "Valentino", name: "Uomo Born In Roma Coral Fantasy", concentration: "EAU_DE_TOILETTE", category: "DESIGNER", gender: "male",
    prices: { 3: 200, 5: 255, 10: 665, 30: 1990 },
    fullBottle: { sizeMl: 100, basePricePhp: 6630 },
    fragellaMirrorId: "Valentino::Valentino Uomo Born In Roma Coral Fantasy",
  },
  {
    brand: "Versace", name: "Eros Energy", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "male",
    prices: { 3: 135, 5: 175, 10: 455, 30: 1365 },
    fullBottle: { sizeMl: 100, basePricePhp: 4550 },
    fragellaMirrorId: "Gianni Versace::Versace Eros Energy",
  },
  {
    // Pricelist said "YSL Y EDP" — Fragrantica's exact title for the EDP
    // concentration is "Y Eau de Parfum" (2018), distinct from "Y" (1964,
    // discontinued vintage) and "Y Eau de Toilette"/"Y Le Parfum" flankers.
    brand: "Yves Saint Laurent", name: "Y Eau de Parfum", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "male",
    prices: { 3: 215, 5: 275, 10: 715, 30: 2145 },
    fullBottle: { sizeMl: 100, basePricePhp: 7150 },
    fragellaMirrorId: "yves-saint-laurent-y-eau-de-parfum-manual",
  },
  {
    // Not in the formula spreadsheet at all — sizeMl/base price below are a
    // guess (100ml; base back-computed from the 5ml price, which every other
    // row's spreadsheet formula shows sells at exactly the raw per-ml rate off
    // the *discounted* price, and discounted = base * 10/13 on every row).
    brand: "Yves Saint Laurent", name: "Libre Flowers & Flames", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    prices: { 3: 240, 5: 400, 10: 800, 30: 2420 },
    fullBottle: { sizeMl: 100, basePricePhp: 10400 },
    costBasisEstimated: true,
    fragellaMirrorId: "Yves Saint Laurent::Libre Flowers & Flames Yves Saint Laurent",
  },
  // --- Niche ---
  {
    // NISHANE NOTE: the pricelist message says 5ml = ₱550; the formula
    // spreadsheet's own Price List column says ₱425 for the same row (only
    // disagreement found across the whole catalog). Went with the pricelist's
    // ₱550 as the more current source (dated 2026-08-09, explicitly "ready to
    // ship" pricing) — flagged to the user, needs their confirmation.
    brand: "Nishane", name: "Wulóng Chá", concentration: "EXTRAIT_DE_PARFUM", category: "NICHE", gender: "unisex",
    prices: { 3: 330, 5: 550, 10: 1105, 30: 3315 },
    fullBottle: { sizeMl: 100, basePricePhp: 11050 },
    fragellaMirrorId: "nishane-wulong-cha-manual",
  },
  // --- Middle Eastern & others ---
  {
    brand: "Afnan", name: "Mystique Bouquet", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "female",
    prices: { 3: 120, 5: 155, 10: 400, 30: 1195 },
    fullBottle: { sizeMl: 80, basePricePhp: 3185 },
    fragellaMirrorId: "afnan-mystique-bouquet-manual",
  },
  {
    brand: "Armaf", name: "Club De Nuit Maleka", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "female",
    prices: { 3: 95, 5: 125, 10: 320, 30: 965 },
    fullBottle: { sizeMl: 105, basePricePhp: 3380 },
    fragellaMirrorId: "armaf-club-de-nuit-maleka-manual",
  },
  {
    // Full name per the linked mirror row (Fragrantica): "Club de Nuit Intense
    // Man Parfum" (2022) — distinct from the base "Club de Nuit Intense Man"
    // (2015, EDT). Pricelist's concentration column said "Parfum", matching this one.
    brand: "Armaf", name: "Club De Nuit Intense Man Parfum", concentration: "PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 95, 5: 125, 10: 320, 30: 960 },
    fullBottle: { sizeMl: 150, basePricePhp: 4810 },
    fragellaMirrorId: "armaf-club-de-nuit-intense-man-parfum-manual",
  },
  {
    brand: "French Avenue", name: "Vulcan Feu", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "unisex",
    prices: { 3: 100, 5: 130, 10: 340, 30: 1015 },
    fullBottle: { sizeMl: 100, basePricePhp: 3380 },
    fragellaMirrorId: "french-avenue-vulcan-feu-manual",
  },
  {
    brand: "French Avenue", name: "Liquid Brun", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 80, 5: 100, 10: 260, 30: 780 },
    fullBottle: { sizeMl: 100, basePricePhp: 2600 },
    fragellaMirrorId: "french-avenue-liquid-brun-manual",
  },
  {
    // Fragrantica spells it "Ra'ed Luxe" (with apostrophe) — pricelist had "Raed Luxe".
    brand: "Lattafa", name: "Ra'ed Luxe", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "unisex",
    prices: { 3: 60, 5: 75, 10: 195, 30: 585 },
    fullBottle: { sizeMl: 100, basePricePhp: 1950 },
    fragellaMirrorId: "lattafa-perfumes-ra-ed-luxe-manual",
  },
  {
    brand: "Mykonos", name: "Milk Drops", concentration: "EXTRAIT_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "unisex",
    prices: { 3: 125, 5: 160, 10: 415, 30: 1250 },
    fullBottle: { sizeMl: 50, basePricePhp: 2080 },
    fragellaMirrorId: "mykonos-milk-drops-manual",
  },
  {
    brand: "Rasasi", name: "Hawas Kobra", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 80, 5: 105, 10: 275, 30: 820 },
    fullBottle: { sizeMl: 100, basePricePhp: 2730 },
    fragellaMirrorId: "rasasi-hawas-kobra-manual",
  },
  {
    brand: "Rasasi", name: "Hawas Ice", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 80, 5: 105, 10: 275, 30: 820 },
    fullBottle: { sizeMl: 100, basePricePhp: 2730 },
    fragellaMirrorId: "rasasi-hawas-ice-manual",
  },
  {
    brand: "Rasasi", name: "Hawas Malibu", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 80, 5: 105, 10: 275, 30: 820 },
    fullBottle: { sizeMl: 100, basePricePhp: 2730 },
    fragellaMirrorId: "rasasi-hawas-malibu-manual",
  },
  {
    brand: "Rayhaan", name: "Pacific Aura", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 60, 5: 75, 10: 195, 30: 585 },
    fullBottle: { sizeMl: 100, basePricePhp: 1950 },
    fragellaMirrorId: "rayhaan-pacific-aura-manual",
  },
  {
    brand: "Rayhaan", name: "Aquatica", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "male",
    prices: { 3: 65, 5: 85, 10: 220, 30: 665 },
    fullBottle: { sizeMl: 100, basePricePhp: 2210 },
    fragellaMirrorId: "rayhaan-aquatica-manual",
  },
  {
    brand: "Rayhaan", name: "Ayka", concentration: "EAU_DE_PARFUM", category: "MIDDLE_EASTERN", gender: "female",
    prices: { 3: 55, 5: 75, 10: 190, 30: 565 },
    fullBottle: { sizeMl: 100, basePricePhp: 1885 },
    // Linked, but this mirror row has no note pyramid yet (Fragrantica page has
    // no dedicated pyramid) — name/brand/image only, no notes/accords.
    fragellaMirrorId: "rayhaan-ayka-manual",
  },
];

function slug(value: string) {
  // No length cap: `sku` is unbounded text, and a truncated slug risks two
  // different names colliding on the same SKU code (bit us once already —
  // "Club De Nuit Intense Man" vs "...Man Parfum" both truncated to the same
  // 24 chars, so the renamed product's SKU upsert silently landed on the old
  // product's rows instead of creating its own).
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function php(pesos: number) {
  return Math.round(pesos * 100);
}

async function main() {
  const client = db();
  let productCount = 0;
  let skuCount = 0;
  let linked = 0;

  for (const entry of CATALOG) {
    const brandSlug = slug(entry.brand);
    const nameSlug = slug(entry.name);

    let mirrorFields: {
      description: string | null;
      notePyramid: { top: string[]; middle: string[]; base: string[] } | undefined;
      accords: Array<{ name: string; strength?: number; color?: string | null }> | null;
      perfumers: string[] | null;
      releaseYear: number | null;
      fragellaId: string | null;
      fragellaPayload: unknown;
      imageUrl: string | null;
    } = {
      description: null,
      notePyramid: undefined,
      accords: null,
      perfumers: null,
      releaseYear: null,
      fragellaId: null,
      fragellaPayload: null,
      imageUrl: null,
    };

    if (entry.fragellaMirrorId) {
      const [mirror] = await client.select().from(fragellaMirror).where(eq(fragellaMirror.id, entry.fragellaMirrorId)).limit(1);
      if (mirror) {
        const record = normalize(mirror.payload as Record<string, unknown>);
        mirrorFields = {
          description: record.description ?? null,
          notePyramid: record.notes,
          accords: record.accords ?? null,
          perfumers: record.perfumers ?? null,
          releaseYear: record.year ?? null,
          fragellaId: mirror.id,
          fragellaPayload: mirror.payload,
          imageUrl: mirror.imageUrl,
        };
        linked += 1;
      } else {
        console.warn(`! ${entry.brand} ${entry.name}: fragellaMirrorId "${entry.fragellaMirrorId}" not found — continuing without enrichment`);
      }
    }

    const sourceMl = entry.fullBottle?.sizeMl ?? null;
    const referenceCostPrice = entry.fullBottle ? php(entry.fullBottle.basePricePhp) : 0;

    const productValues = {
      type: "DECANT" as const,
      fragranceCategory: entry.category,
      concentration: entry.concentration,
      name: entry.name,
      brand: entry.brand,
      gender: entry.gender,
      sourceMl,
      costPrice: referenceCostPrice,
      pricingMode: "DIRECT" as const,
      pricingInput: referenceCostPrice,
      description: mirrorFields.description,
      notePyramid: mirrorFields.notePyramid,
      accords: mirrorFields.accords,
      perfumers: mirrorFields.perfumers,
      releaseYear: mirrorFields.releaseYear,
      fragellaId: mirrorFields.fragellaId,
      fragellaQuery: `${entry.brand} ${entry.name}`,
      fragellaFetchedAt: mirrorFields.fragellaId ? new Date() : null,
      fragellaPayload: mirrorFields.fragellaPayload,
    };

    // No unique constraint on (brand, name) — look up by hand so a re-run
    // updates the existing row instead of inserting a duplicate product.
    // CAVEAT: this matches on the *current* name, so renaming an entry here
    // (e.g. correcting it to Fragrantica's full title) makes this look like a
    // new product — the old-named row is orphaned, not updated. Delete it by
    // hand after re-running (`delete from product where brand=... and name=...`).
    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, entry.brand), ilike(products.name, entry.name), eq(products.type, "DECANT")))
      .limit(1);

    let productId: string;
    if (existing) {
      // remainingMl is deliberately NOT in this update — it tracks live stock
      // as orders deplete it, and a re-run of this script (e.g. to pick up a
      // price change) must not reset that back to full sourceMl.
      productId = existing.id;
      await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
    } else {
      // 100% of bottle size on first insert only — nothing to preserve yet.
      const [inserted] = await client
        .insert(products)
        .values({ ...productValues, remainingMl: sourceMl })
        .returning({ id: products.id });
      productId = inserted.id;
    }
    productCount += 1;

    if (mirrorFields.imageUrl) {
      const [existingImage] = await client
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .limit(1);
      if (existingImage) {
        await client.update(productImages).set({ url: mirrorFields.imageUrl }).where(eq(productImages.id, existingImage.id));
      } else {
        await client.insert(productImages).values({
          productId,
          url: mirrorFields.imageUrl,
          alt: `${entry.brand} — ${entry.name}`,
          position: 0,
        });
      }
    }

    for (const sizeMl of [3, 5, 10, 30] as const) {
      const retailPricePhp = entry.prices[sizeMl];
      const retailPrice = php(retailPricePhp);
      const costForSize = entry.fullBottle
        ? Math.round((referenceCostPrice / entry.fullBottle.sizeMl) * sizeMl)
        : 0;
      // Matched on (productId, sizeMl) — the real identity for a decant
      // SKU — not the mutable slug-derived `sku` string. Renaming a product
      // (already happened for Armaf, Lattafa, YSL, Gucci — each needing a
      // manual DB patch) would make the new slug miss the old row entirely,
      // silently orphaning it instead of updating it. Mirrors the product
      // upsert above, which already avoids this exact trap.
      const [existingSku] = await client
        .select({ id: skus.id })
        .from(skus)
        .where(and(eq(skus.productId, productId), eq(skus.sizeMl, sizeMl)))
        .limit(1);
      if (existingSku) {
        await client
          .update(skus)
          .set({ retailPrice, pricingInput: retailPrice, costPrice: costForSize, updatedAt: new Date() })
          .where(eq(skus.id, existingSku.id));
      } else {
        await client.insert(skus).values({
          productId,
          sku: `${brandSlug}-${nameSlug}-${sizeMl}ML`,
          label: `${sizeMl}ml Decant`,
          sizeMl,
          condition: "BNIB",
          provenance: "RETAIL",
          packaging: "BOTTLE_ONLY",
          costPrice: costForSize,
          pricingMode: "DIRECT",
          pricingInput: retailPrice,
          retailPrice,
          fulfillment: "ON_HAND",
          stock: 0, // decant stock is tracked via the product's shared remainingMl pool
          isTester: false,
        });
      }
      skuCount += 1;
    }
    console.log(`✓ ${entry.brand} — ${entry.name} (${entry.category}, ${entry.gender})${mirrorFields.fragellaId ? " [enriched]" : ""}`);
  }

  console.log(`\nInserted ${productCount} products, ${skuCount} SKUs. ${linked}/${productCount} enriched with Fragella notes/image.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
