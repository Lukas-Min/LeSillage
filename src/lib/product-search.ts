import { and, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { products } from "@/db/schema";

/**
 * Characters folded to a plain equivalent before matching, so "arpege" finds
 * "Eclat d'Arpège" and "d’arpege" (curly apostrophe) finds "d'Arpège". The
 * same map runs in SQL (`translate()` over the column) and in JS (over the
 * query), so both sides always fold identically. Built from every Latin-1 and
 * Latin Extended-A letter whose canonical decomposition is one ASCII letter
 * plus accents (é → e, Ç → C, ő → o), then the letters that have no
 * decomposition (ø, ł, đ, ı) and the apostrophe look-alikes. Upper and lower
 * case are both listed, so the result doesn't depend on the database's
 * collation; ILIKE takes care of ASCII case afterwards.
 */
const FOLD_PAIRS: [string, string][] = (() => {
  const pairs: [string, string][] = [];
  for (let code = 0xc0; code <= 0x17f; code++) {
    const ch = String.fromCharCode(code);
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/^[A-Za-z]$/.test(base)) pairs.push([ch, base]);
  }
  pairs.push(["Ø", "O"], ["ø", "o"], ["Ł", "L"], ["ł", "l"], ["Đ", "D"], ["đ", "d"], ["ı", "i"]);
  // Straight apostrophe is the target: ’ ‘ ‛ ʼ ` ´ ′ all become '.
  for (const quote of ["’", "‘", "‛", "ʼ", "`", "´", "′"]) {
    pairs.push([quote, "'"]);
  }
  return pairs;
})();

const FOLD_FROM = FOLD_PAIRS.map(([from]) => from).join("");
const FOLD_TO = FOLD_PAIRS.map(([, to]) => to).join("");

/** One character to two, which `translate()` can't do. */
const LIGATURES: [string, string][] = [
  ["Œ", "OE"],
  ["œ", "oe"],
  ["Æ", "AE"],
  ["æ", "ae"],
  ["ß", "ss"],
];

const FOLD_MAP = new Map(FOLD_PAIRS);

/** The JS side of the fold, applied to the search query. */
export function foldSearchText(text: string): string {
  let folded = "";
  // NFC first so an "e" + combining acute typed on some keyboards becomes "é"
  // and folds like the stored name; any accent left over is dropped.
  for (const ch of text.normalize("NFC").replace(/[̀-ͯ]/g, "")) {
    folded += FOLD_MAP.get(ch) ?? ch;
  }
  for (const [from, to] of LIGATURES) folded = folded.replaceAll(from, to);
  return folded;
}

/** The SQL side of the fold, applied to a stored column. */
function foldColumn(column: AnyPgColumn): SQL {
  let expr: SQL = sql`translate(${column}, ${FOLD_FROM}, ${FOLD_TO})`;
  for (const [from, to] of LIGATURES) expr = sql`replace(${expr}, ${from}, ${to})`;
  return expr;
}

/**
 * Text-search condition over a product's name and brand. Every
 * whitespace-separated word must appear in the name OR the brand, in any
 * order — so "Velixir paladin" matches brand "Velixir" + name "Paladin",
 * which a single `%whole query%` against one column at a time never could.
 * Accents and apostrophe styles are ignored on both sides (`foldSearchText`).
 * Returns undefined for a blank query (no filter).
 */
export function productSearchCondition(query: string | undefined): SQL | undefined {
  const words = foldSearchText(query ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  return and(
    ...words.map((word) => {
      const needle = `%${word}%`;
      return or(ilike(foldColumn(products.name), needle), ilike(foldColumn(products.brand), needle));
    }),
  );
}
