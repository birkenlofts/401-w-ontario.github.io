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
