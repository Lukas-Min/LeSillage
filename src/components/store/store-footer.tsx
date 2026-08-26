import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All fragrances" },
      { href: "/shop?type=DECANT", label: "Decants" },
      { href: "/shop?type=FULL_BOTTLE", label: "Full bottles" },
      { href: "/shop?type=PARTIAL", label: "Partials" },
      { href: "/brands", label: "Brands" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/how-to-pay", label: "How to pay" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Maison",
    links: [
      { href: "/about", label: "About" },
      { href: "/policies", label: "Policies" },
    ],
  },
] as const;

export function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/30">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
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
