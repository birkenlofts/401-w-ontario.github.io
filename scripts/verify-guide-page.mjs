/**
 * Browser verification for /things-to-do-river-north/ — 53 checks covering the
 * filter mechanism, responsive layout, computed styles, sticky-bar geometry,
 * category anchor targets, and the no-JS path.
 *
 * Not part of `npm run build`: it needs a browser and a served build, and CI
 * has neither. Run it by hand after changing the guide page, its CSS, or the
 * filter:
 *
 *     npm run build
 *     npx --yes serve out -l 4173
 *     npm run verify-guide          # or: node scripts/verify-guide-page.mjs
 *
 * Requires playwright and a Chromium build:
 *
 *     npm i --no-save playwright && npx playwright install chromium
 *
 * Why the computed-style and anchor checks exist: an earlier version of this
 * suite asserted only overflow and column counts, and passed 42/42 while the
 * mobile filter bar was visibly broken — its CSS had been appended earlier in
 * site.css than the desktop rules and so never applied. Checking that a layout
 * does not overflow is not the same as checking it is correct.
 *
 * Exits non-zero if any check fails.
 */

import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:4173/things-to-do-river-north/';
const results = [];
let failures = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

function checkThat(name, ok, detail = '') {
  if (!ok) failures++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
}

const browser = await chromium.launch();

// ---------- filter behaviour ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  // The interaction-gated GA tag cannot reach the network in this sandbox;
  // its ERR_CONNECTION_REFUSED is environmental, not a page defect. Attribute
  // the failure by request URL rather than by console text, which has none.
  const externalFailures = new Set();
  page.on('requestfailed', (r) => externalFailures.add(r.url()));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });

  // Count only cards actually rendered (offsetParent is null when display:none).
  const visible = () => page.evaluate(() =>
    [...document.querySelectorAll('.guide-card')].filter((el) => el.offsetParent !== null).length);
  const visibleSections = () => page.evaluate(() =>
    [...document.querySelectorAll('.guide-section')].filter((el) => el.offsetParent !== null).length);
  const statusCount = () => page.evaluate(() => {
    const el = document.querySelector('.guide-filter-status [aria-live]');
    return el ? parseInt(el.textContent.trim(), 10) : null;
  });
  const emptyShown = () => page.evaluate(() => {
    const el = document.querySelector('.guide-empty');
    return el ? getComputedStyle(el).display !== 'none' : null;
  });

  check('initial visible cards', await visible(), 270);
  check('initial status count', await statusCount(), 270);
  check('initial visible sections', await visibleSections(), 10);
  check('empty state hidden initially', await emptyShown(), false);

  // Category filter
  await page.selectOption('#guide-cat', 'bars-nightlife-live-music');
  await page.waitForTimeout(250);
  check('bars category visible cards', await visible(), 34);
  check('bars category status count', await statusCount(), 34);
  check('bars category visible sections', await visibleSections(), 1);

  // Season composes with category
  await page.selectOption('#guide-season', 'Winter');
  await page.waitForTimeout(250);
  const barsWinter = await visible();
  checkThat('season narrows within category', barsWinter > 0 && barsWinter < 34, `bars+winter=${barsWinter}`);
  check('season status matches visible', await statusCount(), barsWinter);
  const allWinterBadges = await page.evaluate(() =>
    [...document.querySelectorAll('.guide-card')]
      .filter((el) => el.offsetParent !== null)
      .every((el) => (el.getAttribute('data-season') || '').split(' ').includes('winter')));
  checkThat('every visible card carries the winter season', allWinterBadges);

  // Clear restores
  await page.click('.guide-filter-clear');
  await page.waitForTimeout(250);
  check('clear restores cards', await visible(), 270);
  check('clear restores status', await statusCount(), 270);
  check('clear restores sections', await visibleSections(), 10);

  // Search
  await page.fill('#guide-search', 'coffee');
  await page.waitForTimeout(300);
  const coffee = await visible();
  checkThat('search narrows', coffee > 0 && coffee < 270, `coffee=${coffee}`);
  const allMatch = await page.evaluate(() =>
    [...document.querySelectorAll('.guide-card')]
      .filter((el) => el.offsetParent !== null)
      .every((el) => (el.getAttribute('data-search') || '').includes('coffee')));
  checkThat('every visible search result matches the query', allMatch);

  // Empty state
  await page.fill('#guide-search', 'zzzzzqqqq');
  await page.waitForTimeout(300);
  check('no results visible', await visible(), 0);
  check('no results status', await statusCount(), 0);
  checkThat('empty state shown', (await emptyShown()) === true);
  check('all sections hidden when empty', await visibleSections(), 0);

  // Quote / backslash must not break the stylesheet (the escaping path)
  for (const q of ['"', '\\', '"]', 'a\\"b']) {
    await page.fill('#guide-search', q);
    await page.waitForTimeout(250);
    const n = await visible();
    const s = await statusCount();
    checkThat(`hostile query ${JSON.stringify(q)} does not crash or blank the page`,
      Number.isInteger(n) && Number.isInteger(s) && n === s, `visible=${n} status=${s}`);
  }

  await page.fill('#guide-search', '');
  await page.waitForTimeout(300);
  check('cleared search restores all', await visible(), 270);

  const localFailures = [...externalFailures].filter((u) => !/googletagmanager|google-analytics|gtag/i.test(u));
  checkThat('no failed requests for local assets', localFailures.length === 0, JSON.stringify(localFailures.slice(0, 3)));
  // Every console error should be attributable to a blocked external request.
  const unexplained = errors.filter((e) => !/Failed to load resource/i.test(e));
  checkThat('no unexplained console errors', unexplained.length === 0, JSON.stringify(unexplained.slice(0, 3)));
  await page.close();
}

