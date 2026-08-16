# Things to Do Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/things-to-do/` — a single static page presenting all 270 neighborhood-guide listings with client-side category, season, and text filtering.

**Architecture:** All 270 cards render server-side into static HTML (full SEO, works with JS off). A small `'use client'` component filters them by writing a single CSS rule into a `<style>` element it owns — category via `[data-cat=]`, season via `[data-season~=]`, search via `[data-search*= i]`, and empty-section hiding via `:has()`. No listing data is ever serialized to the browser and React never re-renders the 270 cards.

**Tech Stack:** Next.js 15 App Router (`output: 'export'`, `trailingSlash: true`), TypeScript strict, React 19, plain CSS in `app/site.css` (no Tailwind), `sharp` for the image pipeline, `node --test` with Node 25's native type stripping for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-16-things-to-do-page-design.md`

## Global Constraints

- **Branch:** `things-to-do-page`. Do not merge to `main`; the deploy workflow publishes `main` automatically.
- **Design system:** dark industrial only. Use existing tokens from `app/globals.css` (`--color-bg/band/surface/map/text/body/muted/faint/accent/paper/divider/divider-strong`). **No border radius and no shadows anywhere.** Headings are `--font-heading` (Big Shoulders Display, uppercase); body is `--font-body` at weight 300.
- **No new CSS tokens** unless one is genuinely missing; if so it goes in `globals.css`, never inline.
- All new page CSS goes in **one** `/* — things to do — */` block at the end of `app/site.css`, with its `@media (max-width: 768px)` rules inside the file's existing mobile block.
- **No Tailwind. No CSS-in-JS. No new runtime dependencies** — `sharp` is `devDependencies` only.
- Static export: no code may touch `window` or `document` outside a `'use client'` component's effect.
- Images use the existing `components/StaticImg.tsx` (a plain `<img>` with a hand-rolled srcset) — `next/image` emits no srcset under `images.unoptimized`.
- `npm run build` is the deploy gate and typechecks; it must stay clean. CI runs `npm ci && npm run build` only — **nothing added to the build may require network access or Python.**
- Copy is en-dash/em-dash aware: use HTML entities (`&mdash;`, `&rsquo;`) in JSX prose, matching `app/history/page.tsx`.
- Canonical host is `https://birkenlofts.com` with trailing slashes on every route.

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `content/guide/listings.json` | Runtime copy of the guide data, verbatim (270 listings). |
| `lib/guide.ts` | Types, category table, `normalizeSeasons`, `priceTier`, `getListings`, `getPhotoIds`. The only module that reads the JSON. |
| `lib/guide.test.mts` | Unit tests for the two normalizers and the category table. |
| `scripts/build-guide-photos.mjs` | One-off sharp pipeline: `docs/design/photos/**` → `public/images/guide/<id>-{480,960}w.webp`. |
| `components/guide/GuideCard.tsx` | Pure presentational server component for one listing. No `fs`, no state. |
| `components/guide/GuideFilters.tsx` | `'use client'` — the CSS-injection filter bar. |
| `app/things-to-do/page.tsx` | Server component: metadata, JSON-LD, header, stats, filter bar, 10 sections, CTA. |

**Modify**

| File | Change |
|---|---|
| `.gitignore` | Ignore `docs/design/photos/`. |
| `package.json` | `sharp` devDependency; `test` and `build-guide-photos` scripts. |
| `app/site.css` | The `things to do` CSS block + mobile rules + a nav gap tightening. |
| `components/Nav.tsx` | Seventh link, `onThingsToDo` active check. |
| `components/home/Neighborhood.tsx` | "Explore all 270 places →" CTA under the map. |
| `app/sitemap.ts` | `/things-to-do/` entry. |
| `public/llms.txt`, `public/llms-full.txt` | Add the route. |

**Untouched:** `robots.txt`, `public/CNAME`, favicons, `hooks/useScrollSpy.ts` (this is a page, not a home section), `.github/workflows/deploy.yml`, every existing image.

---

## Task 1: Guide data module

Pure functions first, because the raw data is messy (28 distinct season strings, 100+ distinct price strings) and this is the only part of the feature worth real unit tests.

**Files:**
- Create: `content/guide/listings.json`
- Create: `lib/guide.ts`
- Test: `lib/guide.test.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces, all imported by later tasks from `@/lib/guide`:
  - `interface Listing` — fields exactly as listed in Step 3.
  - `type Season = 'Year-Round' | 'Spring' | 'Summer' | 'Fall' | 'Winter'`
  - `interface GuideCategory { name: string; slug: string; intro: string }`
  - `const CATEGORIES: GuideCategory[]` — 10 entries, fixed order.
  - `function normalizeSeasons(raw: string[]): Season[]`
  - `function priceTier(raw: string | null): string | null`
  - `function getListings(): Listing[]`
  - `function getListingsByCategory(): { category: GuideCategory; listings: Listing[] }[]`
  - `function getPhotoIds(): Set<string>`
  - `const TOTAL_LISTINGS: number` (270)

**Critical design note for the implementer:** `lib/guide.ts` must have **no module-scope side effects**. All `fs` reads happen lazily inside `getListings()` / `getPhotoIds()` behind a memo variable. If you read the JSON at module scope, `lib/guide.test.mts` breaks (it runs from a different cwd context and must be able to import the pure normalizers in isolation).

- [ ] **Step 1: Copy the guide data to its runtime home**

```bash
mkdir -p content/guide
cp docs/design/birken-lofts-neighborhood-guide.json content/guide/listings.json
node -e "const d=require('./content/guide/listings.json');console.log(d.length, new Set(d.map(x=>x.id)).size)"
```

Expected output: `270 270`

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/*.test.mts",
```

The `--disable-warning` flag suppresses `MODULE_TYPELESS_PACKAGE_JSON`, which Node emits because this package has no `"type": "module"`. **Do not add `"type": "module"` to `package.json`** — it would change module resolution for `next.config.ts` and the existing `scripts/*.mjs`.

- [ ] **Step 3: Write the failing test**

Create `lib/guide.test.mts`. Note the `./guide.ts` import specifier — Node's type stripping requires the real extension, and tsconfig `paths` aliases (`@/`) do **not** work under `node --test`.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeasons, priceTier, CATEGORIES } from './guide.ts';

test('normalizeSeasons passes through the canonical five', () => {
  assert.deepEqual(normalizeSeasons(['Year-Round']), ['Year-Round']);
  assert.deepEqual(normalizeSeasons(['Summer']), ['Summer']);
  assert.deepEqual(normalizeSeasons(['Winter']), ['Winter']);
});

test('normalizeSeasons extracts seasons from prose', () => {
  assert.deepEqual(normalizeSeasons(['Best On The Patio Spring Through Fall']), ['Spring', 'Fall']);
  assert.deepEqual(normalizeSeasons(['Winter (Heated Stalls)']), ['Winter']);
  assert.deepEqual(normalizeSeasons(['Ice Cream Sandwiches In Summer']), ['Summer']);
  assert.deepEqual(normalizeSeasons(['Video Year-Round']), ['Year-Round']);
});

