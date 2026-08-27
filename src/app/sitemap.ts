import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { skus } from "@/db/schema";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3030";
  const skuRows = await db().select({ id: skus.id }).from(skus).where(eq(skus.isActive, true));
  const staticRoutes = [
    "/",
    "/shop",
    "/how-to-pay",
    "/contact",
    "/about",
    "/faq",
    "/policies",
    "/collections/niche",
    "/collections/designer",
    "/collections/middle-eastern",
  ];
  return [
    ...staticRoutes.map((path, index) => ({
      url: `${base}${path}`,
      changeFrequency: (path === "/" || path === "/shop" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: index === 0 ? 1 : path === "/shop" ? 0.9 : 0.5,
    })),
    ...skuRows.map((row) => ({
      url: `${base}/shop/${row.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
