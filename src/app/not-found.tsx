import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";

export default function NotFound() {
  return (
    <main className="surface-grid mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <Eyebrow>404</Eyebrow>
      <h1 className="font-serif-display text-3xl">This trail ends here.</h1>
      <p className="text-sm text-muted-foreground">The page you are looking for has drifted.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">Return home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">Browse fragrances</Link>
        </Button>
      </div>
    </main>
  );
}