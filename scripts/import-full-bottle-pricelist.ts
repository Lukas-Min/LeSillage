/**
 * One-time load of a full-bottle pricelist (as of 2026-09-03) into
 * `product`/`sku`. Each entry's price is the store's own "discounted" cost
 * basis — the product's costPrice/pricingMode/pricingInput are set to
 * PERCENTAGE @ 25% (per the store owner, overriding the schema's own 30%
 * default), so the SKU's retailPrice is derived automatically (e.g. ₱3,600
 * cost -> ₱4,500 retail), not hardcoded — unlike `import-decant-pricelist.ts`,
 * which has to hardcode SKU prices because its decant pricing isn't linear.
 *
 * Metadata (description/notes/accords/perfumers/rating/image/releaseYear/
 * gender) was fetched from each fragrance's real Fragrantica page and
 * parsed with the same logic as src/lib/fragrantica.ts's summary-paragraph
 * parser, so these rows arrive fully populated instead of needing a
 * follow-up manual-paste import. Image URLs are the clean bottle photo
 * (`fimgs.net/mdimg/perfume-thumbs/375x500.<id>.jpg`), not the "social card"
 * graphic (Fragrantica logo + accord bars + QR code) og:image points at.
 *
 * Every SKU here defaults to condition BNIB, provenance RETAIL, packaging
 * WITH_BOX — i.e. "Retail, BNIB, sealed" — which are already this schema's
 * defaults, so nothing special is set for that beyond leaving them alone.
 * Bottle ml size wasn't given, so `sourceMl`/`sizeMl` are left unset rather
 * than guessed; the single "Full bottle" SKU's price is unaffected either
 * way (computeSkuRetailPrice returns the reference price as-is when a SKU
 * has no sizeMl).
 *
 * Usage: npx tsx scripts/import-full-bottle-pricelist.ts
 * Safe to re-run: upserts by (brand, name, type="FULL_BOTTLE"), does not
 * duplicate; does not touch any existing DECANT product of the same name.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { productImages, products, skus } from "../src/db/schema";
import type { Concentration, FragranceCategory } from "../src/db/schema";

type Gender = "male" | "female" | "unisex";

interface Accord {
  name: string;
  strength: number;
}

interface FullBottleEntry {
  brand: string;
  name: string;
  concentration: Concentration;
  category: FragranceCategory;
  gender: Gender;
  /** The store's discounted cost basis, PHP (not centavos). */
  costPricePhp: number;
  releaseYear: number;
  perfumers: string[];
  notes: { top: string[]; middle: string[]; base: string[] };
  accords: Accord[];
  ratingValue: number;
  ratingCount: number;
  imageUrl: string;
  fragranticaUrl: string;
}

