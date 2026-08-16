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
