"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Admin-scoped error boundary. Without it the root boundary takes over and
 * replaces the whole shell with the storefront's "Back home" page, which is a
 * dead end mid-task. Expected rejections in the promo-code forms are returned
 * as state rather than thrown (see PromoCodeFormState), so reaching this really
 * does mean something unexpected broke.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-4 py-16">
      <h1 className="font-serif-display text-2xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        That action could not be completed. Try again — if it keeps happening, the server log has the details
        {error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="gold" className="rounded-md" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to admin</Link>
        </Button>
      </div>
    </main>
  );
}
