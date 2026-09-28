"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyPromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void copy();
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" className="h-11 w-full font-price-display text-base sm:w-auto" onClick={() => void copy()}>
        {code}
      </Button>
      <p className="text-sm text-muted-foreground">{copied ? "Copied. Paste it at checkout." : "Tap the code to copy it."}</p>
    </div>
  );
}
