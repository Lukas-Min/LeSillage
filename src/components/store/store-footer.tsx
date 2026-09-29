import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon, MessengerIcon } from "@/components/store/brand-icons";
import { getEnv } from "@/lib/env";
import { FACEBOOK_URL, MESSENGER_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/social-links";
import { FooterAccountLink } from "@/components/store/footer-account-link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All fragrances" },
      { href: "/shop?type=DECANT", label: "Decants" },
      { href: "/shop?type=FULL_BOTTLE", label: "Full bottles" },
      { href: "/shop?type=PARTIAL", label: "Partials" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/how-to-pay", label: "How to pay" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/policies", label: "Policies" },
    ],
  },
  {
    title: "Maison",
    links: [{ href: "/about", label: "About" }],
  },
] as const;

export function StoreFooter() {
  const env = getEnv();
  const email = env.GMAIL_USER;
  const phone = env.NEXT_PUBLIC_PHONE;
  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      {/* Matches the page-content container's cap (root layout, 2xl:80vw) so
          the footer's columns align with the content above instead of
          sitting flush against the edge of an ultra-wide screen. Four columns
          only from lg: below that each is too narrow for the email line, so
          it stays two columns rather than wrapping the address. */}
      <div className="grid w-full gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 2xl:mx-auto 2xl:max-w-[80vw]">
        <div className="space-y-3">
          <Link href="/" aria-label="Le Sillage Manila" className="flex items-center gap-2 font-serif-display text-lg">
            <Image src="/logo/mark.png" alt="" width={274} height={240} className="h-8 w-auto" />
            <span className="flex flex-col leading-none">
              <span>Le Sillage</span>
              <span className="font-sans text-[11px] sm:text-[10px] tracking-[0.32em] text-gold">Manila</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Curated retail perfume from independent and iconic houses. Full bottles, testers, partials, and decants.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {phone ? (
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-gold-ink" aria-hidden="true" />
                <a href={`tel:${phone}`} className="hover:text-foreground">{phone}</a>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-gold-ink" aria-hidden="true" />
              <a href={`mailto:${email}`} className="whitespace-nowrap hover:text-foreground">{email}</a>
            </li>
            <li className="flex items-center gap-2">
              <InstagramIcon className="h-3.5 w-3.5 shrink-0" />
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                @{INSTAGRAM_HANDLE}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <FacebookIcon className="h-3.5 w-3.5 shrink-0" />
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Facebook
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MessengerIcon className="h-3.5 w-3.5 shrink-0" />
              <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Messenger
              </a>
            </li>
          </ul>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gold-ink">{column.title}</p>
            <ul className="space-y-1 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
              {column.title === "Maison" ? (
                <li>
                  <FooterAccountLink />
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Le Sillage Manila
      </p>
    </footer>
  );
}