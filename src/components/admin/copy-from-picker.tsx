"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { loadProductCopyDetails, type ProductCopyDetails } from "@/actions/admin-catalog-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/admin/search-select";

/**
 * "Choose a fragrance" + "Load details" on New product. Loading fills the
 * form's fragrance fields in place (no page reload, so the type, cost and
 * pricing already typed stay). The loaded id posts with the form as `copyFrom`
 * (not just a picked one), so creating the product also copies the
 * fragrance's imported data and photos (upsertProduct); editing Name or Brand
 * afterwards drops it, since the product is no longer that fragrance.
 */
export function CopyFromPicker({ options }: { options: readonly SearchSelectOption[] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadedId, setLoadedId] = useState("");

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;
    function onInput(event: Event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement) || (field.name !== "name" && field.name !== "brand")) return;
      setLoadedId("");
      setMessage((current) =>
        current && !current.error
          ? { text: "Name or brand changed, so the notes layout, accords, ratings and photos won't be copied.", error: false }
          : current,
      );
    }
    form.addEventListener("input", onInput);
    return () => form.removeEventListener("input", onInput);
  }, []);

  function fill(details: ProductCopyDetails) {
    const form = buttonRef.current?.form;
    if (!form) return;
    for (const [name, value] of Object.entries(details)) {
      const field = form.querySelector(`[name="${name}"]`);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
        field.value = value;
        // A select without that option falls back to its first ("not set") one.
        if (field instanceof HTMLSelectElement && field.value !== value) field.selectedIndex = 0;
      }
    }
  }

  function load() {
    const form = buttonRef.current?.form;
    // By name, not form.elements.namedItem: that also matches the picker's
    // trigger button (id="copyFrom") and then returns both.
    const chosen = form?.querySelector<HTMLInputElement>('input[name="copyFromPick"]');
    const id = chosen?.value ?? "";
    if (!id) {
      setMessage({ text: "Pick a fragrance first.", error: true });
      return;
    }
    startTransition(async () => {
      const result = await loadProductCopyDetails(id);
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      fill(result.details);
      setLoadedId(id);
      setMessage({
        text: `Loaded ${result.details.brand} — ${result.details.name}. Creating the product also copies its notes layout, accords, ratings and photos.`,
        error: false,
      });
    });
  }

  return (
    <div className="space-y-2">
      {/* Top-aligned, not bottom: the search list opens under the field, and
          Load details should stay beside the field. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="copyFrom">Choose a fragrance</Label>
          <SearchSelect
            id="copyFrom"
            name="copyFromPick"
            options={options}
            placeholder="Pick a fragrance…"
            searchLabel="Search fragrances"
            searchPlaceholder="Search by brand or name…"
            noun="fragrances"
          />
        </div>
        {loadedId ? <input type="hidden" name="copyFrom" value={loadedId} /> : null}
        <Button ref={buttonRef} type="button" variant="outline" className="h-11 sm:mt-6" disabled={pending} onClick={load}>
          {pending ? "Loading…" : "Load details"}
        </Button>
      </div>
      {message ? (
        <p role={message.error ? "alert" : "status"} className={message.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {message.text}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Fills in Name/Brand/Shelf/Concentration/Gender/Description/Notes below — useful when adding e.g. the Full
        Bottle of a fragrance you already have as a Decant. You still set type, size, and price yourself.
      </p>
    </div>
  );
}
