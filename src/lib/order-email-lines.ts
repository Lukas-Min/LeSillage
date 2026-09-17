import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, productImages, skus } from "@/db/schema";
import type { EmailLine } from "@/lib/email-templates";

/**
 * Primary product photo per SKU, for the order emails' HTML version.
 *
 * `order_item` snapshots the name and price at checkout but not the image, so
 * the *current* first photo of the SKU's product is looked up at send time. A
 * product with no photo is simply absent from the map and the template falls
 * back to an initial. One round trip for the whole order, however many lines.
 */
export async function loadSkuImageMap(skuIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(skuIds));
  if (unique.length === 0) return new Map();
  const rows = await db()
    .select({ skuId: skus.id, url: productImages.url, position: productImages.position })
    .from(skus)
    .innerJoin(productImages, eq(productImages.productId, skus.productId))
    .where(inArray(skus.id, unique));
  const map = new Map<string, string>();
  for (const row of rows.sort((a, b) => a.position - b.position)) {
    if (!map.has(row.skuId)) map.set(row.skuId, row.url);
  }
  return map;
}

type OrderItemRow = Pick<
  typeof orderItems.$inferSelect,
  | "skuId"
  | "productName"
  | "skuLabel"
  | "quantity"
  | "originalUnitCentavos"
  | "unitPriceCentavos"
  | "discountCentavos"
  | "lineTotalCentavos"
  | "productType"
  | "fulfillment"
>;

/**
 * `order_item` rows → email lines, with each line's photo attached. Shared by
 * checkout, receipt submission, status transitions and both cron emails so the
 * field mapping (and the image lookup) is maintained in exactly one place.
 */
export async function toEmailLines(rows: OrderItemRow[]): Promise<EmailLine[]> {
  const images = await loadSkuImageMap(rows.map((row) => row.skuId));
  return rows.map((row) => ({
    productName: row.productName,
    skuLabel: row.skuLabel,
    quantity: row.quantity,
    originalUnitCentavos: row.originalUnitCentavos,
    unitPriceCentavos: row.unitPriceCentavos,
    discountCentavos: row.discountCentavos,
    lineTotalCentavos: row.lineTotalCentavos,
    productType: row.productType,
    fulfillment: row.fulfillment,
    imageUrl: images.get(row.skuId) ?? null,
  }));
}
