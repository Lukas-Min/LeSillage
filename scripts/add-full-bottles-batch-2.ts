/**
 * One-off add of 6 FULL_BOTTLE products (BNIB/Sealed/Retail, pre-order),
 * metadata sourced from each fragrance's real Fragrantica page. Follows the
 * same pattern as import-full-bottle-pricelist.ts: single SKU per product,
 * sourceMl left unset (full bottles don't scale by size), cost = the
 * discounted price the user paid, PERCENTAGE markup of 20%.
 *
 * Usage: npx tsx scripts/add-full-bottles-batch-2.ts
 * Safe to re-run: upserts by (brand, name, type FULL_BOTTLE).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { computeRetailPrice } from "@/domain/pricing";
import { db } from "../src/db/client";
import { products, skus, productImages } from "../src/db/schema";
import type { Concentration, FragranceCategory } from "../src/db/schema";

type Gender = "men" | "women" | "unisex";

interface FullBottleEntry {
  brand: string;
  name: string;
  concentration: Concentration;
  category: FragranceCategory;
  gender: Gender;
  sizeMl: number;
  discountedPricePhp: number;
  releaseYear: number;
  perfumers: string[];
  notePyramid: { top: string[]; middle: string[]; base: string[] } | null;
  flatNotes: string[] | null; // for pages with no tiered pyramid
  accords: string[];
  description: string;
  ratingValue: string;
  ratingCount: number;
  imageUrl: string;
  fragranticaUrl: string;
}

const MARKUP_PERCENT = 20;

const CATALOG: FullBottleEntry[] = [
  {
    brand: "Xerjoff",
    name: "La Tosca",
    concentration: "EAU_DE_PARFUM",
    category: "NICHE",
    gender: "women",
    sizeMl: 50,
    discountedPricePhp: 6400,
    releaseYear: 2015,
    perfumers: ["Chris Maurice"],
    notePyramid: {
      top: ["Italian Lemon", "Green Mandarin"],
      middle: ["Violet Leaf", "Eucalyptus", "Bulgarian Rose"],
      base: ["Musk", "Patchouli", "Amber", "Madagascar Vanilla"],
    },
    flatNotes: null,
    accords: ["ozonic", "citrus", "woody", "musky", "aquatic", "camphor", "powdery", "patchouli", "aromatic", "rose"],
    description:
      "La Tosca by Casamorati 1888 is a Chypre Floral fragrance for women. La Tosca was launched in 2015. " +
      "The nose behind this fragrance is Chris Maurice. Top notes are Italian Lemon and Green Mandarin; " +
      "middle notes are Violet Leaf, Eucalyptus and Bulgarian Rose; base notes are Musk, Patchouli, Amber and Madagascar Vanilla.",
    ratingValue: "3.64",
    ratingCount: 1568,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.32191.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Xerjoff/La-Tosca-32191.html",
  },
  {
    brand: "Xerjoff",
    name: "Golden Dallah",
    concentration: "EAU_DE_PARFUM",
    category: "NICHE",
    gender: "unisex",
    sizeMl: 100,
    discountedPricePhp: 7400,
    releaseYear: 2018,
    perfumers: [],
    notePyramid: {
      top: ["Exotic Spices"],
      middle: ["Incense", "Coffee", "Cambodian Oud", "Amber", "Rose"],
      base: ["Cacao", "Hazelnut", "Tonka Bean"],
    },
    flatNotes: null,
    accords: ["warm spicy", "amber", "woody", "coffee", "cacao", "nutty", "smoky", "animalic", "sweet"],
    description:
      "Golden Dallah by Xerjoff is an Oriental Spicy fragrance for women and men. Golden Dallah was launched in 2018. " +
      "Top note is Exotic Spices; middle notes are Incense, Coffee, Cambodian Oud, Amber and Rose; base notes are Cacao, Hazelnut and Tonka Bean.",
    ratingValue: "4.11",
    ratingCount: 1306,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.51728.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Xerjoff/Golden-Dallah-51728.html",
  },
  {
    brand: "Valentino",
    name: "Donna Born In Roma",
    concentration: "EAU_DE_PARFUM",
    category: "DESIGNER",
    gender: "women",
    sizeMl: 100,
    discountedPricePhp: 4750,
    releaseYear: 2019,
    perfumers: [],
    notePyramid: {
      top: ["Black Currant", "Pink Pepper", "Bergamot"],
      middle: ["Jasmine", "Jasmine Sambac", "Jasmine Tea"],
      base: ["Bourbon Vanilla", "Cashmeran", "Guaiac Wood"],
    },
    flatNotes: null,
    accords: ["woody", "vanilla", "fruity", "white floral", "soft spicy", "powdery", "floral", "musky", "citrus", "green"],
    description:
      "Valentino Donna Born In Roma by Valentino is an Oriental Floral fragrance for women. Valentino Donna Born In Roma " +
      "was launched in 2019. Top notes are Black Currant, Pink Pepper and Bergamot; middle notes are Jasmine, " +
      "Jasmine Sambac and Jasmine Tea; base notes are Bourbon Vanilla, Cashmeran and Guaiac Wood.",
    ratingValue: "4.15",
    ratingCount: 11159,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.55805.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Valentino/Valentino-Donna-Born-In-Roma-55805.html",
  },
  {
    brand: "Carolina Herrera",
    name: "212 Heroes",
    concentration: "EAU_DE_TOILETTE",
    category: "DESIGNER",
    gender: "men",
    sizeMl: 80,
    discountedPricePhp: 3350,
    releaseYear: 2021,
    perfumers: ["Domitille Michalon Bertier", "Juliette Karagueuzoglou", "Carlos Benaïm"],
    notePyramid: {
      top: ["Pear", "cannabis", "Ginger"],
      middle: ["Geranium", "Sage"],
      base: ["Musk", "Leather"],
    },
    flatNotes: null,
    accords: ["aromatic", "fresh spicy", "fruity", "herbal", "cannabis", "fresh", "sweet", "musky", "aquatic", "green"],
    description:
      "212 Heroes by Carolina Herrera is an Aromatic Fruity fragrance for men. 212 Heroes was launched in 2021. " +
      "212 Heroes was created by Domitille Michalon Bertier, Juliette Karagueuzoglou and Carlos Benaïm. " +
      "Top notes are Pear, cannabis and Ginger; middle notes are Geranium and Sage; base notes are Musk and Leather.",
    ratingValue: "3.94",
    ratingCount: 1384,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.65988.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Carolina-Herrera/212-Heroes-65988.html",
  },
  {
    brand: "Ralph Lauren",
    name: "Polo Black",
    concentration: "EAU_DE_TOILETTE",
    category: "DESIGNER",
    gender: "men",
    sizeMl: 125,
    discountedPricePhp: 2350,
    releaseYear: 2005,
    perfumers: ["Pierre Negrin"],
    notePyramid: null,
    flatNotes: ["Mango", "Sandalwood", "Tangerine", "Patchouli", "Tonka Bean", "Sage", "Wormwood", "Lemon"],
    accords: ["tropical", "fruity", "woody", "sweet", "citrus", "aromatic", "warm spicy", "patchouli", "terpenic", "powdery"],
    description:
      "Polo Black by Ralph Lauren is a Woody Aromatic fragrance for men. Polo Black was launched in 2005. " +
      "The nose behind this fragrance is Pierre Negrin. The fragrance features Mango, Sandalwood, Tangerine, " +
      "Patchouli, Tonka Bean, Sage, Wormwood and Lemon.",
    ratingValue: "4.01",
    ratingCount: 3972,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.1197.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Ralph-Lauren/Polo-Black-1197.html",
  },
  {
    brand: "Prada",
    name: "Paradoxe",
    concentration: "EAU_DE_PARFUM",
    category: "DESIGNER",
    gender: "women",
    sizeMl: 90,
    discountedPricePhp: 5190,
    releaseYear: 2022,
    perfumers: ["Antoine Maisondieu", "Nadège Le Garlantezec", "Shyamala Maisondieu"],
    notePyramid: {
      top: ["Pear", "Tangerine", "Bergamot"],
      middle: ["Orange Blossom", "Neroli Essence", "Neroli", "Jasmine Sambac"],
      base: ["Bourbon Vanilla", "Amber", "White Musk", "Benzoin"],
    },
    flatNotes: null,
    accords: ["white floral", "citrus", "amber", "sweet", "vanilla", "powdery", "fruity", "musky", "fresh"],
    description:
      "Prada Paradoxe by Prada is an Oriental Floral fragrance for women. Prada Paradoxe was launched in 2022. " +
      "Prada Paradoxe was created by Nadège Le Garlantezec, Antoine Maisondieu and Shyamala Maisondieu. " +
      "Top notes are Pear, Tangerine and Bergamot; middle notes are Orange Blossom, Neroli Essence, Neroli and " +
      "Jasmine Sambac; base notes are Bourbon Vanilla, Amber, White Musk and Benzoin.",
    ratingValue: "3.93",
    ratingCount: 10844,
    imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.75668.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Prada/Prada-Paradoxe-75668.html",
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
  let productCount = 0;

  for (const entry of CATALOG) {
    const costPrice = php(entry.discountedPricePhp);
    const notes = entry.notePyramid
      ? [
          entry.notePyramid.top.length ? `Top: ${entry.notePyramid.top.join(", ")}` : null,
          entry.notePyramid.middle.length ? `Middle: ${entry.notePyramid.middle.join(", ")}` : null,
          entry.notePyramid.base.length ? `Base: ${entry.notePyramid.base.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" | ")
      : (entry.flatNotes ?? []).join(", ");

    const productValues = {
      type: "FULL_BOTTLE" as const,
      fragranceCategory: entry.category,
      concentration: entry.concentration,
      name: entry.name,
      brand: entry.brand,
      gender: entry.gender,
      releaseYear: entry.releaseYear,
      perfumers: entry.perfumers,
      notePyramid: entry.notePyramid,
      notes,
      accords: entry.accords.map((name) => ({ name })),
      description: entry.description,
      ratingValue: entry.ratingValue,
      ratingCount: entry.ratingCount,
      fragranticaUrl: entry.fragranticaUrl,
      costPrice,
      pricingMode: "PERCENTAGE" as const,
      pricingInput: MARKUP_PERCENT,
      isActive: true,
    };

    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, entry.brand), ilike(products.name, entry.name), eq(products.type, "FULL_BOTTLE")))
      .limit(1);

    let productId: string;
    if (existing) {
      productId = existing.id;
      await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
    } else {
      const [inserted] = await client.insert(products).values(productValues).returning({ id: products.id });
      productId = inserted.id;
    }
    productCount += 1;

    const retailPrice = computeRetailPrice({ costPriceCentavos: costPrice, mode: "PERCENTAGE", input: MARKUP_PERCENT });
    const brandSlug = slug(entry.brand);
    const nameSlug = slug(entry.name);

    const [existingSku] = await client.select({ id: skus.id }).from(skus).where(eq(skus.productId, productId)).limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({ sizeMl: entry.sizeMl, label: `${entry.sizeMl}ml Full bottle`, costPrice, retailPrice, pricingInput: retailPrice, updatedAt: new Date() })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: `${brandSlug}-${nameSlug}-${entry.sizeMl}`,
        label: `${entry.sizeMl}ml Full bottle`,
        sizeMl: entry.sizeMl,
        condition: "BNIB",
        provenance: "RETAIL",
        packaging: "WITH_BOX",
        costPrice,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        fulfillment: "PRE_ORDER",
        stock: 0,
        isTester: false,
      });
    }

    const [existingImage] = await client.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId)).limit(1);
    if (!existingImage) {
      await client.insert(productImages).values({
        productId,
        url: entry.imageUrl,
        alt: `${entry.brand} — ${entry.name}`,
        position: 0,
      });
    }

    console.log(`✓ ${entry.brand} — ${entry.name} (${entry.sizeMl}ml) -> ₱${(retailPrice / 100).toFixed(2)} (cost ₱${entry.discountedPricePhp})`);
  }

  console.log(`\nAdded/updated ${productCount} full-bottle products.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
