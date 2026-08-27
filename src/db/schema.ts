import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const productType = ["FULL_BOTTLE", "PARTIAL", "DECANT"] as const;
export type ProductType = (typeof productType)[number];

export const fragranceCategory = ["NICHE", "DESIGNER", "MIDDLE_EASTERN"] as const;
export type FragranceCategory = (typeof fragranceCategory)[number];

export const condition = ["BNIB", "SEALED", "FEW_SPRAYS_MISSING", "PARTIAL_ML"] as const;
export type Condition = (typeof condition)[number];

export const provenance = ["RETAIL", "TESTER"] as const;
export type Provenance = (typeof provenance)[number];

export const packaging = ["WITH_BOX", "BOTTLE_ONLY"] as const;
export type Packaging = (typeof packaging)[number];

export const fulfillment = ["PRE_ORDER", "ON_HAND"] as const;
export type Fulfillment = (typeof fulfillment)[number];

export const orderStatus = [
  "AWAITING_PAYMENT",
  "RECEIPT_SUBMITTED",
  "CONFIRMED",
  "SHIPPED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof orderStatus)[number];

export const fulfillmentMethod = ["DELIVERY", "PICKUP"] as const;
export type FulfillmentMethod = (typeof fulfillmentMethod)[number];

export const pricingMode = ["PERCENTAGE", "FIXED", "DIRECT"] as const;
export type PricingMode = (typeof pricingMode)[number];

export const discountType = ["PERCENTAGE", "FIXED"] as const;
export type DiscountType = (typeof discountType)[number];

export const stockMovementReason = [
  "INITIAL",
  "ADJUSTMENT",
  "ORDER_RESERVED",
  "ORDER_RELEASED",
  "ORDER_FULFILLED",
  "TESTER_ASSIGNED",
  "TESTER_RELEASED",
  "ML_RESERVED",
  "ML_RELEASED",
  "ML_ADJUST",
] as const;
export type StockMovementReason = (typeof stockMovementReason)[number];

export const testerResult = ["ASSIGNED", "PENDING", "SKIPPED"] as const;
export type TesterResult = (typeof testerResult)[number];

export const auditAction = [
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRODUCT_DELETE",
  "PRODUCT_ARCHIVE",
  "SKU_CREATE",
  "SKU_UPDATE",
  "SKU_DELETE",
  "STOCK_ADJUST",
  "ML_ADJUST",
  "DISCOUNT_UPDATE",
  "IMAGE_UPDATE",
  "PROMO_UPDATE",
  "QR_UPDATE",
  "PRODUCT_FRAGELLA_IMPORT",
  "FRAGELLA_REFRESH",
  "ORDER_STATUS",
  "ORDER_NOTE",
  "OPTION_VALUE_CHANGE",
  "ACCOUNT_UPDATE",
  "ACCOUNT_DELETE",
  "ADDRESS_CREATE",
  "ADDRESS_UPDATE",
  "ADDRESS_DELETE",
  "WISHLIST_TOGGLE",
  "AUTH_SIGNUP",
  "AUTH_PASSWORD_CHANGE",
  "AUTH_EMAIL_CHANGE",
] as const;
export type AuditAction = (typeof auditAction)[number];

export const userRole = ["CUSTOMER", "ADMIN"] as const;
export type UserRole = (typeof userRole)[number];

export const rateLimitBucket = [
  "AUTH",
  "OAUTH",
  "CHECKOUT",
  "RECEIPT",
  "LOOKUP",
  "PASSWORD",
  "ACCOUNT",
] as const;

export const emailVerificationPurpose = [
  "SIGNUP",
  "RESET_PASSWORD",
  "CHANGE_EMAIL",
  "REAUTH",
] as const;
export type EmailVerificationPurpose = (typeof emailVerificationPurpose)[number];
export type RateLimitBucket = (typeof rateLimitBucket)[number];

export const notificationChannel = ["EMAIL"] as const;
export type NotificationChannel = (typeof notificationChannel)[number];

export const notificationStatus = ["QUEUED", "SENT", "FAILED"] as const;
export type NotificationStatus = (typeof notificationStatus)[number];

// --- Auth.js core tables ---
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: text("role").$type<UserRole>().notNull().default("CUSTOMER"),
  phone: text("phone"),
  defaultAddressId: text("defaultAddressId"),
  marketingOptIn: boolean("marketingOptIn").notNull().default(false),
  passwordHash: text("passwordHash"),
  sessionVersion: integer("sessionVersion").notNull().default(0),
  deletedAt: timestamp("deletedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const emailVerificationCodes = pgTable(
  "email_verification_code",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    purpose: text("purpose").$type<EmailVerificationPurpose>().notNull(),
    tokenHash: text("tokenHash").notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    attemptCount: integer("attemptCount").notNull().default(0),
    consumedAt: timestamp("consumedAt", { mode: "date" }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    identifierPurposeIdx: index("email_verification_identifier_purpose_idx").on(
      t.identifier,
      t.purpose,
    ),
  }),
);

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// --- Customer-specific tables ---
export const addresses = pgTable(
  "address",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    recipientName: text("recipientName").notNull(),
    phone: text("phone").notNull(),
    region: text("region").notNull(),
    province: text("province").notNull(),
    city: text("city").notNull(),
    barangay: text("barangay").notNull(),
    postalCode: text("postalCode").notNull(),
    street: text("street").notNull(),
    isDefault: boolean("isDefault").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("address_user_idx").on(t.userId),
  }),
);

