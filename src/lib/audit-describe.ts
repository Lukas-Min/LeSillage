import { formatPHP } from "@/domain/money";
import { formatOrderStatus } from "@/components/ui/status-pill";

/**
 * Turns an audit_log row into a sentence for /admin/audit: who did what to
 * which thing, with links to that thing's admin page and a few readable
 * details pulled from the row's metadata. Pure: every name it shows comes
 * from `AuditLookups`, which the page loads in one batch per page of events.
 */

export const AUDIT_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "orders", label: "Orders" },
  { value: "catalog", label: "Catalog" },
  { value: "promos", label: "Promos" },
  { value: "payments", label: "Payments" },
  { value: "customers", label: "Customers" },
] as const;
export type AuditCategory = Exclude<(typeof AUDIT_CATEGORIES)[number]["value"], "all">;
export type AuditCategoryFilter = (typeof AUDIT_CATEGORIES)[number]["value"];

/** Which tab an action belongs to. Unknown actions (old or retired ones
 *  still in the table) fall under Catalog, where most of them came from. */
export function auditCategory(action: string): AuditCategory {
  if (action.startsWith("ORDER_")) return "orders";
  if (action.startsWith("PROMO_") || action === "ANNOUNCEMENT_UPDATE") return "promos";
  if (action.startsWith("QR_")) return "payments";
  if (/^(ACCOUNT|ADDRESS|WISHLIST|AUTH)_/.test(action)) return "customers";
  return "catalog";
}

/** SQL LIKE patterns per tab, for filtering in the query (see auditCategory). */
export const AUDIT_CATEGORY_PATTERNS: Record<Exclude<AuditCategory, "catalog">, string[]> = {
  orders: ["ORDER\\_%"],
  promos: ["PROMO\\_%", "ANNOUNCEMENT\\_UPDATE"],
  payments: ["QR\\_%"],
  customers: ["ACCOUNT\\_%", "ADDRESS\\_%", "WISHLIST\\_%", "AUTH\\_%"],
};

export interface AuditLookups {
  users: Map<string, { name: string | null; email: string | null; role: string }>;
  orders: Map<string, string>;
  products: Map<string, { brand: string; name: string }>;
  skus: Map<string, { label: string; productId: string }>;
  promoCodes: Map<string, string>;
  qrCodes: Map<string, string>;
}

export type AuditSegment = string | { text: string; href?: string };

export interface AuditDescription {
  category: AuditCategory;
  actor: { label: string; href?: string; system: boolean };
  /** The sentence after the actor's name, as text and links. */
  segments: AuditSegment[];
  /** Short extra lines: a reason, a price, what changed. */
  details: string[];
}

