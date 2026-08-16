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
