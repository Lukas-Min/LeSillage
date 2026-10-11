import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { foldSearchText, productSearchCondition } from "../product-search";

const dialect = new PgDialect();

/**
 * Runs the generated condition the way Postgres would for one product:
 * substitutes the row's name/brand for the columns and evaluates the
 * `translate()` / `regexp_replace()` / `replace()` / `ILIKE` SQL in JS, so a
 * test exercises the SQL side of the fold, not just `foldSearchText`.
 * `[^[:alnum:][:space:]]` is read as its Unicode meaning, as on the
 * database's ICU collation.
 */
function matches(query: string, product: { name: string; brand: string }): boolean {
  const condition = productSearchCondition(query);
  if (!condition) return true;
  const { sql, params } = dialect.sqlToQuery(condition);
  const values = params as string[];
  const param = (ref: string) => values[Number(ref.slice(1)) - 1];
  const translate = (text: string, from: string, to: string) =>
    [...text].map((ch) => {
      const i = [...from].indexOf(ch);
      return i === -1 ? ch : ([...to][i] ?? "");
    }).join("");
  const columns: Record<string, string> = { '"product"."name"': product.name, '"product"."brand"': product.brand };

  // Innermost first: regexp_replace(translate(column, $a, $b), $c, '', 'g'),
  // then replace(expr, $d, $e) layers.
  let expr = sql;
  const literals: string[] = [];
  const lit = (value: string) => `@${literals.push(value) - 1}`;
  expr = expr.replace(
    /regexp_replace\(translate\(("product"\."\w+"), (\$\d+), (\$\d+)\), (\$\d+), '', 'g'\)/g,
    (_, col, a, b, pattern) => {
      expect(param(pattern)).toBe("[^[:alnum:][:space:]]");
      return lit(translate(columns[col], param(a), param(b)).replace(/[^\p{L}\p{N}\s]/gu, ""));
    },
  );
  for (let prev = ""; prev !== expr; ) {
    prev = expr;
    expr = expr.replace(/replace\((@\d+), (\$\d+), (\$\d+)\)/g, (_, ref, a, b) =>
      lit(literals[Number(ref.slice(1))].replaceAll(param(a), param(b))),
    );
  }
  expr = expr.replace(/(@\d+) ilike (\$\d+)/g, (_, ref, p) => {
    const text = literals[Number(ref.slice(1))].toLowerCase();
    const needle = param(p).toLowerCase().replace(/^%|%$/g, "");
    return text.includes(needle) ? "true" : "false";
  });
  // What's left is and/or over true/false.
  return Function(`return ${expr.replace(/\band\b/g, "&&").replace(/\bor\b/g, "||")}`)() as boolean;
}

const arpege = { name: "Eclat d'Arpège", brand: "Lanvin" };

describe("foldSearchText", () => {
  it("drops accents", () => {
    expect(foldSearchText("Arpège")).toBe("Arpege");
    expect(foldSearchText("Wulóng Chá")).toBe("Wulong Cha");
    expect(foldSearchText("ÉCLAT Crème Brûlée Ça Mañana")).toBe("ECLAT Creme Brulee Ca Manana");
    expect(foldSearchText("Rosé Ø ł Ūmi Đà Nẵng Ș")).toBe("Rose O l Umi Da Nang S");
  });

  it("folds a typed combining accent like the precomposed letter", () => {
    expect(foldSearchText("Arpège")).toBe("Arpege");
  });

  it("drops apostrophes of any style and other punctuation and symbols", () => {
    expect(foldSearchText("d’Arpège d'Arpège")).toBe("dArpege dArpege");
    expect(foldSearchText("L‘Homme L`Eau Lʼete")).toBe("LHomme LEau Lete");
    expect(foldSearchText("Eau-de-Parfum No.5 Flowers & Flames Sauvage®")).toBe("EaudeParfum No5 Flowers  Flames Sauvage");
  });

  it("keeps letters from other scripts", () => {
    expect(foldSearchText("香水 Ébène")).toBe("香水 Ebene");
  });

  it("expands ligatures", () => {
    expect(foldSearchText("Cœur Æther Straße")).toBe("Coeur AEther Strasse");
  });
});

describe("productSearchCondition", () => {
  it("is undefined for a blank query", () => {
    expect(productSearchCondition(undefined)).toBeUndefined();
    expect(productSearchCondition("   ")).toBeUndefined();
  });

  it("folds the stored name and brand in SQL and the query before it's bound", () => {
    const { sql, params } = dialect.sqlToQuery(productSearchCondition("d’arpège")!);
    expect(sql).toContain('translate("product"."name", $1, $2)');
    expect(sql).toContain('translate("product"."brand", ');
    expect(params).toContain("%darpege%");
  });

  it("finds an accented name without the accent or with a curly apostrophe", () => {
    expect(matches("arpege", arpege)).toBe(true);
    expect(matches("Arpège", arpege)).toBe(true);
    expect(matches("d’arpege", arpege)).toBe(true);
    expect(matches("d'ARPEGE", arpege)).toBe(true);
    expect(matches("eclat", arpege)).toBe(true);
  });

  it("finds a curly-apostrophe name from a straight-apostrophe query", () => {
    expect(matches("d'arpege", { name: "Eclat d’Arpège", brand: "Lanvin" })).toBe(true);
  });

  it("finds every special-character name by plain letters", () => {
    expect(matches("wulong cha", { name: "Wulóng Chá", brand: "Nishane" })).toBe(true);
    expect(matches("darpege", arpege)).toBe(true);
    expect(matches("raed", { name: "Ra'ed Luxe", brand: "Lattafa" })).toBe(true);
    expect(matches("collectors edition", { name: "Supremacy Collector's Edition", brand: "Afnan" })).toBe(true);
    expect(matches("idole lancome", { name: "Idôle", brand: "Lancôme" })).toBe(true);
    expect(matches("flowers flames", { name: "Libre Flowers & Flames", brand: "Yves Saint Laurent" })).toBe(true);
    expect(matches("dolce & gabbana", { name: "Devotion", brand: "Dolce & Gabbana" })).toBe(true);
  });

  it("still needs every word, each in the name or the brand", () => {
    expect(matches("lanvin arpege", arpege)).toBe(true);
    expect(matches("arpege lanvin", arpege)).toBe(true);
    expect(matches("lanvin dior", arpege)).toBe(false);
    expect(matches("arpeges", arpege)).toBe(false);
  });

  it("matches ligatures either way", () => {
    const coeur = { name: "Cœur de Jardin", brand: "Maison" };
    expect(matches("coeur", coeur)).toBe(true);
    expect(matches("cœur", coeur)).toBe(true);
  });
});
