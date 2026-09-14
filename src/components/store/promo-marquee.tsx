"use client";

import { usePathname } from "next/navigation";

/**
 * Announcement copy. Benefit first, plain language, no fine print — but every
 * line has to stay true to the live promo settings, because this is the first
 * thing a customer reads:
 *   - WELCOME10 is ORDER-scope 10% (fragrances only, delivery still charged),
 *     minSpendCentavos null (hence "no minimum spend") and onePerCustomer on.
 *   - ₱2,000 of discounted decants unlocks free delivery plus a tester, on
 *     delivered orders only.
 * If any of that changes in /admin/promo, change these lines with it.
 */
const ITEMS: { key: string; node: React.ReactNode }[] = [
  {
    key: "welcome",
    // The code and its terms are one offer, so they read as one line. The
    // explicit margin on the code is belt-and-braces next to the real space:
    // at this size the two were running together as "codeWELCOME10".
    node: (
      <>
        Enjoy 10% off your fragrances with code{" "}
        <strong className="mx-0.5 font-semibold tracking-[0.08em]">WELCOME10</strong>
        <span className="opacity-50">{" · "}</span>
        no minimum spend, one use per customer
      </>
    ),
  },
  { key: "delivery", node: "Free delivery on ₱2,000 of decants" },
  // Reads right after the delivery line above — a marquee scrolls in order, so
  // "Plus" always follows the ₱2,000 condition it depends on.
  { key: "tester", node: "Plus a complimentary tester, matched to your order" },
  { key: "brand", node: "Decants, partials and full bottles — find your signature scent" },
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
      className="marquee overflow-hidden bg-gold text-gold-foreground"
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
                key={item.key}
                className="flex items-center whitespace-nowrap py-1.5 text-[11px] tracking-wide sm:text-xs"
              >
                {item.node}
                <span aria-hidden className="px-3 opacity-60">
                  {" ◆ "}
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </aside>
  );
}
