import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-gold">404</p>
      <h1 className="font-serif-display text-3xl">This trail ends here.</h1>
      <p className="text-sm text-muted-foreground">The page you are looking for has drifted.</p>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
    </main>
  );
}