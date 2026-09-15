"""Fetch each source's official mark and normalise it to the register's 192px canvas.

    backend/.venv/bin/python scripts/fetch_logos.py [slug ...]

For every body: the Wikipedia page image first (their logo, in the article
about them, as a PNG thumbnail even when the original is SVG), then the site's
own mark (apple-touch-icon, the header image that calls itself a logo, og:image),
then its largest icon. Each candidate is downloaded and judged on size and shape
before it is accepted. Output goes to frontend/public/sources/<slug>.png and the
run prints where each mark came from, so a wrong one is easy to redo by hand.
"""

from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests
from lxml import html as lxml_html
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "sources"
REGISTER = ROOT / "backend" / "knowledge" / "fixtures" / "register.json"
UA = "MaatBot/1.0 (+https://maatverify.com; rumour verification; logo fetch for attribution)"
CANVAS = 192
INNER = 176

#: The Wikipedia article about each body, whose page image is its logo.
WIKI = {
    "nema-ng": "National Emergency Management Agency (Nigeria)",
    "fmoh-ng": "Federal Ministry of Health (Nigeria)",
    "nafdac-ng": "National Agency for Food and Drug Administration and Control",
    "nphcda-ng": "National Primary Health Care Development Agency",
    "nscdc-ng": "Nigeria Security and Civil Defence Corps",
    "fmino-ng": "Federal Ministry of Information and National Orientation",
    "statehouse-ng": "Coat of arms of Nigeria",
    "nan-ng": "News Agency of Nigeria",
    "frcn-ng": "Federal Radio Corporation of Nigeria",
    "waec-ng": "West African Examinations Council",
    "ncc-ng": "Nigerian Communications Commission",
    "nhia-ng": "National Health Insurance Authority (Nigeria)",
    "nis-ng": "Nigeria Immigration Service",
    "fmf-ng": "Federal Ministry of Finance (Nigeria)",
    "pencom-ng": "National Pension Commission",
    "fmafs-ng": "Federal Ministry of Agriculture and Food Security",
    "sec-ng": "Securities and Exchange Commission (Nigeria)",
    "nerc-ng": "Nigerian Electricity Regulatory Commission",
    "nta-ng": "Nigerian Television Authority",
    "ncaa-ng": "Nigerian Civil Aviation Authority",
    "kbc-ke": "Kenya Broadcasting Corporation",
    "ndma-ke": "National Drought Management Authority",
    "cbk-ke": "Central Bank of Kenya",
    "presidency-ke": "Coat of arms of Kenya",
    "redcross-ke": "Kenya Red Cross Society",
    "moe-ke": "Ministry of Education (Kenya)",
    "sha-ke": "Social Health Authority",
    "kebs-ke": "Kenya Bureau of Standards",
    "ca-ke": "Communications Authority of Kenya",
    "kilimo-ke": "Ministry of Agriculture and Livestock Development (Kenya)",
    "dci-ke": "Directorate of Criminal Investigations (Kenya)",
    "treasury-ke": "National Treasury (Kenya)",
    "kaa-ke": "Kenya Airports Authority",
    "kemri-ke": "Kenya Medical Research Institute",
    "kmd-ke": "Kenya Meteorological Department",
    "kra-ke": "Kenya Revenue Authority",
}


def get(url: str, **kw) -> requests.Response | None:
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=20, **kw)
        return r if r.ok else None
    except requests.RequestException:
        return None


def image_from(url: str) -> Image.Image | None:
    r = get(url)
    if r is None or not r.content:
        return None
    try:
        im = Image.open(io.BytesIO(r.content))
        im.load()
        return im.convert("RGBA")
    except Exception:  # noqa: BLE001 - SVG, HTML, or junk
        return None


def plausible(im: Image.Image) -> bool:
    w, h = im.size
    return min(w, h) >= 48 and 0.25 <= w / h <= 4


