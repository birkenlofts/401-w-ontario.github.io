#!/usr/bin/env python3
"""
download-photos.py — fetches a photo for every listing in the Birken Lofts
neighborhood guide.

Usage (from the folder containing this script and the JSON file):

    python3 download-photos.py

Requires only the Python standard library (macOS ships with Python 3).

What it does, per listing:
  1. Tries the `photo_url` recorded during research.
  2. If that's missing or fails, visits the listing's official website and
     pulls its og:image / twitter:image / apple-touch-icon as a fallback.
  3. Saves the image to photos/<category>/<listing-id>.<ext>
  4. Writes photos/manifest.csv with the source URL, license note, and result
     for every listing — that's your rights-clearance worksheet.

Re-running is safe: listings that already have a file are skipped.
Use --force to re-download everything.
"""

import csv
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(HERE, "birken-lofts-neighborhood-guide.json")
PHOTO_ROOT = os.path.join(HERE, "photos")
MANIFEST = os.path.join(PHOTO_ROOT, "manifest.csv")

FORCE = "--force" in sys.argv
WORKERS = 8
TIMEOUT = 25

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Wikimedia's User-Agent policy (https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy)
# 429s any request to upload.wikimedia.org that looks like a generic/spoofed browser UA;
# it wants a descriptive UA identifying the client. Business sites, by contrast, often *do*
# gate on a browser-like UA, so only wikimedia.org hosts get the descriptive one.
WIKIMEDIA_UA = "BirkenLoftsSiteBuild/1.0 (https://birkenlofts.com; drew@monroeresidential.com)"

EXT_BY_TYPE = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
    "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif",
    "image/svg+xml": ".svg",
}

# Some sites reject default SSL negotiation; be permissive, we're only reading images.
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def fetch(url, max_bytes=15_000_000):
    host = urllib.parse.urlparse(url).hostname or ""
    ua = WIKIMEDIA_UA if host.endswith("wikimedia.org") else UA
    req = urllib.request.Request(url, headers={
        "User-Agent": ua,
        "Accept": "image/avif,image/webp,image/*,text/html;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX) as resp:
        return resp.read(max_bytes), resp.headers.get("Content-Type", "").split(";")[0].strip().lower(), resp.geturl()


META_PATTERNS = [
    r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)["\']',
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image(?::secure_url)?["\']',
    r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)["\']',
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image(?::src)?["\']',
    r'<link[^>]+rel=["\']apple-touch-icon[^"\']*["\'][^>]+href=["\']([^"\']+)["\']',
]


def find_image_on_page(page_url):
    """Fetch an HTML page and return the best image URL it advertises."""
    body, ctype, final_url = fetch(page_url, max_bytes=800_000)
    if ctype.startswith("image/"):
        return page_url
    html = body.decode("utf-8", errors="ignore")
    for pat in META_PATTERNS:
        m = re.search(pat, html, re.I)
        if m:
            return urllib.parse.urljoin(final_url, m.group(1).strip())
    return None


def save(listing, data, ctype, source_url, how):
    cat_dir = os.path.dirname(listing["photo_file"])          # e.g. photos/destination-dining
    ext = EXT_BY_TYPE.get(ctype, os.path.splitext(urllib.parse.urlparse(source_url).path)[1] or ".jpg")
    if len(ext) > 5:
        ext = ".jpg"
    out_dir = os.path.join(HERE, cat_dir)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, listing["id"] + ext)
    with open(path, "wb") as f:
        f.write(data)
    return os.path.relpath(path, HERE), how


def existing(listing):
    out_dir = os.path.join(HERE, os.path.dirname(listing["photo_file"]))
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"):
        p = os.path.join(out_dir, listing["id"] + ext)
        if os.path.exists(p) and os.path.getsize(p) > 1000:
            return os.path.relpath(p, HERE)
    return None


def handle(listing):
    row = {
        "name": listing["name"],
        "category": listing["category"],
        "file": "",
        "source_url": listing.get("photo_url") or "",
        "source_note": listing.get("photo_source") or "",
        "method": "",
        "status": "",
        "website": listing.get("website") or "",
    }

    if not FORCE:
        have = existing(listing)
        if have:
            row.update(file=have, method="already downloaded", status="ok")
            return row

    attempts = []
    if listing.get("photo_url"):
        attempts.append(("recorded photo_url", listing["photo_url"]))

    for how, url in attempts:
        try:
            data, ctype, final = fetch(url)
            if ctype.startswith("image/") and len(data) > 3000:
                path, _ = save(listing, data, ctype, final, how)
                row.update(file=path, source_url=final, method=how, status="ok")
                return row
        except Exception as e:
            row["status"] = f"photo_url failed: {type(e).__name__}"

    # Fallback: scrape the official website for an og:image
    site = listing.get("website")
    if site and site.startswith("http"):
        try:
            img = find_image_on_page(site)
            if img:
                data, ctype, final = fetch(img)
                if ctype.startswith("image/") and len(data) > 3000:
                    path, _ = save(listing, data, ctype, final, "og:image from website")
                    row.update(file=path, source_url=final, method="og:image from website", status="ok")
                    return row
            row["status"] = row["status"] or "no image found on website"
        except Exception as e:
            row["status"] = f"{row['status'] or ''} | website fallback failed: {type(e).__name__}".strip(" |")

    row["status"] = row["status"] or "no source available"
    row["method"] = "NEEDS MANUAL PHOTO"
    return row


def main():
    if not os.path.exists(JSON_PATH):
        sys.exit(f"Can't find {JSON_PATH}. Run this script from the folder that contains the JSON file.")

    listings = json.load(open(JSON_PATH))
    os.makedirs(PHOTO_ROOT, exist_ok=True)
    print(f"Fetching photos for {len(listings)} listings using {WORKERS} workers...\n")

    rows = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for i, row in enumerate(pool.map(handle, listings), 1):
            rows.append(row)
            flag = "ok " if row["status"] == "ok" else "MISS"
            print(f"[{i:>3}/{len(listings)}] {flag}  {row['name'][:52]:<52} {row['method']}")

    with open(MANIFEST, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["name", "category", "file", "source_url",
                                          "source_note", "method", "status", "website"])
        w.writeheader()
        w.writerows(rows)

    ok = sum(1 for r in rows if r["status"] == "ok")
    print(f"\nDone. {ok}/{len(rows)} photos saved under photos/")
    print(f"Manifest written to {os.path.relpath(MANIFEST, HERE)}")
    missing = [r["name"] for r in rows if r["status"] != "ok"]
    if missing:
        print(f"\n{len(missing)} listings still need a photo:")
        for n in missing:
            print(f"  - {n}")
    print("\nReminder: images from business websites are copyrighted. Use them to build "
          "the page, then request press photos or license replacements before publishing.")


if __name__ == "__main__":
    main()
