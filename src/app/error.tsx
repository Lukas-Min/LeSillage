"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="surface-grid mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <Eyebrow>Error</Eyebrow>
      <h1 className="font-serif-display text-3xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "The page could not be loaded. Try again."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="gold" className="rounded-md" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}