const CATALOG: FullBottleEntry[] = [
  {
    brand: "Yves Saint Laurent", name: "Libre", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5250, releaseYear: 2019, perfumers: ["Anne Flipo", "Carlos Benaïm"],
    notes: { top: ["Lavender", "Mandarin Orange", "Black Currant", "Petitgrain"], middle: ["Lavender", "Orange Blossom", "Jasmine"], base: ["Madagascar Vanilla", "Musk", "Cedar", "Ambergris"] },
    accords: [{ name: "white floral", strength: 100 }, { name: "citrus", strength: 73 }, { name: "lavender", strength: 65 }, { name: "vanilla", strength: 49 }, { name: "aromatic", strength: 39 }, { name: "sweet", strength: 36 }, { name: "powdery", strength: 33 }, { name: "animalic", strength: 32 }],
    ratingValue: 3.92, ratingCount: 22371, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.56077.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-56077.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Libre Intense", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5750, releaseYear: 2020, perfumers: ["Anne Flipo", "Carlos Benaïm"],
    notes: { top: ["Lavender", "Mandarin Orange", "Bergamot"], middle: ["Lavender", "Tunisian Orange Blossom", "Jasmine Sambac", "Orchid"], base: ["Madagascar Vanilla", "Tonka Bean", "Ambergris", "Vetiver"] },
    accords: [{ name: "vanilla", strength: 100 }, { name: "white floral", strength: 74 }, { name: "citrus", strength: 62 }, { name: "lavender", strength: 59 }, { name: "sweet", strength: 57 }, { name: "aromatic", strength: 53 }, { name: "amber", strength: 44 }, { name: "powdery", strength: 28 }],
    ratingValue: 4.27, ratingCount: 11466, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.62318.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Intense-62318.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Libre Le Parfum", concentration: "PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5750, releaseYear: 2022, perfumers: ["Anne Flipo", "Carlos Benaïm"],
    notes: { top: ["Ginger", "Saffron", "Mandarin Orange", "Bergamot"], middle: ["Orange Blossom", "Lavender"], base: ["Bourbon Vanilla", "Honey", "Tonka Bean", "Vetiver"] },
    accords: [{ name: "vanilla", strength: 100 }, { name: "sweet", strength: 87 }, { name: "citrus", strength: 82 }, { name: "honey", strength: 67 }, { name: "white floral", strength: 57 }, { name: "lavender", strength: 56 }, { name: "fresh spicy", strength: 54 }, { name: "aromatic", strength: 52 }],
    ratingValue: 4.28, ratingCount: 5054, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.75676.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Le-Parfum-75676.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Mon Paris", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5550, releaseYear: 2016, perfumers: ["Olivier Cresp", "Harry Fremont", "Dora Baghriche"],
    notes: { top: ["Strawberry", "Raspberry", "Pear", "Orange", "Calabrian bergamot", "Tangerine", "Calone"], middle: ["Peony", "Jasmine Sambac", "Chinese Jasmine", "Datura", "Orange Blossom"], base: ["Indonesian Patchouli Leaf", "Patchouli", "White Musk", "Vanila", "Ambroxan", "Moss", "Cedar"] },
    accords: [{ name: "fruity", strength: 100 }, { name: "sweet", strength: 79 }, { name: "fresh", strength: 32 }, { name: "white floral", strength: 31 }, { name: "patchouli", strength: 30 }, { name: "citrus", strength: 30 }, { name: "woody", strength: 27 }, { name: "floral", strength: 27 }],
    ratingValue: 3.8, ratingCount: 10485, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.38914.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Mon-Paris-38914.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Libre Flowers & Flames", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5750, releaseYear: 2024, perfumers: [],
    notes: { top: ["Lavender", "Bergamot"], middle: ["Orange Blossom", "Lavender", "Coconut", "Lily", "Palm Tree"], base: ["Vanilla"] },
    accords: [{ name: "white floral", strength: 100 }, { name: "vanilla", strength: 68 }, { name: "citrus", strength: 57 }, { name: "lavender", strength: 56 }, { name: "sweet", strength: 50 }, { name: "coconut", strength: 44 }, { name: "aromatic", strength: 30 }, { name: "fresh spicy", strength: 30 }],
    ratingValue: 4.15, ratingCount: 1955, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.95623.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Flowers-Flames-95623.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Y Eau de Parfum", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "male",
    costPricePhp: 5250, releaseYear: 2018, perfumers: ["Dominique Ropion", "Claire Liégent"],
    notes: { top: ["Apple", "Ginger", "Bergamot"], middle: ["Sage", "Juniper Berries", "Geranium"], base: ["Amberwood", "Tonka Bean", "Cedar", "Vetiver", "Olibanum"] },
    accords: [{ name: "aromatic", strength: 100 }, { name: "fresh spicy", strength: 98 }, { name: "woody", strength: 73 }, { name: "fruity", strength: 59 }, { name: "fresh", strength: 52 }, { name: "amber", strength: 52 }, { name: "citrus", strength: 46 }, { name: "herbal", strength: 39 }],
    ratingValue: 4.41, ratingCount: 28455, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.50757.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Y-Eau-de-Parfum-50757.html",
  },
  {
    brand: "Yves Saint Laurent", name: "MYSLF Eau de Parfum", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "male",
    costPricePhp: 5350, releaseYear: 2023, perfumers: ["Christophe Raynaud", "Antoine Maisondieu", "Daniela Andrier"],
    notes: { top: ["Calabrian bergamot", "Bergamot"], middle: ["Tunisian Orange Blossom"], base: ["Ambrofix™", "Patchouli"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "white floral", strength: 76 }, { name: "patchouli", strength: 33 }, { name: "fresh spicy", strength: 31 }, { name: "woody", strength: 26 }, { name: "sweet", strength: 23 }, { name: "soapy", strength: 19 }, { name: "aromatic", strength: 19 }],
    ratingValue: 4.33, ratingCount: 14077, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.84094.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/MYSLF-Eau-de-Parfum-84094.html",
  },
  {
    brand: "Yves Saint Laurent", name: "MYSLF Le Parfum", concentration: "PARFUM", category: "DESIGNER", gender: "male",
    costPricePhp: 5750, releaseYear: 2024, perfumers: ["Daniela Andrier", "Antoine Maisondieu", "Christophe Raynaud"],
    notes: { top: ["Black Pepper"], middle: ["Orange Blossom"], base: ["Bourbon Vanilla", "Amber", "Woody Notes", "Patchouli"] },
    accords: [{ name: "white floral", strength: 100 }, { name: "vanilla", strength: 75 }, { name: "woody", strength: 63 }, { name: "citrus", strength: 50 }, { name: "amber", strength: 46 }, { name: "sweet", strength: 45 }, { name: "fresh spicy", strength: 43 }, { name: "warm spicy", strength: 34 }],
    ratingValue: 4.31, ratingCount: 5139, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.94983.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/MYSLF-Le-Parfum-94983.html",
  },
  {
    brand: "Prada", name: "Paradigme Le Parfum", concentration: "PARFUM", category: "DESIGNER", gender: "male",
    costPricePhp: 5650, releaseYear: 2026, perfumers: [],
    notes: { top: ["Bergamot"], middle: ["Vanilla", "Geranium"], base: ["Peru Balsam", "Benzoin", "Guaiac Wood", "Amberever"] },
    accords: [{ name: "amber", strength: 100 }, { name: "balsamic", strength: 81 }, { name: "vanilla", strength: 78 }, { name: "woody", strength: 70 }, { name: "fresh spicy", strength: 51 }, { name: "aromatic", strength: 38 }, { name: "warm spicy", strength: 34 }, { name: "citrus", strength: 33 }],
    ratingValue: 4.22, ratingCount: 583, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.132417.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Prada/Paradigme-Le-Parfum-132417.html",
  },
  {
    brand: "Sospiro Perfumes", name: "Vibrato", concentration: "EAU_DE_PARFUM", category: "NICHE", gender: "unisex",
    costPricePhp: 9500, releaseYear: 2022, perfumers: ["Christian Provenzano"],
    notes: { top: ["Grapefruit", "Bergamot", "Jasmine", "Magnolia"], middle: ["Ginger", "Herbal Notes", "Powdery Notes"], base: ["Musk", "Cedar", "Amber", "Patchouli", "Orris Root"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "fresh spicy", strength: 66 }, { name: "powdery", strength: 52 }, { name: "green", strength: 30 }, { name: "woody", strength: 29 }, { name: "musky", strength: 29 }, { name: "aromatic", strength: 23 }, { name: "fresh", strength: 21 }],
    ratingValue: 4.53, ratingCount: 6216, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.75930.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Sospiro-Perfumes/Vibrato-75930.html",
  },
  {
    brand: "Nishane", name: "Wulóng Chá", concentration: "EXTRAIT_DE_PARFUM", category: "NICHE", gender: "unisex",
    costPricePhp: 9500, releaseYear: 2015, perfumers: ["Jorge Lee"],
    notes: { top: ["Bergamot", "Orange", "Mandarin Orange", "Litsea Cubeba"], middle: ["Oolong tea", "Nutmeg"], base: ["Fig", "Musk"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "fresh spicy", strength: 36 }, { name: "aromatic", strength: 34 }, { name: "sweet", strength: 24 }, { name: "fruity", strength: 20 }, { name: "musky", strength: 18 }, { name: "powdery", strength: 14 }, { name: "woody", strength: 12 }],
    ratingValue: 4.25, ratingCount: 6852, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.30567.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Nishane/Wulong-Cha-30567.html",
  },
  {
    brand: "Miu Miu", name: "Miutine", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 3990, releaseYear: 2025, perfumers: ["Dominique Ropion"],
    notes: { top: ["Strawberry", "Citruses"], middle: ["Rose", "Gardenia", "Jasmine"], base: ["Brown sugar", "Patchouli", "Bourbon Vanilla", "Oakmoss", "Amber"] },
    accords: [{ name: "sweet", strength: 100 }, { name: "fruity", strength: 76 }, { name: "rose", strength: 45 }, { name: "patchouli", strength: 40 }, { name: "earthy", strength: 30 }, { name: "woody", strength: 30 }, { name: "vanilla", strength: 29 }, { name: "mossy", strength: 20 }],
    ratingValue: 3.72, ratingCount: 1595, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.113885.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Miu-Miu/Miutine-113885.html",
  },
  {
    brand: "Miu Miu", name: "Miu Miu Fleur de Lait", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 3990, releaseYear: 2023, perfumers: [],
    notes: { top: ["Mango"], middle: ["Osmanthus"], base: ["Coconut Milk"] },
    accords: [{ name: "fruity", strength: 100 }, { name: "tropical", strength: 95 }, { name: "sweet", strength: 73 }, { name: "coconut", strength: 72 }, { name: "floral", strength: 47 }, { name: "lactonic", strength: 41 }, { name: "terpenic", strength: 22 }, { name: "vanilla", strength: 22 }],
    ratingValue: 3.93, ratingCount: 1199, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.78755.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Miu-Miu/Miu-Miu-Fleur-de-Lait-78755.html",
  },
  {
    brand: "Prada", name: "Prada Paradoxe Intense", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5450, releaseYear: 2023, perfumers: ["Nadège Le Garlantezec", "Shyamala Maisondieu", "Antoine Maisondieu"],
    notes: { top: ["Neroli", "Pear", "Bergamot"], middle: ["Jasmine", "Neroli Essence", "Moss"], base: ["Bourbon Vanilla", "Vanilla", "Amber", "Ambrofix™", "Serenolide"] },
    accords: [{ name: "white floral", strength: 100 }, { name: "vanilla", strength: 72 }, { name: "citrus", strength: 70 }, { name: "mossy", strength: 61 }, { name: "amber", strength: 54 }, { name: "fruity", strength: 48 }, { name: "sweet", strength: 46 }, { name: "fresh", strength: 45 }],
    ratingValue: 4.12, ratingCount: 4381, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.83988.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Prada/Prada-Paradoxe-Intense-83988.html",
  },
  {
    brand: "Lancôme", name: "Idôle", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5450, releaseYear: 2019, perfumers: ["Shyamala Maisondieu", "Adriana Medina-Baez", "Nadege le Garlantezec", "Sonia Constant"],
    notes: { top: ["Pear", "Bergamot", "Pink Pepper"], middle: ["Rose", "Jasmine"], base: ["White Musk", "Vanilla", "Patchouli", "Cedar"] },
    accords: [{ name: "rose", strength: 100 }, { name: "musky", strength: 71 }, { name: "fruity", strength: 56 }, { name: "sweet", strength: 53 }, { name: "white floral", strength: 51 }, { name: "powdery", strength: 47 }, { name: "floral", strength: 45 }, { name: "citrus", strength: 40 }],
    ratingValue: 3.88, ratingCount: 13589, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.55795.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Lancome/Idole-55795.html",
  },
  {
    brand: "Lancôme", name: "Idôle Power", concentration: "EAU_DE_PARFUM", category: "DESIGNER", gender: "female",
    costPricePhp: 5350, releaseYear: 2024, perfumers: [],
    notes: { top: ["Apple"], middle: ["May Rose"], base: ["Sandalwood"] },
    accords: [{ name: "rose", strength: 100 }, { name: "woody", strength: 83 }, { name: "powdery", strength: 41 }, { name: "fruity", strength: 34 }, { name: "warm spicy", strength: 33 }, { name: "floral", strength: 29 }, { name: "fresh", strength: 21 }, { name: "green", strength: 17 }],
    ratingValue: 3.71, ratingCount: 935, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.101224.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Lancome/Idole-Power-101224.html",
  },
];

