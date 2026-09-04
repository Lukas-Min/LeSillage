import Link from "next/link";
import { Globe, HelpCircle, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { getEnv } from "@/lib/env";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61591955240476";
const MESSENGER_URL = "https://m.me/61591955240476";

export default function ContactPage() {
  const env = getEnv();
  const rows = [
    { icon: Mail, label: "Order questions", value: env.GMAIL_USER, href: `mailto:${env.GMAIL_USER}` },
    env.NEXT_PUBLIC_PHONE
      ? { icon: Phone, label: "Phone", value: env.NEXT_PUBLIC_PHONE, href: `tel:${env.NEXT_PUBLIC_PHONE}` }
      : null,
    { icon: Globe, label: "Facebook", value: "Le Sillage", href: FACEBOOK_URL },
    { icon: MessageCircle, label: "Messenger", value: "Message us", href: MESSENGER_URL },
    { icon: MapPin, label: "Pickup", value: env.NEXT_PUBLIC_PICKUP_NOTES ?? "By appointment only.", href: null },
  ].filter(
    (row): row is { icon: typeof Mail; label: string; value: string; href: string | null } => row !== null,
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Help" title="Contact" />
        <SectionCard
          eyebrow="Response time"
          title="Usually within one business day"
          contentClassName="space-y-1 divide-y divide-border/60"
        >
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 pt-4 first:pt-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold">
                <row.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{row.label}</p>
                {row.href ? (
                  <a
                    href={row.href}
                    target={row.href.startsWith("http") ? "_blank" : undefined}
                    rel={row.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-foreground underline-offset-4 hover:underline"
                  >
                    {row.value}
                  </a>
                ) : (
                  <p className="text-sm">{row.value}</p>
                )}
              </div>
            </div>
          ))}
        </SectionCard>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Looking for a quick answer instead? Check the{" "}
          <Link href="/faq" className="text-foreground underline underline-offset-4 hover:text-gold">
            FAQ
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
