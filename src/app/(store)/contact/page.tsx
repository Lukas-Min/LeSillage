import Link from "next/link";
import { HelpCircle, Mail, MapPin, Phone } from "lucide-react";
import { FaFacebookF, FaFacebookMessenger, FaInstagram } from "react-icons/fa6";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { getEnv } from "@/lib/env";
import { FACEBOOK_URL, MESSENGER_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/social-links";

export default function ContactPage() {
  const env = getEnv();
  type ContactRow = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    href: string | null;
  };
  const rows: (ContactRow | null)[] = [
    { icon: Mail, label: "Order questions", value: env.GMAIL_USER, href: `mailto:${env.GMAIL_USER}` },
    env.NEXT_PUBLIC_PHONE
      ? { icon: Phone, label: "Phone", value: env.NEXT_PUBLIC_PHONE, href: `tel:${env.NEXT_PUBLIC_PHONE}` }
      : null,
    { icon: FaFacebookF, label: "Facebook", value: "Le Sillage Manila", href: FACEBOOK_URL },
    { icon: FaFacebookMessenger, label: "Messenger", value: "Message us", href: MESSENGER_URL },
    { icon: FaInstagram, label: "Instagram", value: `@${INSTAGRAM_HANDLE}`, href: INSTAGRAM_URL },
    { icon: MapPin, label: "Pickup", value: env.NEXT_PUBLIC_PICKUP_NOTES ?? "By appointment only.", href: null },
  ];
  const visibleRows = rows.filter((row): row is ContactRow => row !== null);

  return (
    <main className="w-full space-y-6 px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Help" title="Contact" />
        <SectionCard
          eyebrow="Response time"
          title="Usually within one business day"
          // `space-y-0` overrides SectionCard's default `space-y-4` on its
          // content wrapper. That margin lands *outside* each row's box —
          // between the divider and the next row — so it stacked on top of
          // the next row's own padding-top (32px above the icon vs. 16px
          // below it). With it gone, the rows' symmetric `py-4` is the only
          // spacing, so each row sits dead-centre between its dividers.
          contentClassName="space-y-0 divide-y divide-border/60"
        >
          {visibleRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-4">
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