test('normalizeSeasons maps month names to their season', () => {
  assert.deepEqual(normalizeSeasons(['Christkindlmarket In December']), ['Winter']);
  assert.deepEqual(normalizeSeasons(['September Through May Season']), ['Spring', 'Fall']);
  assert.deepEqual(normalizeSeasons(['April Through December']), ['Spring', 'Winter']);
});

test('normalizeSeasons treats holiday copy as winter', () => {
  assert.deepEqual(normalizeSeasons(['Holiday Season']), ['Winter']);
});

test('normalizeSeasons returns canonical order and dedupes', () => {
  assert.deepEqual(normalizeSeasons(['Winter', 'Summer', 'Summer']), ['Summer', 'Winter']);
});

test('normalizeSeasons falls back to Year-Round when nothing matches', () => {
  assert.deepEqual(normalizeSeasons(['Weekdays Only']), ['Year-Round']);
  assert.deepEqual(normalizeSeasons(['Thursday-Sunday Evenings']), ['Year-Round']);
  assert.deepEqual(normalizeSeasons([]), ['Year-Round']);
});

test('normalizeSeasons does not match "may" inside another word', () => {
  assert.deepEqual(normalizeSeasons(['Mayoral Tours']), ['Year-Round']);
});

test('priceTier takes a leading dollar run', () => {
  assert.equal(priceTier('$$'), '$$');
  assert.equal(priceTier('$$$ (about $38 drop-in; class packs)'), '$$$');
  assert.equal(priceTier('$$$$ (from about $339/month)'), '$$$$');
  assert.equal(priceTier('$-$$'), '$');
  assert.equal(priceTier('$$-$$$'), '$$');
});

test('priceTier recognises free', () => {
  assert.equal(priceTier('Free'), 'Free');
  assert.equal(priceTier('Free to visit'), 'Free');
  assert.equal(priceTier('Free (city DFA permit tag required)'), 'Free');
});

test('priceTier returns null for dollar amounts, not tiers', () => {
  assert.equal(priceTier('$2.50 per ride; $5 day pass; $75 monthly'), null);
  assert.equal(priceTier('$19-$24 adults; free for 18 and under'), null);
  assert.equal(priceTier('$16 adults, $10 seniors'), null);
});

test('priceTier returns null for unparseable prose and nullish input', () => {
  assert.equal(priceTier('Mid-range to upscale'), null);
  assert.equal(priceTier('About $25-$50 per adult'), null);
  assert.equal(priceTier(null), null);
  assert.equal(priceTier(''), null);
});

