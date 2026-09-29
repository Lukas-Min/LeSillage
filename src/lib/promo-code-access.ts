import { asc, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { promoCodeAllowedUsers, users, type PromoCode } from "@/db/schema";

type Reader = Pick<ReturnType<typeof db>, "select">;

/**
 * Attaches each code's allowed customers: its promo_code_allowed_user rows
 * plus the older single-customer restrictedUserId column, which a code saved
 * before the list existed may still carry. Empty means every customer. Pass
 * the transaction as `reader` when the codes were read (and locked) in one.
 */
export async function withAllowedUsers<T extends Pick<PromoCode, "id" | "restrictedUserId">>(
  codes: readonly T[],
  reader: Reader = db(),
): Promise<Array<T & { allowedUserIds: string[] }>> {
  const rows = codes.length
    ? await reader
        .select({ promoCodeId: promoCodeAllowedUsers.promoCodeId, userId: promoCodeAllowedUsers.userId })
        .from(promoCodeAllowedUsers)
        .where(
          inArray(
            promoCodeAllowedUsers.promoCodeId,
            codes.map((code) => code.id),
          ),
        )
    : [];
  const byCode = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = byCode.get(row.promoCodeId) ?? new Set<string>();
    set.add(row.userId);
    byCode.set(row.promoCodeId, set);
  }
  return codes.map((code) => {
    const allowed = new Set(byCode.get(code.id));
    if (code.restrictedUserId) allowed.add(code.restrictedUserId);
    return { ...code, allowedUserIds: [...allowed] };
  });
}

/** Whether this customer can see and use a code with these allowed customers. */
export function isAllowedFor(allowedUserIds: readonly string[], userId: string): boolean {
  return allowedUserIds.length === 0 || allowedUserIds.includes(userId);
}

/**
 * Customers the admin can add to a promo code's allowed list: every account
 * that hasn't been deleted, by name. An already-chosen id that isn't in that
 * list (a since-deleted account) is added as "Deleted account" so its chip
 * still shows and can be removed.
 */
export async function loadCustomerOptions(
  alreadyChosen: readonly string[] = [],
): Promise<Array<{ id: string; name: string | null; email: string | null }>> {
  const live = await db()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.name), asc(users.email));
  const liveIds = new Set(live.map((user) => user.id));
  const gone = alreadyChosen
    .filter((id) => !liveIds.has(id))
    .map((id) => ({ id, name: "Deleted account", email: null }));
  return [...live, ...gone];
}
