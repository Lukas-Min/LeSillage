import type {
  FragellaAccord,
  FragellaRecord,
} from "./fragella";

export interface ParsedFragranticaPage {
  name?: string;
  brand?: string;
  year?: number | null;
  gender?: string | null;
  description?: string | null;
  perfumers?: string[];
  accords?: FragellaAccord[];
  notes?: { top: string[]; middle: string[]; base: string[] };
  longevity?: string | null;
  sillage?: string | null;
  priceValue?: string | null;
  imageUrl?: string | null;
  ratingValue?: number | null;
  ratingCount?: number | null;
}

const NOTE_BLOCK_TITLES: Record<string, "top" | "middle" | "base"> = {
  "top notes": "top",
  "heart notes": "middle",
  "middle notes": "middle",
  "base notes": "base",
};

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractBetween(html: string, marker: string, endMarker: string): string | null {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const slice = html.slice(start);
  const end = slice.indexOf(endMarker, marker.length);
  if (end < 0) return slice.slice(marker.length, marker.length + 200);
  return slice.slice(marker.length, end);
}

function extractH1(html: string): string | null {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!match) return null;
  const inner = match[1];
  const linkMatch = /<a[^>]*>([\s\S]*?)<\/a>/i.exec(inner);
  const target = linkMatch ? linkMatch[1] : inner;
  const cleaned = stripTags(target).trim();
  return cleaned || null;
}

function extractAccords(html: string): FragellaAccord[] {
  const block = extractBetween(html, "main_accords", "</section>");
  if (!block) return [];
  const items: FragellaAccord[] = [];
  const re = /<div[^>]*class="[^"]*accord[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const cell = match[1];
    const labelMatch = /<span[^>]*>([\s\S]*?)<\/span>/i.exec(cell);
    const label = labelMatch ? stripTags(labelMatch[1]).trim() : "";
    if (!label) continue;
    const styleMatch = /width:\s*([\d.]+)%/i.exec(cell);
    const strength = styleMatch ? Math.round(parseFloat(styleMatch[1])) : undefined;
    items.push({ name: label, strength, color: null });
  }
  return items;
}

function extractNotes(html: string): { top: string[]; middle: string[]; base: string[] } {
  const out = { top: [] as string[], middle: [] as string[], base: [] as string[] };
  const notesBlock = extractBetween(html, "pyramid", "</div>") ?? extractBetween(html, "Notes", "</div>");
  if (!notesBlock) return out;
  const sectionRe = /<h4[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4|<\/div>)/gi;
  let match: RegExpExecArray | null;
  while ((match = sectionRe.exec(notesBlock)) !== null) {
    const heading = stripTags(match[1]).trim().toLowerCase();
    const slot = NOTE_BLOCK_TITLES[heading];
    if (!slot) continue;
    const inner = match[2];
    const links = inner.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) ?? [];
    for (const link of links) {
      const name = stripTags(link).trim();
      if (name) out[slot].push(name);
    }
  }
  return out;
}

function extractPerfumers(html: string): string[] {
  const block = extractBetween(html, "Perfumers", "</p>");
  if (!block) return [];
  const links = block.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) ?? [];
  return links
    .map((link) => stripTags(link).trim())
    .filter((name) => name.length > 0);
}

function extractDescription(html: string): string | null {
  const block = extractBetween(html, "Description", "</p>");
  if (!block) return null;
  return decodeEntities(stripTags(block)).slice(0, 1000) || null;
}

function extractYear(html: string): number | null {
  const block = extractBetween(html, "Year", "</p>");
  if (!block) return null;
  const match = /\b(19|20)\d{2}\b/.exec(stripTags(block));
  if (!match) return null;
  const year = parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function extractGender(html: string): string | null {
  const block = extractBetween(html, "Gender", "</p>");
  if (!block) return null;
  const cleaned = stripTags(block).trim();
  return cleaned || null;
}

function extractRating(html: string): { ratingValue: number | null; ratingCount: number | null } {
  const ratingBlock = extractBetween(html, "Rating", "</div>");
  if (!ratingBlock) return { ratingValue: null, ratingCount: null };
  const cleaned = stripTags(ratingBlock);
  const valueMatch = /(\d+(?:\.\d+)?)\s*\/\s*5/.exec(cleaned);
  const countMatch = /of\s+([\d,]+)\s*votes/i.exec(cleaned) ?? /([\d,]+)\s*votes/i.exec(cleaned);
  return {
    ratingValue: valueMatch ? parseFloat(valueMatch[1]) : null,
    ratingCount: countMatch ? parseInt(countMatch[1].replace(/,/g, ""), 10) : null,
  };
}

function extractImage(html: string): string | null {
  const match = /<img[^>]+id="[^"]*mainpic[^"]*"[^>]+src="([^"]+)"/i.exec(html);
  if (match) return decodeEntities(match[1]);
  const fallback = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html);
  return fallback ? decodeEntities(fallback[1]) : null;
}