test('CATEGORIES has ten entries with unique slugs and non-empty intros', () => {
  assert.equal(CATEGORIES.length, 10);
  assert.equal(new Set(CATEGORIES.map((c) => c.slug)).size, 10);
  assert.equal(CATEGORIES[0].slug, 'destination-dining');
  assert.equal(CATEGORIES[9].slug, 'neighborhood-essentials');
  for (const c of CATEGORIES) assert.ok(c.intro.length > 40, `${c.slug} intro too short`);
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './guide.ts'`.

- [ ] **Step 5: Write `lib/guide.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';

export interface Listing {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  address: string;
  neighborhood: string;
  distance_note: string;
  website: string | null;
  phone: string | null;
  price_range: string | null;
  seasons: string[];
  description: string;
  highlights: string[];
  why_residents_love_it: string | null;
  photo_url: string | null;
  photo_source: string | null;
  photo_file: string;
}

export type Season = 'Year-Round' | 'Spring' | 'Summer' | 'Fall' | 'Winter';

export interface GuideCategory {
  name: string;
  slug: string;
  intro: string;
}

/** Canonical display order — the source markdown's own table-of-contents order. */
export const CATEGORIES: GuideCategory[] = [
  {
    name: 'Destination Dining',
    slug: 'destination-dining',
    intro:
      'River North has more restaurants per square foot than any neighborhood in Chicago outside the Loop, and the ones below are the reservations people plan their week around. Roughly half are inside a ten-minute walk of the front door.',
  },
  {
    name: 'Casual Eats, Coffee & Bakeries',
    slug: 'casual-eats-coffee-bakeries',
    intro:
      'The everyday list — the deep-dish that ships nationwide, the Italian beef stand, the corner espresso bar, and the brunch spot with the line out the door. This is what living here actually tastes like on a Tuesday.',
  },
  {
    name: 'Bars, Nightlife & Live Music',
    slug: 'bars-nightlife-live-music',
    intro:
      "River North is Chicago's nightlife center of gravity: tiki bars, hotel rooftops, blues clubs, and the comedy stage that launched half of Saturday Night Live. Most of it is walkable, and none of it requires a car.",
  },
  {
    name: 'Fitness, Wellness & Recreation',
    slug: 'fitness-wellness-recreation',
    intro:
      'East Bank Club sits eight blocks west and anchors one of the densest fitness corridors in the city — full-service clubs, boutique studios, climbing gyms, pickleball courts, and spas, nearly all within a mile.',
  },
  {
    name: 'Museums, Galleries & Performing Arts',
    slug: 'museums-galleries-performing-arts',
    intro:
      "The River North Gallery District begins at the building's doorstep, and world-class museums and stages are a short walk or one train stop away. Several are free or pay-what-you-wish for Illinois residents.",
  },
  {
    name: 'Parks, Beaches & Outdoors',
    slug: 'parks-beaches-outdoors',
    intro:
      "Green space starts two blocks away at Erie Park and runs east to eighteen miles of lakefront trail, three beaches, and a riverwalk that functions as the city's summer front porch.",
  },
  {
    name: 'Attractions, Tours & Shopping',
    slug: 'attractions-tours-shopping',
    intro:
      'The Magnificent Mile, architecture cruises, two observation decks, and Navy Pier — the postcard version of Chicago is a walk or a short ride from Ontario Street.',
  },
  {
    name: 'Sports & Venues',
    slug: 'sports-venues',
    intro:
      'Five major pro franchises play within a few miles, and three of the venues are reachable by a single train ride from the Chicago Brown Line stop two blocks away.',
  },
  {
    name: 'Annual Events & Festivals',
    slug: 'annual-events-festivals',
    intro:
      'Chicago runs on its festival calendar. Several of the biggest — the river dyeing, the Mag Mile Lights Festival, Christkindlmarket — happen close enough to walk to.',
  },
  {
    name: 'Neighborhood Essentials',
    slug: 'neighborhood-essentials',
    intro:
      'The practical stuff that makes a neighborhood livable: groceries, pharmacies, transit, the library, and how long it actually takes to get to O’Hare.',
  },
];

export const TOTAL_LISTINGS = 270;

const SEASON_ORDER: Season[] = ['Year-Round', 'Spring', 'Summer', 'Fall', 'Winter'];

const MONTH_SEASON: Record<string, Season> = {
  january: 'Winter', february: 'Winter', december: 'Winter',
  march: 'Spring', april: 'Spring', may: 'Spring',
  june: 'Summer', july: 'Summer', august: 'Summer',
  september: 'Fall', october: 'Fall', november: 'Fall',
};

/**
 * The guide holds 28 distinct season strings ("Best On The Patio Spring Through
 * Fall", "Christkindlmarket In December"). Reduce them to the canonical five so
 * the filter has a fixed vocabulary. Ranges are not expanded — "Spring Through
 * Fall" yields Spring and Fall, not Summer — which keeps the rule simple and
 * never invents a season the copy didn't name.
 */
export function normalizeSeasons(raw: string[]): Season[] {
  const found = new Set<Season>();
  for (const entry of raw) {
    const s = entry.toLowerCase();
    if (/year[-\s]?round/.test(s)) found.add('Year-Round');
    if (/\bspring\b/.test(s)) found.add('Spring');
    if (/\bsummer\b/.test(s)) found.add('Summer');
    if (/\bfall\b|\bautumn\b/.test(s)) found.add('Fall');
    if (/\bwinter\b|\bholiday\b|\bchristmas\b/.test(s)) found.add('Winter');
    for (const [month, season] of Object.entries(MONTH_SEASON)) {
      if (new RegExp(`\\b${month}\\b`).test(s)) found.add(season);
    }
  }
  if (found.size === 0) return ['Year-Round'];
  return SEASON_ORDER.filter((s) => found.has(s));
}

/**
 * `price_range` holds 100+ distinct strings. Only a leading tier token is
 * trustworthy; a leading dollar *amount* ("$2.50 per ride") is not a tier, so
 * the dollar run must not be followed by a digit or decimal point.
 */
export function priceTier(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const m = /^(\$+)(?![\d.])/.exec(s);
  if (m) return m[1].slice(0, 4);
  if (/^free\b/i.test(s)) return 'Free';
  return null;
}

let cachedListings: Listing[] | null = null;

/** Build-time only. Lazy so the pure helpers above stay importable in tests. */
export function getListings(): Listing[] {
  if (cachedListings) return cachedListings;
  const file = path.join(process.cwd(), 'content', 'guide', 'listings.json');
  const listings: Listing[] = JSON.parse(fs.readFileSync(file, 'utf8'));

  const ids = new Set<string>();
  for (const l of listings) {
    if (ids.has(l.id)) throw new Error(`Duplicate listing id: ${l.id}`);
    ids.add(l.id);
  }
  const known = new Set(CATEGORIES.map((c) => c.name));
  for (const l of listings) {
    if (!known.has(l.category)) throw new Error(`Unknown category on ${l.id}: ${l.category}`);
  }
  if (listings.length !== TOTAL_LISTINGS) {
    throw new Error(`Expected ${TOTAL_LISTINGS} listings, found ${listings.length}`);
  }

  cachedListings = listings;
  return listings;
}

export function getListingsByCategory(): { category: GuideCategory; listings: Listing[] }[] {
  const all = getListings();
  return CATEGORIES.map((category) => ({
    category,
    listings: all.filter((l) => l.category === category.name),
  }));
}

/** Ids that have a generated 480w webp on disk — one readdir, not 270 stats. */
export function getPhotoIds(): Set<string> {
  const dir = path.join(process.cwd(), 'public', 'images', 'guide');
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('-480w.webp'))
      .map((f) => f.slice(0, -'-480w.webp'.length)),
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `# pass 13`, `# fail 0`.

If `normalizeSeasons(['September Through May Season'])` fails, check the month regex: `may` must be word-bounded so `Mayoral` doesn't match, and September→Fall must sort before May→Spring is dropped — the expected result is `['Spring', 'Fall']` in `SEASON_ORDER` order.

- [ ] **Step 7: Verify the loader against the real data**

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON -e "
const g = await import('./lib/guide.ts');
const all = g.getListings();
console.log('listings', all.length);
console.log('by category', g.getListingsByCategory().map(x => x.category.slug + ':' + x.listings.length).join(' '));
const tiers = all.map(l => g.priceTier(l.price_range)).filter(Boolean);
console.log('price badges', tiers.length + '/' + all.length);
console.log('season vocab', [...new Set(all.flatMap(l => g.normalizeSeasons(l.seasons)))].join(','));
" --input-type=module
```

Expected: 270 listings; the ten slugs with counts 35/37/34/30/35/31/30/11/14/13; roughly 175–190 price badges; season vocabulary exactly `Year-Round,Spring,Summer,Fall,Winter` in some order and nothing else.

- [ ] **Step 8: Commit**

```bash
git add content/guide/listings.json lib/guide.ts lib/guide.test.mts package.json
git commit -m "Add the neighborhood guide data module

Normalizes the raw guide's 28 season strings to the canonical five and
parses a price tier only from a leading token, so a dollar amount like
\"\$2.50 per ride\" doesn't masquerade as a \$ tier. Loader asserts 270
listings, unique ids, and known categories so a bad re-sync fails the
build loudly."
```

---

## Task 2: Photo pipeline

**Files:**
- Create: `scripts/build-guide-photos.mjs`
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Consumes: `docs/design/download-photos.py` (supplied, unmodified), the `id` field from `content/guide/listings.json`.
- Produces: `public/images/guide/<id>-480w.webp` and `<id>-960w.webp` for every listing that has a source photo. Task 3's `GuideCard` and Task 1's `getPhotoIds()` depend on exactly this naming.

- [ ] **Step 1: Ignore the raw downloads**

Append to `.gitignore`:

```
# Raw listing photos + rights worksheet — only the processed webps are committed
/docs/design/photos/
```

- [ ] **Step 2: Fetch the source photos**

```bash
python3 docs/design/download-photos.py
```

This makes ~270 network requests with 8 workers; allow several minutes. Expect roughly 200 successes and a tail of failures — 67 listings have no `photo_url` and the og:image fallback will not rescue all of them. **This is expected, not a failure.** Record the number it reports:

```bash
ls docs/design/photos/*/* | wc -l
```

- [ ] **Step 3: Add sharp and the script entry**

```bash
npm install --save-dev sharp
```

Add to `"scripts"` in `package.json`:

```json
"build-guide-photos": "node scripts/build-guide-photos.mjs",
```

**`build-guide-photos` must NOT be wired into `build`.** CI has no Python and no network for this; the processed webps are committed and are what the site serves.

- [ ] **Step 4: Write `scripts/build-guide-photos.mjs`**

```js
#!/usr/bin/env node
/**
 * Crops every downloaded listing photo to 3:2 and emits the two widths the
 * cards reference. Run manually after docs/design/download-photos.py:
 *
 *     npm run build-guide-photos [-- --force]
 *
 * Deliberately not part of `npm run build` — CI must never need Python,
 * network access, or sharp's platform binaries to deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'docs', 'design', 'photos');
const OUT = path.join(ROOT, 'public', 'images', 'guide');
const WIDTHS = [480, 960];
const FORCE = process.argv.includes('--force');

if (!fs.existsSync(SRC)) {
  console.error(`No source photos at ${path.relative(ROOT, SRC)}.`);
  console.error('Run: python3 docs/design/download-photos.py');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const sources = fs
  .readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) =>
    fs
      .readdirSync(path.join(SRC, d.name))
      .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
      .map((f) => ({ id: path.parse(f).name, file: path.join(SRC, d.name, f) })),
  );

let written = 0;
let skipped = 0;
const failed = [];

for (const { id, file } of sources) {
  for (const w of WIDTHS) {
    const dest = path.join(OUT, `${id}-${w}w.webp`);
    if (!FORCE && fs.existsSync(dest)) {
      skipped++;
      continue;
    }
    try {
      await sharp(file, { failOn: 'none' })
        .rotate()
        .resize(w, Math.round((w * 2) / 3), { fit: 'cover', position: 'attention' })
        .webp({ quality: 72, effort: 5 })
        .toFile(dest);
      written++;
    } catch (err) {
      failed.push(`${id} @${w}w: ${err.message}`);
    }
  }
}

const bytes = fs
  .readdirSync(OUT)
  .reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);

console.log(`\nSources: ${sources.length}`);
console.log(`Written: ${written}   Skipped (already present): ${skipped}   Failed: ${failed.length}`);
console.log(`Output:  ${fs.readdirSync(OUT).length} files, ${(bytes / 1e6).toFixed(1)} MB`);
if (failed.length) {
  console.log('\nFailures:');
  for (const f of failed) console.log(`  - ${f}`);
}
```

Notes for the implementer: `position: 'attention'` picks the most feature-rich crop region rather than dead-centering, which matters for storefront photos. `.rotate()` with no argument applies EXIF orientation. `failOn: 'none'` keeps one truncated download from aborting the run.

- [ ] **Step 5: Run the pipeline**

```bash
npm run build-guide-photos
```

Expected: two files written per source, `Failed: 0` (a handful of failures on corrupt downloads is tolerable — note them), and total output in the **15–25 MB** range. If it lands materially above 25 MB, drop `quality` to 65 and re-run with `--force` before committing.

- [ ] **Step 6: Verify the output matches what the page will look for**

```bash
node -e "
const fs=require('fs');
const ids=new Set(require('./content/guide/listings.json').map(l=>l.id));
const have=new Set(fs.readdirSync('public/images/guide').filter(f=>f.endsWith('-480w.webp')).map(f=>f.slice(0,-10)));
const orphans=[...have].filter(id=>!ids.has(id));
const pairless=[...have].filter(id=>!fs.existsSync('public/images/guide/'+id+'-960w.webp'));
console.log('listings with a photo:', have.size, '/', ids.size);
console.log('orphan files (no matching listing):', orphans);
console.log('480w without a 960w partner:', pairless);
"
```

Expected: a photo count around 180–210, **`orphans` empty**, and **`pairless` empty**. A non-empty `orphans` means an id mismatch between the fetcher and the JSON and must be fixed before proceeding — the page keys entirely on `id`.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json scripts/build-guide-photos.mjs public/images/guide
git commit -m "Add the listing photo pipeline

download-photos.py fetches into a gitignored docs/design/photos/; this
script crops to 3:2 and emits the committed 480w/960w webps the cards
reference. Kept out of \`npm run build\` so CI never needs Python,
network access, or sharp's platform binaries."
```

---

## Task 3: Listing card + card CSS

**Files:**
- Create: `components/guide/GuideCard.tsx`
- Modify: `app/site.css`

**Interfaces:**
- Consumes: `Listing`, `normalizeSeasons`, `priceTier` from `@/lib/guide`; `StaticImg` from `@/components/StaticImg`.
- Produces: `export default function GuideCard(props: { listing: Listing; hasPhoto: boolean; eager?: boolean })`. Task 4 renders it. The `data-cat` / `data-season` / `data-search` attributes it emits are the exact contract Task 5's filter selectors depend on.

- [ ] **Step 1: Write `components/guide/GuideCard.tsx`**

A server component — no `'use client'`, no `fs` (the caller resolves `hasPhoto` once from `getPhotoIds()`).

```tsx
import StaticImg from '@/components/StaticImg';
import { normalizeSeasons, priceTier, type Listing } from '@/lib/guide';

interface GuideCardProps {
  listing: Listing;
  categorySlug: string;
  hasPhoto: boolean;
  eager?: boolean;
}

export default function GuideCard({ listing, categorySlug, hasPhoto, eager }: GuideCardProps) {
  const seasons = normalizeSeasons(listing.seasons);
  const tier = priceTier(listing.price_range);
  const src = `/images/guide/${listing.id}`;

  return (
    <article
      className="guide-card"
      data-cat={categorySlug}
      data-season={seasons.map((s) => s.toLowerCase()).join(' ')}
      data-search={`${listing.name} ${listing.neighborhood} ${listing.subcategory}`.toLowerCase()}
    >
      <div className="guide-card-media">
        {hasPhoto ? (
          <StaticImg
            src={`${src}-960w.webp`}
            srcSet={`${src}-480w.webp 480w, ${src}-960w.webp 960w`}
            sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 900px) 45vw, 30vw"
            alt={listing.name}
            width={960}
            height={640}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
          />
        ) : (
          <div className="guide-card-fallback" aria-hidden="true">
            <span className="guide-card-fallback-kicker">{listing.subcategory}</span>
            <span className="guide-card-fallback-name">{listing.name}</span>
          </div>
        )}
      </div>

      <div className="guide-card-body">
        <h3>{listing.name}</h3>
        <p className="guide-card-meta">
          {listing.neighborhood} &middot; {listing.distance_note}
        </p>

        <div className="guide-card-badges">
          {tier && (
            <span className="guide-badge guide-badge--price" title={listing.price_range ?? undefined}>
              {tier}
            </span>
          )}
          {seasons.map((s) => (
            <span className="guide-badge" key={s}>
              {s}
            </span>
          ))}
        </div>

        <p className="guide-card-desc">{listing.description}</p>

        {listing.why_residents_love_it && (
          <p className="guide-card-quote">{listing.why_residents_love_it}</p>
        )}

        {listing.website && (
          <a
            className="guide-card-link"
            href={listing.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Visit website <span aria-hidden="true">&#8599;</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Check whether `.sr-only` already exists**

Run: `grep -n "sr-only" app/globals.css app/site.css`

If it returns nothing, add this to `app/globals.css` alongside the other base elements:

```css
.sr-only {
  position: absolute;
  overflow: hidden;
  clip-path: inset(50%);
  width: 1px;
  height: 1px;
  white-space: nowrap;
}
```

- [ ] **Step 3: Add the card CSS**

Append a new block at the end of `app/site.css`:

```css
/* — things to do — */

.guide-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.guide-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  border: 1px solid var(--color-divider);
  background: var(--color-surface);
}

.guide-card-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3 / 2;
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-map);
}