export interface AuditEventInput {
  actor: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function describeAuditEvent(event: AuditEventInput, lookups: AuditLookups): AuditDescription {
  const meta = (event.metadata && typeof event.metadata === "object" ? event.metadata : {}) as Record<string, unknown>;
  const str = (key: string) => (typeof meta[key] === "string" && (meta[key] as string).trim() ? (meta[key] as string).trim() : null);
  const num = (key: string) => (typeof meta[key] === "number" ? (meta[key] as number) : null);
  const target = event.targetId;
  const isSelf = target !== null && target === event.actor;

  const product = (id: string | null, fallbackName?: string | null): AuditSegment => {
    const row = id ? lookups.products.get(id) : undefined;
    if (row && id) return { text: `${row.brand} ${row.name}`, href: `/admin/products/${id}` };
    return fallbackName ?? "a product that's since been deleted";
  };
  const order = (id: string | null): AuditSegment => {
    const number = id ? lookups.orders.get(id) : undefined;
    return number && id ? { text: `order ${number}`, href: `/admin/orders/${id}` } : "an order";
  };
  const user = (id: string | null): AuditSegment => {
    const row = id ? lookups.users.get(id) : undefined;
    return row && id ? { text: row.name || row.email || "a customer", href: `/admin/customers/${id}` } : "a customer";
  };
  const promoCode = (): AuditSegment => {
    const code = (target && lookups.promoCodes.get(target)) || str("code");
    if (!code) return "a promo code";
    return target && lookups.promoCodes.has(target) ? { text: code, href: `/admin/promo/${target}` } : code;
  };
  const promoTerms = (): string[] => {
    const lines: string[] = [];
    const amount = num("amount");
    if (meta.typeAmounts && typeof meta.typeAmounts === "object") lines.push("A different amount per product type");
    else if (amount !== null) {
      const off = str("type") === "FIXED" ? `${formatPHP(amount)} off` : `${amount}% off`;
      lines.push(`${off} ${str("scope") === "DELIVERY" ? "the delivery fee" : "the order"}`);
    }
    if (Array.isArray(meta.allowedUserIds) && meta.allowedUserIds.length > 0) {
      lines.push(`Only for ${plural(meta.allowedUserIds.length, "customer")}`);
    }
    if (meta.firstOrderOnly === true) lines.push("First order only");
    if (meta.onePerCustomer === true) lines.push("Once per customer");
    return lines;
  };

  const sku = target ? lookups.skus.get(target) : undefined;
  const skuLabel: AuditSegment = sku?.label ?? "a size";
  const skuProduct = sku ? product(sku.productId) : "a product";

  let segments: AuditSegment[];
  const details: string[] = [];
  switch (event.action) {
    case "ORDER_STATUS": {
      const to = str("to");
      segments = ["moved ", order(target), " to ", to ? formatOrderStatus(to) : "a new status"];
      if (str("reason")) details.push(`Reason: ${str("reason")}`);
      break;
    }
    case "ORDER_TESTER_ASSIGN": {
      segments = ["picked the free tester for ", order(target)];
      const testerSku = str("skuId") ? lookups.skus.get(str("skuId")!) : undefined;
      if (testerSku) {
        const testerProduct = lookups.products.get(testerSku.productId);
        details.push(`Tester: ${testerProduct ? `${testerProduct.brand} ${testerProduct.name}, ` : ""}${testerSku.label}`);
      } else if (meta.skuId === null) details.push("Tester cleared");
      break;
    }
    case "ORDER_CANCEL_REQUEST":
      segments = ["asked to cancel ", order(target)];
      if (str("reason")) details.push(`Reason: ${str("reason")}`);
      break;
    case "ORDER_CANCEL_RESOLVE":
      segments =
        str("decision") === "DENIED"
          ? ["turned down the cancellation request for ", order(target)]
          : ["approved cancelling ", order(target)];
      break;
    case "ORDER_NOTE":
      segments = ["added a note to ", order(target)];
      if (str("note")) details.push(str("note")!);
      break;
    case "PRODUCT_CREATE": {
      segments = ["added ", product(target, str("name") && str("brand") ? `${str("brand")} ${str("name")}` : null)];
      const retail = num("retailPrice");
      const cost = num("costPrice");
      const markup = num("markupPercent");
      if (retail !== null) {
        details.push(
          `Sells at ${formatPHP(retail)}${cost !== null ? ` (cost ${formatPHP(cost)}${markup !== null ? ` + ${markup}%` : ""})` : ""}`,
        );
      }
      break;
    }
    case "PRODUCT_UPDATE":
      segments = ["edited ", product(target)];
      break;
    case "PRODUCT_DELETE":
      segments = ["deleted ", product(target, str("name"))];
      break;
    case "PRODUCT_ARCHIVE":
      segments = ["archived ", product(target)];
      break;
    case "PRODUCT_UNARCHIVE":
      segments = ["brought back ", product(target), " from the archive"];
      break;
    case "PRODUCT_FRAGELLA_IMPORT":
      segments = ["imported ", product(target), " from Fragrantica"];
      if (str("query")) details.push(`Looked up “${str("query")}”`);
      break;
    case "FRAGELLA_REFRESH": {
      const error = str("error");
      segments = [error ? "couldn't refresh the rating for " : "refreshed the rating for ", product(target, str("query"))];
      if (error) {
        // "Fragella 429: {"error":"Too Many Requests: …"}" → the readable part.
        const inner = error.match(/"error"\s*:\s*"([^"]+)"/)?.[1];
        details.push(inner ?? error.slice(0, 140));
      }
      break;
    }
    case "SKU_CREATE":
      segments = ["added the ", skuLabel, " size to ", skuProduct];
      break;
    case "SKU_UPDATE":
      segments = ["edited the ", skuLabel, " size of ", skuProduct];
      break;
    case "SKU_DELETE":
      segments = sku ? ["removed the ", skuLabel, " size from ", skuProduct] : ["deleted a size"];
      break;
    case "STOCK_ADJUST":
      segments = ["adjusted the stock of ", sku ? skuProduct : product(target)];
      if (num("stock") !== null) details.push(`Stock: ${num("stock")}`);
      if (str("note")) details.push(`Reason: ${str("note")}`);
      break;
    case "ML_ADJUST":
      segments = ["set the decant pool of ", product(target), num("remainingMl") !== null ? ` to ${num("remainingMl")}ml` : ""];
      if (str("note")) details.push(`Reason: ${str("note")}`);
      break;
    case "DISCOUNT_UPDATE":
      segments = ["changed the discount on ", product(target)];
      break;
    case "IMAGE_UPDATE": {
      const moved = Array.isArray(meta.photosMoved) ? meta.photosMoved.length : 0;
      segments = moved
        ? ["moved ", plural(moved, "photo"), " of ", product(target), " to the store's own storage"]
        : ["updated the photos of ", product(target)];
      break;
    }
    case "OPTION_VALUE_CHANGE": {
      segments = ["changed a dropdown's options"];
      const changed = Array.isArray(meta.changed) ? (meta.changed as Array<Record<string, unknown>>) : [];
      for (const option of changed.slice(0, 4)) {
        const label = typeof option.label === "string" ? option.label : "An option";
        details.push(`“${label}” ${option.isActive === false ? "turned off" : option.isActive === true ? "turned on" : "edited"}`);
      }
      break;
    }
    case "PROMO_UPDATE":
      segments = ["updated the promo settings"];
      if (num("announcedTo")) details.push(`Announced to ${plural(num("announcedTo")!, "subscriber")}`);
      break;
    case "ANNOUNCEMENT_UPDATE":
      segments = ["updated the announcement bar"];
      details.push(
        [meta.enabled === false ? "Turned off" : "Showing", num("messageCount") !== null ? plural(num("messageCount")!, "message") : null]
          .filter(Boolean)
          .join(" · "),
      );
      break;
    case "PROMO_CODE_CREATE":
      segments = ["created promo code ", promoCode()];
      details.push(...promoTerms());
      break;
    case "PROMO_CODE_UPDATE": {
      segments = ["edited promo code ", promoCode()];
      const previous = str("previousCode");
      if (previous && previous !== str("code")) details.push(`Renamed from ${previous}`);
      details.push(...promoTerms());
      break;
    }
    case "PROMO_CODE_DELETE": {
      segments = ["deleted promo code ", str("code") ?? "a promo code"];
      const used = num("redemptionCount");
      if (used !== null) details.push(`Used ${plural(used, "time")}`);
      break;
    }
    case "QR_CREATE":
    case "QR_UPDATE":
    case "QR_DELETE": {
      const bank = (target && lookups.qrCodes.get(target)) || str("bankName");
      const verb = event.action === "QR_CREATE" ? "added" : event.action === "QR_UPDATE" ? "updated" : "removed";
      segments = [`${verb} the `, bank ? { text: bank, href: "/admin/qr" } : "a", " payment QR code"];
      break;
    }
    case "ACCOUNT_UPDATE":
      segments = isSelf ? ["updated their profile"] : ["updated the profile of ", user(target)];
      break;
    case "ACCOUNT_DELETE":
      segments = isSelf ? ["deleted their account"] : ["deleted the account of ", user(target)];
      break;
    case "ACCOUNT_ARCHIVE":
      segments = isSelf ? ["closed their account"] : ["archived the account of ", user(target)];
      break;
    case "ACCOUNT_UNARCHIVE":
      segments = isSelf ? ["reopened their account"] : ["reopened the account of ", user(target)];
      break;
    case "ADDRESS_CREATE":
      segments = ["added a delivery address"];
      break;
    case "ADDRESS_UPDATE":
      segments = ["edited a delivery address"];
      break;
    case "ADDRESS_DELETE":
      segments = ["removed a delivery address"];
      break;
    case "WISHLIST_TOGGLE":
      segments =
        meta.saved === false
          ? ["removed ", product(target), " from their wishlist"]
          : ["saved ", product(target), " to their wishlist"];
      break;
    case "AUTH_SIGNUP":
      segments = ["created an account"];
      break;
    case "AUTH_PASSWORD_CHANGE":
      segments = ["changed their password"];
      break;
    case "AUTH_EMAIL_CHANGE":
      segments = ["changed their email address"];
      break;
    default:
      segments = [humanize(event.action).toLowerCase()];
      if (event.targetType === "product") segments.push(" · ", product(target));
      else if (event.targetType === "order") segments.push(" · ", order(target));
  }

  const actorRow = lookups.users.get(event.actor);
  const actor = actorRow
    ? {
        label: actorRow.name || actorRow.email || (actorRow.role === "ADMIN" ? "Admin" : "A customer"),
        href: actorRow.role === "ADMIN" ? undefined : `/admin/customers/${event.actor}`,
        system: false,
      }
    : UUID.test(event.actor)
      ? { label: "A deleted account", system: false }
      : { label: event.actor === "system" ? "System" : `System (${humanize(event.actor).toLowerCase()})`, system: true };

  return { category: auditCategory(event.action), actor, segments, details: details.filter(Boolean) };
}

const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/** "2026-10-11" in Manila time, for grouping events by day. */
export function auditDayKey(date: Date): string {
  return DAY_KEY_FORMATTER.format(date);
}

/** "Today", "Yesterday", or "Sat, Oct 4, 2026" (Manila time). */
export function auditDayLabel(date: Date, now: Date = new Date()): string {
  const key = auditDayKey(date);
  if (key === auditDayKey(now)) return "Today";
  if (key === auditDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "Yesterday";
  return DAY_FORMATTER.format(date);
}

export function auditTime(date: Date): string {
  return TIME_FORMATTER.format(date);
}
