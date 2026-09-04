import Link from "next/link";
import Image from "next/image";
import { AtSign, Globe, Mail, MessageCircle, Phone } from "lucide-react";
import { getEnv } from "@/lib/env";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61591955240476";
const MESSENGER_URL = "https://m.me/61591955240476";

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
    links: [
      { href: "/about", label: "About" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
] as const;

export function StoreFooter() {
  const env = getEnv();
  const email = env.GMAIL_USER;
  const phone = env.NEXT_PUBLIC_PHONE;
  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-serif-display text-lg">
            <Image src="/logo/mark.png" alt="" width={274} height={240} className="h-8 w-auto" />
            Le Sillage
          </Link>
          <p className="text-sm text-muted-foreground">
            Curated retail perfume from independent and iconic houses. Full bottles, testers, partials, and decants.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {phone ? (
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gold" />
                <a href={`tel:${phone}`} className="hover:text-foreground">{phone}</a>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-gold" />
              <a href={`mailto:${email}`} className="hover:text-foreground">{email}</a>
            </li>
            <li className="flex items-center gap-2">
              <AtSign className="h-3.5 w-3.5 text-gold" />
              <span>@le.sillage.mnl</span>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-gold" />
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Facebook
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-gold" />
              <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Messenger
              </a>
            </li>
          </ul>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{column.title}</p>
            <ul className="space-y-1 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Le Sillage · Manila
      </p>
    </footer>
  );
}