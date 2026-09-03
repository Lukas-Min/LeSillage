export interface FragranticaAccord {
  name: string;
  strength?: number;
  color?: string | null;
}

export interface ParsedFragranticaPage {
  name?: string;
  brand?: string;
  year?: number | null;
  gender?: string | null;
  concentration?: string | null;
  description?: string | null;
  perfumers?: string[];
  accords?: FragranticaAccord[];
  notes?: { top: string[]; middle: string[]; base: string[] };
  longevity?: string | null;
  sillage?: string | null;
  priceValue?: string | null;
  imageUrl?: string | null;
  ratingValue?: number | null;
  ratingCount?: number | null;
  reviewsCount?: number | null;
  longevityBreakout?: Record<string, number>;
  sillageBreakout?: Record<string, number>;
  priceValueBreakout?: Record<string, number>;
  seasonBreakout?: Record<string, number>;
  genderBreakout?: Record<string, number>;
  relationBreakout?: Record<string, number>;
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

/**
 * Fragrantica's product pages carry one canonical, plain-language summary
 * paragraph — `<div itemprop="description">...<p><b>Name</b> by <b>Brand</b>
 * is a ... fragrance for women. Name was launched in 2015. The nose behind
 * this fragrance is X. Top notes are A, B and C; middle notes are ...; base
 * notes are ... .</p>` — which has stayed a stable template across the
 * site's redesigns even as the surrounding widget markup (note pyramid,
 * accord bars) has not. Prefer parsing this sentence over the widgets below;
 * they're kept only as a fallback for pages where it's thin or absent.
 */
function extractSummaryParagraph(html: string): { raw: string; text: string } | null {
  const markerIdx = html.indexOf('itemprop="description"');
  if (markerIdx < 0) return null;
  const pStart = html.indexOf("<p>", markerIdx);
  if (pStart < 0) return null;
  const pEnd = html.indexOf("</p>", pStart);
  if (pEnd < 0) return null;
  const raw = html.slice(pStart + 3, pEnd);
  return { raw, text: decodeEntities(stripTags(raw)) };
}

function extractNameAndBrandFromSummary(raw: string): { name?: string; brand?: string } {
  const bolds = [...raw.matchAll(/<b>([\s\S]*?)<\/b>/gi)].map((m) => decodeEntities(stripTags(m[1])).trim());
  return { name: bolds[0] || undefined, brand: bolds[1] || undefined };
}

function splitList(text: string): string[] {
  return text
    .replace(/\band\b/gi, ",")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractGenderFromText(text: string): string | null {
  const match = /fragrance for (women and men|men and women|women|men)\b/i.exec(text);
  return match ? match[1] : null;
}

function extractYearFromText(text: string): number | null {
  const match = /launched in (\d{4})/i.exec(text);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

function extractPerfumersFromText(text: string): string[] {
  const match =
    /noses? behind this fragrance (?:is|are) ([^.]+)\./i.exec(text) ??
    /was created by ([^.]+)\./i.exec(text);
  return match ? splitList(match[1]) : [];
}

function extractNotesFromText(text: string): { top: string[]; middle: string[]; base: string[] } {
  const out = { top: [] as string[], middle: [] as string[], base: [] as string[] };
  const topMatch = /top notes? (?:is|are) ([^;.]+)/i.exec(text);
  const middleMatch = /(?:middle|heart) notes? (?:is|are) ([^;.]+)/i.exec(text);
  const baseMatch = /base notes? (?:is|are) ([^;.]+)/i.exec(text);
  if (topMatch) out.top = splitList(topMatch[1]);
  if (middleMatch) out.middle = splitList(middleMatch[1]);
  if (baseMatch) out.base = splitList(baseMatch[1]);
  return out;
}

/** Fallback for pages whose summary sentence doesn't spell out notes: read
 *  the note-pyramid widget directly. Each tier's heading (`<h4>Top Notes</h4>`
 *  etc.) is used only to find where that tier's note links start and end —
 *  not to bound a single enclosing `<div>`, since the pyramid's nested
 *  wrapper divs close well before the actual note links appear. */
function extractNotesFromPyramid(html: string): { top: string[]; middle: string[]; base: string[] } {
  const out = { top: [] as string[], middle: [] as string[], base: [] as string[] };
  const headingRe = /<h4[^>]*>([\s\S]*?)<\/h4>/gi;
  const headings: { slot: "top" | "middle" | "base"; index: number; end: number }[] = [];
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRe.exec(html)) !== null) {
    const label = stripTags(headingMatch[1]).trim().toLowerCase();
    const slot = NOTE_BLOCK_TITLES[label];
    if (slot) headings.push({ slot, index: headingMatch.index, end: headingRe.lastIndex });
  }
  for (let i = 0; i < headings.length; i++) {
    const { slot, end } = headings[i];
    const boundary = i + 1 < headings.length ? headings[i + 1].index : Math.min(html.length, end + 8000);
    const segment = html.slice(end, boundary);
    const linkRe = /<a[^>]+href="[^"]*\/notes\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRe.exec(segment)) !== null) {
      const altMatch = /alt="([^"]*)"/i.exec(linkMatch[0]);
      const name = decodeEntities(altMatch ? altMatch[1] : stripTags(linkMatch[1])).trim();
      if (name) out[slot].push(name);
    }
  }
  return out;
}

function extractNotes(html: string, summaryText: string): { top: string[]; middle: string[]; base: string[] } {
  const fromText = extractNotesFromText(summaryText);
  if (fromText.top.length || fromText.middle.length || fromText.base.length) return fromText;
  return extractNotesFromPyramid(html);
}

