"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CustomerOption {
  id: string;
  name: string | null;
  email: string | null;
}

// Enough to scan; typing narrows the rest.
const MAX_SHOWN = 50;

function labelFor(option: CustomerOption): string {
  return option.name?.trim() || option.email || "Customer";
}

/**
 * Chips for the chosen customers, and a list with a search box on top to add
 * or remove them. Each chosen id posts as its own `name` field, so the action
 * reads them with `formData.getAll(name)`; nothing chosen posts nothing.
 *
 * The list opens in the page flow rather than floating, so a Card's
 * overflow-hidden can't clip it. `id` goes on the trigger button, so a
 * `<Label htmlFor={id}>` names the field; the search box is the combobox
 * while the list is open.
 */
export function CustomerMultiSelect({
  id,
  name,
  options,
  defaultSelected = [],
  emptyLabel,
  describedBy,
}: {
  id: string;
  name: string;
  options: readonly CustomerOption[];
  defaultSelected?: readonly string[];
  /** Shown when nothing is chosen, e.g. "Every customer". */
  emptyLabel: string;
  /** Id of the helper text under the field. */
  describedBy?: string;
}) {
  const [selected, setSelected] = useState<string[]>([...defaultSelected]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const byId = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) => option.name?.toLowerCase().includes(q) || option.email?.toLowerCase().includes(q),
    );
  }, [options, query]);
  const shown = matches.slice(0, MAX_SHOWN);
  const activeId = shown[active] ? `${listId}-${shown[active].id}` : undefined;

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

  function toggle(optionId: string) {
    const label = labelFor(byId.get(optionId) ?? { id: optionId, name: null, email: null });
    const removing = selected.includes(optionId);
    setSelected((current) =>
      removing ? current.filter((value) => value !== optionId) : [...current, optionId],
    );
    setAnnouncement(removing ? `Removed ${label}` : `Added ${label}`);
  }

  function openList() {
    setOpen(true);
    setActive(0);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Enter picks the highlighted customer instead of submitting the form.
      event.preventDefault();
      const option = shown[active];
      if (option) toggle(option.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Backspace" && query === "" && selected.length > 0) {
      toggle(selected[selected.length - 1]);
    }
  }

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <span role="status" className="sr-only">
        {announcement}
      </span>
      <div
        onClick={() => (open ? close() : openList())}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selected.map((value) => {
            const option = byId.get(value);
            const label = option ? labelFor(option) : "Unknown customer";
            return (
              <span
                key={value}
                className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-full bg-gold/25 py-0.5 pr-0.5 pl-2.5 text-xs font-medium text-foreground"
              >
                <span className="truncate" title={option?.email ?? undefined}>
                  {label}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(value);
                    (open ? searchRef : triggerRef).current?.focus();
                  }}
                  // 24px to look at, 44px to tap (the ::after extends the hit area).
                  className="relative flex size-6 shrink-0 items-center justify-center rounded-full after:absolute after:-inset-2.5 hover:bg-foreground/10"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            );
          })}
          <button
            ref={triggerRef}
            id={id}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-describedby={describedBy}
            onClick={(event) => {
              event.stopPropagation();
              if (open) close();
              else openList();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                openList();
              }
            }}
            className="min-h-8 min-w-11 flex-1 px-1 text-left text-muted-foreground outline-none"
          >
            {selected.length === 0 ? (
              emptyLabel
            ) : (
              <span className="sr-only">
                {selected.length} chosen. Add or remove customers
              </span>
            )}
          </button>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </div>
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
              aria-label="Search customers"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Search by name or email…"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label="Customers"
            aria-multiselectable="true"
            className="max-h-[min(16rem,40dvh)] overflow-y-auto p-1"
          >
            {shown.map((option, index) => {
              const isSelected = selected.includes(option.id);
              return (
                <li
                  key={option.id}
                  id={`${listId}-${option.id}`}
                  role="option"
                  aria-selected={isSelected}
                  // Keep focus in the search box when a row is clicked.
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => toggle(option.id)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1",
                    index === active && "bg-muted",
                  )}
                >
                  <Check className={cn("size-4 shrink-0 text-gold", !isSelected && "invisible")} />
                  <span className="min-w-0">
                    <span className="block truncate">{labelFor(option)}</span>
                    {option.name && option.email ? (
                      <span className="block truncate text-xs text-muted-foreground">{option.email}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 ? (
            <p role="status" className="px-3 pb-3 text-sm text-muted-foreground">
              {query.trim() ? <>No customers match &ldquo;{query.trim()}&rdquo;.</> : "No customers yet."}
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
