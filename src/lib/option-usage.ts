import { db } from "@/db/client";
import { products, skus } from "@/db/schema";

/**
 * Option values that products or SKUs still store, per list key. These rows
 * store the value itself, so renaming or turning off a used value would leave
 * them pointing at nothing — the settings page locks those, and
 * saveOptionList (src/actions/option-list-actions.ts) refuses them.
 */
export async function loadOptionValuesInUse(): Promise<Map<string, Set<string>>> {
  const client = db();
  const [categories, skuValues] = await Promise.all([
    client.selectDistinct({ value: products.fragranceCategory }).from(products),
    client
      .selectDistinct({ condition: skus.condition, provenance: skus.provenance, packaging: skus.packaging })
      .from(skus),
  ]);
  const used = new Map<string, Set<string>>([
    ["fragrance_category", new Set(categories.map((row) => row.value))],
    ["condition", new Set()],
    ["provenance", new Set()],
    ["packaging", new Set()],
  ]);
  for (const row of skuValues) {
    if (row.condition) used.get("condition")!.add(row.condition);
    if (row.provenance) used.get("provenance")!.add(row.provenance);
    if (row.packaging) used.get("packaging")!.add(row.packaging);
  }
  return used;
}
