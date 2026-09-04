export const PHP_PER_PESO = 100;
export const DEFAULT_DELIVERY_FEE_CENTAVOS = 120 * PHP_PER_PESO;
export const DECANT_PROMO_THRESHOLD_CENTAVOS = 2000 * PHP_PER_PESO;

export function toCentavos(pesos: number): number {
  return Math.round(pesos * PHP_PER_PESO);
}

export function fromCentavos(centavos: number): number {
  return centavos / PHP_PER_PESO;
}

/** Rounds up to the nearest whole multiple of `stepPesos` pesos (e.g. step=5 turns ₱56.55 into ₱60). */
export function ceilToNearestPesos(centavos: number, stepPesos: number): number {
  const step = toCentavos(stepPesos);
  return Math.ceil(centavos / step) * step;
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPHP(centavos: number): string {
  return pesoFormatter.format(fromCentavos(centavos));
}

export function formatPHPRange(minCentavos: number, maxCentavos: number): string {
  if (minCentavos === maxCentavos) return formatPHP(minCentavos);
  return `${formatPHP(minCentavos)} – ${formatPHP(maxCentavos)}`;
}

export function formatPHPShort(pesos: number): string {
  return pesoFormatter.format(pesos);
}

export function clampQuantity(quantity: number, max: number): number {
  if (!Number.isFinite(quantity)) return 1;
  if (quantity < 1) return 1;
  if (max > 0 && quantity > max) return max;
  return Math.floor(quantity);
}