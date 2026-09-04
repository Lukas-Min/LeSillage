/**
 * Metadata-only backfill (as of 2026-09-03) for the 24 decant products
 * created by `import-decant-pricelist.ts`, which never fetched Fragrantica
 * data for them (see that file's own comment). Sets description, notes,
 * accords, perfumers, rating, releaseYear, and a clean product photo —
 * fetched from each fragrance's real Fragrantica page, same parsing logic
 * as src/lib/fragrantica.ts.
 *
 * Deliberately does NOT touch: costPrice/pricingMode/pricingInput,
 * sourceMl/remainingMl, type/fragranceCategory/concentration/gender, or any
 * SKU row — those are already correct and out of scope (per the store
 * owner: "dont edit the price of the decants").
 *
 * Usage: npx tsx scripts/backfill-decant-metadata.ts
 * Safe to re-run: matches existing rows by (brand, name, type="DECANT");
 * does nothing if a product isn't found (never inserts).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { productImages, products } from "../src/db/schema";
import { formatFragranceDescription } from "@/domain/product-type";

interface Accord {
  name: string;
  strength: number;
}

interface MetadataEntry {
  brand: string;
  name: string;
  releaseYear: number | null;
  perfumers: string[];
  notes: { top: string[]; middle: string[]; base: string[] };
  accords: Accord[];
  ratingValue: number | null;
  ratingCount: number | null;
  imageUrl: string;
  fragranticaUrl: string;
}

const CATALOG: MetadataEntry[] = [
  {
    brand: "Carolina Herrera", name: "Good Girl", releaseYear: 2016, perfumers: ["Louise Turner", "Quentin Bisch"],
    notes: { top: ["Almond", "Coffee", "Bergamot", "Lemon"], middle: ["Tuberose", "Jasmine Sambac", "Orange Blossom", "Bulgarian Rose", "Orris"], base: ["Tonka Bean", "Cacao", "Vanilla", "Praline", "Sandalwood", "Musk", "Amber", "Cashmere Wood", "Patchouli", "Cinnamon", "Cedar"] },
    accords: [{ name: "sweet", strength: 100 }, { name: "white floral", strength: 99 }, { name: "warm spicy", strength: 89 }, { name: "vanilla", strength: 89 }, { name: "amber", strength: 56 }, { name: "cacao", strength: 53 }, { name: "woody", strength: 52 }, { name: "tuberose", strength: 47 }],
    ratingValue: 3.95, ratingCount: 25681, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.39681.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Carolina-Herrera/Good-Girl-39681.html",
  },
  {
    brand: "Coach", name: "Dreams", releaseYear: 2020, perfumers: ["Antoine Maisondieu", "Natalie Gracia-Cetto", "Olivier Pescheux", "Shyamala Maisondieu"],
    notes: { top: ["Fruits", "Pear", "Bitter Orange"], middle: ["Gardenia", "Cactus Flower"], base: ["Ambroxan", "Woody Notes"] },
    accords: [{ name: "white floral", strength: 100 }, { name: "fruity", strength: 82 }, { name: "green", strength: 61 }, { name: "sweet", strength: 47 }, { name: "citrus", strength: 40 }, { name: "lactonic", strength: 40 }, { name: "amber", strength: 35 }, { name: "woody", strength: 32 }],
    ratingValue: 3.94, ratingCount: 1475, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.58846.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Coach/Coach-Dreams-58846.html",
  },
  {
    brand: "Coach", name: "Dreams Sunset", releaseYear: 2021, perfumers: ["Nathalie Lorson"],
    notes: { top: ["Pear Ice Cream", "Bergamot"], middle: ["Jasmine Sambac", "Magnolia"], base: ["Vanilla", "Tonka Bean"] },
    accords: [{ name: "vanilla", strength: 100 }, { name: "citrus", strength: 49 }, { name: "floral", strength: 47 }, { name: "white floral", strength: 37 }, { name: "fruity", strength: 33 }, { name: "sweet", strength: 28 }, { name: "aromatic", strength: 23 }, { name: "lactonic", strength: 21 }],
    ratingValue: 4.03, ratingCount: 1561, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.66267.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Coach/Coach-Dreams-Sunset-66267.html",
  },
  {
    brand: "Gucci", name: "Guilty Pour Homme Parfum", releaseYear: 2022, perfumers: [],
    notes: { top: ["Juniper", "Lavender", "Lemon"], middle: ["Orange Blossom", "Nutmeg", "Spanish Labdanum"], base: ["Dry Wood", "Patchouli", "Musk"] },
    accords: [{ name: "woody", strength: 100 }, { name: "fresh spicy", strength: 77 }, { name: "aromatic", strength: 73 }, { name: "citrus", strength: 45 }, { name: "lavender", strength: 39 }, { name: "musky", strength: 35 }, { name: "patchouli", strength: 34 }, { name: "white floral", strength: 33 }],
    ratingValue: 3.86, ratingCount: 2230, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.71378.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Gucci/Gucci-Guilty-Pour-Homme-Parfum-71378.html",
  },
  {
    brand: "Moschino", name: "Toy Boy", releaseYear: 2019, perfumers: ["Yann Vasnier"],
    notes: { top: ["Pink Pepper", "Pear", "Indonesian Nutmeg", "elemi", "Bergamot"], middle: ["Rose", "Clove", "Magnolia", "Flax"], base: ["Haitian Vetiver", "Cashmeran", "Sandalwood", "Amber", "Sylkolide"] },
    accords: [{ name: "rose", strength: 100 }, { name: "floral", strength: 64 }, { name: "woody", strength: 57 }, { name: "musky", strength: 55 }, { name: "soft spicy", strength: 52 }, { name: "fresh spicy", strength: 44 }, { name: "amber", strength: 43 }, { name: "aromatic", strength: 42 }],
    ratingValue: 3.99, ratingCount: 13201, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.55858.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Moschino/Toy-Boy-55858.html",
  },
  {
    brand: "Nautica", name: "Voyage Sport", releaseYear: 2016, perfumers: [],
    notes: { top: ["Sea Notes", "Citruses", "Sea Salt", "Coriander"], middle: ["Apple", "Geranium", "Palm Leaf", "Green Bell Pepper"], base: ["Musk", "Vetiver", "Patchouli", "Brazilian Redwood"] },
    accords: [{ name: "aromatic", strength: 100 }, { name: "marine", strength: 62 }, { name: "green", strength: 59 }, { name: "fresh", strength: 52 }, { name: "fresh spicy", strength: 47 }, { name: "salty", strength: 45 }, { name: "citrus", strength: 45 }, { name: "woody", strength: 44 }],
    ratingValue: 3.67, ratingCount: 547, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.36402.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Nautica/Nautica-Voyage-Sport-36402.html",
  },
  {
    brand: "Valentino", name: "Uomo Born In Roma Coral Fantasy", releaseYear: 2022, perfumers: ["Nicolas Beaulieu", "Jean-Christophe Hérault"],
    notes: { top: ["Red Apple", "Cardamom", "Calabrian bergamot"], middle: ["Lavender", "Bourbon Geranium", "Clary Sage"], base: ["Tobacco Leaf", "Patchouli", "Haitian Vetiver"] },
    accords: [{ name: "aromatic", strength: 100 }, { name: "fruity", strength: 66 }, { name: "tobacco", strength: 64 }, { name: "sweet", strength: 60 }, { name: "warm spicy", strength: 57 }, { name: "fresh spicy", strength: 53 }, { name: "lavender", strength: 46 }, { name: "woody", strength: 32 }],
    ratingValue: 4.57, ratingCount: 9679, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.71761.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Valentino/Valentino-Uomo-Born-In-Roma-Coral-Fantasy-71761.html",
  },
  {
    brand: "Versace", name: "Eros Energy", releaseYear: 2024, perfumers: [],
    notes: { top: ["Lemon", "Lime", "Grapefruit", "Blood Orange", "Sicilian Bergamot", "Mandarin Orange"], middle: ["Pink Pepper", "White Amber", "Black Currant"], base: ["Musk", "Oakmoss", "Patchouli"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "aromatic", strength: 18 }, { name: "fresh spicy", strength: 18 }, { name: "musky", strength: 13 }, { name: "woody", strength: 12 }, { name: "fruity", strength: 12 }, { name: "mossy", strength: 10 }, { name: "earthy", strength: 9 }],
    ratingValue: 3.98, ratingCount: 6570, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.92647.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Versace/Eros-Energy-92647.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Y Eau de Parfum", releaseYear: 2018, perfumers: ["Dominique Ropion", "Claire Liégent"],
    notes: { top: ["Apple", "Ginger", "Bergamot"], middle: ["Sage", "Juniper Berries", "Geranium"], base: ["Amberwood", "Tonka Bean", "Cedar", "Vetiver", "Olibanum"] },
    accords: [{ name: "aromatic", strength: 100 }, { name: "fresh spicy", strength: 98 }, { name: "woody", strength: 73 }, { name: "fruity", strength: 59 }, { name: "fresh", strength: 52 }, { name: "amber", strength: 52 }, { name: "citrus", strength: 46 }, { name: "herbal", strength: 39 }],
    ratingValue: 4.41, ratingCount: 28455, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.50757.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Y-Eau-de-Parfum-50757.html",
  },
  {
    brand: "Yves Saint Laurent", name: "Libre Flowers & Flames", releaseYear: 2024, perfumers: [],
    notes: { top: ["Lavender", "Bergamot"], middle: ["Orange Blossom", "Lavender", "Coconut", "Lily", "Palm Tree"], base: ["Vanilla"] },
    accords: [{ name: "white floral", strength: 100 }, { name: "vanilla", strength: 68 }, { name: "citrus", strength: 57 }, { name: "lavender", strength: 56 }, { name: "sweet", strength: 50 }, { name: "coconut", strength: 44 }, { name: "aromatic", strength: 30 }, { name: "fresh spicy", strength: 30 }],
    ratingValue: 4.15, ratingCount: 1955, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.95623.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Flowers-Flames-95623.html",
  },
  {
    brand: "Nishane", name: "Wulóng Chá", releaseYear: 2015, perfumers: ["Jorge Lee"],
    notes: { top: ["Bergamot", "Orange", "Mandarin Orange", "Litsea Cubeba"], middle: ["Oolong tea", "Nutmeg"], base: ["Fig", "Musk"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "fresh spicy", strength: 36 }, { name: "aromatic", strength: 34 }, { name: "sweet", strength: 24 }, { name: "fruity", strength: 20 }, { name: "musky", strength: 18 }, { name: "powdery", strength: 14 }, { name: "woody", strength: 12 }],
    ratingValue: 4.25, ratingCount: 6852, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.30567.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Nishane/Wulong-Cha-30567.html",
  },
  {
    brand: "Afnan", name: "Mystique Bouquet", releaseYear: 2024, perfumers: ["Imran Fazlani"],
    notes: { top: ["White Peach", "Mandarin Orange", "Bergamot", "Litchi"], middle: ["Orange Blossom", "Peony", "Vetiver", "Mahonia"], base: ["Musk", "Ambroxan", "oak moss", "Vanilla"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "musky", strength: 94 }, { name: "fruity", strength: 73 }, { name: "powdery", strength: 55 }, { name: "sweet", strength: 45 }, { name: "floral", strength: 44 }, { name: "amber", strength: 44 }, { name: "white floral", strength: 42 }],
    ratingValue: 4.08, ratingCount: 1509, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.92434.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Afnan/Mystique-Bouquet-92434.html",
  },
  {
    brand: "Armaf", name: "Club De Nuit Maleka", releaseYear: 2025, perfumers: ["Olivier Cresp"],
    notes: { top: ["Lychee", "Bergamot", "Pink Pepper"], middle: ["Orris"], base: ["Praline", "Sandalwood", "Ambroxan"] },
    accords: [{ name: "iris", strength: 100 }, { name: "powdery", strength: 93 }, { name: "fruity", strength: 85 }, { name: "woody", strength: 80 }, { name: "sweet", strength: 78 }, { name: "tropical", strength: 73 }, { name: "citrus", strength: 70 }, { name: "amber", strength: 59 }],
    ratingValue: 4.23, ratingCount: 1019, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.106168.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Armaf/Club-De-Nuit-Maleka-106168.html",
  },
  {
    brand: "Armaf", name: "Club De Nuit Intense Man Parfum", releaseYear: 2022, perfumers: [],
    notes: { top: ["Lemon", "Pineapple", "Bergamot", "Black Currant", "Apple"], middle: ["Birch", "Jasmine", "Rose"], base: ["Ambergris", "Musk", "Patchouli", "Vanilla"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "fruity", strength: 71 }, { name: "leather", strength: 53 }, { name: "woody", strength: 43 }, { name: "smoky", strength: 43 }, { name: "sweet", strength: 38 }, { name: "aromatic", strength: 34 }, { name: "fresh", strength: 33 }],
    ratingValue: 4.29, ratingCount: 3495, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.72842.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Armaf/Club-de-Nuit-Intense-Man-Parfum-72842.html",
  },
  {
    brand: "French Avenue", name: "Vulcan Feu", releaseYear: 2025, perfumers: [],
    notes: { top: ["Mango", "Lemon", "Ginger", "Rhubarb"], middle: ["Pink Pepper", "Jasmine", "Violet", "Praline"], base: ["Tonka Bean", "Cedarwood", "Ambergris", "Moss"] },
    accords: [{ name: "tropical", strength: 100 }, { name: "fruity", strength: 97 }, { name: "sweet", strength: 89 }, { name: "citrus", strength: 62 }, { name: "woody", strength: 38 }, { name: "fresh", strength: 37 }, { name: "fresh spicy", strength: 36 }, { name: "aromatic", strength: 35 }],
    ratingValue: 4.36, ratingCount: 6873, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.105520.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/French-Avenue/Vulcan-Feu-105520.html",
  },
  {
    brand: "French Avenue", name: "Liquid Brun", releaseYear: 2024, perfumers: [],
    notes: { top: ["Cinnamon", "Orange Blossom", "Cardamom", "Bergamot"], middle: ["Bourbon Vanilla", "elemi"], base: ["Praline", "Ambroxan", "Musk", "Guaiac Wood"] },
    accords: [{ name: "sweet", strength: 100 }, { name: "warm spicy", strength: 98 }, { name: "vanilla", strength: 95 }, { name: "cinnamon", strength: 71 }, { name: "white floral", strength: 45 }, { name: "powdery", strength: 44 }, { name: "citrus", strength: 40 }, { name: "aromatic", strength: 40 }],
    ratingValue: 4.43, ratingCount: 14011, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.94713.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/French-Avenue/Liquid-Brun-94713.html",
  },
  {
    brand: "Lattafa", name: "Ra'ed Luxe", releaseYear: 2019, perfumers: [],
    notes: { top: ["Juniper", "Watermelon", "Pineapple", "Jasmine", "Pink Pepper", "Silk Tree blossom"], middle: ["Herbal Notes", "Lavender", "Sage", "Cinnamon"], base: ["Ice", "Strawberry", "Sandalwood", "Vetiver", "Amber", "Musk", "Vanilla", "Tonka Bean", "Chestnut"] },
    accords: [{ name: "aromatic", strength: 100 }, { name: "fruity", strength: 73 }, { name: "woody", strength: 68 }, { name: "sweet", strength: 65 }, { name: "fresh", strength: 56 }, { name: "aquatic", strength: 53 }, { name: "fresh spicy", strength: 43 }, { name: "ozonic", strength: 42 }],
    ratingValue: 4.05, ratingCount: 657, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.65392.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Ra-ed-Luxe-65392.html",
  },
  {
    brand: "Mykonos", name: "Milk Drops", releaseYear: null, perfumers: [],
    notes: { top: ["Milk", "Vanilla", "Caramel"], middle: ["Tea", "Rose", "Almond"], base: ["Musk", "Vanilla", "Sandalwood", "Cedarwood"] },
    accords: [{ name: "musky", strength: 100 }, { name: "powdery", strength: 96 }, { name: "lactonic", strength: 76 }, { name: "woody", strength: 71 }, { name: "vanilla", strength: 65 }, { name: "sweet", strength: 44 }, { name: "rose", strength: 41 }, { name: "green", strength: 28 }],
    ratingValue: 4.12, ratingCount: 59, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.121112.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Mykonos/Milk-Drops-121112.html",
  },
  {
    brand: "Rasasi", name: "Hawas Kobra", releaseYear: 2025, perfumers: [],
    notes: { top: ["Ginger", "Bergamot", "Tangerine"], middle: ["Green Tea", "Cinnamon", "Neroli"], base: ["Musk", "Woodsy Notes", "Amber"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "fresh spicy", strength: 95 }, { name: "fresh", strength: 64 }, { name: "musky", strength: 57 }, { name: "woody", strength: 45 }, { name: "green", strength: 42 }, { name: "powdery", strength: 38 }, { name: "amber", strength: 37 }],
    ratingValue: 4.33, ratingCount: 2213, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.112706.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Rasasi/Hawas-Kobra-112706.html",
  },
  {
    brand: "Rasasi", name: "Hawas Ice", releaseYear: 2023, perfumers: [],
    notes: { top: ["Apple", "Italian Lemon", "Sicilian Bergamot", "Star Anise"], middle: ["Plum", "Orange Blossom", "Cardamon"], base: ["Musk", "Amber", "Driftwood", "Moss"] },
    accords: [{ name: "fruity", strength: 100 }, { name: "citrus", strength: 89 }, { name: "sweet", strength: 38 }, { name: "fresh", strength: 34 }, { name: "aromatic", strength: 32 }, { name: "musky", strength: 30 }, { name: "powdery", strength: 28 }, { name: "fresh spicy", strength: 27 }],
    ratingValue: 4.4, ratingCount: 8086, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.89050.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Rasasi/Hawas-Ice-89050.html",
  },
  {
    brand: "Rasasi", name: "Hawas Malibu", releaseYear: 2025, perfumers: [],
    notes: { top: ["Pineapple", "Orange", "Grapefruit"], middle: ["Orris", "Amber", "Lavender"], base: ["Tonka Bean", "Musk", "Patchouli", "Cashmeran"] },
    accords: [{ name: "sweet", strength: 100 }, { name: "amber", strength: 78 }, { name: "citrus", strength: 71 }, { name: "fruity", strength: 66 }, { name: "powdery", strength: 56 }, { name: "vanilla", strength: 45 }, { name: "iris", strength: 41 }, { name: "musky", strength: 41 }],
    ratingValue: 4.2, ratingCount: 926, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.112707.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Rasasi/Hawas-Malibu-112707.html",
  },
  {
    brand: "Rayhaan", name: "Pacific Aura", releaseYear: 2025, perfumers: [],
    notes: { top: ["Mandarin", "Mint", "Citron", "Bergamot", "Black Currant", "Coriander"], middle: ["Basil", "Carrot", "Rose"], base: ["Fig", "Ambroxan", "Amber"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "green", strength: 53 }, { name: "aromatic", strength: 51 }, { name: "fresh spicy", strength: 47 }, { name: "fruity", strength: 40 }, { name: "amber", strength: 23 }, { name: "soft spicy", strength: 17 }, { name: "sweet", strength: 14 }],
    ratingValue: 4.28, ratingCount: 1845, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.109709.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Rayhaan/Pacific-Aura-109709.html",
  },
  {
    brand: "Rayhaan", name: "Aquatica", releaseYear: 2025, perfumers: [],
    notes: { top: ["Lime", "Coconut Milk", "Bergamot", "Mandarin"], middle: ["Sugar Cane", "Jasmine", "Hibiscus", "Gardenia"], base: ["Rum", "Musk", "Tonka Bean", "Patchouli"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "sweet", strength: 63 }, { name: "coconut", strength: 47 }, { name: "vanilla", strength: 32 }, { name: "fresh spicy", strength: 22 }, { name: "conifer", strength: 20 }, { name: "lactonic", strength: 19 }, { name: "musky", strength: 18 }],
    ratingValue: 4.4, ratingCount: 2819, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.120605.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Rayhaan/Aquatica-120605.html",
  },
  {
    // Brand-new (2026) release — no votes yet, so rating stays null rather
    // than fabricated.
    brand: "Rayhaan", name: "Ayka", releaseYear: 2026, perfumers: [],
    notes: { top: ["Mandarin", "Citrus", "Peony"], middle: ["Rose", "Osmanthus"], base: ["Sandalwood", "Patchouli", "Pink Pepper"] },
    accords: [{ name: "citrus", strength: 100 }, { name: "woody", strength: 78 }, { name: "rose", strength: 68 }, { name: "fresh", strength: 56 }, { name: "patchouli", strength: 49 }, { name: "warm spicy", strength: 44 }, { name: "powdery", strength: 24 }, { name: "balsamic", strength: 24 }],
    ratingValue: null, ratingCount: null, imageUrl: "https://fimgs.net/mdimg/perfume-thumbs/375x500.140287.jpg",
    fragranticaUrl: "https://www.fragrantica.com/perfume/Rayhaan/Ayka-140287.html",
  },
];

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
  let updated = 0;
  let notFound = 0;

  for (const entry of CATALOG) {
    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, entry.brand), ilike(products.name, entry.name), eq(products.type, "DECANT")))
      .limit(1);

    if (!existing) {
      console.log(`✗ not found: ${entry.brand} — ${entry.name}`);
      notFound += 1;
      continue;
    }

    await client
      .update(products)
      .set({
        description: formatFragranceDescription(entry),
        notes: formatNotesSummary(entry.notes),
        notePyramid: entry.notes,
        accords: entry.accords,
        perfumers: entry.perfumers,
        ratingValue: entry.ratingValue !== null ? entry.ratingValue.toFixed(2) : null,
        ratingCount: entry.ratingCount,
        releaseYear: entry.releaseYear,
        fragranticaUrl: entry.fragranticaUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id));

    const [existingImage] = await client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, existing.id))
      .limit(1);
    if (existingImage) {
      await client
        .update(productImages)
        .set({ url: entry.imageUrl, alt: `${entry.brand} — ${entry.name}` })
        .where(eq(productImages.id, existingImage.id));
    } else {
      await client.insert(productImages).values({
        productId: existing.id,
        url: entry.imageUrl,
        alt: `${entry.brand} — ${entry.name}`,
        position: 0,
      });
    }

    console.log(`✓ ${entry.brand} — ${entry.name}${entry.ratingValue ? ` (${entry.ratingValue.toFixed(2)}★, ${entry.ratingCount} votes)` : " (no rating yet)"}`);
    updated += 1;
  }

  console.log(`\nUpdated ${updated} decant products${notFound ? `, ${notFound} not found` : ""}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
