# "Things to Do" Neighborhood Guide Page — Design Spec

**Date:** 2026-08-16
**Status:** User-approved
**Branch:** `things-to-do-page`
**Context:** birkenlofts.com (Next.js 15 static export, dark industrial 2026 design system). The user supplied three source files in `docs/design/`: `birken-lofts-neighborhood-guide.json` (270 structured listings), `Things-To-Do-Near-Birken-Lofts.md` (the same content as prose, plus Appendix A on photos and Appendix B on verification), and `download-photos.py` (stdlib-only photo fetcher). Modeled on <https://tetonflats.com/things-to-do-victor-idaho>.

## Decision summary (user-confirmed)

1. **URL: `/things-to-do/`** — one page, all 270 listings, client-side category + season + text filters. Not a hub-and-spoke, not per-listing pages.
2. **Photos ship.** The user has permission from the businesses to post their images, which resolves the Appendix A rights warning. Two widths per listing (~20MB added to the repo).
3. **Nav gets a "Things to Do" link**, plus a CTA from the home page Neighborhood section.
4. **Listing data ships as-is** — including the four listings Appendix B flags as in flux (Lurie Garden, Bally's, Water Tower Place, Mr. Beef). Their body copy already carries the caveats; no hand-added advisory field.

## Data

`docs/design/` is the committed source-of-truth handoff (like `reference/`). The runtime copy is `content/guide/listings.json` — the guide JSON **verbatim**, so `download-photos.py` keeps working unmodified against its own sibling file. The 474KB duplication is deliberate and buys an unforked vendor script.

**`lib/guide.ts`** (new) — mirrors `lib/posts.ts` (`fs.readFileSync` at build time):

```ts
export interface Listing {
  id: string; name: string; category: string; subcategory: string;
  address: string; neighborhood: string; distance_note: string;
  website: string | null; phone: string | null; price_range: string | null;
  seasons: string[]; description: string; highlights: string[];
  why_residents_love_it: string | null;
  photo_url: string | null; photo_source: string | null; photo_file: string;
}
```

Exports `getListings()`, `getCategories()`, and two normalizers the raw data needs:

- **`normalizeSeasons(raw: string[]): Season[]`** — the data holds 28 distinct season strings (`"Best On The Patio Spring Through Fall"`, `"Christkindlmarket In December"`, `"Video Year-Round"`…). Case-insensitive substring match onto the canonical five — `Year-Round`, `Spring`, `Summer`, `Fall`, `Winter` — with month names mapping to their season (December → Winter, September → Fall, April → Spring). A listing can carry several. A listing that matches nothing falls back to `Year-Round`.
- **`priceTier(raw: string | null): Tier | null`** — 100+ distinct price strings (`"$$$ (about $38 drop-in; class packs and memberships)"`). Take the leading token: `/^\$+/` → `$`…`$$$$`; a leading `Free`/`free to` → `Free`; anything else (`"Mid-range to upscale"`, `"About $25-$50 per adult"`) → `null`, no badge. The full raw string becomes the badge's `title` attribute.

**Category table** is fixed in `lib/guide.ts`, in the markdown's own order (its table of contents order — the author's intent, not alphabetical and not the JSON's incidental order). Each entry carries a slug, used for the section anchor id and the filter value. **The slugs are the `photo_file` directory names already present in the JSON** — verified 1:1 with the categories, so nothing needs remapping. Each entry also carries the italic intro sentence lifted verbatim from the corresponding `##` section of the markdown (all 10 exist; line numbers noted for transcription).

| # | Category | Slug | Count | Intro at md line |
|---|---|---|---:|---:|
| 1 | Destination Dining | `destination-dining` | 35 | 31 |
| 2 | Casual Eats, Coffee & Bakeries | `casual-eats-coffee-bakeries` | 37 | 636 |
| 3 | Bars, Nightlife & Live Music | `bars-nightlife-live-music` | 34 | 1241 |
| 4 | Fitness, Wellness & Recreation | `fitness-wellness-recreation` | 30 | 1778 |
| 5 | Museums, Galleries & Performing Arts | `museums-galleries-performing-arts` | 35 | 2275 |
| 6 | Parks, Beaches & Outdoors | `parks-beaches-outdoors` | 31 | 2844 |
| 7 | Attractions, Tours & Shopping | `attractions-tours-shopping` | 30 | 3358 |
| 8 | Sports & Venues | `sports-venues` | 11 | 3834 |
| 9 | Annual Events & Festivals | `annual-events-festivals` | 14 | 4030 |
| 10 | Neighborhood Essentials | `neighborhood-essentials` | 13 | 4270 |

Listing `id`s are globally unique (verified: 270/270), so the photo script keys output files on `id` alone and never needs the category directory.

## Page architecture

**All 270 cards render server-side** into static HTML. Every name, address, distance note, description, and outbound link is in the document for SEO and for no-JS readers. Each `<article>` carries `data-cat="<slug>"`, `data-season="year-round summer"` (space-separated), and `data-search="<lowercased name + neighborhood + subcategory>"`.

**`components/guide/GuideFilters.tsx`** (`'use client'`) filters by **injecting a CSS rule** into a `<style>` element it owns, e.g.:

```css
.guide-grid > :not([data-cat~="bars-nightlife"]) { display: none }
```

Rationale — and this is the load-bearing decision: handing 270 listings from a server component to a client component serializes the entire 474KB payload a *second* time into the RSC stream, and a `useState` + `.filter()` re-renders 270 nodes on every keystroke. CSS injection ships **zero listing data to the client** and does no React work. Same instinct as the existing Leaflet pin-visibility effect in `NeighborhoodMap.tsx`.

- Text search adds a second injected rule built from a DOM pass over `[data-search]`, debounced ~120ms, matching on substring.
- The result count and each section's visibility (a category heading hides when all its cards are filtered out) are computed from `container.querySelectorAll(...)`, in a `requestAnimationFrame` after the style write.
- Filter state also drives `aria-live="polite"` on the count for screen readers.
- No JS → no `<style>` injected → all 270 visible. Correct degradation.

## Photo pipeline

1. `python3 docs/design/download-photos.py` (run once, manually) → `docs/design/photos/<category>/<id>.<ext>` plus `manifest.csv`. **Both gitignored** — raw originals and the rights worksheet stay out of the repo.
2. **`scripts/build-guide-photos.mjs`** (new) + **`sharp`** as a devDependency. The repo has no resize tooling today; existing webps were hand-made. The script walks `docs/design/photos/`, cover-crops each image to 3:2, and writes:
   - `public/images/guide/<id>-480w.webp`
   - `public/images/guide/<id>-960w.webp`

   Quality 72, `effort: 5`. Idempotent — skips an output that already exists unless `--force`. Prints a summary of written/skipped/failed and the total output bytes.
3. Wired as **`npm run build-guide-photos`** — a manual step, deliberately **not** part of `npm run build`, so CI never touches the network or needs Python.

**Missing photos.** 67 of 270 listings have no `photo_url`, and the og:image fallback will not rescue all of them. At build time the card checks `fs.existsSync(public/images/guide/<id>-480w.webp)`. When absent it renders a **typographic fallback tile** in place of the `<img>`: the category eyebrow over the listing name, on `--color-surface` with a hairline `--color-divider` border, at the identical 3:2 aspect ratio. No broken images, no layout shift, and it reads as an intentional editorial treatment rather than a hole.

## Layout

Top to bottom, in the dark industrial system — `--color-*` tokens only, no border radius, no shadows, Big Shoulders Display headings, Libre Franklin 300 body. New CSS goes in a single `/* — things to do — */` block in `app/site.css`; **no new tokens** unless one is genuinely missing, in which case it is added to `globals.css`.

1. **Header** (`.guide-header`) — eyebrow "The Neighborhood", `<h1>` "Things to Do Around Birken Lofts", lede adapted from the guide's opening paragraph. Mirrors `.history-header` / `.journal-header` rhythm.
2. **Stats band** — reuses the home page `.stats-band` markup and classes: `270 places` · `10 categories` · `4 min walk to groceries` · `1–3 miles from the door`.
3. **Filter bar** (`.guide-filters`) — `position: sticky` below the 72px nav. Category `<select>`, season `<select>`, search `<input>`, a live "270 places" count, and a Clear button that only appears when a filter is active. Built on the existing `.input` and `.btn` base styles.
4. **Category sections** — each `<section id="<slug>">` with `scroll-margin-top: 132px` (nav + sticky filter bar), an `<h2>`, the italic category intro, and a **3-up grid** (`.guide-grid`): 3 columns → 2 at 900px → 1 at 640px, 28px gap, matching `.cards-3`.
5. **Card** (`.guide-card`) — `--color-surface` on a `--color-divider` hairline:
   - 3:2 image via `StaticImg` with the 480w/960w srcset, `sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 900px) 45vw, 30vw"`, explicit width/height, `loading="lazy"` except the **first 6** which are eager.
   - `<h3>` name.
   - Meta line: `neighborhood` · `distance_note`.
   - Badge row: price tier (when parseable) + normalized season badges.
   - Description, CSS `line-clamp: 3` — **full text stays in the DOM** for SEO and for the search index.
   - `why_residents_love_it` as a pull quote with a left accent border.
   - `Visit website ↗` — `target="_blank" rel="noopener noreferrer nofollow"`. Omitted when `website` is null.
6. **Empty state** (`.guide-empty`) — shown by the same CSS-injection mechanism when the result count hits zero; offers a Clear filters button.
7. **Closing CTA** — "See it on the map" → `/#neighborhood`, "Schedule a tour" → `/#contact`.

Mobile (≤768px) follows the established spec: single column, filter bar collapses to a full-width stack, badges wrap.

## Files

**Create**
- `content/guide/listings.json` — verbatim copy of the guide JSON.
- `lib/guide.ts` — types, loader, `normalizeSeasons`, `priceTier`, category table.
- `app/things-to-do/page.tsx` — server component: `metadata`, JSON-LD, header, stats, filter bar, 10 sections, CTA.
- `components/guide/GuideCard.tsx` — server component (needs `fs.existsSync` for the photo check).
- `components/guide/GuideFilters.tsx` — `'use client'`, the CSS-injection filter.
- `scripts/build-guide-photos.mjs` — sharp resize pipeline.

**Modify**
- `components/Nav.tsx` — add `{ href: '/things-to-do/', label: 'Things to Do' }` after Neighborhood, with an `onThingsToDo = pathname.startsWith('/things-to-do')` check. Seven links plus the CTA on desktop; if it wraps at 1024px, tighten the `.nav-links` gap in `site.css` rather than dropping a link. The mobile drawer needs no change (vertical, auto-numbered).
- `components/home/Neighborhood.tsx` — "Explore all 270 places →" link under the map.
- `app/sitemap.ts` — `/things-to-do/` at priority 0.8, `changeFrequency: 'monthly'`.
- `app/site.css` — the `things to do` block plus the ≤768px rules.
- `package.json` — `sharp` devDependency, `build-guide-photos` script.
- `.gitignore` — `docs/design/photos/`.
- `public/llms.txt`, `public/llms-full.txt` — add the route and a two-line description.

**Untouched:** `robots.txt`, CNAME, favicons, `hooks/useScrollSpy.ts` (this is a page, not a home section), all existing images.

## SEO

- `metadata`: title "Things to Do Near Birken Lofts | River North, Chicago", description naming the 270 places and the River North / 401 W. Ontario anchor, canonical `https://birkenlofts.com/things-to-do/`, OpenGraph reusing `public/images/og/birken-lofts-og.jpg`.
- Inline JSON-LD: `CollectionPage` + `BreadcrumbList` + an `ItemList` whose 10 items are the **category sections** (name, description, section URL).
- **Deliberately not** 270 `LocalBusiness` entries. Marking up businesses we don't own is schema spam and invites a manual action.

## Edge cases / constraints

- **Field nullability, measured against the data:** `phone` is null on **84 of 270** — the card does not render phone at all, so this is moot by design. `website`, `price_range`, `why_residents_love_it`, `description`, and `highlights` are populated on **all 270**. The card still guards `website` and `why_residents_love_it` defensively (no link / no pull quote when absent) so a future re-sync with gaps degrades instead of rendering "null".
- `price_range` is populated everywhere but only ~65% parses to a tier; the rest render no price badge, which is the intended behavior, not a bug.
- Four listings carry Appendix B caveats inside their descriptions; shipped as-is per the decision above.
- Ids are asserted unique at load time; a duplicate throws at build (fails the deploy loudly rather than silently overwriting a photo).
- `docs/design/photos/` gitignored means a fresh clone cannot regenerate `public/images/guide/` without re-running the Python fetcher. That is acceptable — the processed webps are committed and are what the site serves.
- Expected page weight: ~450KB of HTML (~90KB gzipped) and 270 lazy images. If Lighthouse regresses below the current >90, the fallback is to clamp the description harder and cut the eager count.

## Verification

There is no test suite; `npm run build` is the gate.

- `npm run build` clean (typechecks) and `npm run lint` clean.
- `out/things-to-do/index.html` exists; grep it for: the canonical tag, `CollectionPage`, all 10 section ids, a count of 270 `guide-card` occurrences, and zero `undefined`/`null` leaking into rendered text.
- Confirm `public/images/guide/` file count matches the successful-download count, and that every card either references an existing file or renders a fallback tile — no `<img>` pointing at a nonexistent path.
- Playwright against the built output: category filter narrows and the count updates; season filter composes with it; search narrows further; Clear restores 270; an empty combination shows the empty state; category headings hide when their section empties.
- Playwright at 375 / 768 / 1440: no horizontal overflow, nav does not wrap, filter bar sticks correctly, grid reflows 1 → 2 → 3.
- With JS disabled, all 270 cards are visible.
