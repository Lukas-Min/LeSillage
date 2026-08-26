"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-gold">Error</p>
      <h1 className="font-serif-display text-3xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "The page could not be loaded. Try again."}
      </p>
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