export function parseFragranticaHtml(html: string): ParsedFragranticaPage {
  const cleaned = stripTags(html);
  const title = extractH1(html);
  let brand: string | undefined;
  let name: string | undefined;
  if (title) {
    const parts = title.split(/\s+(by|–|-)\s+/i);
    if (parts.length >= 3) {
      brand = parts[0]?.trim();
      name = parts.slice(2).join(" ").trim();
    } else {
      name = title;
    }
  }
  return {
    name,
    brand,
    year: extractYear(html),
    gender: extractGender(html),
    description: extractDescription(html),
    perfumers: extractPerfumers(html),
    accords: extractAccords(html),
    notes: extractNotes(html),
    ratingValue: extractRating(html).ratingValue,
    ratingCount: extractRating(html).ratingCount,
    imageUrl: extractImage(html),
  };
}

export function parseFragranticaJson(payload: unknown): ParsedFragranticaPage {
  if (!payload || typeof payload !== "object") return {};
  const data = payload as Record<string, unknown>;
  const notes = (data.notes ?? data.pyramid) as Record<string, unknown> | undefined;
  const out: ParsedFragranticaPage = {
    name: asString(data.name ?? data.Name),
    brand: asString(data.brand ?? data.Brand),
    year: typeof data.year === "number" ? data.year : null,
    gender: asString(data.gender ?? data.Gender),
    description: asString(data.description ?? data.Description),
    imageUrl: asString(data.imageUrl ?? data.image_url ?? data.Image ?? data.primaryImageUrl),
  };
  const accords = data.accords ?? data.MainAccords ?? data.mainAccords;
  if (Array.isArray(accords)) {
    const list: FragellaAccord[] = [];
    for (const entry of accords) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const name = asString(record.name ?? record.Name);
      if (!name) continue;
      const strength = typeof record.strength === "number" ? record.strength : undefined;
      const color = typeof record.color === "string" ? record.color : null;
      list.push({ name, strength, color });
    }
    out.accords = list;
  }
  if (notes) {
    out.notes = {
      top: asStringList(notes.top ?? notes.Top),
      middle: asStringList(notes.middle ?? notes.Middle),
      base: asStringList(notes.base ?? notes.Base),
    };
  }
  const perfumers = data.perfumers ?? data.Perfumers;
  if (Array.isArray(perfumers)) {
    out.perfumers = perfumers.map((p) => asString(p)).filter((p): p is string => Boolean(p));
  }
  if (typeof data.ratingValue === "number") out.ratingValue = data.ratingValue;
  if (typeof data.ratingCount === "number") out.ratingCount = data.ratingCount;
  return out;
}

export function mergeFragranticRecords(
  primary: ParsedFragranticaPage | FragellaRecord | null,
  fallback: ParsedFragranticaPage,
): ParsedFragranticaPage {
  if (!primary) return fallback;
  const merged: ParsedFragranticaPage = { ...fallback, ...primary };
  const primaryNotes = "notes" in primary ? primary.notes : undefined;
  if (primaryNotes) {
    merged.notes = {
      top: primaryNotes.top?.length ? primaryNotes.top : fallback.notes?.top ?? [],
      middle: primaryNotes.middle?.length ? primaryNotes.middle : fallback.notes?.middle ?? [],
      base: primaryNotes.base?.length ? primaryNotes.base : fallback.notes?.base ?? [],
    };
  }
  const primaryAccords = "accords" in primary ? primary.accords : undefined;
  if (primaryAccords && primaryAccords.length > 0) {
    merged.accords = primaryAccords;
  }
  return merged;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}