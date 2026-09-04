import { Loader2 } from "lucide-react";

// This is the fallback for the ROOT Suspense boundary that Next.js wraps
// around every route's `{children}` — not just "/". Because of how nested
// `loading.tsx` boundaries stream in (the outer one is established before
// Next has resolved which inner segment/module to render), THIS file flashes
// briefly on a hard refresh of ANY route, not only the homepage. It must
// stay generic — a page-specific skeleton here (e.g. a copy of the
// homepage's hero) would visibly flash on top of unrelated pages before
// their own `loading.tsx` takes over. Keep this minimal; each route's own
// `loading.tsx` is what actually shows a shaped skeleton for that route.
export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </main>
  );
}