/** The "main accords" widget renders each accord as a percentage-width bar
 *  with no machine-readable strength attribute, but the "Search by accords"
 *  link right below it encodes every accord and its exact percentage as
 *  clean query-string params — read that instead of the bars. */
function extractAccords(html: string): FragranticaAccord[] {
  const markerIdx = html.toLowerCase().indexOf("main accords");
  if (markerIdx < 0) return [];
  // Each accord bar is its own chunk of markup, so a fragrance with more
  // than a handful of accords pushes the "Search by accords" link (which
  // carries the actual percentages) well past a few thousand characters.
  const window = html.slice(markerIdx, markerIdx + 12000);
  const hrefMatch = /href="\/accords-search\/\?([^"]+)"/i.exec(window);
  if (!hrefMatch) return [];
  const params = new URLSearchParams(decodeEntities(hrefMatch[1]));
  const items: FragranticaAccord[] = [];
  for (const [key, value] of params.entries()) {
    if (key.startsWith("f_")) continue;
    const strength = Number.parseInt(value, 10);
    if (!Number.isFinite(strength)) continue;
    items.push({ name: key, strength, color: null });
  }
  return items;
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

function extractConcentration(html: string): string | null {
  const block = extractBetween(html, "Concentration", "</p>");
  if (!block) return null;
  const cleaned = stripTags(block).trim();
  return cleaned || null;
}

function extractRating(html: string): { ratingValue: number | null; ratingCount: number | null } {
  const valueMatch = /itemprop="ratingValue"[^>]*>\s*([\d.]+)/i.exec(html);
  const countMatch = /itemprop="ratingCount"[^>]*content="(\d+)"/i.exec(html);
  if (valueMatch || countMatch) {
    return {
      ratingValue: valueMatch ? parseFloat(valueMatch[1]) : null,
      ratingCount: countMatch ? parseInt(countMatch[1], 10) : null,
    };
  }
  // Older/alternate markup: a plain "Rating" block with "X / 5" and "N votes".
  const ratingBlock = extractBetween(html, "Rating", "</div>");
  if (!ratingBlock) return { ratingValue: null, ratingCount: null };
  const cleaned = stripTags(ratingBlock);
  const legacyValueMatch = /(\d+(?:\.\d+)?)\s*\/\s*5/.exec(cleaned);
  const legacyCountMatch = /of\s+([\d,]+)\s*votes/i.exec(cleaned) ?? /([\d,]+)\s*votes/i.exec(cleaned);
  return {
    ratingValue: legacyValueMatch ? parseFloat(legacyValueMatch[1]) : null,
    ratingCount: legacyCountMatch ? parseInt(legacyCountMatch[1].replace(/,/g, ""), 10) : null,
  };
}

function extractImage(html: string): string | null {
  const match = /<img[^>]+id="[^"]*mainpic[^"]*"[^>]+src="([^"]+)"/i.exec(html);
  if (match) return decodeEntities(match[1]);
  const fallback = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html);
  return fallback ? decodeEntities(fallback[1]) : null;
}

export function parseFragranticaHtml(html: string): ParsedFragranticaPage {
  const summary = extractSummaryParagraph(html);
  const summaryText = summary?.text ?? "";
  const fromSummary = summary ? extractNameAndBrandFromSummary(summary.raw) : {};

  const title = extractH1(html);
  let name = fromSummary.name;
  let brand = fromSummary.brand;
  if (!name && title) {
    const parts = title.split(/\s+(by|–|-)\s+/i);
    if (parts.length >= 3) {
      brand = brand ?? parts[0]?.trim();
      name = parts.slice(2).join(" ").trim();
    } else {
      name = title;
    }
  }

  const rating = extractRating(html);
  const perfumers = extractPerfumersFromText(summaryText);

  return {
    name,
    brand,
    year: extractYear(html) ?? extractYearFromText(summaryText),
    gender: extractGender(html) ?? extractGenderFromText(summaryText),
    // Concentration rarely has its own labelled field any more; fall back to
    // the raw title text so the caller's guessConcentration()-style keyword
    // matching (e.g. "Eau de Parfum") still has a chance to find it there.
    concentration: extractConcentration(html) ?? title ?? null,
    description: summaryText || extractDescription(html),
    perfumers: perfumers.length ? perfumers : extractPerfumers(html),
    accords: extractAccords(html),
    notes: extractNotes(html, summaryText),
    ratingValue: rating.ratingValue,
    ratingCount: rating.ratingCount,
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
    concentration: asString(data.concentration ?? data.Concentration),
    description: asString(data.description ?? data.Description),
    imageUrl: asString(data.imageUrl ?? data.image_url ?? data.Image ?? data.primaryImageUrl),
  };
  const accords = data.accords ?? data.MainAccords ?? data.mainAccords;
  if (Array.isArray(accords)) {
    const list: FragranticaAccord[] = [];
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
  primary: ParsedFragranticaPage | null,
  fallback: ParsedFragranticaPage,
): ParsedFragranticaPage {
  if (!primary) return fallback;
  const merged: ParsedFragranticaPage = { ...fallback, ...primary };
  if (primary.notes) {
    merged.notes = {
      top: primary.notes.top?.length ? primary.notes.top : fallback.notes?.top ?? [],
      middle: primary.notes.middle?.length ? primary.notes.middle : fallback.notes?.middle ?? [],
      base: primary.notes.base?.length ? primary.notes.base : fallback.notes?.base ?? [],
    };
  }
  if (primary.accords && primary.accords.length > 0) {
    merged.accords = primary.accords;
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
