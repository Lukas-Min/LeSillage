"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DisclosureItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

interface DisclosureAccordionProps {
  items: DisclosureItem[];
  className?: string;
  itemClassName?: string;
}

export function DisclosureAccordion({
  items,
  className,
  itemClassName,
}: DisclosureAccordionProps) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {items.map((item) => (
        <DisclosureRow
          key={item.id}
          id={item.id}
          label={item.label}
          content={item.content}
          defaultOpen={item.defaultOpen}
          className={itemClassName}
        />
      ))}
    </div>
  );
}

function DisclosureRow({
  id,
  label,
  content,
  defaultOpen,
  className,
}: DisclosureItem & { className?: string }) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  return (
    <div className={cn("py-4", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`disclosure-${id}`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-foreground">
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      <div
        id={`disclosure-${id}`}
        hidden={!open}
        className="pt-3 text-sm leading-relaxed text-muted-foreground"
      >
        {content}
      </div>
    </div>
  );
}