// ---------- responsive layout ----------
for (const [w, expectedCols] of [[375, 1], [768, 2], [1440, 3]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  checkThat(`no horizontal overflow at ${w}px`, overflow <= 0, `overflow=${overflow}px`);

  const cols = await page.evaluate(() => {
    const grid = document.querySelector('.guide-grid');
    return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  });
  check(`grid columns at ${w}px`, cols, expectedCols);

  if (w >= 769) {
    const navHeight = await page.evaluate(() => document.querySelector('.site-nav').getBoundingClientRect().height);
    checkThat(`nav does not wrap at ${w}px`, navHeight <= 80, `height=${Math.round(navHeight)}px`);
  }
  await page.close();
}

// Nav link row. An existing rule hides .nav-links at <=1120px (burger mode),
// so measuring nav height at 800/900/1024 proves nothing — the row isn't
// rendered there. Test the widths where the seven-link row actually exists.
for (const w of [1121, 1200, 1440, 1600]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const links = document.querySelector('.site-nav .nav-links');
    const as = [...links.querySelectorAll('a:not(.btn)')];
    return {
      display: getComputedStyle(links).display,
      rows: new Set(as.map((a) => Math.round(a.getBoundingClientRect().top))).size,
      count: as.length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  checkThat(`nav link row is single-row at ${w}px`,
    r.display !== 'none' && r.rows === 1 && r.count === 7 && r.overflow <= 0,
    `display=${r.display} rows=${r.rows} links=${r.count} overflow=${r.overflow}`);
  await page.close();
}

// And confirm the burger really does take over below that.
for (const w of [768, 1120]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  const hidden = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.site-nav .nav-links')).display === 'none');
  checkThat(`nav collapses to burger at ${w}px`, hidden);
  await page.close();
}

// ---------- computed styles + anchor targets ----------
// The 42-check suite originally missed an entire class of bug: mobile CSS that
// never applied (wrong source order) and anchors landing behind the sticky bar.
// Assert computed values and real scroll positions, not just overflow/columns.
for (const [w, h, expectLede, expectSm] of [[390, 844, '15px', '280px'], [1440, 900, '17px', '186px']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });

  const cs = await page.evaluate(() => {
    const g = (s) => getComputedStyle(document.querySelector(s));
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      lede: g('.guide-lede').fontSize,
      sm: g('.guide-section').scrollMarginTop,
      navBottom: Math.round(r('.site-nav').bottom),
      filterTop: Math.round(r('.guide-filters').top),
    };
  });
  check(`lede font-size at ${w}px`, cs.lede, expectLede);
  check(`section scroll-margin-top at ${w}px`, cs.sm, expectSm);

  // The sticky bar must sit flush under the header — a gap shows content through it.
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(200);
  const stuck = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { gap: Math.round(r('.guide-filters').top - r('.site-nav').bottom),
             chromePct: Math.round(((r('.guide-filters').bottom) / window.innerHeight) * 100) };
  });
  checkThat(`sticky bar flush under header at ${w}px`, Math.abs(stuck.gap) <= 1, `gap=${stuck.gap}px`);
  checkThat(`sticky chrome under 35% of viewport at ${w}px`, stuck.chromePct <= 35, `${stuck.chromePct}%`);

  // Every published category anchor must land clear of the sticky bar.
  const slugs = await page.evaluate(() => [...document.querySelectorAll('.guide-section')].map((s) => s.id));
  let worst = Infinity;
  for (const slug of slugs) {
    const clear = await page.evaluate((s) => {
      document.getElementById(s).scrollIntoView();
      const h2 = document.querySelector(`#${s} h2`).getBoundingClientRect();
      return Math.round(h2.top - document.querySelector('.guide-filters').getBoundingClientRect().bottom);
    }, slug);
    worst = Math.min(worst, clear);
  }
  checkThat(`all ${slugs.length} anchors clear the sticky bar at ${w}px`, worst >= 0, `worst clearance=${worst}px`);

  // Filter fields must fill their row, not leave a ragged edge.
  const fields = await page.evaluate(() => {
    const inner = document.querySelector('.guide-filters-inner');
    const pad = getComputedStyle(inner);
    const avail = inner.getBoundingClientRect().width
      - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    const search = document.querySelector('.guide-filter-field--search').getBoundingClientRect().width;
    return { avail: Math.round(avail), search: Math.round(search) };
  });
  if (w < 769) {
    checkThat('search field spans the row on mobile', Math.abs(fields.search - fields.avail) <= 2,
      `search=${fields.search} available=${fields.avail}`);
  }
  await page.close();
}

// ---------- no-JS ----------
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  const n = await page.evaluate(() => document.querySelectorAll('.guide-card').length);
  check('no-JS: all cards present', n, 270);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('.guide-card')].filter((el) => getComputedStyle(el).display === 'none').length);
  check('no-JS: none hidden', hidden, 0);
  const emptyVisible = await page.evaluate(() => {
    const el = document.querySelector('.guide-empty');
    return el ? getComputedStyle(el).display !== 'none' : null;
  });
  check('no-JS: empty state not shown', emptyVisible, false);
  await ctx.close();
}

await browser.close();

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
