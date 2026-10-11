import Link from "next/link";
import { Suspense } from "react";
import { count, desc, inArray, like, not, or, type SQL } from "drizzle-orm";
import { Bot, Package, QrCode, ShoppingBag, Tag, UserRound, type LucideIcon } from "lucide-react";
import { db } from "@/db/client";
import { auditLog, orders, products, promoCodes, qrCodes, skus, users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AreaHeader } from "@/components/ui/page-layout";
import { AUDIT_TAB_CLASS, AuditListSkeleton } from "@/components/admin/audit-skeleton";
import {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_PATTERNS,
  auditCategory,
  auditDayKey,
  auditDayLabel,
  auditTime,
  describeAuditEvent,
  type AuditCategory,
  type AuditCategoryFilter,
  type AuditLookups,
  type AuditSegment,
} from "@/lib/audit-describe";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const CATEGORY_ICONS: Record<AuditCategory, LucideIcon> = {
  orders: ShoppingBag,
  catalog: Package,
  promos: Tag,
  payments: QrCode,
  customers: UserRound,
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const active: AuditCategoryFilter =
    AUDIT_CATEGORIES.find((tab) => tab.value === params.category)?.value ?? "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader
        eyebrow="Admin"
        title="Audit log"
        subtitle="Who changed what, newest first. Times are Manila time."
      />
      {/* loading.tsx doesn't re-show for a query-string-only change on this
          route, so tab and page switches get their own boundary. */}
      <Suspense key={`${active}:${page}`} fallback={<AuditListSkeleton active={active} />}>
        <AuditList active={active} page={page} />
      </Suspense>
    </div>
  );
}

function categoryCondition(category: AuditCategory): SQL | undefined {
  if (category === "catalog") {
    const others = Object.values(AUDIT_CATEGORY_PATTERNS).flat();
    return not(or(...others.map((pattern) => like(auditLog.action, pattern)))!);
  }
  return or(...AUDIT_CATEGORY_PATTERNS[category].map((pattern) => like(auditLog.action, pattern)));
}

