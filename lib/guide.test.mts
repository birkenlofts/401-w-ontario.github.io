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
