"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchCatalog } from "@/actions/catalog-search-actions";
import type { CatalogCardModel } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatPHPRange } from "@/domain/money";

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCardModel[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const term = query.trim();
    if (term.length === 0) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        setResults(await searchCatalog(term));
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Search" className="min-h-11 min-w-11">
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden rounded-md bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
            Search the shelf
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Oud, amber, Maison Ivre…"
          aria-label="Search"
          className="h-11 rounded-md"
        />
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {query.trim().length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Type to search the catalog.</p>
          ) : isPending && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            results.map((card) => (
              <Link
                key={card.productId}
                href={card.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/60"
              >
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {card.brand}
                  </span>
                  <span className="font-serif-display text-base">{card.name}</span>
                </span>
                <span className="text-sm tabular-nums">
                  {formatPHPRange(card.minDiscountedCentavos, card.maxDiscountedCentavos)}
                </span>
              </Link>
            ))
          )}
        </div>
        <Button asChild variant="outline" className="rounded-md" onClick={() => setOpen(false)}>
          <Link href={query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search"}>
            Open full search
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