function slug(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function php(pesos: number) {
  return Math.round(pesos * 100);
}

function formatNotesSummary(notes: { top: string[]; middle: string[]; base: string[] }) {
  return [
    notes.top.length ? `Top: ${notes.top.join(", ")}` : null,
    notes.middle.length ? `Middle: ${notes.middle.join(", ")}` : null,
    notes.base.length ? `Base: ${notes.base.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function main() {
  const client = db();
  let productCount = 0;

  for (const entry of CATALOG) {
    const brandSlug = slug(entry.brand);
    const nameSlug = slug(entry.name);
    const costPrice = php(entry.costPricePhp);

    const productValues = {
      type: "FULL_BOTTLE" as const,
      fragranceCategory: entry.category,
      concentration: entry.concentration,
      name: entry.name,
      brand: entry.brand,
      gender: entry.gender,
      description: `${entry.name} by ${entry.brand} (${entry.releaseYear}).`,
      notes: formatNotesSummary(entry.notes),
      notePyramid: entry.notes,
      accords: entry.accords,
      perfumers: entry.perfumers,
      ratingValue: entry.ratingValue.toFixed(2),
      ratingCount: entry.ratingCount,
      releaseYear: entry.releaseYear,
      fragranticaUrl: entry.fragranticaUrl,
      costPrice,
      pricingMode: "PERCENTAGE" as const,
      pricingInput: 25,
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

    const retailPrice = Math.round(costPrice * 1.25);
    const [existingSku] = await client
      .select({ id: skus.id })
      .from(skus)
      .where(eq(skus.productId, productId))
      .limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({ retailPrice, pricingInput: retailPrice, updatedAt: new Date() })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: `${brandSlug}-${nameSlug}-FB`,
        label: "Full bottle",
        // sizeMl left unset — no bottle size was given, and this single
        // full-bottle SKU's price doesn't depend on it either way.
        condition: "BNIB",
        provenance: "RETAIL",
        packaging: "WITH_BOX",
        costPrice: 0,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        fulfillment: "PRE_ORDER",
        stock: 0,
        isTester: false,
      });
    }
    const [existingImage] = await client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .limit(1);
    if (existingImage) {
      await client
        .update(productImages)
        .set({ url: entry.imageUrl, alt: `${entry.brand} — ${entry.name}` })
        .where(eq(productImages.id, existingImage.id));
    } else {
      await client.insert(productImages).values({
        productId,
        url: entry.imageUrl,
        alt: `${entry.brand} — ${entry.name}`,
        position: 0,
      });
    }

    console.log(`✓ ${entry.brand} — ${entry.name} (cost ₱${entry.costPricePhp} -> retail ₱${(retailPrice / 100).toFixed(2)})`);
  }

  console.log(`\nInserted/updated ${productCount} full-bottle products.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