async function AuditList({ active, page }: { active: AuditCategoryFilter; page: number }) {
  const client = db();
  const [countRows, rows] = await Promise.all([
    client.select({ action: auditLog.action, n: count() }).from(auditLog).groupBy(auditLog.action),
    client
      .select()
      .from(auditLog)
      .where(active === "all" ? undefined : categoryCondition(active))
      .orderBy(desc(auditLog.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const counts = new Map<AuditCategoryFilter, number>([["all", 0]]);
  for (const row of countRows) {
    const category = auditCategory(row.action);
    counts.set(category, (counts.get(category) ?? 0) + row.n);
    counts.set("all", (counts.get("all") ?? 0) + row.n);
  }
  const hasOlder = rows.length > PAGE_SIZE;
  const events = rows.slice(0, PAGE_SIZE);
  const lookups = await loadLookups(events);

  const hrefFor = (overrides: { category?: AuditCategoryFilter; page?: number }) => {
    const query = new URLSearchParams();
    const category = overrides.category ?? active;
    const nextPage = overrides.page ?? page;
    if (category !== "all") query.set("category", category);
    if (nextPage > 1) query.set("page", String(nextPage));
    const text = query.toString();
    return text ? `/admin/audit?${text}` : "/admin/audit";
  };

  // Newest first, grouped by Manila calendar day. Back-to-back identical
  // events (same person, action, thing and details, e.g. four Saves of one
  // product in a row) show as one row with a count instead of a wall.
  type Row = { event: (typeof events)[number]; repeats: number; oldest: Date };
  const days: { key: string; label: string; rows: Row[] }[] = [];
  const now = new Date();
  const sameAs = (a: (typeof events)[number], b: (typeof events)[number]) =>
    a.actor === b.actor &&
    a.action === b.action &&
    a.targetId === b.targetId &&
    JSON.stringify(a.metadata) === JSON.stringify(b.metadata);
  for (const event of events) {
    const key = auditDayKey(event.createdAt);
    const day = days[days.length - 1];
    const previous = day?.key === key ? day.rows[day.rows.length - 1] : undefined;
    if (previous && sameAs(previous.event, event)) {
      previous.repeats += 1;
      previous.oldest = event.createdAt;
    } else if (day?.key === key) {
      day.rows.push({ event, repeats: 1, oldest: event.createdAt });
    } else {
      days.push({ key, label: auditDayLabel(event.createdAt, now), rows: [{ event, repeats: 1, oldest: event.createdAt }] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Filter events" className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border">
        {AUDIT_CATEGORIES.map((tab) => {
          const isActive = tab.value === active;
          return (
            <Link
              key={tab.value}
              href={hrefFor({ category: tab.value, page: 1 })}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                AUDIT_TAB_CLASS,
                isActive ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label} ({counts.get(tab.value) ?? 0})
            </Link>
          );
        })}
      </nav>

      {events.length === 0 ? (
        <Card className="items-center justify-center p-10 text-center">
          <p className="font-serif-display text-lg">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            {page > 1 ? "There are no older events." : "Changes in this area will show up here as they happen."}
          </p>
        </Card>
      ) : (
        days.map((day) => (
          <section key={day.key} aria-labelledby={`audit-day-${day.key}`} className="space-y-2">
            <h2
              id={`audit-day-${day.key}`}
              className="px-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground"
            >
              {day.label}
            </h2>
            <Card className="gap-0 py-0">
              <ol className="divide-y divide-border">
                {day.rows.map(({ event, repeats, oldest }) => {
                  const description = describeAuditEvent(event, lookups);
                  const span =
                    repeats > 1 && auditTime(oldest) !== auditTime(event.createdAt)
                      ? `${auditTime(oldest)} – ${auditTime(event.createdAt)}`
                      : auditTime(event.createdAt);
                  const Icon = description.actor.system ? Bot : CATEGORY_ICONS[description.category];
                  return (
                    <li key={event.id} className="flex gap-3 px-4 py-3">
                      <span
                        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-gold-ink"
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm leading-snug break-words">
                          <Segment
                            segment={
                              description.actor.href
                                ? { text: description.actor.label, href: description.actor.href }
                                : description.actor.label
                            }
                            strong
                          />{" "}
                          {description.segments.map((segment, index) => (
                            <Segment key={index} segment={segment} />
                          ))}
                          {repeats > 1 ? (
                            <span className="ml-2 inline-block rounded-md border border-border px-1.5 py-0.5 align-middle text-[11px] text-muted-foreground">
                              {repeats} times
                            </span>
                          ) : null}
                        </p>
                        {description.details.length > 0 ? (
                          <ul className="flex flex-wrap gap-1.5">
                            {description.details.map((detail, index) => (
                              <li
                                key={index}
                                className="max-w-full break-words rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {detail}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <time
                        dateTime={event.createdAt.toISOString()}
                        title={formatDateTime(event.createdAt)}
                        className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
                      >
                        {span}
                      </time>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </section>
        ))
      )}

      {page > 1 || hasOlder ? (
        <div className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={hrefFor({ page: page - 1 })}>Newer</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {hasOlder ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={hrefFor({ page: page + 1 })}>Older</Link>
            </Button>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}

function Segment({ segment, strong = false }: { segment: AuditSegment; strong?: boolean }) {
  if (typeof segment === "string") return strong ? <span className="font-medium">{segment}</span> : <>{segment}</>;
  if (!segment.href) return <span className={strong ? "font-medium" : undefined}>{segment.text}</span>;
  return (
    <Link
      href={segment.href}
      className="font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
    >
      {segment.text}
    </Link>
  );
}

/** Every name a page of events mentions, in one query per table. */
async function loadLookups(events: (typeof auditLog.$inferSelect)[]): Promise<AuditLookups> {
  const client = db();
  const ids = (type: string) => events.filter((e) => e.targetType === type && e.targetId).map((e) => e.targetId!);
  const metaSkuIds = events
    .map((e) => (e.metadata as Record<string, unknown> | null)?.skuId)
    .filter((id): id is string => typeof id === "string");
  const userIds = [...new Set([...events.map((e) => e.actor), ...ids("user")])];
  const skuIds = [...new Set([...ids("sku"), ...metaSkuIds])];

  const [userRows, orderRows, skuRows, promoRows, qrRows] = await Promise.all([
    userIds.length
      ? client.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(inArray(users.id, userIds))
      : [],
    ids("order").length
      ? client.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders).where(inArray(orders.id, ids("order")))
      : [],
    skuIds.length
      ? client.select({ id: skus.id, label: skus.label, productId: skus.productId }).from(skus).where(inArray(skus.id, skuIds))
      : [],
    ids("promo_code").length
      ? client.select({ id: promoCodes.id, code: promoCodes.code }).from(promoCodes).where(inArray(promoCodes.id, ids("promo_code")))
      : [],
    ids("qr_code").length
      ? client.select({ id: qrCodes.id, bankName: qrCodes.bankName }).from(qrCodes).where(inArray(qrCodes.id, ids("qr_code")))
      : [],
  ]);
  const productIds = [...new Set([...ids("product"), ...skuRows.map((row) => row.productId)])];
  const productRows = productIds.length
    ? await client
        .select({ id: products.id, brand: products.brand, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds))
    : [];

  return {
    users: new Map(userRows.map((row) => [row.id, { name: row.name, email: row.email, role: row.role }])),
    orders: new Map(orderRows.map((row) => [row.id, row.orderNumber])),
    products: new Map(productRows.map((row) => [row.id, { brand: row.brand, name: row.name }])),
    skus: new Map(skuRows.map((row) => [row.id, { label: row.label, productId: row.productId }])),
    promoCodes: new Map(promoRows.map((row) => [row.id, row.code])),
    qrCodes: new Map(qrRows.map((row) => [row.id, row.bankName])),
  };
}