.guide-card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.guide-card-fallback {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  gap: 8px;
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0 11px,
      rgba(237, 230, 219, 0.03) 11px 12px
    ),
    var(--color-map);
}

.guide-card-fallback-kicker {
  color: var(--color-accent);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1.4;
  text-transform: uppercase;
}

.guide-card-fallback-name {
  color: var(--color-faint);
  font-family: var(--font-heading);
  font-size: 26px;
  font-weight: 700;
  line-height: 0.95;
  text-transform: uppercase;
}

.guide-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 22px 22px 24px;
  gap: 10px;
}

.guide-card-body h3 {
  font-size: 22px;
  line-height: 1.05;
}

.guide-card-meta {
  color: var(--color-faint);
  font-size: 12px;
  letter-spacing: 0.04em;
  line-height: 1.5;
}

.guide-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.guide-badge {
  padding: 4px 9px;
  border: 1px solid var(--color-divider-strong);
  color: var(--color-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1.3;
  text-transform: uppercase;
}

.guide-badge--price {
  border-color: rgba(200, 107, 79, 0.4);
  color: var(--color-accent);
}

.guide-card-desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  color: var(--color-body);
  font-size: 14px;
  line-height: 1.6;
}

.guide-card-quote {
  padding-left: 12px;
  border-left: 2px solid var(--color-accent);
  color: var(--color-muted);
  font-size: 13px;
  font-style: italic;
  line-height: 1.55;
}

