/**
 * One-off add of the remaining 23 Velixir FULL_BOTTLE listings (every
 * fragrance in the brand's real Fragrantica lineup except Icarus, already
 * added by add-velixir-icarus-full-bottle.ts). Metadata sourced from each
 * fragrance's own Fragrantica page: https://www.fragrantica.com/designers/Velixir.html
 * lists 24 perfumes total; this script covers the other 23.
 *
 * concentration: Fragrantica doesn't print "Eau de Parfum" as page *text* for
 * most of these (a gap in this newer brand's listings, not an omission on our
 * part) — but where it was actually checked, it's consistently EDP: Nyx states
 * it directly in body copy, and 8 other entries' bottle-label photos were
 * visually confirmed to read "EAU DE PARFUM". With zero contradicting
 * evidence anywhere in the line and Icarus already catalogued the same way,
 * every entry here is EAU_DE_PARFUM on that basis rather than a guess.
 *
 * Pricing is a direct final price, not a formula, same as Icarus: cost
 * ₱2,550, retail ₱3,000 for every entry (not a markup calculation — ~17.6%
 * isn't a round percentage — so both product and SKU are stored DIRECT
 * rather than PERCENTAGE, so a later admin edit can't silently recompute and
 * drift the price). Single 100ml SKU per fragrance, BNIB/boxed/Retail, stock
 * 0 pending admin count — availableForPreOrder true so each shows as
 * pre-order instead of being hidden (newSkuFulfillmentDefaults).
 *
 * Usage: npx tsx scripts/add-velixir-full-bottles.ts
 * Safe to re-run: upserts by (brand, name, type FULL_BOTTLE) and by productId.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { products, skus, productImages } from "../src/db/schema";
import type { Concentration, FragranceCategory } from "../src/db/schema";
import { formatFragranceDescription, newSkuFulfillmentDefaults } from "@/domain/product-type";

type Gender = "men" | "women" | "unisex";
type NotePyramid = { top: string[]; middle: string[]; base: string[] };

interface VelixirEntry {
  name: string;
  gender: Gender;
  releaseYear: number | null;
  perfumers: string[];
  notePyramid: NotePyramid | null;
  flatNotes: string[] | null;
  accords: string[];
  ratingValue: string | null;
  ratingCount: number | null;
  imageUrl: string;
  fragranticaUrl: string;
}

const BRAND = "Velixir";
const CONCENTRATION: Concentration = "EAU_DE_PARFUM";
const CATEGORY: FragranceCategory = "MIDDLE_EASTERN";
const SIZE_ML = 100;
const COST_PRICE_PHP = 2550;
const RETAIL_PRICE_PHP = 3000;

const CATALOG: VelixirEntry[] = [
  {
    name: "Adonis",
    gender: "unisex",
    releaseYear: 2024,
    perfumers: [],
    notePyramid: { top: ["Lavender", "Mint"], middle: ["Madagascar Vanilla", "Benzoin"], base: ["Tonka Bean", "Tobacco", "Honey"] },
    flatNotes: null,
    accords: ["vanilla", "sweet", "amber", "aromatic", "tobacco", "lavender", "honey", "green", "fresh spicy", "warm spicy"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127600.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Adonis-127600.html",
  },
  {
    name: "Aphrodite",
    gender: "women",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Bergamot", "Litchi", "Ginger"], middle: ["Peony", "Rose", "Cacao"], base: ["Patchouli"] },
    flatNotes: null,
    accords: ["fresh", "rose", "floral", "citrus", "fresh spicy", "fruity", "warm spicy", "cacao", "tropical", "patchouli"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127606.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Aphrodite-127606.html",
  },
  {
    name: "Apollo",
    gender: "unisex",
    releaseYear: 2024,
    perfumers: [],
    notePyramid: { top: ["Green Apple", "Ginger", "Bergamot"], middle: ["Clary Sage", "Juniper Berries"], base: ["Amberwood", "Cedar", "Tonka Bean", "Olibanum", "Vetiver"] },
    flatNotes: null,
    accords: ["aromatic", "woody", "fresh spicy", "amber", "citrus", "fresh", "fruity", "warm spicy", "green", "soft spicy"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127593.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Apollo-127593.html",
  },
  {
    name: "Ares",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Grapefruit", "Citrus", "Mandarin Orange"], middle: ["Sandalwood", "Cedarwood"], base: ["Amber", "Patchouli", "Musk"] },
    flatNotes: null,
    accords: ["citrus", "woody", "powdery", "amber", "warm spicy"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127591.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Ares-127591.html",
  },
  {
    name: "Artemis",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Watery Notes", "Pear", "Ambrette"], middle: ["Ylang-Ylang", "Jasmine"], base: ["Patchouli"] },
    flatNotes: null,
    accords: ["aquatic", "yellow floral", "white floral", "sweet", "fresh", "floral", "woody", "fruity", "musky", "patchouli"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127602.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Artemis-127602.html",
  },
  {
    name: "Asteria",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Blood Orange", "Mandarin Orange", "Bergamot", "Lemon"], middle: ["Tiare Flower"], base: ["Sandalwood", "Musk", "Powdery Notes"] },
    flatNotes: null,
    accords: ["woody", "powdery", "warm spicy", "balsamic", "musky"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127608.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Asteria-127608.html",
  },
  {
    name: "Athena",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Litchi", "Grapefruit", "Rhubarb"], middle: ["Bulgarian Rose", "Freesia", "Vanilla"], base: ["Akigalawood", "Musk", "Orris Root", "Vetiver"] },
    flatNotes: null,
    accords: ["woody", "floral", "fruity", "musky", "oud", "powdery", "citrus", "rose", "aromatic", "green"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127595.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Athena-127595.html",
  },
  {
    name: "Concordia",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Bergamot"], middle: ["Grapefruit"], base: ["Ginger"] },
    flatNotes: null,
    accords: ["fresh spicy", "fresh", "fruity", "herbal", "terpenic"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127603.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Concordia-127603.html",
  },
  {
    name: "Demeter",
    gender: "unisex",
    releaseYear: 2024,
    perfumers: [],
    notePyramid: { top: ["Mint", "Lemon", "Basil", "Thyme"], middle: ["Rosemary", "Blackcurrant", "Lavender", "Jasmine"], base: ["Cedarwood", "Musk"] },
    flatNotes: null,
    accords: ["aromatic", "fresh spicy", "green", "woody", "citrus", "musky"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127590.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Demeter-127590.html",
  },
  {
    name: "Galatea",
    gender: "unisex",
    releaseYear: 2024,
    perfumers: [],
    notePyramid: { top: ["Caramel", "Biscuit"], middle: ["Tonka Bean", "Honey", "Sugar", "Milk"], base: ["White Musk", "Vanilla", "Praline", "Amber"] },
    flatNotes: null,
    accords: ["sweet", "vanilla", "amber", "lactonic", "powdery", "musky", "honey", "caramel"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127592.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Galatea-127592.html",
  },
  {
    name: "Harmonia",
    gender: "unisex",
    releaseYear: null,
    perfumers: [],
    notePyramid: { top: ["Lemongrass", "Tea"], middle: ["Rose", "Magnolia"], base: ["Woody Notes"] },
    flatNotes: null,
    accords: ["citrus", "floral", "rose", "woody", "fresh spicy", "green", "herbal", "aromatic", "fresh", "ozonic"],
    ratingValue: "4.63",
    ratingCount: 30,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.139663.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Harmonia-139663.html",
  },
  {
    name: "Helios",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Coconut", "Green Notes", "Mint"], middle: ["Marine notes", "Fig"], base: ["Vetiver", "Woody Notes", "Tonka Bean"] },
    flatNotes: null,
    accords: ["aromatic", "woody", "green", "coconut", "sweet", "vanilla", "earthy", "marine", "fruity"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127596.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Helios-127596.html",
  },
  {
    name: "Hera",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Pear", "Mandarin Orange", "Citrus"], middle: ["Violet", "Lavender"], base: ["Musk", "Sandalwood", "Vanilla", "Patchouli"] },
    flatNotes: null,
    accords: ["powdery", "woody", "violet", "musky", "citrus", "vanilla", "sweet", "fruity", "fresh", "lavender"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127597.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Hera-127597.html",
  },
  {
    name: "Himeros",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Green Notes", "Bergamot", "Woody Notes"], middle: ["Solar Notes", "Ginger"], base: ["Sandalwood", "Cedarwood"] },
    flatNotes: null,
    accords: ["woody", "fresh spicy", "citrus", "green", "powdery", "aldehydic"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127609.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Himeros-127609.html",
  },
  {
    name: "Morpheus",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Citron", "Sicilian Orange", "Bergamot"], middle: ["Ginger", "Neroli"], base: ["Ambroxan", "Guaiac Wood", "Black Tea"] },
    flatNotes: null,
    accords: ["amber", "woody", "fresh spicy", "musky", "fresh", "citrus"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127605.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Morpheus-127605.html",
  },
  {
    name: "Narcisus",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Bergamot"], middle: ["Orange Blossom"], base: ["Ambrofix", "Patchouli"] },
    flatNotes: null,
    accords: ["citrus", "white floral", "sweet", "fresh spicy", "soapy"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127594.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Narcisus-127594.html",
  },
  {
    name: "Nyx",
    gender: "unisex",
    releaseYear: null,
    perfumers: [],
    notePyramid: null,
    flatNotes: ["Incense", "Amber", "Sandalwood"],
    accords: ["amber", "smoky", "balsamic", "warm spicy", "animalic"],
    ratingValue: "3.75",
    ratingCount: 20,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.139664.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Nyx-139664.html",
  },
  {
    name: "Orion",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Cinnamon", "Bergamot"], middle: ["Bourbon Vanilla", "Ambroxan", "Praline"], base: ["Amber", "Woody Notes", "Musk", "Heliotrope"] },
    flatNotes: null,
    accords: ["amber", "vanilla", "musky", "sweet", "powdery", "cinnamon", "woody", "citrus", "warm spicy", "lactonic"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127598.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Orion-127598.html",
  },
  {
    name: "Paladin",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Vanilla"], middle: ["Lavender", "Aromatic Notes"], base: ["Vetiver"] },
    flatNotes: null,
    accords: ["vanilla", "lavender", "aromatic", "woody", "earthy", "powdery", "fresh spicy", "sweet"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127599.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Paladin-127599.html",
  },
  {
    name: "Persephone",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Mandarin", "Pear"], middle: ["Ambrette"], base: ["Benzoin", "Musk"] },
    flatNotes: null,
    accords: ["amber", "musky", "floral", "warm spicy", "vanilla"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127601.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Persephone-127601.html",
  },
  {
    name: "Poseidon",
    gender: "unisex",
    releaseYear: 2025,
    perfumers: [],
    notePyramid: { top: ["Bergamot", "Mandarin Orange"], middle: ["Ginger"], base: ["Ambergris"] },
    flatNotes: null,
    accords: ["fresh spicy", "fresh", "fruity", "herbal", "terpenic"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127607.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Poseidon-127607.html",
  },
  {
    name: "Selene",
    gender: "unisex",
    releaseYear: null,
    perfumers: [],
    notePyramid: null,
    flatNotes: ["Peony", "Jasmine Sambac", "Rose Geranium", "Raspberry", "Magnolia"],
    accords: ["floral", "fresh", "rose", "white floral", "fruity", "fresh spicy"],
    ratingValue: "4.40",
    ratingCount: 20,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.139665.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Selene-139665.html",
  },
  {
    name: "Uranus",
    gender: "unisex",
    releaseYear: 2026,
    perfumers: [],
    notePyramid: { top: ["Sicilian Orange", "Bergamot"], middle: ["Pink Pepper", "Cardamom", "Nutmeg", "Neroli"], base: ["Vetiver"] },
    flatNotes: null,
    accords: ["warm spicy", "soft spicy", "aromatic", "musky", "sweet"],
    ratingValue: null,
    ratingCount: null,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.127604.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Velixir/Uranus-127604.html",
  },
];

function slug(value: string) {
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
  const costPrice = php(COST_PRICE_PHP);
  const retailPrice = php(RETAIL_PRICE_PHP);
  let count = 0;

  for (const entry of CATALOG) {
    const notes = entry.notePyramid
      ? [
          `Top: ${entry.notePyramid.top.join(", ")}`,
          `Middle: ${entry.notePyramid.middle.join(", ")}`,
          `Base: ${entry.notePyramid.base.join(", ")}`,
        ].join(" | ")
      : (entry.flatNotes ?? []).join(", ");

    const productValues = {
      type: "FULL_BOTTLE" as const,
      fragranceCategory: CATEGORY,
      concentration: CONCENTRATION,
      name: entry.name,
      brand: BRAND,
      gender: entry.gender,
      releaseYear: entry.releaseYear,
      perfumers: entry.perfumers,
      notePyramid: entry.notePyramid,
      notes,
      accords: entry.accords.map((name) => ({ name })),
      description: formatFragranceDescription({ brand: BRAND, perfumers: entry.perfumers, releaseYear: entry.releaseYear }),
      ratingValue: entry.ratingValue,
      ratingCount: entry.ratingCount,
      fragranticaUrl: entry.fragranticaUrl,
      costPrice,
      pricingMode: "DIRECT" as const,
      pricingInput: retailPrice,
      isActive: true,
    };

    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, BRAND), ilike(products.name, entry.name), eq(products.type, "FULL_BOTTLE")))
      .limit(1);

    let productId: string;
    if (existing) {
      productId = existing.id;
      await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
    } else {
      const [inserted] = await client.insert(products).values(productValues).returning({ id: products.id });
      productId = inserted.id;
    }
    count += 1;

    const brandSlug = slug(BRAND);
    const nameSlug = slug(entry.name);

    const [existingSku] = await client.select({ id: skus.id }).from(skus).where(eq(skus.productId, productId)).limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({
          sizeMl: SIZE_ML,
          label: `${SIZE_ML}ml Full bottle`,
          condition: "BNIB",
          provenance: "RETAIL",
          packaging: "WITH_BOX",
          costPrice,
          pricingMode: "DIRECT",
          pricingInput: retailPrice,
          retailPrice,
          updatedAt: new Date(),
        })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: `${brandSlug}-${nameSlug}-${SIZE_ML}`,
        label: `${SIZE_ML}ml Full bottle`,
        sizeMl: SIZE_ML,
        condition: "BNIB",
        provenance: "RETAIL",
        packaging: "WITH_BOX",
        costPrice,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        stock: 0,
        ...newSkuFulfillmentDefaults("FULL_BOTTLE"),
        isTester: false,
      });
    }

    const [existingImage] = await client.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId)).limit(1);
    if (!existingImage) {
      await client.insert(productImages).values({
        productId,
        url: entry.imageUrl,
        alt: `${BRAND} — ${entry.name}`,
        position: 0,
      });
    }

    console.log(`✓ ${BRAND} — ${entry.name} (${SIZE_ML}ml) -> ₱${RETAIL_PRICE_PHP} (cost ₱${COST_PRICE_PHP}) [productId ${productId}]`);
  }

  console.log(`\nAdded/updated ${count} Velixir full-bottle products.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
