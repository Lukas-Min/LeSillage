import type { OrderStatus } from "@/db/schema";

// The specific pickup location — kept out of the public NEXT_PUBLIC_PICKUP_NOTES
// env var (shown to everyone on /contact, no order or sign-in needed) since
// this is a private residence, not a business storefront. It's only ever
// revealed to a customer on their own order once canRevealPickupAddress says
// so, both on the order page and in the order emails.
export const PICKUP_ADDRESS_NAME = "Moraleta Residence";
export const PICKUP_ADDRESS_LINE = "20 Balimbing St, Taguig, 1639 Metro Manila";

// Revealed only after a receipt exists. CANCELLED and REJECTED are reachable
// straight from AWAITING_PAYMENT (instant cancel, admin reject, auto-reject)
// with no receipt row at all — status alone would otherwise publish the
// residence to anyone who started a checkout and then backed out. A later
// cancel, after the address was already shown, stops showing it too: a
// closed order should not keep directing someone to the house.
export function canRevealPickupAddress(status: OrderStatus): boolean {
  switch (status) {
    case "AWAITING_PAYMENT":
    case "REJECTED":
    case "CANCELLED":
      return false;
    case "RECEIPT_SUBMITTED":
    case "CONFIRMED":
    case "SHIPPED":
    case "DELIVERED":
    case "READY_FOR_PICKUP":
    case "COMPLETED":
      return true;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/** Title and description for the order page when the street address stays hidden. */
export function pickupAddressPlaceholder(status: OrderStatus): { title: string; description: string } {
  if (status === "CANCELLED" || status === "REJECTED") {
    return {
      title: "Pickup closed",
      description: "This order is closed, so the pickup address stays private.",
    };
  }
  return {
    title: "Address coming soon",
    description: "We'll share the exact pickup address here once your payment is verified.",
  };
}

/** One-line version for plain-text contexts (emails' text bodies). */
export function pickupAddressLine(status: OrderStatus): string {
  if (!canRevealPickupAddress(status)) return pickupAddressPlaceholder(status).description;
  return `${PICKUP_ADDRESS_NAME} — ${PICKUP_ADDRESS_LINE} (search "${PICKUP_ADDRESS_NAME}" on Google Maps or Apple Maps to find it)`;
}
