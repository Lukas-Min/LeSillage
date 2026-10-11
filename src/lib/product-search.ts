import { and, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { products } from "@/db/schema";

/**
 * Accented letters folded to a plain one before matching, so "arpege" finds
 * "Eclat d'Arpège" and "wulong cha" finds "Wulóng Chá". The same map runs in
 * SQL (`translate()` over the column) and in JS (over the query), so both
 * sides always fold identically. Built from every Latin letter (Latin-1,
 * Extended-A and -B, Extended Additional for Vietnamese) whose canonical
 * decomposition is one ASCII letter plus accents (é → e, Ç → C, ő → o,
 * ế → e), then the letters that have no decomposition (ø, ł, đ, ı). Upper and
 * lower case are both listed, so the result doesn't depend on the database's
 * collation; ILIKE takes care of ASCII case afterwards.
 */
const FOLD_PAIRS: [string, string][] = (() => {
  const pairs: [string, string][] = [];
  const ranges: [number, number][] = [
    [0xc0, 0x24f],
    [0x1e00, 0x1eff],
  ];
  for (const [first, last] of ranges) {
    for (let code = first; code <= last; code++) {
      const ch = String.fromCharCode(code);
      const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (base !== ch && /^[A-Za-z]$/.test(base)) pairs.push([ch, base]);
    }
  }
  pairs.push(["Ø", "O"], ["ø", "o"], ["Ł", "L"], ["ł", "l"], ["Đ", "D"], ["đ", "d"], ["ı", "i"]);
  return pairs;
})();

/**
 * Apostrophe look-alikes that Unicode counts as letters (ʼ ʻ), so the
 * punctuation drop below would keep them. Listed after the pairs in
 * `translate()`'s "from" with nothing in "to", which deletes them.
 */
const DROPPED = "\u02bc\u02bb";

const FOLD_FROM = FOLD_PAIRS.map(([from]) => from).join("") + DROPPED;
const FOLD_TO = FOLD_PAIRS.map(([, to]) => to).join("");

/**
 * Everything that isn't a letter, a digit or a space is dropped on both
 * sides: apostrophes of any style, hyphens, dots, "&", "®" and the like. So
 * "darpege", "d'arpege" and "d’arpege" all find "d'Arpège", and "raed" finds
 * "Ra'ed". The database's ICU collation makes `[:alnum:]` Unicode-aware,
 * matching `\p{L}\p{N}` in JS.
 */
const NOT_ALNUM_SQL = "[^[:alnum:][:space:]]";
const NOT_ALNUM_JS = /[^\p{L}\p{N}\s]/gu;

/** One character to two, which `translate()` can't do. */
const LIGATURES: [string, string][] = [
  ["Œ", "OE"],
  ["œ", "oe"],
  ["Æ", "AE"],
  ["æ", "ae"],
  ["ß", "ss"],
];

const FOLD_MAP = new Map([...FOLD_PAIRS, ...[...DROPPED].map((ch): [string, string] => [ch, ""])]);

/** The JS side of the fold, applied to the search query. */
export function foldSearchText(text: string): string {
  let folded = "";
  // NFC first so an "e" + combining acute typed on some keyboards becomes "é"
  // and folds like the stored name; any accent left over is dropped below.
  for (const ch of text.normalize("NFC")) folded += FOLD_MAP.get(ch) ?? ch;
  folded = folded.replace(NOT_ALNUM_JS, "");
  for (const [from, to] of LIGATURES) folded = folded.replaceAll(from, to);
  return folded;
}

/** The SQL side of the fold, applied to a stored column. */
function foldColumn(column: AnyPgColumn): SQL {
  let expr: SQL = sql`regexp_replace(translate(${column}, ${FOLD_FROM}, ${FOLD_TO}), ${NOT_ALNUM_SQL}, '', 'g')`;
  for (const [from, to] of LIGATURES) expr = sql`replace(${expr}, ${from}, ${to})`;
  return expr;
}

/**
 * Text-search condition over a product's name and brand. Every
 * whitespace-separated word must appear in the name OR the brand, in any
 * order — so "Velixir paladin" matches brand "Velixir" + name "Paladin",
 * which a single `%whole query%` against one column at a time never could.
 * Accents and punctuation are ignored on both sides (`foldSearchText`).
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