export const carts = pgTable(
  "cart",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
    guestToken: text("guestToken"),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("cart_user_idx").on(t.userId),
    guestIdx: index("cart_guest_idx").on(t.guestToken),
  }),
);

export const cartItems = pgTable(
  "cart_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cartId: text("cartId")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    skuId: text("skuId")
      .notNull()
      .references(() => skus.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    cartSkuIdx: uniqueIndex("cart_item_cart_sku_idx").on(t.cartId, t.skuId),
  }),
);

export const wishlists = pgTable(
  "wishlist",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    userProductIdx: uniqueIndex("wishlist_user_product_idx").on(t.userId, t.productId),
  }),
);

// --- Catalog ---
export const products = pgTable(
  "product",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text("type").$type<ProductType>().notNull(),
    fragranceCategory: text("fragranceCategory").$type<FragranceCategory>().notNull().default("NICHE"),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    family: text("family"),
    description: text("description"),
    notes: text("notes"),
    sourceMl: integer("sourceMl"),
    remainingMl: integer("remainingMl"),
    notePyramid: jsonb("notePyramid").$type<{ top: string[]; middle: string[]; base: string[] }>(),
    accords: jsonb("accords").$type<Array<{ name: string; strength?: number; color?: string | null }>>(),
    perfumers: jsonb("perfumers").$type<string[]>(),
    longevity: text("longevity"),
    sillage: text("sillage"),
    priceValue: text("priceValue"),
    longevityBreakout: jsonb("longevityBreakout").$type<Record<string, number>>(),
    sillageBreakout: jsonb("sillageBreakout").$type<Record<string, number>>(),
    priceValueBreakout: jsonb("priceValueBreakout").$type<Record<string, number>>(),
    seasonBreakout: jsonb("seasonBreakout").$type<Record<string, number>>(),
    genderBreakout: jsonb("genderBreakout").$type<Record<string, number>>(),
    relationBreakout: jsonb("relationBreakout").$type<Record<string, number>>(),
    ratingValue: numeric("ratingValue", { precision: 4, scale: 2 }),
    ratingCount: integer("ratingCount"),
    reviewsCount: integer("reviewsCount"),
    releaseYear: integer("releaseYear"),
    gender: text("gender"),
    fragranticaUrl: text("fragranticaUrl"),
    fragellaId: text("fragellaId"),
    fragellaQuery: text("fragellaQuery"),
    fragellaFetchedAt: timestamp("fragellaFetchedAt", { mode: "date" }),
    fragellaPayload: jsonb("fragellaPayload"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("product_type_idx").on(t.type),
    brandIdx: index("product_brand_idx").on(t.brand),
    categoryIdx: index("product_category_idx").on(t.fragranceCategory),
  }),
);

