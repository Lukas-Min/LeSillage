import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

export const DEFAULT_FULL_BOTTLE_MARKUP_PERCENT = 20;

export function catalogSlug(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function pesosToCentavos(pesos: number) {
  return Math.round(pesos * 100);
}

export function formatNotesSummary(notes: { top: string[]; middle: string[]; base: string[] }) {
  return [
    notes.top.length ? `Top: ${notes.top.join(", ")}` : null,
    notes.middle.length ? `Middle: ${notes.middle.join(", ")}` : null,
    notes.base.length ? `Base: ${notes.base.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function retailFromMarkup(costCentavos: number, markupPercent: number) {
  return Math.round((costCentavos * (100 + markupPercent)) / 100);
}

/** Default file lives in scripts/data. Pass a .json path to use another file. */
export function loadCatalogJson<T>(filename: string): T {
  const override = process.argv.slice(2).find((arg) => arg.endsWith(".json"));
  const file = override
    ? resolve(override)
    : fileURLToPath(new URL(`./data/${filename}`, import.meta.url));
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function decantSizes(prices: Record<string, number>): number[] {
  const sizes = Object.keys(prices)
    .map((key) => Number(key))
    .filter((size) => Number.isInteger(size) && size > 0 && Number.isFinite(prices[String(size)]))
    .sort((a, b) => a - b);
  if (sizes.length === 0) throw new Error("Decant entry has no sizes");
  return sizes;
}

export function runWhenInvoked(scriptFile: string, task: () => Promise<void>) {
  const invoked = process.argv[1]?.replace(/\\/g, "/").endsWith(scriptFile);
  if (!invoked) return;
  task()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