.guide-card-link {
  margin-top: auto;
  padding-top: 14px;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.guide-card-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

@media (max-width: 900px) {
  .guide-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .guide-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
}
```

The `-webkit-line-clamp` truncation is visual only — the full description stays in the DOM for SEO. `overflow: hidden` on the media box plus a fixed `aspect-ratio` is what prevents layout shift for the 67 fallback tiles.

- [ ] **Step 4: Verify it typechecks**

Run: `npm run build`
Expected: PASS. `GuideCard` is not yet rendered anywhere, so this only proves the types and imports resolve.

- [ ] **Step 5: Commit**

```bash
git add components/guide/GuideCard.tsx app/site.css app/globals.css
git commit -m "Add the guide listing card

Server component; the caller resolves hasPhoto once from a readdir
rather than 270 stat calls. Listings without a source photo get a
typographic fallback tile at the same 3:2 ratio, so there is no broken
image and no layout shift. The data-cat/season/search attributes are
the filter's contract."
```

---

## Task 4: The page

**Files:**
- Create: `app/things-to-do/page.tsx`
- Modify: `app/site.css`

**Interfaces:**
- Consumes: `getListingsByCategory`, `getPhotoIds`, `CATEGORIES`, `TOTAL_LISTINGS` from `@/lib/guide`; `GuideCard` from Task 3.
- Produces: the route `/things-to-do/` and the DOM structure Task 5 queries — `.guide-section` wrappers each containing one `.guide-grid` of `.guide-card`s, plus a `#guide-empty` node.

Task 5 adds the filter bar; this task renders the page without it so the static content can be verified on its own.

- [ ] **Step 1: Write `app/things-to-do/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import GuideCard from '@/components/guide/GuideCard';
import { CATEGORIES, getListingsByCategory, getPhotoIds, TOTAL_LISTINGS } from '@/lib/guide';

const URL = 'https://birkenlofts.com/things-to-do/';

export const metadata: Metadata = {
  title: 'Things to Do Near Birken Lofts | River North, Chicago',
  description:
    `${TOTAL_LISTINGS} places to eat, drink, move, explore and spend a Saturday — all within roughly one to three miles of 401 W. Ontario Street in Chicago's River North.`,
  alternates: { canonical: URL },
  openGraph: {
    title: 'Things to Do Around Birken Lofts',
    description:
      `The complete neighborhood guide to River North and beyond — ${TOTAL_LISTINGS} places within walking distance of 401 W. Ontario Street.`,
    type: 'website',
    url: URL,
    images: [{ url: 'https://birkenlofts.com/images/og/birken-lofts-og.jpg', width: 1200, height: 630 }],
  },
};

const stats = [
  { figure: String(TOTAL_LISTINGS), label: 'Places to eat, drink & explore' },
  { figure: '10', label: 'Categories, from dining to daily errands', labelShort: 'Categories' },
  { figure: '4 min', label: 'Walk to the nearest grocery store' },
  { figure: '1–3 mi', label: 'From the front door', labelShort: 'From the door' },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': URL,
      name: 'Things to Do Around Birken Lofts',
      description: `A guide to ${TOTAL_LISTINGS} restaurants, bars, museums, parks, venues and everyday essentials within roughly one to three miles of 401 W. Ontario Street, Chicago.`,
      url: URL,
      isPartOf: { '@type': 'WebSite', name: 'Birken Lofts', url: 'https://birkenlofts.com' },
      about: {
        '@type': 'Place',
        name: 'River North, Chicago',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '401 W. Ontario Street',
          addressLocality: 'Chicago',
          addressRegion: 'IL',
          postalCode: '60654',
          addressCountry: 'US',
        },
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://birkenlofts.com/' },
        { '@type': 'ListItem', position: 2, name: 'Things to Do', item: URL },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Neighborhood guide categories',
      itemListElement: CATEGORIES.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        url: `${URL}#${c.slug}`,
      })),
    },
  ],
};

