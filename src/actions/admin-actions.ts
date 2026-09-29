"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { invalidateCatalog } from "@/lib/catalog";
import { signIn } from "@/auth";
import { db } from "@/db/client";
import { promoSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { assignTesterToOrder, resolveCancellationRequest as resolveCancellationRequestLib, transitionOrderStatus } from "@/lib/orders";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { formatPHP, toCentavos } from "@/domain/money";
import { parsePhDateBoundary, toDisplayDate } from "@/domain/ph-date";
import { siteWideDiscountFromSettings, type SiteWideDiscountConfig } from "@/domain/promo";
import { shouldAnnounceSiteWideDiscount } from "@/domain/marketing";
import { unsubscribePageUrl } from "@/lib/email-links";
import { siteWideDiscountEmail } from "@/lib/email-templates";
import { drainMarketingQueue, enqueueMarketingEmails } from "@/lib/marketing-queue";
import { loadMarketingRecipients } from "@/lib/marketing-recipients";
import { formatDate } from "@/lib/utils";

// decantThresholdCentavos/deliveryFeeCentavos are entered in pesos here
// (decimals allowed for centavos) and converted below via toCentavos — the
// field names keep their DB-column spelling, not their unit.
const promoSchema = z.object({
  decantThresholdCentavos: z.coerce.number().min(0).max(1_000_000),
  deliveryFeeCentavos: z.coerce.number().min(0).max(1_000_000),
  freeDeliveryEnabled: z.coerce.boolean(),
  testerBonusEnabled: z.coerce.boolean(),
  decantPreOrderThresholdMl: z.coerce.number().int().min(0).max(1000),
});

// Amount is pesos for FIXED (converted via toCentavos), a plain percent for PERCENTAGE.
const siteWideDiscountSchema = z.object({
  enabled: z.coerce.boolean(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  amount: z.coerce.number().min(0),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

/** Reported back to the form rather than thrown — a thrown Server Action
 *  error's message is redacted in production (see PromoCodeFormState). */
export interface SiteWideDiscountFormState {
  savedAt: number;
  error: string | null;
  /** How many subscribers this save is emailing, when it turned the sale on. */
  announcedTo?: number;
}

/** "From Oct 1 through Oct 5." / "Through Oct 5." / "Starts Oct 1." — Manila days, end date inclusive. */
function describeSaleWindow(config: SiteWideDiscountConfig, now: Date): string | null {
  const start = config.startsAt && config.startsAt > now ? formatDate(config.startsAt) : null;
  const end = config.endsAt ? formatDate(toDisplayDate(config.endsAt, "end")!) : null;
  if (start && end) return `From ${start} through ${end}.`;
  if (end) return `Through ${end}.`;
  if (start) return `Starts ${start}.`;
  return null;
}

/** Queues the sale email for every marketing subscriber. Returns how many. */
async function announceSiteWideDiscount(config: SiteWideDiscountConfig, now: Date): Promise<number> {
  const recipients = await loadMarketingRecipients();
  if (recipients.length === 0) return 0;
  const offer = `${config.type === "PERCENTAGE" ? `${config.amount}%` : formatPHP(config.amount)} off every fragrance`;
  const window = describeSaleWindow(config, now);
  await enqueueMarketingEmails(
    recipients.map((recipient) => ({
      recipient: recipient.email,
      template: "site_wide_discount_broadcast",
      ...siteWideDiscountEmail({ name: recipient.name, offer, window, unsubscribeUrl: unsubscribePageUrl(recipient.email) }),
    })),
  );
  // First batch now; the hourly marketing-emails cron sends the rest.
  after(() => drainMarketingQueue());
  return recipients.length;
}

export async function adminOAuthSignIn(provider: "google" | "facebook", returnTo?: string) {
  const decision = await rateLimit({
    bucket: "OAUTH",
    key: await getRequestKey("oauth-signin"),
    limit: 10,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many sign-in attempts. Please slow down.");
  await signIn(provider, { redirectTo: returnTo ?? "/account" });
}

export async function updatePromoSettings(formData: FormData) {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-update", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const parsed = promoSchema.parse({
    decantThresholdCentavos: formData.get("decantThresholdCentavos"),
    deliveryFeeCentavos: formData.get("deliveryFeeCentavos"),
    freeDeliveryEnabled: formData.get("freeDeliveryEnabled") === "on",
    testerBonusEnabled: formData.get("testerBonusEnabled") === "on",
    decantPreOrderThresholdMl: formData.get("decantPreOrderThresholdMl"),
  });
  const values = {
    decantThresholdCentavos: toCentavos(parsed.decantThresholdCentavos),
    deliveryFeeCentavos: toCentavos(parsed.deliveryFeeCentavos),
    freeDeliveryEnabled: parsed.freeDeliveryEnabled,
    testerBonusEnabled: parsed.testerBonusEnabled,
    decantPreOrderThresholdMl: parsed.decantPreOrderThresholdMl,
  };
  await db()
    .update(promoSettings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(promoSettings.id, "singleton"));
  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_UPDATE",
    targetType: "promo_setting",
    targetId: "singleton",
    metadata: values,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/promo");
  invalidateCatalog();
}

export async function updateSiteWideDiscount(
  _prev: SiteWideDiscountFormState,
  formData: FormData,
): Promise<SiteWideDiscountFormState> {
  const admin = await requireAdmin();
  const failed = (error: string): SiteWideDiscountFormState => ({ savedAt: 0, error });
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-update", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) return failed("Too many requests. Please slow down.");
  const result = siteWideDiscountSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    type: formData.get("type"),
    amount: formData.get("amount") || 0,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
  });
  if (!result.success) return failed("Check the type and amount.");
  const parsed = result.data;
  if (parsed.type === "PERCENTAGE" && parsed.amount > 100) return failed("Percentage discounts can't exceed 100%");
  if (parsed.enabled && parsed.amount <= 0) return failed("Enter an amount above 0 to turn the discount on");
  const startsAt = parsePhDateBoundary(parsed.startsAt, "start");
  const endsAt = parsePhDateBoundary(parsed.endsAt, "end");
  if (startsAt && endsAt && endsAt <= startsAt) {
    return failed("This discount would end before it starts — check the start and end dates");
  }
  const values = {
    siteWideDiscountEnabled: parsed.enabled,
    siteWideDiscountType: parsed.type,
    siteWideDiscountAmount: parsed.type === "FIXED" ? toCentavos(parsed.amount) : Math.round(parsed.amount),
    siteWideDiscountStartsAt: startsAt,
    siteWideDiscountEndsAt: endsAt,
  };
  // 0.4% rounds to 0 — that would save as "on" but discount nothing.
  if (parsed.enabled && values.siteWideDiscountAmount <= 0) {
    return failed("Enter an amount above 0 to turn the discount on");
  }
  // Read and write under the row lock, so two saves at once can't both see
  // the sale as off and both email every subscriber.
  const previousRow = await db().transaction(async (tx) => {
    const row = (await tx.select().from(promoSettings).where(eq(promoSettings.id, "singleton")).for("update"))[0];
    if (row) {
      await tx
        .update(promoSettings)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(promoSettings.id, "singleton"));
    }
    return row;
  });
  if (!previousRow) return failed("Promo settings are missing, so nothing was saved");
  const previous = siteWideDiscountFromSettings(previousRow);
  const now = new Date();
  const next = siteWideDiscountFromSettings(values);
  const announcedTo = shouldAnnounceSiteWideDiscount(previous, next, now) ? await announceSiteWideDiscount(next, now) : 0;
  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_UPDATE",
    targetType: "promo_setting",
    targetId: "singleton",
    metadata: { ...values, announcedTo },
  });
  revalidatePath("/admin/promo");
  invalidateCatalog();
  return { savedAt: Date.now(), error: null, announcedTo };
}