def wikipedia(title: str) -> tuple[Image.Image | None, str]:
    r = get(
        "https://en.wikipedia.org/w/api.php",
        params={"action": "query", "prop": "pageimages", "piprop": "thumbnail|original|name", "pithumbsize": 600,
                "redirects": 1, "titles": title, "format": "json"},
    )
    if r is None:
        return None, ""
    for page in r.json().get("query", {}).get("pages", {}).values():
        name = page.get("pageimage", "")
        # A photo of a building or a person is not a logo. Logos are almost
        # always named as such, or as a seal, emblem or coat of arms.
        if name and not re.search(r"logo|seal|emblem|coat|arms|crest|badge|mark", name, re.IGNORECASE):
            return None, f"wikipedia page image is {name!r}, not a logo"
        thumb = (page.get("thumbnail") or {}).get("source") or (page.get("original") or {}).get("source")
        if thumb:
            im = image_from(thumb)
            if im is not None and plausible(im):
                return im, f"wikipedia:{name}"
    return None, "no wikipedia page image"


def site(url: str) -> tuple[Image.Image | None, str]:
    r = get(url)
    if r is None:
        return None, "site unreachable"
    base = r.url
    try:
        tree = lxml_html.fromstring(r.content)
    except Exception:  # noqa: BLE001
        return None, "site html unreadable"
    candidates: list[tuple[int, str, str]] = []  # (priority, url, why)
    for link in tree.xpath('//link[@rel]'):
        rel = (link.get("rel") or "").lower()
        href = link.get("href") or ""
        if not href:
            continue
        if "apple-touch-icon" in rel:
            candidates.append((1, urljoin(base, href), "apple-touch-icon"))
        elif "icon" in rel:
            sizes = link.get("sizes") or ""
            big = int(re.findall(r"\d+", sizes)[0]) if re.findall(r"\d+", sizes) else 0
            candidates.append((3 if big < 96 else 2, urljoin(base, href), f"icon {sizes or 'unsized'}"))
    for img in tree.xpath("//img")[:60]:
        blob = " ".join(filter(None, [img.get("src"), img.get("alt"), img.get("class"), img.get("id")])).lower()
        if "logo" in blob and img.get("src"):
            candidates.append((1, urljoin(base, img.get("src")), "header logo img"))
    for meta in tree.xpath('//meta[@property="og:image" or @name="og:image"]'):
        if meta.get("content"):
            candidates.append((2, urljoin(base, meta.get("content")), "og:image"))
    best: tuple[int, Image.Image, str] | None = None
    for priority, u, why in sorted(candidates, key=lambda c: c[0]):
        im = image_from(u)
        if im is None or not plausible(im):
            continue
        score = min(im.size) - priority * 40
        if best is None or score > best[0]:
            best = (score, im, f"site {why} {im.size[0]}x{im.size[1]}")
        if priority == 1 and min(im.size) >= 120:
            break
    return (best[1], best[2]) if best else (None, "no usable image on the site")


def trim(im: Image.Image) -> Image.Image:
    """Cut away uniform margins (transparent or a flat colour) so marks sit at the same visual size."""
    alpha = im.getchannel("A")
    bbox = alpha.getbbox()
    if bbox and bbox != (0, 0, *im.size):
        im = im.crop(bbox)
    # Flat background: compare to the corner pixel.
    corner = im.getpixel((0, 0))
    if corner[3] == 255:
        from PIL import ImageChops

        bg = Image.new("RGBA", im.size, corner)
        diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 24 else 0)
        bbox = diff.getbbox()
        if bbox:
            im = im.crop(bbox)
    return im


def normalise(im: Image.Image) -> Image.Image:
    im = trim(im)
    w, h = im.size
    scale = INNER / max(w, h)
    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(im, ((CANVAS - im.size[0]) // 2, (CANVAS - im.size[1]) // 2), im)
    return canvas


def main(only: list[str]) -> None:
    rows = json.loads(REGISTER.read_text())
    by_slug = {r["id"]: r for r in rows}
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for slug, title in WIKI.items():
        if only and slug not in only:
            continue
        row = by_slug.get(slug)
        im, how = wikipedia(title)
        if im is None and row and row.get("address"):
            parts = urlsplit(row["address"])
            im, how2 = site(f"{parts.scheme}://{parts.netloc}/")
            how = f"{how}; {how2}"
        if im is None:
            report.append((slug, "MISSING", how))
            continue
        normalise(im).save(OUT / f"{slug}.png")
        report.append((slug, "ok", how))
        print(f"{slug:14} {how}", flush=True)
    for slug, status, how in report:
        if status != "ok":
            print(f"{slug:14} MISSING: {how}")


if __name__ == "__main__":
    main(sys.argv[1:])
