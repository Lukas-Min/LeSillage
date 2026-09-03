import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";
import { getEnv } from "@/lib/env";

// No DB fetch — env vars resolve synchronously, so this renders the exact
// same real content as page.tsx rather than a skeleton for any of it.
export default function ContactLoading() {
  const env = getEnv();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <Eyebrow>Help</Eyebrow>
          <h1 className="font-serif-display text-4xl">Contact</h1>
        </header>
        <Card className="rounded-md">
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed">
            <p className="text-muted-foreground">
              Questions about a fragrance, an order, or anything else — a real person reads every
              message and usually replies within one business day.
            </p>
            <p>For order questions: {env.GMAIL_USER}</p>
            {env.NEXT_PUBLIC_PHONE ? <p>Phone: {env.NEXT_PUBLIC_PHONE}</p> : null}
            <p>Pickup: {env.NEXT_PUBLIC_PICKUP_NOTES ?? "By appointment only."}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
