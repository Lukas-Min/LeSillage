import type { OrderStatus } from "@/db/schema";

// The specific pickup location — kept out of the public NEXT_PUBLIC_PICKUP_NOTES
// env var (shown to everyone on /contact, no order or sign-in needed) since
// this is a private residence, not a business storefront. It's only ever
// revealed to a customer on their own order once canRevealPickupAddress says
// so, both on the order page and in the order emails.
export const PICKUP_ADDRESS_NAME = "Moraleta Residence";
export const PICKUP_ADDRESS_LINE = "20 Balimbing St, Taguig, 1639 Metro Manila";

// Revealed once a pickup order has moved past AWAITING_PAYMENT — i.e. a
// receipt has been submitted at least once, so this is a real, paying
// customer rather than anyone who happened to start a checkout.
export function canRevealPickupAddress(status: OrderStatus): boolean {
  return status !== "AWAITING_PAYMENT";
}

/** One-line version for plain-text contexts (emails' text bodies). */
export function pickupAddressLine(status: OrderStatus): string {
  return canRevealPickupAddress(status)
    ? `${PICKUP_ADDRESS_NAME} — ${PICKUP_ADDRESS_LINE} (search "${PICKUP_ADDRESS_NAME}" on Google Maps or Apple Maps to find it)`
    : "We'll share the exact pickup address here once your payment is verified.";
}
