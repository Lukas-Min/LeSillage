"use server";

import { loadCatalogCards, type CatalogCardModel } from "@/lib/catalog";

export async function searchCatalog(query: string): Promise<CatalogCardModel[]> {
  const term = query.trim();
  if (term.length === 0) return [];
  return loadCatalogCards({ query: term });
}