export default function ThingsToDoPage() {
  const sections = getListingsByCategory();
  const photoIds = getPhotoIds();
  let rendered = 0;

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="guide-header container">
        <span className="eyebrow">The Neighborhood</span>
        <h1>Things to Do Around Birken Lofts</h1>
        <p className="guide-lede">
          {TOTAL_LISTINGS} places to eat, drink, move, explore and spend a Saturday &mdash; all
          within roughly one to three miles of the front door. Chicago&rsquo;s densest restaurant
          district, the River North Gallery District, eighteen miles of lakefront, two observation
          decks, five pro sports franchises, and a grocery store you can walk to in four minutes.
        </p>
      </header>

      <section className="stats-band" aria-label="Neighborhood facts">
        <div className="stats-inner section-shell">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="stat-figure">{s.figure}</div>
              <div className="stat-label">
                {s.labelShort ? (
                  <>
                    <span className="stat-label-long">{s.label}</span>
                    <span className="stat-label-short">{s.labelShort}</span>
                  </>
                ) : (
                  s.label
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="container guide-body">
        {sections.map(({ category, listings }) => (
          <section className="guide-section" id={category.slug} key={category.slug}>
            <div className="guide-section-head">
              <h2>{category.name}</h2>
              <p className="guide-section-intro">{category.intro}</p>
            </div>
            <div className="guide-grid">
              {listings.map((listing) => {
                const eager = rendered++ < 6;
                return (
                  <GuideCard
                    key={listing.id}
                    listing={listing}
                    categorySlug={category.slug}
                    hasPhoto={photoIds.has(listing.id)}
                    eager={eager}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="guide-cta">
        <div className="section-shell">
          <h2>See how close it all is</h2>
          <p>
            Every one of these sits within a short walk, a single train ride, or a few minutes on
            the Riverwalk. The neighborhood map plots the essentials.
          </p>
          <div className="guide-cta-actions">
            <Link className="btn btn-primary" href="/#neighborhood">
              View the map
            </Link>
            <Link className="btn btn-secondary" href="/#contact">
              Schedule a tour
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

The `rendered++ < 6` counter marks only the first six images eager; everything below is lazy. Because `sections.map` runs synchronously in order, the counter is deterministic.

- [ ] **Step 2: Add the page-chrome CSS**

Append inside the `/* — things to do — */` block in `app/site.css`, **above** the `@media (max-width: 900px)` rules already there:

```css
.guide-header {
  padding-block: clamp(48px, 7vw, 88px) clamp(32px, 4vw, 48px);
}

.guide-header h1 {
  max-width: 15ch;
  margin-top: 18px;
  font-size: clamp(40px, 7vw, 76px);
  font-weight: 800;
}

.guide-lede {
  max-width: 62ch;
  margin-top: 22px;
  color: var(--color-muted);
  font-size: 17px;
  line-height: 1.65;
}

.guide-body {
  padding-block: clamp(48px, 6vw, 72px) clamp(56px, 8vw, 96px);
}

.guide-section + .guide-section {
  margin-top: clamp(56px, 7vw, 88px);
}

.guide-section-head {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-divider);
}

.guide-section-head h2 {
  font-size: clamp(28px, 4vw, 40px);
}

.guide-section-intro {
  max-width: 68ch;
  margin-top: 14px;
  color: var(--color-muted);
  font-size: 15px;
  font-style: italic;
  line-height: 1.6;
}

.guide-cta {
  padding-block: clamp(56px, 8vw, 96px);
  border-top: 1px solid var(--color-divider);
  background: var(--color-band);
  text-align: center;
}

.guide-cta h2 {
  font-size: clamp(30px, 4.5vw, 46px);
}

.guide-cta p {
  max-width: 52ch;
  margin: 18px auto 0;
  color: var(--color-muted);
  font-size: 16px;
}

.guide-cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
}
```

And add to the existing `@media (max-width: 768px)` block near the end of `app/site.css`:

```css
  .guide-header h1 {
    font-size: 40px;
  }

  .guide-lede {
    font-size: 15px;
  }

  .guide-section-intro {
    font-size: 14px;
  }
```

- [ ] **Step 3: Build and verify the static output**

Run: `npm run build`
Expected: PASS, and `out/things-to-do/index.html` exists.

```bash
node -e "
const h=require('fs').readFileSync('out/things-to-do/index.html','utf8');
const n=s=>(h.match(new RegExp(s,'g'))||[]).length;
console.log('cards:', n('class=\"guide-card\"'));
console.log('sections:', n('class=\"guide-section\"'));
console.log('canonical:', /rel=\"canonical\" href=\"https:\/\/birkenlofts.com\/things-to-do\/\"/.test(h));
console.log('CollectionPage:', h.includes('CollectionPage'));
console.log('eager imgs:', n('loading=\"eager\"'));
console.log('leaked null/undefined:', n('>null<') + n('>undefined<'));
console.log('kb:', Math.round(h.length/1024));
"
```

Expected: **cards 270**, sections 10, canonical `true`, CollectionPage `true`, eager imgs ≤ 6, leaked `0`, size roughly 400–550 KB.

- [ ] **Step 4: Confirm every referenced image exists**

```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('out/things-to-do/index.html','utf8');
const refs=[...h.matchAll(/\/images\/guide\/([^\"\s]+\.webp)/g)].map(m=>m[1]);
const missing=[...new Set(refs)].filter(f=>!fs.existsSync('out/images/guide/'+f));
console.log('referenced:', new Set(refs).size, 'missing:', missing.length);
if(missing.length) console.log(missing.slice(0,10));
"
```

Expected: **missing 0**. Any miss means `getPhotoIds()` and the card's `src` disagree — fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add app/things-to-do/page.tsx app/site.css
git commit -m "Add the /things-to-do/ page

All 270 listings render server-side across ten category sections, so
the content is in the static HTML and works with JS off. JSON-LD marks
up the page and its ten category sections — deliberately not 270
LocalBusiness entries for businesses we don't own."
```

---

## Task 5: Filter bar

**Files:**
- Create: `components/guide/GuideFilters.tsx`
- Modify: `app/things-to-do/page.tsx`, `app/site.css`

**Interfaces:**
- Consumes: `CATEGORIES`, `TOTAL_LISTINGS` from `@/lib/guide`; the `data-cat` / `data-season` / `data-search` attributes emitted by Task 3, and the `.guide-section` / `.guide-grid` / `.guide-card` structure from Task 4.
- Produces: `export default function GuideFilters({ categories, total }: { categories: { name: string; slug: string }[]; total: number })`. Only the 10 category name/slug pairs cross to the client — never listing data.

**How the filtering works.** The component owns one `<style>` element. On every state change it writes a single rule set built from a compound selector, and derives the visible count with `document.querySelectorAll` using the positive form of the same selector. All three filters are expressible in pure CSS:

- category → `[data-cat="destination-dining"]`
- season → `[data-season~="summer"]` (space-separated attribute word match)
- search → `[data-search*="pizza" i]` (attribute substring, case-insensitive flag)

Empty category sections hide via `:has()`. This is why no listing data and no per-node JavaScript is needed.

- [ ] **Step 1: Write `components/guide/GuideFilters.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SEASONS = ['Year-Round', 'Spring', 'Summer', 'Fall', 'Winter'];

/** Escape a user string for safe use inside a quoted CSS attribute value. */
function cssValue(s: string): string {
  return s.replace(/[\\"]/g, '\\$&');
}

interface GuideFiltersProps {
  categories: { name: string; slug: string }[];
  total: number;
}

export default function GuideFilters({ categories, total }: GuideFiltersProps) {
  const [cat, setCat] = useState('all');
  const [season, setSeason] = useState('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [count, setCount] = useState(total);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const active = cat !== 'all' || season !== 'all' || query.trim() !== '';

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 120);
    return () => clearTimeout(id);
  }, [query]);

  // One <style> element, owned for the component's lifetime.
  useEffect(() => {
    const el = document.createElement('style');
    el.setAttribute('data-guide-filters', '');
    document.head.appendChild(el);
    styleRef.current = el;
    return () => {
      el.remove();
      styleRef.current = null;
    };
  }, []);

  const selector = useMemo(() => {
    const parts: string[] = [];
    if (cat !== 'all') parts.push(`[data-cat="${cssValue(cat)}"]`);
    if (season !== 'all') parts.push(`[data-season~="${cssValue(season.toLowerCase())}"]`);
    if (debounced) parts.push(`[data-search*="${cssValue(debounced.toLowerCase())}" i]`);
    return parts.join('');
  }, [cat, season, debounced]);

  useEffect(() => {
    const el = styleRef.current;
    if (!el) return;

    if (!selector) {
      el.textContent = '';
      setCount(total);
      return;
    }

    const match = `.guide-card${selector}`;
    const visible = document.querySelectorAll(match).length;
    el.textContent =
      `.guide-card:not(${selector}){display:none}` +
      `.guide-section:not(:has(${match})){display:none}` +
      (visible === 0 ? '.guide-empty{display:block}' : '');
    setCount(visible);
  }, [selector, total]);

  const clear = () => {
    setCat('all');
    setSeason('all');
    setQuery('');
  };

  return (
    <div className="guide-filters">
      <div className="guide-filters-inner section-shell">
        <div className="guide-filter-field">
          <label htmlFor="guide-cat">Category</label>
          <select
            id="guide-cat"
            className="input"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="guide-filter-field">
          <label htmlFor="guide-season">Season</label>
          <select
            id="guide-season"
            className="input"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            <option value="all">Any season</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="guide-filter-field guide-filter-field--search">
          <label htmlFor="guide-search">Search</label>
          <input
            id="guide-search"
            className="input"
            type="search"
            placeholder="Name, neighborhood or type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="guide-filter-status">
          <span aria-live="polite">
            {count} {count === 1 ? 'place' : 'places'}
          </span>
          {active && (
            <button type="button" className="guide-filter-clear" onClick={clear}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the page and add the empty state**

In `app/things-to-do/page.tsx`, add the import:

```tsx
import GuideFilters from '@/components/guide/GuideFilters';
```

Insert immediately after the closing `</section>` of the stats band and before `<div className="container guide-body">`:

```tsx
      <GuideFilters
        categories={CATEGORIES.map((c) => ({ name: c.name, slug: c.slug }))}
        total={TOTAL_LISTINGS}
      />
```

Then, inside `<div className="container guide-body">`, **after** the `sections.map(...)` block, add the empty state:

```tsx
        <p className="guide-empty">
          Nothing matches those filters. Try widening the season or clearing the search.
        </p>
```

Note the mapping passes only `{ name, slug }` — passing the full `CATEGORIES` array would serialize the ten long intro strings into the RSC payload for no reason.

- [ ] **Step 3: Add the filter-bar CSS**

Append inside the `/* — things to do — */` block, above the media queries:

```css
.guide-filters {
  position: sticky;
  z-index: 900;
  top: 72px;
  border-block: 1px solid var(--color-divider);
  background: rgba(18, 17, 16, 0.94);
  backdrop-filter: blur(8px);
}

.guide-filters-inner {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding-block: 16px;
}

.guide-filter-field {
  display: flex;
  min-width: 0;
  flex: 0 1 220px;
  flex-direction: column;
  gap: 6px;
}

.guide-filter-field--search {
  flex: 1 1 240px;
}

.guide-filter-field label {
  color: var(--color-faint);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.guide-filters .input {
  min-height: 44px;
  padding-block: 10px;
  font-size: 14px;
}

.guide-filters select.input {
  appearance: none;
  padding-right: 34px;
  background-image: linear-gradient(45deg, transparent 50%, var(--color-muted) 50%),
    linear-gradient(135deg, var(--color-muted) 50%, transparent 50%);
  background-position: calc(100% - 18px) 20px, calc(100% - 13px) 20px;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.guide-filter-status {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 14px;
  padding-bottom: 12px;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
}

.guide-filter-clear {
  border: 1px solid var(--color-divider-strong);
  background: transparent;
  padding: 7px 14px;
  color: var(--color-text);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.guide-filter-clear:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Anchors must clear the nav (72px) and the sticky filter bar. */
.guide-section {
  scroll-margin-top: 150px;
}

/*
 * Hidden by default. GuideFilters appends a `.guide-empty{display:block}`
 * rule to its injected stylesheet when the visible count hits zero.
 * Do NOT try to express this in static CSS via the sections' visibility —
 * they are hidden by an injected stylesheet, not an inline style attribute,
 * so there is nothing for a static selector to key on.
 */
.guide-empty {
  display: none;
  padding: 64px 0;
  color: var(--color-muted);
  font-size: 16px;
  text-align: center;
}
```

- [ ] **Step 4: Add the mobile filter rules**

In the existing `@media (max-width: 768px)` block in `app/site.css`:

```css
  .guide-filters-inner {
    flex-wrap: wrap;
    gap: 12px;
  }

  .guide-filter-field,
  .guide-filter-field--search {
    flex: 1 1 100%;
  }

  .guide-filter-status {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
    padding-bottom: 0;
  }

  .guide-section {
    scroll-margin-top: 60px;
  }
```

The mobile header is 60px, and the filter bar wraps to roughly three rows — sticking it under a 60px header at full height would eat the viewport, so on mobile the `top` stays at 72px only if it still fits. Verify in Task 7 and reduce to `position: static` on mobile if the bar consumes more than about a third of the screen.

- [ ] **Step 5: Build and verify**

Run: `npm run build && npm run lint`
Expected: both PASS.

```bash
node -e "
const h=require('fs').readFileSync('out/things-to-do/index.html','utf8');
console.log('filter bar present:', h.includes('guide-filters'));
console.log('empty state present:', h.includes('guide-empty'));
console.log('cards still 270:', (h.match(/class=\"guide-card\"/g)||[]).length);
console.log('no intro text in RSC payload:', !h.includes('restaurants per square foot') || h.indexOf('restaurants per square foot') === h.lastIndexOf('restaurants per square foot'));
"
```

Expected: first three `true` / `270`. The last check guards the point of the whole design — the category intro should appear **once** (rendered HTML), not twice (rendered HTML + serialized client props).

- [ ] **Step 6: Commit**

```bash
git add components/guide/GuideFilters.tsx app/things-to-do/page.tsx app/site.css
git commit -m "Add client-side filtering to the guide

Filters by writing one CSS rule instead of re-rendering 270 nodes:
category and season are attribute selectors, search uses the
case-insensitive attribute-substring form, and empty category sections
collapse via :has(). No listing data crosses to the browser, and with
JS off every listing stays visible."
```

---

## Task 6: Site wiring

**Files:**
- Modify: `components/Nav.tsx`, `components/home/Neighborhood.tsx`, `app/sitemap.ts`, `public/llms.txt`, `public/llms-full.txt`, `app/site.css`

**Interfaces:**
- Consumes: the `/things-to-do/` route from Task 4.
- Produces: no new exports.

- [ ] **Step 1: Add the nav link**

In `components/Nav.tsx`, after the `onBlog` declaration add:

```tsx
  const onThingsToDo = pathname.startsWith('/things-to-do');
```

and insert into the `links` array between the Neighborhood and History entries:

```tsx
    { href: '/things-to-do/', label: 'Things to Do', current: onThingsToDo },
```

- [ ] **Step 2: Give the nav room for a seventh link**

The desktop bar is `gap: 24px` with six links plus a CTA; a seventh at 12px/0.14em adds roughly 130px and will overflow between the 768px burger breakpoint and about 1080px. In `app/site.css`, after the existing `.site-nav .nav-links` rule, add:

```css
@media (max-width: 1120px) {
  .site-nav {
    gap: 16px;
  }

  .site-nav .nav-links {
    gap: 16px;
  }

  .site-nav .nav-links > a:not(.btn) {
    letter-spacing: 0.1em;
  }
}
```

Task 7 verifies this at 800px and 1024px. If it still overflows, tighten to 14px rather than removing a link.

- [ ] **Step 3: Link from the home Neighborhood section**

In `components/home/Neighborhood.tsx`, inside `<div className="section-heading-row">` and after the `<p className="nbhd-intro">…</p>` element, the heading row is a flex with `justify-content: space-between`, so the link must go inside the intro paragraph's container. Change the intro paragraph to:

```tsx
          <div>
            <p className="nbhd-intro">
              Galleries, the Riverwalk, the Merchandise Mart and half the city&rsquo;s best
              restaurants &mdash; all within a ten-minute walk. The Brown Line at Chicago Ave. puts
              the Loop six minutes away.
            </p>
            <a className="nbhd-guide-link" href="/things-to-do/">
              Explore all 270 places &rarr;
            </a>
          </div>
```

and add to `app/site.css` inside the `/* — things to do — */` block:

```css
.nbhd-guide-link {
  display: inline-block;
  margin-top: 16px;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.nbhd-guide-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}
```

- [ ] **Step 4: Add the sitemap entry**

In `app/sitemap.ts`, after the `/history/` entry:

```ts
    { url: `${BASE}/things-to-do/`, lastModified: '2026-08-16', changeFrequency: 'monthly', priority: 0.8 },
```

- [ ] **Step 5: Update the LLM files**

Read `public/llms.txt` and `public/llms-full.txt` first and match their existing formatting exactly. Add the route to each — a link line in `llms.txt`, and in `llms-full.txt` a short section:

```
## Things to Do (https://birkenlofts.com/things-to-do/)

A guide to 270 restaurants, bars, museums, galleries, parks, venues, festivals and
everyday essentials within roughly one to three miles of 401 W. Ontario Street, in
ten categories, filterable by category and season. Highlights include the River
North Gallery District at the doorstep, a four-minute walk to groceries, eighteen
miles of lakefront trail, and five pro sports franchises within a few miles.
```

- [ ] **Step 6: Build and verify the wiring**

Run: `npm run build && npm run lint`
Expected: both PASS.

```bash
node -e "
const fs=require('fs');
const home=fs.readFileSync('out/index.html','utf8');
console.log('nav link on home:', home.includes('/things-to-do/'));
console.log('neighborhood CTA:', home.includes('Explore all 270 places'));
console.log('sitemap:', fs.readFileSync('out/sitemap.xml','utf8').includes('/things-to-do/'));
console.log('llms:', fs.readFileSync('out/llms.txt','utf8').includes('/things-to-do/'));
const page=fs.readFileSync('out/things-to-do/index.html','utf8');
console.log('aria-current on page:', /href=\"\/things-to-do\/\"[^>]*aria-current=\"page\"/.test(page));
"
```

Expected: all `true`.

- [ ] **Step 7: Commit**

```bash
git add components/Nav.tsx components/home/Neighborhood.tsx app/sitemap.ts app/site.css public/llms.txt public/llms-full.txt
git commit -m "Wire /things-to-do/ into the nav, home page, sitemap and llms files

Seventh nav link needs a tighter gap between the 768px burger
breakpoint and ~1120px, so desktop link spacing steps down there."
```

---

## Task 7: Full verification pass

No changes are expected here beyond fixes the checks surface. This is the gate before the branch is considered done.

**Files:**
- Modify: only whatever the checks reveal as broken.

**Interfaces:**
- Consumes: everything.
- Produces: a verified branch.

- [ ] **Step 1: Clean build and lint from scratch**

```bash
rm -rf .next out && npm run build && npm run lint && npm test
```

Expected: all three PASS with no warnings about the new files.

- [ ] **Step 2: Serve the static output**

```bash
npx serve out -l 4173
```

Leave it running for the browser checks. The site expects trailing slashes, so use `http://localhost:4173/things-to-do/`.

- [ ] **Step 3: Verify the filters actually filter**

Drive the page in a browser (Playwright MCP) and confirm each, checking the visible-card count via `document.querySelectorAll('.guide-card')` filtered by `offsetParent !== null`:

- Initial load shows **270 places** in the status and 270 visible cards.
- Selecting **Bars, Nightlife & Live Music** → status reads **34**, 34 visible cards, and only the `#bars-nightlife-live-music` section heading remains visible.
- Adding season **Winter** → count drops and every visible card shows a Winter badge.
- Typing `pizza` in search → count drops further; visible cards all contain "pizza" in name, neighborhood, or subcategory.
- **Clear** → back to 270 and all ten section headings visible.
- Category **Sports & Venues** + search `zzzzz` → count **0** and the empty-state message is visible.
- No console errors (a Google Analytics warning from the sandbox is expected and fine).

- [ ] **Step 4: Verify layout at three widths**

At 375, 768, and 1440:

- `document.documentElement.scrollWidth <= window.innerWidth` — no horizontal overflow.
- The grid is 1 / 2 / 3 columns respectively.
- The nav does not wrap at 800 and 1024 (check `.site-nav` height stays at 72px).
- The sticky filter bar stays visible while scrolling and does not overlap section headings when a category anchor is followed.
- At 375, confirm the filter bar does not consume more than about a third of the viewport; if it does, add `position: static` for `.guide-filters` inside the 768px media block.

- [ ] **Step 5: Verify the no-JS path**

In the browser, disable JavaScript and reload `/things-to-do/`. Expected: all 270 cards visible, the filter bar renders but is inert, no empty state shown. This is the reason the cards are server-rendered.

- [ ] **Step 6: Verify the fallback tiles**

```bash
node -e "
const h=require('fs').readFileSync('out/things-to-do/index.html','utf8');
console.log('fallback tiles:', (h.match(/guide-card-fallback\"/g)||[]).length);
console.log('cards:', (h.match(/class=\"guide-card\"/g)||[]).length);
"
```

Expected: fallback count equals 270 minus the number of generated photos, and the two numbers are consistent with Task 2 Step 6. Visually confirm in the browser that a fallback tile is the same height as a photo card in the same row.

- [ ] **Step 7: Check the page weight didn't wreck performance**

Run Lighthouse (or PageSpeed Insights against a preview) on `/things-to-do/`. The site's other pages score >90; this page has 270 lazy images and ~500KB of HTML, so some drop is expected. If Performance falls below 85, in order: reduce `-webkit-line-clamp` to 3, cut eager images from 6 to 3, then re-run. Record the score.

- [ ] **Step 8: Commit any fixes and report**

```bash
git add -A && git commit -m "Fixes from the verification pass"
git log --oneline main..HEAD
```

Report to the user: the Lighthouse score, the photo coverage (X of 270), the final repo size delta (`git count-objects -vH`), and anything the checks surfaced that was left unfixed.

---

## Self-Review

**Spec coverage.** Walked each spec section against the tasks: data module and both normalizers → Task 1; the `content/guide/listings.json` verbatim copy and the id-uniqueness assertion → Task 1 Steps 1 and 5; photo fetch, sharp pipeline, gitignore, and the 67 missing-photo fallback → Tasks 2 and 3; page architecture and CSS injection → Tasks 4 and 5; all seven layout elements (header, stats, filter bar, sections, card, empty state, CTA) → Tasks 4 and 5; nav, Neighborhood CTA, sitemap, llms files → Task 6; SEO metadata and the three JSON-LD blocks → Task 4; every verification bullet → Task 7. No gaps.

**Two refinements over the spec, both consistent with its intent.** The spec left search as "a DOM pass over `data-search` attributes"; Task 5 uses the CSS attribute-substring form `[data-search*="…" i]` instead, so search needs no DOM pass at all. The spec did not say how empty category sections hide; Task 5 uses `:has()`. Both keep the "zero listing data to the client" property that the mechanism exists for.

**Known browser-support note.** `:has()` requires Chrome 105+, Safari 15.4+, Firefox 121+. Where unsupported, headings of fully-filtered sections stay visible above an empty grid — cosmetic only, no broken functionality, and no fallback is planned.

**Type consistency.** `GuideCard` is called with `{ listing, categorySlug, hasPhoto, eager }` in Task 4 and declares exactly those four props in Task 3. `GuideFilters` is called with `{ categories, total }` in Task 5 Step 2 and declares exactly those. `getPhotoIds()` strips the `-480w.webp` suffix and `GuideCard` builds `/images/guide/${id}-480w.webp` — same key, verified by Task 4 Step 4. `CATEGORIES[].slug` is the single source for the section `id`, the card's `data-cat`, and the filter's `<option value>`.

**Placeholder scan.** No TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries the actual code. The one trap worth naming — expressing the empty state as a static CSS selector keyed on section visibility — is called out inline in Task 5 Step 3 with the reason it cannot work, since it is the obvious thing to reach for and fails silently.
