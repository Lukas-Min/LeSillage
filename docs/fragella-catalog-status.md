# Fragella catalog import — status

Tracks the one-time backfill of your ~75-fragrance list into `fragella_mirror`
(see [`scripts/import-fragella-catalog.ts`](../scripts/import-fragella-catalog.ts)).
Not auto-generated — update this by hand after each import run or manual entry.

**Status: complete.** 361 mirror rows total — 26 via the live Fragella API,
40 hand-entered from Fragrantica via `scripts/import-fragella-manual.ts`
(`scripts/manual-fragrances.json`), 1 genuinely not on Fragrantica at all
(Rayhaan Floriana — not among the brand's 41 listings).

Naming corrections found along the way (your name → Fragrantica's actual
title): NeoRio → Duran Duran NeoRio; Baso → Basso; Tera → Terra; Raed Luxe →
Ra'ed Luxe; Fakhar Extrait Gold → Fakhar Extrait; Fakhar Rose White → Fakhar
Rose; Valaya Exclusif Parfum → Valaya Exclusif. Rayhaan Ayka is on Fragrantica
but has no note pyramid yet (name/brand/year only).

Last updated: 2026-09-02.

## Found (26 of 75)

Confirmed present in `fragella_mirror`, via `Carolina Herrera 212 Heroes` /
`Coach Dreams` / `Gucci Guilty Pour Homme Parfum` (page 2) / `Moschino Toy Boy` /
`Nautica Voyage` / `Valentino Born in Roma` / `Valentino Donna` / `Versace Eros` /
`Y Eau de Parfum Yves Saint Laurent` / `Yves Saint Laurent Libre` /
`Armani Stronger With You` / `Acqua di Gio` / `Jo Malone English Pear` /
`Jo Malone Wild Bluebell` / `Jo Malone Peony` / `Lanvin Eclat d'Arpege` /
`Prada Paradoxe` / `Azzaro The Most Wanted` / `Ralph Lauren Polo` (Blue) /
`Ralph Lauren Ralph` / `Ralph Lauren Romance` / `Mugler Angel Nova` /
`Xerjoff Kemi` searches:

- Carolina Herrera Good Girl, 212 Heroes Her
- Coach Dreams, Dreams Sunset
- Gucci Guilty Parfum
- Moschino Toy Boy
- Nautica Voyage Sport
- Valentino Uomo Born In Roma, Coral Fantasy
- Valentino Donna
- Versace Eros Energy
- Yves Saint Laurent Y, Libre Flowers & Flames, Libre L'Eau Nue
- Giorgio Armani Stronger With You, Aqua Di Gio, Aqua Di Gio Parfum, Aqua Di Gio Profondo
- Jo Malone English Pear & Freesia, Wild Bluebell, Peony and Blush Suede
- Prada Paradoxe
- Azzaro The Most Wanted Intense (covers "Intense" + "Intense EDP" on your list — Fragella lists one 2024 "Intense"), The Most Wanted Parfum
- Ralph Lauren Polo Blue, Ralph For Her, Romance
- Mugler Angel Nova

## Hand-entered — not in Fragella, confirmed real (3 of 75)

All three are genuine 2025 launches; Fragella's catalog simply hasn't
indexed them yet. Verified directly on Fragrantica and inserted into
`fragella_mirror` manually (ids end in `-manual`) with structured facts
only — notes, accords, year, perfumer — no marketing copy or hotlinked
product photography (Fragrantica's photos aren't ours to serve).

| Your name | Actual name | Fragrantica link |
|---|---|---|
| YSL MYSLF Absolu | **MYSLF L'Absolu** (male, 2025) | [link](https://www.fragrantica.com/perfume/Yves-Saint-Laurent/MYSLF-L-Absolu-107428.html) |
| Prada Paradigme | Prada Paradigme (male, 2025) — real, just new | [link](https://www.fragrantica.com/perfume/Prada/Paradigme-110661.html) |
| Mugler Alien Pulp | Mugler Alien Pulp (female, 2025) — real, just new | [link](https://www.fragrantica.com/perfume/Mugler/Alien-Pulp-121443.html) |

**Known gap:** these 3 rows have `requestCount: 0` and no image. If Fragella
indexes them later, a future import run will create a *second* row under
Fragella's own id (the mirror's refresh-by-search can't find/update a
manually-keyed row). When that happens, delete the `-manual` row and keep
the real one.

Every one of the 75 is now either found, hand-entered, or still pending below
— nothing was dropped from the list.

## Still pending (Fragella API, ~46 of 75)

Blocked on quota — every free key we've tried (including the two you supplied
on 2026-09-02) reports `requests_made: 20/20`, reset ~2026-10-02. Progress is
saved in `scripts/.fragella-import-state.json`; the next run resumes from
wherever it stopped, no wasted requests.

Grouped by search (one request each unless noted), roughly in original order:

- Xerjoff Holysm, Xerjoff NeoRio (Duran Duran NeoRio)
- Armani Prive Bleu Lazuli, Armani Prive Cuir Zerzura
- Nishane Wulóng Chá Extrait
- Sospiro (covers both Baso and Vibrato)
- Parfums de Marly Valaya (covers Valaya + Valaya Exclusif Parfum)
- Afnan Mystique Bouquet, Afnan Turathi Blue
- Armaf Club De Nuit (covers Maleka, Intense Man, Intense Man Parfum, Women) — up to 2 pages
- French Avenue (covers Vulcan Feu + Liquid Brun)
- Lattafa Raed, Lattafa Asad (Elixir Black), Lattafa Yara (covers Yara + Elixir),
  Lattafa Fakhar (covers Black/Gold/Rose White — up to 2 pages),
  Lattafa Khamrah (covers Khamrah + Dukhan + Qahwa)
- Mykonos Milk Drops
- Rasasi Hawas (covers Kobra + Ice + Malibu)
- Rayhaan (covers all 8: Tera, Pacific Aura, Lion, Wolf, Aquatica, Obsidian,
  Floriana, Ayka) — up to 3 pages

Run with `npm run fragella:import -- --budget=N` once quota is available
(free tier resets to 20; pay-as-you-go has no cap — see cost note below).
`--dry-run` shows the current plan with zero API cost.

## Cost to finish

~24 requests minimum, ~35–49 realistic (multi-page groups). On pay-as-you-go
($2/mo base + $0.005/request) that's about **$2.25 total**, done in one run.
On the free tier, ~2 more monthly runs of 18–20 requests each.
