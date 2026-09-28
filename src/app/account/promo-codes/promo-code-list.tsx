"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export type ProfilePromoCode = {
  id: string;
  code: string;
  conditions: string;
  note: string;
  group: "valid" | "used";
};

const GROUPS = [
  { id: "valid", label: "Valid" },
  { id: "used", label: "Used" },
] as const;

export function PromoCodeList({ codes }: { codes: ProfilePromoCode[] }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("valid");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const visible = codes.filter((code) => code.group === group);

  async function copy(code: ProfilePromoCode) {
    try {
      await navigator.clipboard.writeText(code.code);
      setCopiedId(code.id);
      return;
    } catch {
      const field = document.createElement("textarea");
      field.value = code.code;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      setCopiedId(ok ? code.id : null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex w-full items-center sm:w-auto sm:gap-x-6">
        {GROUPS.map((item) => {
          const active = item.id === group;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center text-xs uppercase tracking-[0.22em] whitespace-nowrap transition-colors sm:flex-none",
                active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative pb-2">
                {item.label}
                {active ? <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-foreground" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
          <p className="text-sm text-muted-foreground">{group === "valid" ? "No valid codes." : "No used codes."}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((code) => (
            <li key={code.id} className="group relative">
              <button
                type="button"
                onClick={() => void copy(code)}
                aria-label={`Copy ${code.code}`}
                className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <SectionCard
                className="transition-colors group-hover:border-gold/50"
                eyebrow={copiedId === code.id ? "Copied" : code.note}
                title={<span className="font-price-display">{code.code}</span>}
                description={code.conditions}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
