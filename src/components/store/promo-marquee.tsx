"use client";

import { usePathname } from "next/navigation";

/**
 * Copy for the announcement bar. Kept accurate to the live promo rules:
 * WELCOME10 is an ORDER-scope 10% code (merchandise only — delivery is still
 * charged) with onePerCustomer set and firstOrderOnly off, and the ₱2,000
 * decant threshold unlocks free delivery plus a tester on delivered orders.
 * If any of those settings change in /admin/promo, change these lines too.
 */
const ITEMS = [
  "Use code WELCOME10 for 10% off every fragrance",
  "One use per customer · applies to fragrances, not delivery",
  "₱2,000 of decants unlocks free delivery and a complimentary tester",
];

/**
 * A permanently scrolling announcement bar that sits above the header, at the
 * very top of the page. Two identical tracks sit side by side and the pair is
 * translated by half its width, so the loop closes seamlessly instead of
 * snapping back. The animation is pure CSS (see globals.css); this is a client
 * component only so it can stay off the admin portal, which shares the root
 * layout with the storefront.
 */
export function PromoMarquee() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <aside
      aria-label="Store promotions"
      className="marquee overflow-hidden border-b border-gold/40 bg-gold text-gold-foreground"
    >
      <div className="marquee-track flex w-max">
        {[0, 1].map((track) => (
          <ul
            key={track}
            className="flex shrink-0 items-center"
            // The second track exists only to make the loop seamless — it must
            // not be read out twice.
            aria-hidden={track === 1 ? true : undefined}
          >
            {ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center whitespace-nowrap py-1.5 text-[11px] tracking-wide sm:text-xs"
              >
                {item}
                <span aria-hidden className="px-4 opacity-60">
                  ◆
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </aside>
  );
}
