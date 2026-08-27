"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import { products, skus, productImages } from "@/db/schema";
import { guessConcentration, isConcentration } from "@/domain/concentration";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import {
  buildFragellaQuery,
  lookupFragella,
  searchFragella,
  type FragellaAccord,
  type FragellaRecord,
} from "@/lib/fragella";
import {
  mergeFragranticRecords,
  parseFragranticaHtml,
  parseFragranticaJson,
  type ParsedFragranticaPage,
} from "@/lib/fragrantica";
import {
  clearPendingPayload,
  persistPendingPayload,
  lookupPendingPayload,
  type ReviewPayload,
} from "@/lib/fragella-pending-store";

// Re-export the canonical type so other modules import from this file.
export type { ReviewPayload };

export async function lookupFragranticaFromUrl(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-lookup", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  const raw = String(formData.get("fragellaQuery") ?? "").trim();
  if (raw.length === 0) throw new Error("Paste a perfume name or Fragrantica URL");
  const url = extractFragranticaUrl(raw);
  const query = url ? deriveQueryFromUrl(url) : raw;
  let fragella: FragellaRecord | null = null;
  try {
    fragella = await lookupFragella(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fragella lookup failed";
    throw new Error(`Fragella lookup failed: ${message}`);
  }
  const payload: ReviewPayload = {
    fragella,
    parsed: null,
    query: buildFragellaQuery({ brand: fragella?.brand ?? "", name: fragella?.name ?? query }),
    fragranticaUrl: url,
  };
  await persistPendingPayload(admin.id, payload);
  redirect(`/admin/products/fragrantica/review?query=${encodeURIComponent(payload.query)}`);
}

export async function previewPasteFragrantica(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-paste", admin.id),
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
  const query = buildFragellaQuery({
    brand: parsed.brand ?? "",
    name: parsed.name ?? "",
  });
  const payload: ReviewPayload = {
    fragella: null,
    parsed,
    query,
    fragranticaUrl: null,
  };
  await persistPendingPayload(admin.id, payload);
  redirect(`/admin/products/fragrantica/review?query=${encodeURIComponent(query)}`);
}

export async function saveFragranticaImport(formData: FormData) {
  const admin = await requireAdmin();
  await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("fragella-save", admin.id),
    limit: 15,
    windowMs: 60_000,
  });
  const query = String(formData.get("query") ?? "").trim();
  if (!query) throw new Error("Your paste/lookup expired. Try again.");
  const payload = await lookupPendingPayload(admin.id, query);
  if (!payload) throw new Error("Your paste/lookup expired. Try again.");

  const type = parseType(formData.get("type"));
  const fragranceCategory = parseCategory(formData.get("fragranceCategory"));
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  if (!name || !brand) throw new Error("Name and brand are required");
  const family = String(formData.get("family") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const releaseYear = parseIntOptional(formData.get("releaseYear"));
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const concentrationRaw = String(formData.get("concentration") ?? "").trim();
  const concentration = isConcentration(concentrationRaw)
    ? concentrationRaw
    : guessConcentration(concentrationRaw);
  const ratingValue = parseFloatOptional(formData.get("ratingValue"));
  const ratingCount = parseIntOptional(formData.get("ratingCount"));
  const reviewsCount = parseIntOptional(formData.get("reviewsCount"));
  const longevity = String(formData.get("longevity") ?? "").trim() || null;
  const sillage = String(formData.get("sillage") ?? "").trim() || null;
  const priceValue = String(formData.get("priceValue") ?? "").trim() || null;
  const notes = parseNoteList(formData.get("topNotes"));
  const middleNotes = parseNoteList(formData.get("middleNotes"));
  const baseNotes = parseNoteList(formData.get("baseNotes"));
  const perfumers = parseNoteList(formData.get("perfumers"));
  const accords = parseAccordList(formData.get("accords"));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  const merged = mergeFragranticRecords(payload.fragella ?? payload.parsed, {
    name,
    brand,
    description,
    gender,
    ratingValue,
    ratingCount,
    accords,
    notes: {
      top: notes,
      middle: middleNotes,
      base: baseNotes,
    },
    perfumers,
    longevity,
    sillage,
    priceValue,
    imageUrl,
  });

  const productId = crypto.randomUUID();
  const now = new Date();
  await db().insert(products).values({
    id: productId,
    type,
    fragranceCategory,
    concentration,
    name: merged.name ?? name,
    brand: merged.brand ?? brand,
    family,
    description: merged.description ?? description,
    notes: merged.notes
      ? [
          merged.notes.top.length ? `Top: ${merged.notes.top.join(", ")}` : null,
          merged.notes.middle.length ? `Middle: ${merged.notes.middle.join(", ")}` : null,
          merged.notes.base.length ? `Base: ${merged.notes.base.join(", ")}` : null,
        ]
        .filter(Boolean)
        .join(" | ")
      : null,
    notePyramid: merged.notes,
    accords: merged.accords ?? null,
    perfumers: merged.perfumers ?? null,
    longevity: merged.longevity ?? null,
    sillage: merged.sillage ?? null,
    priceValue: merged.priceValue ?? null,
    longevityBreakout: payload.fragella?.longevityBreakout ?? null,
    sillageBreakout: payload.fragella?.sillageBreakout ?? null,
    priceValueBreakout: payload.fragella?.priceValueBreakout ?? null,
    seasonBreakout: payload.fragella?.seasonBreakout ?? null,
    genderBreakout: payload.fragella?.genderBreakout ?? null,
    relationBreakout: payload.fragella?.relationBreakout ?? null,
    ratingValue:
      merged.ratingValue !== null && merged.ratingValue !== undefined
        ? String(merged.ratingValue)
        : null,
    ratingCount: merged.ratingCount ?? null,
    reviewsCount: parseIntOptional(formData.get("reviewsCount")),
    releaseYear: releaseYear ?? null,
    gender: merged.gender ?? gender,
    fragranticaUrl: payload.fragranticaUrl,
    fragellaId: payload.fragella?.id ?? null,
    fragellaQuery: payload.query,
    fragellaFetchedAt: payload.fragella ? now : null,
    fragellaPayload: payload.fragella?.raw ?? null,
    isActive: true,
    updatedAt: now,
  });
  await db().insert(skus).values({
    productId,
    sku: deriveSku(brand, name),
    label: "Default",
    costPrice: 0,
    retailPrice: 0,
    pricingMode: "DIRECT",
    pricingInput: 0,
    fulfillment: type === "FULL_BOTTLE" ? "PRE_ORDER" : "ON_HAND",
    stock: 0,
  });
  const finalImageUrl = merged.imageUrl ?? imageUrl;
  if (finalImageUrl) {
    await db().insert(productImages).values({
      productId,
      url: finalImageUrl,
      alt: `${merged.brand ?? brand} — ${merged.name ?? name}`,
      position: 0,
    });
  }
  await auditLogSubject({
    actor: admin.id,
    action: "PRODUCT_FRAGELLA_IMPORT",
    targetType: "product",
    targetId: productId,
    metadata: {
      query: payload.query,
      source: payload.fragella ? "fragella" : "paste",
      fragellaId: payload.fragella?.id ?? null,
    },
  });
  await clearPendingPayload(admin.id, query);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?welcome=1`);
}

export async function refreshStaleFragellaRecords() {
  const env = process.env;
  const budget = Number(env.FRAGELLA_DAILY_REQUEST_BUDGET ?? 8);
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const candidates = await db()
    .select({
      id: products.id,
      fragellaId: products.fragellaId,
      fragellaQuery: products.fragellaQuery,
    })
    .from(products)
    .where(
      and(
        sql`${products.fragellaId} IS NOT NULL OR ${products.fragellaQuery} IS NOT NULL`,
        or(isNull(products.fragellaFetchedAt), lt(products.fragellaFetchedAt, cutoff)),
      ),
    )
    .limit(budget);
  let refreshed = 0;
  for (const candidate of candidates) {
    const query = candidate.fragellaQuery ?? candidate.fragellaId;
    if (!query) continue;
    try {
      const records = await searchFragella(query, { limit: 1 });
      const record = records[0];
      if (!record) continue;
      await db()
        .update(products)
        .set({
          fragellaPayload: record.raw,
          fragellaFetchedAt: new Date(),
          notePyramid: record.notes ?? null,
          accords: record.accords ?? null,
          gender: record.gender ?? null,
          concentration: guessConcentration(record.concentration),
          perfumers: record.perfumers ?? null,
          longevity: record.longevity ?? null,
          sillage: record.sillage ?? null,
          priceValue: record.priceValue ?? null,
          longevityBreakout: record.longevityBreakout ?? null,
          sillageBreakout: record.sillageBreakout ?? null,
          priceValueBreakout: record.priceValueBreakout ?? null,
          seasonBreakout: record.seasonBreakout ?? null,
          genderBreakout: record.genderBreakout ?? null,
          relationBreakout: record.relationBreakout ?? null,
          ratingValue:
            record.ratingValue !== null && record.ratingValue !== undefined
              ? String(record.ratingValue)
              : null,
          ratingCount: record.ratingCount ?? null,
          reviewsCount: record.reviewsCount ?? null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, candidate.id));
      if (record.imageUrl) {
        const existingImage = (
          await db().select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, candidate.id)).limit(1)
        )[0];
        if (existingImage) {
          await db().update(productImages).set({ url: record.imageUrl }).where(eq(productImages.id, existingImage.id));
        } else {
          await db().insert(productImages).values({ productId: candidate.id, url: record.imageUrl, position: 0 });
        }
      }
      await auditLogSubject({
        actor: "fragella-refresh",
        action: "FRAGELLA_REFRESH",
        targetType: "product",
        targetId: candidate.id,
        metadata: { query, refreshedAt: new Date().toISOString() },
      });
      refreshed += 1;
    } catch (err) {
      await auditLogSubject({
        actor: "fragella-refresh",
        action: "FRAGELLA_REFRESH",
        targetType: "product",
        targetId: candidate.id,
        metadata: { query, error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
  return { refreshed, budget, candidates: candidates.length };
}

function extractFragranticaUrl(raw: string): string | null {
  const match = /(https?:\/\/[^\s]*fragrantica\.com[^\s]*)/i.exec(raw);
  return match ? match[1] : null;
}

function deriveQueryFromUrl(rawArg: string): string {
  try {
    const segments = new URL(rawArg).pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const cleaned = last.replace(/-\d+\.html$/i, "").replace(/\.html$/i, "");
    const slugParts = cleaned.split("-").filter((part) => !/^\d+$/.test(part));
    if (slugParts.length >= 2) {
      const brand = slugParts[0];
      const name = slugParts.slice(1).join(" ");
      return `${brand} ${name}`.replace(/-/g, " ").trim();
    }
    return cleaned.replace(/-/g, " ").trim();
  } catch {
    return rawArg;
  }
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

function parseIntOptional(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatOptional(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNoteList(value: FormDataEntryValue | null): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseAccordList(value: FormDataEntryValue | null): FragellaAccord[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const out: FragellaAccord[] = [];
  for (const line of raw.split(/\n+/)) {
    const cleaned = line.trim();
    if (!cleaned) continue;
    const match = /^([^\d]+?)(?:\s*(\d{1,3}))?\s*$/.exec(cleaned);
    if (!match) {
      out.push({ name: cleaned });
      continue;
    }
    const name = match[1].replace(/[:\s]+$/, "").trim();
    const strength = match[2] ? parseInt(match[2], 10) : undefined;
    out.push({
      name,
      strength: typeof strength === "number" && Number.isFinite(strength) ? strength : undefined,
    });
  }
  return out;
}

function deriveSku(brand: string, name: string) {
  const base = `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `imported-${Date.now()}`;
}

async function persistPendingPayloadLocal(adminId: string, payload: ReviewPayload) {
  persistPendingPayload(adminId, payload);
}