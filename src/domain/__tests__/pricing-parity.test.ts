import { describe, expect, it } from "vitest";
import { computeRetailPrice } from "../pricing";
import { db } from "@/db/client";
import { skus } from "@/db/schema";

describe("seed pricing parity", () => {
  it("every sku stores a retailPrice equal to computeRetailPrice", async () => {
    const client = db();
    const rows = await client
      .select({
        id: skus.id,
        costPrice: skus.costPrice,
        retailPrice: skus.retailPrice,
        pricingMode: skus.pricingMode,
        pricingInput: skus.pricingInput,
      })
      .from(skus);
    if (rows.length === 0) return;
    for (const row of rows) {
      const expected = computeRetailPrice({
        costPriceCentavos: row.costPrice,
        mode: row.pricingMode,
        input: row.pricingInput,
      });
      expect({ id: row.id, stored: row.retailPrice, expected }).toEqual({
        id: row.id,
        stored: expected,
        expected,
      });
    }
  });
});
