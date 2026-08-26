import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { skus } from "@/db/schema";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const skuRows = await db().select({ id: skus.id }).from(skus).where(eq(skus.isActive, true));
  return [
    { url: `${base}/`, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/shop`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${base}/how-to-pay`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly" as const, priority: 0.5 },
    ...skuRows.map((row) => ({
      url: `${base}/shop/${row.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}