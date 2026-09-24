"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  newest: "Newest",
  rating: "Most rated",
  discount_desc: "Biggest discount",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name_asc: "Name: A to Z",
  name_desc: "Name: Z to A",
};

// Below 400px the toolbar (count line + Clear/Filter/Sort) can't fit on one
// row with the button labels, so every toolbar button collapses to a uniform
// 44px square showing just its icon — the label stays in the DOM as sr-only
// so the accessible name is unchanged. Same `sr-only min-[…]:not-sr-only`
// pattern the header uses for its wordmark.
const TOOLBAR_BUTTON_CLASS =
  "min-h-11 min-w-11 gap-1.5 rounded-md px-0 text-[10px] uppercase tracking-[0.2em] min-[400px]:px-2.5";
const TOOLBAR_LABEL_CLASS = "sr-only min-[400px]:not-sr-only";

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

  // Every caller here is a filter or sort change (Clear, gender, shelf,
  // concentration, sort) — always drop `page` so it lands back on page 1
  // instead of keeping whatever page number the old filter/sort happened to
  // be on, which could now be out of range or just show a confusing slice
  // of the new result set.
  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
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
            className={cn(TOOLBAR_BUTTON_CLASS, "text-muted-foreground hover:text-foreground")}
          >
            <X className="h-3.5 w-3.5" />
            <span className={TOOLBAR_LABEL_CLASS}>Clear</span>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className={TOOLBAR_LABEL_CLASS}>Filter</span>
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
              className={TOOLBAR_BUTTON_CLASS}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className={TOOLBAR_LABEL_CLASS}>Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuRadioGroup value={activeSort} onValueChange={(value) => navigate({ sort: value === "name_asc" ? null : value })}>
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
