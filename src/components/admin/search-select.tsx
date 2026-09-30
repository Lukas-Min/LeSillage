"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Extra words the search matches but the row doesn't show. */
  keywords?: string;
}

// Enough to scan; typing narrows the rest.
const MAX_SHOWN = 50;

/**
 * A single-choice select with a search box on top — the one-value sibling of
 * CustomerMultiSelect, with the same keyboard handling. The choice posts as a
 * hidden `name` field (with `form` when it belongs to a form elsewhere on the
 * page). The list opens in the page flow rather than floating, so a Card's
 * overflow-hidden can't clip it. `id` goes on the trigger button, so a
 * `<Label htmlFor={id}>` names the field.
 */
export function SearchSelect({
  id,
  name,
  form,
  options,
  defaultValue = "",
  placeholder,
  searchLabel,
  searchPlaceholder,
  noun,
}: {
  id: string;
  name: string;
  /** The `form` attribute for the hidden input, when the field sits outside its form. */
  form?: string;
  options: readonly SearchSelectOption[];
  defaultValue?: string;
  /** Shown when nothing is chosen. */
  placeholder: string;
  /** Accessible name of the search box, e.g. "Search fragrances". */
  searchLabel: string;
  searchPlaceholder: string;
  /** Plural used in the empty and overflow messages, e.g. "fragrances". */
  noun: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const chosen = options.find((option) => option.value === value);
  const matches = useMemo(() => {
    // Every word has to appear, in any order ("club intense" finds Armaf — Club De Nuit Intense Man).
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [options, query]);
  const shown = matches.slice(0, MAX_SHOWN);
  const activeId = shown[active] ? `${listId}-${active}` : undefined;

  useEffect(() => {
    if (!open) return;
    // On a phone the keyboard covers the lower half; start the field at the top.
    if (window.matchMedia("(max-width: 639px)").matches) rootRef.current?.scrollIntoView({ block: "start" });
    searchRef.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Focus stays in the search box, so keep the highlighted row in view.
  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  function openList() {
    setOpen(true);
    setQuery("");
    // Start on the current choice so the arrow keys move from there.
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function choose(option: SearchSelectOption) {
    setValue(option.value);
    close();
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Enter picks the highlighted row instead of submitting a form.
      event.preventDefault();
      const option = shown[active];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input type="hidden" name={name} value={value} form={form} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openList();
          }
        }}
        className="flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        <span className={cn("min-w-0 flex-1 truncate", !chosen && "text-muted-foreground")}>
          {chosen ? chosen.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-sm">
          <div className="border-b p-2">
            <Input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-expanded={true}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-label={searchLabel}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
            />
          </div>
          <ul id={listId} role="listbox" aria-label={searchLabel} className="max-h-[min(16rem,40dvh)] overflow-y-auto p-1">
            {shown.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  // Keep focus in the search box when a row is clicked.
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1",
                    index === active && "bg-muted",
                  )}
                >
                  <Check className={cn("size-4 shrink-0 text-gold-ink", !isSelected && "invisible")} />
                  <span className="min-w-0 truncate">{option.label}</span>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 ? (
            <p role="status" className="px-3 pb-3 text-sm text-muted-foreground">
              {query.trim() ? (
                <>
                  No {noun} match &ldquo;{query.trim()}&rdquo;.
                </>
              ) : (
                `No ${noun} yet.`
              )}
            </p>
          ) : null}
          {matches.length > shown.length ? (
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              {matches.length - shown.length} more — keep typing to narrow the list.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
