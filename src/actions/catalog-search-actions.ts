"use server";

import { searchCatalogCards, type SearchResultCard } from "@/lib/catalog";

export async function searchCatalog(query: string): Promise<SearchResultCard[]> {
  return searchCatalogCards(query);
}