const transitionSchema = z.object({
  orderId: z.string().min(1),
  next: z.enum([
    "RECEIPT_SUBMITTED",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ]),
  reason: z.string().max(280).optional(),
});

// Expected rejections (a stale/raced order state, a missing reason) come
// back as `{ ok: false, error }` rather than being thrown — Next.js redacts
// a thrown Server Action error's message in production, turning e.g.
// "Invalid order transition" into React #441 boilerplate. Same pattern as
// CheckoutResult in src/actions/order-actions.ts.
export type OrderActionResult = { ok: true } | { ok: false; error: string };

// The single admin-triggered order-transition action — every OrderRowActions
// button (Confirm, Mark shipped, Mark ready for pickup, Mark delivered, Mark
// completed, Reject, Cancel) posts here with its own fixed `next`, rather
// than each button calling a different dedicated action and a client-side
// ternary picking between them. That ternary is exactly what caused the
// RECEIPT_SUBMITTED → SHIPPED bug: "Confirm" fell through to the wrong
// action because the dispatch condition didn't match any value a button
// actually sent. One action per transition target, chosen by the button
// itself, can't misroute.
const assignTesterSchema = z.object({
  orderId: z.string().min(1),
  skuId: z.string().min(1),
});

/** Admin picks (or swaps) the free tester an order earned — see
 *  `assignTesterToOrder` for the stock handling and the status window. */
export async function adminAssignTester(formData: FormData): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("order-tester", admin.id),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };
  const parsed = assignTesterSchema.safeParse({
    orderId: formData.get("orderId"),
    skuId: formData.get("skuId"),
  });
  if (!parsed.success) return { ok: false, error: "Pick a tester first" };
  try {
    await assignTesterToOrder(parsed.data);
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  await auditLogSubject({
    actor: admin.id,
    action: "ORDER_TESTER_ASSIGN",
    targetType: "order",
    targetId: parsed.data.orderId,
    metadata: { skuId: parsed.data.skuId },
  });
  return { ok: true };
}

export async function adminTransitionOrder(formData: FormData): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("order-transition", admin.id),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };
  const parsed = transitionSchema.parse({
    orderId: formData.get("orderId"),
    next: formData.get("next"),
    reason: formData.get("reason") ?? undefined,
  });
  try {
    await transitionOrderStatus({
      orderId: parsed.orderId,
      next: parsed.next,
      reason: parsed.reason ?? null,
    });
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/orders");
  await auditLogSubject({
    actor: admin.id,
    action: "ORDER_STATUS",
    targetType: "order",
    targetId: parsed.orderId,
    metadata: { to: parsed.next, reason: parsed.reason ?? null },
  });
  return { ok: true };
}

const resolveCancellationSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["APPROVED", "DENIED"]),
});

/** Admin approves or denies a customer's pending cancellation request on a
 *  CONFIRMED order — see customerCancelMode in src/domain/order-state.ts and
 *  resolveCancellationRequest in src/lib/orders.ts. */
export async function resolveCancellationRequest(formData: FormData): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("order-cancel-resolve", admin.id),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };
  const parsed = resolveCancellationSchema.parse({
    orderId: formData.get("orderId"),
    decision: formData.get("decision"),
  });
  try {
    await resolveCancellationRequestLib(parsed);
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.orderId}`);
  await auditLogSubject({
    actor: admin.id,
    action: "ORDER_CANCEL_RESOLVE",
    targetType: "order",
    targetId: parsed.orderId,
    metadata: { decision: parsed.decision },
  });
  return { ok: true };
}
