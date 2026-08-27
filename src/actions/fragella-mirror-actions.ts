"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import { products, skus } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import {
  findFragellaMirrorEntryByQuery,
  getFragellaMirrorEntry,
  searchFragellaMirror,
  upsertFragellaMirrorRow,
} from "@/lib/fragella-mirror";
import { lookupFragella } from "@/lib/fragella";
import {
  mergeFragranticRecords,
  parseFragranticaHtml,
  parseFragranticaJson,
  type ParsedFragranticaPage,
} from "@/lib/fragrantica";

export interface MirrorLookupHit {
  id: string;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  imageUrl: string | null;
  lastFetchedAt: string;
}

export async function searchFragellaMirrorAction(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-mirror-search", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  const query = String(formData.get("query") ?? "").trim();
  const result = await searchFragellaMirror(query, { limit: 10 });
  return {
    query,
    hits: result.hits.map((hit) => ({ ...hit, lastFetchedAt: hit.lastFetchedAt.toISOString() })),
    filledFromFragella: result.filledFromFragella,
  };
}

export async function openFragellaMirrorEntry(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-mirror-open", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Pick a fragrance from the list first");
  let entry = await getFragellaMirrorEntry(id);
  if (!entry) {
    entry = await findFragellaMirrorEntryByQuery(id);
  }
  if (!entry) throw new Error("No mirror entry found");
  const query = `${entry.brand} ${entry.name}`.trim();
  redirect(`/admin/products/fragrantica/review?query=${encodeURIComponent(query)}&mirror=${encodeURIComponent(entry.id)}`);
}

export async function previewPasteFragranticaAction(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-mirror-paste", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  const raw = String(formData.get("paste") ?? "").trim();
  if (raw.length === 0) throw new Error("Paste Fragrantica page HTML or JSON first");
  let parsed: ParsedFragranticaPage;
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      parsed = parseFragranticaJson(JSON.parse(raw));
    } catch (err) {
      throw new Error(`Could not parse JSON: ${(err as Error).message}`);
    }
  } else {
    parsed = parseFragranticaHtml(raw);
  }
  const query = `${parsed.brand ?? ""} ${parsed.name ?? ""}`.trim() || "paste-import";
  redirect(`/admin/products/fragrantica/review?query=${encodeURIComponent(query)}`);
}

export async function saveFragranticaFromMirror(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-mirror-save", admin.id),
    limit: 15,
    windowMs: 60_000,
  });
  const mirrorId = String(formData.get("mirrorId") ?? "").trim();
  const entry = mirrorId ? await getFragellaMirrorEntry(mirrorId) : null;
  if (!entry) throw new Error("Mirror entry missing. Refresh the page and try again.");
  const record = await lookupFragella(entry.id);
  if (record) {
    await upsertFragellaMirrorRow(record);
  }
  const payloadRecord = record ?? {
    id: entry.id,
    name: entry.name,
    brand: entry.brand,
    year: entry.year ?? null,
    gender: entry.gender ?? null,
    imageUrl: entry.imageUrl ?? null,
    raw: (entry.payload ?? {}) as Record<string, unknown>,
    accords: [],
    perfumers: [],
  };
  const parsed = mergeFragranticRecords(payloadRecord, {
    name: entry.name,
    brand: entry.brand,
    imageUrl: entry.imageUrl ?? null,
  });

  const productId = crypto.randomUUID();
  const now = new Date();
  await db().insert(products).values({
    id: productId,
    type: parseType(formData.get("type")),
    fragranceCategory: parseCategory(formData.get("fragranceCategory")),
    name: parsed.name ?? entry.name,
    brand: parsed.brand ?? entry.brand,
    family: String(formData.get("family") ?? "").trim() || null,
    description: parsed.description ?? null,
    notes: null,
    notePyramid: parsed.notes ?? undefined,
    accords: parsed.accords ?? null,
    perfumers: parsed.perfumers ?? null,
    longevity: parsed.longevity ?? null,
    sillage: parsed.sillage ?? null,
    priceValue: parsed.priceValue ?? null,
    longevityBreakout: parsed.longevityBreakout ?? null,
    sillageBreakout: parsed.sillageBreakout ?? null,
    priceValueBreakout: parsed.priceValueBreakout ?? null,
    seasonBreakout: parsed.seasonBreakout ?? null,
    genderBreakout: parsed.genderBreakout ?? null,
    relationBreakout: parsed.relationBreakout ?? null,
    ratingValue:
      parsed.ratingValue !== null && parsed.ratingValue !== undefined
        ? String(parsed.ratingValue)
        : null,
    ratingCount: parsed.ratingCount ?? null,
    reviewsCount: parsed.reviewsCount ?? null,
    releaseYear: parsed.year ?? entry.year ?? null,
    gender: parsed.gender ?? entry.gender,
    fragellaId: entry.id,
    fragellaQuery: `${entry.brand} ${entry.name}`,
    fragellaFetchedAt: entry.lastFetchedAt,
    fragellaPayload: entry.payload,
    isActive: true,
    updatedAt: now,
  });
  await db().insert(skus).values({
    productId,
    sku: deriveSku(entry.brand, entry.name),
    label: "Default",
    costPrice: 0,
    retailPrice: 0,
    pricingMode: "DIRECT",
    pricingInput: 0,
    fulfillment: parseType(formData.get("type")) === "FULL_BOTTLE" ? "PRE_ORDER" : "ON_HAND",
    stock: 0,
  });
  await auditLogSubject({
    actor: admin.id,
    action: "PRODUCT_FRAGELLA_IMPORT",
    targetType: "product",
    targetId: productId,
    metadata: {
      source: "mirror",
      mirrorId: entry.id,
      query: `${entry.brand} ${entry.name}`,
    },
  });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?welcome=1`);
}

function parseType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "DECANT");
  if (raw === "FULL_BOTTLE" || raw === "PARTIAL" || raw === "DECANT") return raw;
  return "DECANT";
}

function parseCategory(value: FormDataEntryValue | null) {
  const raw = String(value ?? "NICHE");
  if (raw === "DESIGNER" || raw === "MIDDLE_EASTERN") return raw;
  return "NICHE";
}

function deriveSku(brand: string, name: string) {
  const base = `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `imported-${Date.now()}`;
}