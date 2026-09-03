import Link from "next/link";
import { HelpCircle, Mail, MapPin, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { getEnv } from "@/lib/env";

// No DB fetch — env vars resolve synchronously, so this renders the exact
// same real content as page.tsx rather than a skeleton for any of it.
export default function ContactLoading() {
  const env = getEnv();
  const rows = [
    { icon: Mail, label: "Order questions", value: env.GMAIL_USER },
    env.NEXT_PUBLIC_PHONE ? { icon: Phone, label: "Phone", value: env.NEXT_PUBLIC_PHONE } : null,
    { icon: MapPin, label: "Pickup", value: env.NEXT_PUBLIC_PICKUP_NOTES ?? "By appointment only." },
  ].filter((row): row is { icon: typeof Mail; label: string; value: string } => row !== null);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Help"
          title="Contact"
          subtitle="Questions about a fragrance, an order, or anything else — a real person reads every message."
        />
        <SectionCard
          eyebrow="Response time"
          title="Usually within one business day"
          contentClassName="space-y-1 divide-y divide-border/60"
        >
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 pt-4 first:pt-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-foreground">
                <row.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{row.label}</p>
                <p className="text-sm">{row.value}</p>
              </div>
            </div>
          ))}
        </SectionCard>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Looking for a quick answer instead? Check the{" "}
          <Link href="/faq" className="text-foreground underline underline-offset-4 hover:text-gold-foreground">
            FAQ
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
