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
