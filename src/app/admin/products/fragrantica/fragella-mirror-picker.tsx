"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, Sparkles, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  openFragellaMirrorEntry,
  searchFragellaMirrorAction,
  type MirrorLookupHit,
} from "@/actions/fragella-mirror-actions";

interface InitialHit extends Omit<MirrorLookupHit, "lastFetchedAt"> {
  lastFetchedAt: string;
}

export interface FragellaMirrorPickerProps {
  initialHits: InitialHit[];
  initialQuery: string;
  initialFilledFromFragella: number;
  mirrorTotal: number;
}

export function FragellaMirrorPicker({
  initialHits,
  initialQuery,
  initialFilledFromFragella,
  mirrorTotal,
}: FragellaMirrorPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<MirrorLookupHit[]>(
    initialHits.map((hit) => ({
      ...hit,
      lastFetchedAt: hit.lastFetchedAt,
    })),
  );
  const [filled, setFilled] = useState(initialFilledFromFragella);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setHits(
      initialHits.map((hit) => ({
        ...hit,
        lastFetchedAt: hit.lastFetchedAt,
      })),
    );
    setFilled(initialFilledFromFragella);
  }, [initialQuery, initialHits, initialFilledFromFragella]);

  const sortedHits = useMemo(() => hits, [hits]);

  function submit(form: FormData) {
    const nextQuery = String(form.get("query") ?? "").trim();
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("query", nextQuery);
        const result = await searchFragellaMirrorAction(fd);
        setQuery(result.query);
        setHits(result.hits);
        setFilled(result.filledFromFragella);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lookup failed");
      }
    });
  }

  function open(form: FormData) {
    startTransition(async () => {
      try {
        await openFragellaMirrorEntry(form);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Open failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <form action={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Browse local Fragella mirror
              </label>
              <Input
                name="query"
                defaultValue={query}
                placeholder="Search by name or brand"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {pending ? "Searching…" : "Search"}
            </Button>
          </form>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{mirrorTotal} cached</Badge>
            {filled > 0 ? (
              <Badge variant="default">
                <Sparkles className="h-3 w-3" /> Warmed {filled} from Fragella
              </Badge>
            ) : null}
            <span>Reads from the mirror; only falls back to Fragella when empty.</span>
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sortedHits.length === 0 ? (
          <li className="sm:col-span-2">
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nothing in the mirror yet. Search again or paste a Fragrantica page below to seed it.
              </CardContent>
            </Card>
          </li>
        ) : (
          sortedHits.map((hit) => (
            <li key={hit.id}>
              <Card>
                <CardContent className="space-y-2 p-4 text-sm">
                  <form action={open} className="flex items-center justify-between gap-3">
                    <input type="hidden" name="id" value={hit.id} />
                    <div className="min-w-0">
                      <p className="truncate font-serif-display text-base leading-tight">{hit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {hit.brand}
                        {hit.year ? ` · ${hit.year}` : ""}
                        {hit.gender ? ` · ${hit.gender}` : ""}
                      </p>
                      <p className="flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatTime(hit.lastFetchedAt)}
                      </p>
                    </div>
                    <Button type="submit" variant="outline" size="sm" disabled={pending}>
                      Use
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "refreshed today";
  if (days === 1) return "refreshed yesterday";
  if (days < 30) return `refreshed ${days}d ago`;
  const months = Math.round(days / 30);
  return `refreshed ${months}mo ago`;
}