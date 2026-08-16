'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import MobileMap from '@/components/map/MobileMap';

// The static SVG doubles as the placeholder: on phones it IS the final map,
// so the swap to NeighborhoodMap is DOM-identical (no layout shift, no tiles).
function MapPlaceholder() {
  return (
    <div className="map-frame map-frame--svg map-frame--placeholder" aria-hidden="true">
      <MobileMap />
    </div>
  );
}

const NeighborhoodMap = dynamic(() => import('@/components/map/NeighborhoodMap'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

const cards = [
  { kicker: 'Eat & drink', body: "River North's restaurant row is out the front door." },
  { kicker: 'Transit', body: 'Brown & Purple Lines at Chicago Ave., six minutes to the Loop.' },
  { kicker: 'Outside', body: 'The Riverwalk, Ward Park and the lakefront trail, minutes away.' },
];

export default function Neighborhood() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [nearView, setNearView] = useState(false);

  // The map is below the fold on every viewport — don't load Leaflet (~120KB)
  // until the section approaches the viewport.
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearView(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="neighborhood" className="neighborhood-section">
      <div className="section-shell">
        <div className="section-heading-row">
          <h2>River North</h2>
          <div>
            <p className="nbhd-intro">
              Galleries, the Riverwalk, the Merchandise Mart and half the city&rsquo;s best
              restaurants &mdash; all within a ten-minute walk. The Brown Line at Chicago Ave. puts
              the Loop six minutes away.
            </p>
            <a className="nbhd-guide-link" href="/things-to-do-river-north/">
              Explore all 270 places &rarr;
            </a>
          </div>
        </div>
        <div ref={mapRef}>{nearView ? <NeighborhoodMap /> : <MapPlaceholder />}</div>
        <div className="nbhd-cards">
          {cards.map((c) => (
            <div key={c.kicker} className="nbhd-card">
              <h3>{c.kicker}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
