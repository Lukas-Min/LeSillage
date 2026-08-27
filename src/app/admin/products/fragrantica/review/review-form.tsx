"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { saveFragranticaImport } from "@/actions/fragrantica-actions";
import { saveFragranticaFromMirror } from "@/actions/fragella-mirror-actions";

export interface ReviewDefaults {
  name: string;
  brand: string;
  type: "FULL_BOTTLE" | "PARTIAL" | "DECANT";
  fragranceCategory: "NICHE" | "DESIGNER" | "MIDDLE_EASTERN";
  description: string;
  releaseYear: string;
  gender: string;
  longevity: string;
  sillage: string;
  priceValue: string;
  ratingValue: string;
  ratingCount: string;
  reviewsCount: string;
  imageUrl: string;
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  perfumers: string;
  accords: string;
}

export function FragranticaReviewForm({
  defaults,
  query,
  mirrorId,
}: {
  defaults: ReviewDefaults;
  query: string;
  mirrorId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(event.currentTarget);
      if (mirrorId) {
        await saveFragranticaFromMirror(fd);
      } else {
        await saveFragranticaImport(fd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input type="hidden" name="query" value={query} />
      {mirrorId ? <input type="hidden" name="mirrorId" value={mirrorId} /> : null}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={defaults.name} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" defaultValue={defaults.brand} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                defaultValue={defaults.type}
                className="h-11 rounded-lg border bg-background px-3 text-sm"
              >
                <option value="DECANT">Decant</option>
                <option value="FULL_BOTTLE">Full bottle</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fragranceCategory">Category</Label>
              <select
                id="fragranceCategory"
                name="fragranceCategory"
                defaultValue={defaults.fragranceCategory}
                className="h-11 rounded-lg border bg-background px-3 text-sm"
              >
                <option value="NICHE">Niche</option>
                <option value="DESIGNER">Designer</option>
                <option value="MIDDLE_EASTERN">Middle Eastern</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="releaseYear">Year</Label>
              <Input id="releaseYear" name="releaseYear" type="number" defaultValue={defaults.releaseYear} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" name="gender" defaultValue={defaults.gender} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={defaults.description} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input id="imageUrl" name="imageUrl" defaultValue={defaults.imageUrl} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="topNotes">Top notes</Label>
              <Textarea id="topNotes" name="topNotes" rows={3} defaultValue={defaults.topNotes} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="middleNotes">Middle notes</Label>
              <Textarea id="middleNotes" name="middleNotes" rows={3} defaultValue={defaults.middleNotes} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="baseNotes">Base notes</Label>
              <Textarea id="baseNotes" name="baseNotes" rows={3} defaultValue={defaults.baseNotes} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="accords">Accords (one per line, optional strength 0–100)</Label>
            <Textarea id="accords" name="accords" rows={3} defaultValue={defaults.accords} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="perfumers">Perfumers</Label>
            <Input id="perfumers" name="perfumers" defaultValue={defaults.perfumers} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="longevity">Longevity</Label>
              <Input id="longevity" name="longevity" defaultValue={defaults.longevity} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sillage">Sillage</Label>
              <Input id="sillage" name="sillage" defaultValue={defaults.sillage} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="priceValue">Price/value</Label>
              <Input id="priceValue" name="priceValue" defaultValue={defaults.priceValue} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ratingValue">Rating value</Label>
              <Input id="ratingValue" name="ratingValue" type="number" step="0.01" defaultValue={defaults.ratingValue} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ratingCount">Rating count</Label>
              <Input id="ratingCount" name="ratingCount" type="number" defaultValue={defaults.ratingCount} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reviewsCount">Reviews count</Label>
              <Input id="reviewsCount" name="reviewsCount" type="number" defaultValue={defaults.reviewsCount} />
            </div>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/products/fragrantica">Back to lookup</Link>
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : "Save product"}
        </Button>
      </div>
    </form>
  );
}