export const skus = pgTable(
  "sku",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    label: text("label").notNull(),
    sizeMl: integer("sizeMl"),
    condition: text("condition").$type<Condition>().notNull().default("BNIB"),
    provenance: text("provenance").$type<Provenance>().notNull().default("RETAIL"),
    packaging: text("packaging").$type<Packaging>().notNull().default("WITH_BOX"),
    costPrice: integer("costPrice").notNull(),
    retailPrice: integer("retailPrice").notNull(),
    pricingMode: text("pricingMode").$type<PricingMode>().notNull().default("PERCENTAGE"),
    pricingInput: integer("pricingInput").notNull().default(0),
    fulfillment: text("fulfillment").$type<Fulfillment>().notNull(),
    stock: integer("stock").notNull().default(0),
    isTester: boolean("isTester").notNull().default(false),
    testerFamily: text("testerFamily"),
    testerBrand: text("testerBrand"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    productIdx: index("sku_product_idx").on(t.productId),
    skuIdx: uniqueIndex("sku_sku_idx").on(t.sku),
    conditionIdx: index("sku_condition_idx").on(t.condition),
    provenanceIdx: index("sku_provenance_idx").on(t.provenance),
  }),
);

export const productImages = pgTable(
  "product_image",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    productIdx: index("product_image_product_idx").on(t.productId),
  }),
);

export const productDiscounts = pgTable(
  "product_discount",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: text("type").$type<DiscountType>().notNull(),
    amount: integer("amount").notNull(),
    startsAt: timestamp("startsAt", { mode: "date" }),
    endsAt: timestamp("endsAt", { mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    productIdx: index("product_discount_product_idx").on(t.productId),
  }),
);

export const promoSettings = pgTable("promo_setting", {
  id: text("id")
    .primaryKey()
    .default("singleton"),
  decantThresholdCentavos: integer("decantThresholdCentavos").notNull().default(200000),
  deliveryFeeCentavos: integer("deliveryFeeCentavos").notNull().default(12000),
  freeDeliveryEnabled: boolean("freeDeliveryEnabled").notNull().default(true),
  testerBonusEnabled: boolean("testerBonusEnabled").notNull().default(true),
  decantPreOrderThresholdMl: integer("decantPreOrderThresholdMl").notNull().default(10),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const qrCodes = pgTable("qr_code", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  bankName: text("bankName").notNull(),
  accountName: text("accountName").notNull(),
  accountNumber: text("accountNumber").notNull(),
  imageUrl: text("imageUrl").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const stockMovements = pgTable(
  "stock_movement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    skuId: text("skuId")
      .notNull()
      .references(() => skus.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    reason: text("reason").$type<StockMovementReason>().notNull(),
    orderId: text("orderId"),
    note: text("note"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    skuIdx: index("stock_movement_sku_idx").on(t.skuId),
    orderIdx: index("stock_movement_order_idx").on(t.orderId),
  }),
);

// --- Orders ---
export const orders = pgTable(
  "order",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderNumber: text("orderNumber").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("AWAITING_PAYMENT"),
    fulfillmentMethod: text("fulfillmentMethod")
      .$type<FulfillmentMethod>()
      .notNull(),
    recipientName: text("recipientName").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    addressSnapshot: jsonb("addressSnapshot"),
    pickupNotes: text("pickupNotes"),
    notes: text("notes"),
    subtotalCentavos: integer("subtotalCentavos").notNull(),
    discountCentavos: integer("discountCentavos").notNull().default(0),
    deliveryFeeCentavos: integer("deliveryFeeCentavos").notNull().default(0),
    totalCentavos: integer("totalCentavos").notNull(),
    promoTesterResult: text("promoTesterResult").$type<TesterResult>(),
    promoTesterSkuId: text("promoTesterSkuId").references(() => skus.id, {
      onDelete: "set null",
    }),
    statusReason: text("statusReason"),
    statusUpdatedAt: timestamp("statusUpdatedAt", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orderNumberIdx: uniqueIndex("order_number_idx").on(t.orderNumber),
    userIdx: index("order_user_idx").on(t.userId),
    statusIdx: index("order_status_idx").on(t.status),
  }),
);

export const orderItems = pgTable(
  "order_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    skuId: text("skuId")
      .notNull()
      .references(() => skus.id, { onDelete: "restrict" }),
    productName: text("productName").notNull(),
    skuLabel: text("skuLabel").notNull(),
    productType: text("productType").$type<ProductType>().notNull(),
    fragranceCategory: text("fragranceCategory").$type<FragranceCategory>(),
    condition: text("condition").$type<Condition>(),
    provenance: text("provenance").$type<Provenance>(),
    packaging: text("packaging").$type<Packaging>(),
    fulfillment: text("fulfillment").$type<Fulfillment>().notNull(),
    quantity: integer("quantity").notNull(),
    originalUnitCentavos: integer("originalUnitCentavos").notNull(),
    unitPriceCentavos: integer("unitPriceCentavos").notNull(),
    discountCentavos: integer("discountCentavos").notNull().default(0),
    lineTotalCentavos: integer("lineTotalCentavos").notNull(),
  },
  (t) => ({
    orderIdx: index("order_item_order_idx").on(t.orderId),
    skuIdx: index("order_item_sku_idx").on(t.skuId),
  }),
);

export const receipts = pgTable(
  "receipt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    blobUrl: text("blobUrl").notNull(),
    submittedAt: timestamp("submittedAt", { mode: "date" }).notNull().defaultNow(),
    note: text("note"),
  },
  (t) => ({
    orderIdx: index("receipt_order_idx").on(t.orderId),
  }),
);

