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
