import { desc, eq, inArray, isNull, or } from "drizzle-orm";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { promoCodes, promoCodeRedemptions } from "@/db/schema";
import { formatPHP } from "@/domain/money";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/section";
import { PromoCodeList, type ProfilePromoCode } from "./promo-code-list";

export const dynamic = "force-dynamic";

export default async function AccountPromoCodesPage() {
  const user = await requireActiveCustomer();
  const codes = await loadAccountPromoCodes(user.id);
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Promo codes"
        subtitle="Codes for everyone, and any code made just for you. Tap one to copy it."
      />
      <PromoCodeList codes={codes} />
    </div>
  );
}

async function loadAccountPromoCodes(userId: string): Promise<ProfilePromoCode[]> {
  const client = db();
  const [listed, redeemed] = await Promise.all([
    client
      .select()
      .from(promoCodes)
      .where(or(isNull(promoCodes.restrictedUserId), eq(promoCodes.restrictedUserId, userId)))
      .orderBy(desc(promoCodes.createdAt)),
    client
      .select({ promoCodeId: promoCodeRedemptions.promoCodeId })
      .from(promoCodeRedemptions)
      .where(eq(promoCodeRedemptions.userId, userId)),
  ]);
  const redeemedIds = new Set(redeemed.map((row) => row.promoCodeId));
  const missingIds = [...redeemedIds].filter((id) => !listed.some((code) => code.id === id));
  const redeemedCodes = missingIds.length
    ? await client.select().from(promoCodes).where(inArray(promoCodes.id, missingIds))
    : [];
  const now = new Date();
  return [...listed, ...redeemedCodes].flatMap((code) => {
    const usedByCustomer = redeemedIds.has(code.id);
    const expired = Boolean(code.endsAt && code.endsAt < now);
    const notStarted = Boolean(code.startsAt && code.startsAt > now);
    const exhausted = code.maxRedemptions !== null && code.redemptionCount >= code.maxRedemptions;
    const valid = code.isActive && !expired && !exhausted && !usedByCustomer;
    if (code.restrictedUserId === null && !usedByCustomer && !valid) return [];
    const offer = code.type === "PERCENTAGE" ? `${code.amount}%` : formatPHP(code.amount);
    const target = code.scope === "ORDER" ? "off the order" : "off delivery";
    const conditions = [
      `${offer} ${target}.`,
      code.minSpendCentavos ? `Minimum spend ${formatPHP(code.minSpendCentavos)}.` : "No minimum spend.",
      code.firstOrderOnly ? "First order only." : null,
      code.onePerCustomer ? "Once per customer." : null,
      code.maxRedemptions === 1
        ? "One redemption in total."
        : code.maxRedemptions
          ? `Up to ${code.maxRedemptions} redemptions.`
          : null,
      code.restrictedUserId ? "Only for your account." : "Available to every customer.",
      code.startsAt ? `Starts ${formatDate(code.startsAt)}.` : null,
      code.endsAt ? `Ends ${formatDate(code.endsAt)}.` : null,
    ]
      .filter((line): line is string => line !== null)
      .join(" ");
    const note = usedByCustomer
      ? "Used"
      : !code.isActive
        ? "Inactive"
        : expired
          ? "Expired"
          : notStarted
            ? "Not open yet"
            : exhausted
              ? "Limit reached"
              : code.maxRedemptions
                ? `${code.maxRedemptions - code.redemptionCount} left`
                : "Ready";
    return [
      {
        id: code.id,
        code: code.code,
        conditions,
        note,
        group: valid ? "valid" as const : "used" as const,
      },
    ];
  });
}
