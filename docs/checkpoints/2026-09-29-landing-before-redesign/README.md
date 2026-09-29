# Checkpoint: landing page before the redesign (2026-09-29)

The homepage (`src/app/page.tsx`) as it stood before the landing-page redesign.

- **Git tag:** `landing-before-redesign` (commit `3b56be6`). Check out the tag to run this exact version: `git checkout landing-before-redesign`.
- **Screenshots (dark mode):** [`mobile-375-dark.jpg`](mobile-375-dark.jpg) is the full page at 375px wide. [`desktop-1280-dark.jpg`](desktop-1280-dark.jpg) is a lower-resolution capture at 1280px wide (the page fills the top-left of the image).

## What the page had

1. Hero: "Est. 2026 · Manila" eyebrow, "Le Sillage Manila" heading, one random in-stock full bottle as the flagship (discounted bottles first), and the tagline.
2. "Browse by type": three tall tiles for Decant, Full bottle, and Partial.
3. "How it works": three steps (browse, order, upload receipt).

It had no deals section, no new arrivals, no brand or scent-family entry points, and no mention of the store's perks (the decant promo or the first-order code) outside the scrolling bar.

## Accessibility audit (WCAG 2.1 AA)

Tested on the dev server at 375px, 360px, and 320px wide, in light and dark mode, plus a keyboard tab-through. Contrast was measured with a script over every visible text element on the page, header and footer included.

**Issues found:** 8 (Critical: 1, Major: 2, Minor: 5)

### Perceivable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 1 | In light mode, gold small text on the cream background measures 1.7–2.0:1: the "Est. 2026 · Manila", "The shelf", and "How it works" eyebrows, the step numbers 01–03, "View the shelf", and the footer column headings. Dark mode passes everywhere. | 1.4.3 Contrast | 🔴 Critical | Use a darker gold for text in light mode (about 4.5:1 or better on cream) and keep the bright gold for dark mode and for fills |
| 2 | The flagship's rating pill is read as just "4.3", because the star icon is hidden, so there's no context. | 1.1.1 / 1.3.1 | 🟢 Minor | Add screen-reader text such as "Rated 4.3 out of 5" |
| 3 | The "How it works" step titles are paragraphs, not headings. | 1.3.1 | 🟢 Minor | Make them `h3` under the section's `h2` |

The small "Manila" under the header logo also fails in light mode, but it's part of the logotype, which 1.4.3 exempts.

### Operable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 4 | The promo bar scrolls continuously. It pauses on mouse hover and stops when the OS asks for reduced motion, but touch and keyboard users can't pause it: there's nothing focusable inside it, so its `:focus-within` pause never fires. | 2.2.2 Pause, Stop, Hide | 🟡 Major | Add a pause/play button to the bar |
| 5 | Links without their own focus style (the Browse-by-type tiles, footer links) fall back to a 1px outline at 50% opacity, which is barely different from the tile's own border. | 2.4.7 Focus Visible | 🟡 Major | Give them a clear `focus-visible` ring (2px, full-strength gold, offset) |
| 6 | There's no "Skip to content" link. The menu, logo, search, bag, and promo bar all come before the page content. | 2.4.1 Bypass Blocks | 🟢 Minor | Add a skip link that becomes visible on focus, targeting `<main id="main">` |
| 7 | Footer links are 18–20px tall and the header logo link is 32px. They're spaced far enough apart to pass the 24px minimum, but they're below the 44px target. | 2.5.5 (AAA) / 2.5.8 | 🟢 Minor | Pad the footer links to about 44px tall on phones |

### Understandable

No issues. The landing page has no forms of its own; the search dialog's input is labelled.

### Robust

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 8 | `Price` puts `aria-label="Now"` on a plain `<span>`. Screen readers ignore labels on generic elements, so "Now" is never announced; only the "Original price" text is. | 4.1.2 Name, Role, Value | 🟢 Minor | Use screen-reader-only text ("Now") instead of `aria-label` |

### Color contrast check

| Element | Foreground | Background | Ratio | Required | Pass? |
|---------|-----------|------------|-------|----------|-------|
| Eyebrows, step numbers (light) | gold `rgb(217,176,107)` | cream `rgb(249,244,236)` | 1.85:1 | 4.5:1 | ❌ |
| "View the shelf" (light) | gold at 80% | card `rgb(253,251,248)` | 1.70:1 | 4.5:1 | ❌ |
| Footer headings (light) | gold | `rgb(245,240,233)` | 1.79:1 | 4.5:1 | ❌ |
| Eyebrows (dark) | gold | `oklch(0.16)` | above 7:1 | 4.5:1 | ✅ |
| Body and muted text (both modes) | foreground / muted | background / card | 4.5:1 or better | 4.5:1 | ✅ |
| "Save 10%" badge (both modes) | gold-foreground | gold | above 7:1 | 4.5:1 | ✅ |

### Keyboard navigation

| Element | Tab order | Enter/Space | Escape |
|---------|-----------|-------------|--------|
| Header: menu, logo, search, bag | 1–4 | Opens menu / navigates / opens search dialog / opens bag drawer | Closes the dialog or drawer (Radix) |
| Flagship photo | 5 | Opens the lightbox; focus is trapped inside it | Closes it |
| View, Shop the catalog | 6–7 | Navigates | — |
| Browse-by-type tiles | 8–10 | Navigates (weak focus ring, #5) | — |
| Footer links | after main | Navigates | — |

The tab order follows the visual order and there are no traps.

### Screen reader

| Element | Announced as | Issue |
|---------|-------------|-------|
| Logo link | "Le Sillage Manila, link" | None (the image is decorative, `alt=""`) |
| Flagship photo button | "View larger image of Velixir — Athena, button" | None |
| Rating pill | "4.3" | No context (#2) |
| Price | "₱2,880.00 Original price ₱3,200.00" | "Now" label lost (#8) |
| Type tile | "Decant Try before the full bottle. View the shelf, link" | Verbose, but acceptable |
| Promo bar | "Store promotions" complementary landmark, messages read once | None (the repeat copies are `aria-hidden`) |

### Also passing

- `lang="en"`.
- One `h1`, with headings in order.
- Every icon-only button is named.
- The page reflows at 320px (200% zoom) with no horizontal scroll.
- Reduced-motion settings are respected.

### Priority fixes

1. **Gold text contrast in light mode (#1).** This affects every light-mode visitor with low vision, and the section labels are the page's signposts.
2. **Focus ring (#5) and pausing the promo bar (#4).** These affect keyboard and touch users, and people who are distracted by motion.
3. **Skip link, rating text, step headings, the price label, and footer tap targets (#6, #2, #3, #8, #7).**
