// Shared by the settings list editor (a client component), its loading screen
// and the add-value page (server components). Plain values can't be imported
// from a "use client" module into a Server Component, so they live here.

/** Value | Label | Active columns, one row per entry. */
export const OPTION_GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2";

/** "fragrance_category" → "Fragrance category". */
export function listTitle(listKey: string): string {
  const words = listKey.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