// --- Admin & security ---
export const adminSessions = pgTable("admin_session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  issuedAt: timestamp("issuedAt", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  ipHash: text("ipHash"),
});

export const optionLists = pgTable("option_list", {
  key: text("key").primaryKey(),
  description: text("description"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const optionValues = pgTable(
  "option_value",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    listKey: text("listKey")
      .notNull()
      .references(() => optionLists.key, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
  },
  (t) => ({
    listPositionIdx: uniqueIndex("option_value_list_position_idx").on(t.listKey, t.position),
    listValueIdx: uniqueIndex("option_value_list_value_idx").on(t.listKey, t.value),
  }),
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId").references(() => orders.id, { onDelete: "set null" }),
    channel: text("channel").$type<NotificationChannel>().notNull().default("EMAIL"),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    status: text("status").$type<NotificationStatus>().notNull(),
    error: text("error"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("notification_log_order_idx").on(t.orderId),
    statusIdx: index("notification_log_status_idx").on(t.status),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actor: text("actor").notNull(),
    action: text("action").$type<AuditAction>().notNull(),
    targetType: text("targetType").notNull(),
    targetId: text("targetId"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    actionIdx: index("audit_log_action_idx").on(t.action),
    targetIdx: index("audit_log_target_idx").on(t.targetId),
  }),
);

export const rateLimits = pgTable(
  "rate_limit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    bucket: text("bucket").$type<RateLimitBucket>().notNull(),
    key: text("key").notNull(),
    count: integer("count").notNull().default(1),
    windowStart: timestamp("windowStart", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    bucketKeyIdx: uniqueIndex("rate_limit_bucket_key_idx").on(t.bucket, t.key),
  }),
);

export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const fragellaMirror = pgTable(
  "fragella_mirror",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    year: integer("year"),
    gender: text("gender"),
    imageUrl: text("imageUrl"),
    searchName: text("searchName").notNull(),
    payload: jsonb("payload").notNull(),
    requestCount: integer("requestCount").notNull().default(1),
    lastFetchedAt: timestamp("lastFetchedAt", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index("fragella_mirror_name_idx").on(t.name),
    brandIdx: index("fragella_mirror_brand_idx").on(t.brand),
    updatedIdx: index("fragella_mirror_updated_idx").on(t.lastFetchedAt),
  }),
);

export type Product = typeof products.$inferSelect;
export type FragellaMirrorEntry = typeof fragellaMirror.$inferSelect;
export type Sku = typeof skus.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type User = typeof users.$inferSelect;
export type PromoSetting = typeof promoSettings.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type ProductDiscount = typeof productDiscounts.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type OptionList = typeof optionLists.$inferSelect;
export type OptionValue = typeof optionValues.$inferSelect;
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;