"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CatalogSort } from "@/lib/catalog";
import type { Concentration, FragranceCategory } from "@/db/schema";
import { CONCENTRATION_LABELS } from "@/domain/concentration";
import { GENDERS, GENDER_LABELS, type Gender } from "@/domain/gender";

const SORT_LABELS: Record<CatalogSort, string> = {
  featured: "Featured",
  rating: "Most rated",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const CATEGORY_LABELS: Record<FragranceCategory, string> = {
  NICHE: "Niche",
  DESIGNER: "Designer",
  MIDDLE_EASTERN: "Middle Eastern",
};

export function ShopToolbar({
  count,
  activeSort,
  activeCategory,
  activeConcentration,
  activeGender,
}: {
  count: number;
  activeSort: CatalogSort;
  activeCategory?: FragranceCategory;
  activeConcentration?: Concentration;
  activeGender?: Gender;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/shop?${params.toString()}`, { scroll: false });
  }

  const filterActive = Boolean(activeCategory || activeConcentration || activeGender);

  function clearFilters() {
    navigate({ gender: null, category: null, concentration: null });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {count} fragrance{count === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        {filterActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="min-h-11 gap-1 rounded-md text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 gap-1.5 rounded-md text-[10px] uppercase tracking-[0.2em]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {filterActive ? <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" /> : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Gender</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={activeGender ?? ""}
              onValueChange={(value) => navigate({ gender: value || null })}
            >
              <DropdownMenuRadioItem value="">Any gender</DropdownMenuRadioItem>
              {GENDERS.map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {GENDER_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Shelf</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={activeCategory ?? ""}
              onValueChange={(value) => navigate({ category: value || null })}
            >
              <DropdownMenuRadioItem value="">All shelves</DropdownMenuRadioItem>
              {(Object.keys(CATEGORY_LABELS) as FragranceCategory[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Concentration</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={activeConcentration ?? ""}
              onValueChange={(value) => navigate({ concentration: value || null })}
            >
              <DropdownMenuRadioItem value="">Any concentration</DropdownMenuRadioItem>
              {(Object.keys(CONCENTRATION_LABELS) as Concentration[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {CONCENTRATION_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 gap-1.5 rounded-md text-[10px] uppercase tracking-[0.2em]"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuRadioGroup value={activeSort} onValueChange={(value) => navigate({ sort: value === "featured" ? null : value })}>
              {(Object.keys(SORT_LABELS) as CatalogSort[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
