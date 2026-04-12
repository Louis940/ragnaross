#!/usr/bin/env python3
"""
BFS mirror of https://ragnaross.co.uk (same-origin only).
Writes mirror/ragnaross.co.uk/... and mirror/inventory.jsonl
"""
from __future__ import annotations

import json
import re
import time
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen

BASE = "https://ragnaross.co.uk"
NETLOC = "ragnaross.co.uk"
MIRROR_ROOT = Path(__file__).resolve().parent / "mirror" / NETLOC
DELAY_S = 0.35
USER_AGENT = "RagnarossMirrorBot/1.0 (personal site backup; +https://ragnaross.co.uk)"

SEARCH_INDEX_META_RE = re.compile(
    r'<meta\s+name="framer-search-index"\s+content="([^"]+)"', re.I
)


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.urls: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = {k: v or "" for k, v in attrs}
        if tag == "a" and ad.get("href"):
            self.urls.append(ad["href"])
        elif tag in ("img", "script", "iframe", "source"):
            if ad.get("src"):
                self.urls.append(ad["src"])
        elif tag == "link" and ad.get("href"):
            rel = ad.get("rel", "").lower()
            if "stylesheet" in rel or "preload" in rel or "icon" in rel:
                self.urls.append(ad["href"])
        elif tag in ("video", "audio"):
            if ad.get("src"):
                self.urls.append(ad["src"])
        elif tag == "use" and ad.get("href"):
            self.urls.append(ad["href"])
        if ad.get("srcset"):
            for part in ad["srcset"].split(","):
                u = part.strip().split()[0] if part.strip() else ""
                if u:
                    self.urls.append(u)


def normalize_url(page_url: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
        return None
    abs_url = urljoin(page_url, href)
    abs_url, _frag = urldefrag(abs_url)
    p = urlparse(abs_url)
    if p.scheme not in ("http", "https"):
        return None
    if p.netloc.lower() != NETLOC:
        return None
    # canonical https
    if p.scheme == "http":
        abs_url = "https://" + p.netloc + (p.path or "/")
        if p.query:
            abs_url += "?" + p.query
        p = urlparse(abs_url)
    path = p.path or "/"
    if not path.endswith("/") and path.rsplit(".", 1)[-1].lower() in (
        "html",
        "htm",
        "php",
        "xml",
        "txt",
        "json",
    ):
        pass
    return abs_url


def url_to_disk_path(url: str) -> Path:
    p = urlparse(url)
    path = p.path or "/"
    if path.endswith("/"):
        path = path + "index.html"
    elif not Path(path).suffix:
        path = path + "/index.html"
    rel = path.lstrip("/")
    if not rel:
        rel = "index.html"
    return MIRROR_ROOT / rel


def fetch(url: str) -> tuple[int, str, bytes]:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=60) as resp:
        code = resp.getcode()
        ctype = resp.headers.get("Content-Type", "")
        data = resp.read()
    return code, ctype, data


def site_url_from_path(path: str) -> str:
    path = (path or "/").strip()
    if not path.startswith("/"):
        path = "/" + path
    return urljoin(BASE + "/", path[1:])


def enqueue_framer_search_routes(
    html: str,
    queue: deque[str],
    seen: set[str],
    fetched_indices: set[str],
    inv,
) -> None:
    m = SEARCH_INDEX_META_RE.search(html)
    if not m:
        return
    index_url = m.group(1)
    if index_url in fetched_indices:
        return
    fetched_indices.add(index_url)
    time.sleep(DELAY_S)
    try:
        code, ctype, data = fetch(index_url)
    except Exception as e:
        inv.write(
            json.dumps(
                {
                    "url": index_url,
                    "status": None,
                    "error": str(e),
                    "note": "framer-search-index",
                }
            )
            + "\n"
        )
        inv.flush()
        return
    meta_dir = Path(__file__).resolve().parent / "mirror"
    meta_dir.mkdir(parents=True, exist_ok=True)
    (meta_dir / "framer-search-index.json").write_bytes(data)
    inv.write(
        json.dumps(
            {
                "url": index_url,
                "status": code,
                "content_type": ctype,
                "saved": "framer-search-index.json",
                "note": "framer-search-index",
            }
        )
        + "\n"
    )
    inv.flush()
    try:
        idx = json.loads(data.decode("utf-8"))
    except json.JSONDecodeError:
        return
    routes = sorted(idx.keys())
    (meta_dir / "route_manifest.json").write_text(
        json.dumps({"source": index_url, "paths": routes}, indent=2),
        encoding="utf-8",
    )
    for path in routes:
        u = site_url_from_path(path)
        if u not in seen:
            queue.append(u)


def main() -> None:
    MIRROR_ROOT.mkdir(parents=True, exist_ok=True)
    inventory = Path(__file__).resolve().parent / "mirror" / "inventory.jsonl"
    seen: set[str] = set()
    queue: deque[str] = deque([BASE + "/"])
    fetched_search_indices: set[str] = set()

    with inventory.open("w", encoding="utf-8") as inv:
        while queue:
            url = queue.popleft()
            if url in seen:
                continue
            seen.add(url)
            time.sleep(DELAY_S)
            try:
                code, ctype, data = fetch(url)
            except Exception as e:
                inv.write(
                    json.dumps(
                        {"url": url, "status": None, "error": str(e), "saved": None}
                    )
                    + "\n"
                )
                inv.flush()
                continue

            p = urlparse(url)
            ext = Path(p.path).suffix.lower()
            ctype_l = ctype.lower()
            is_html = "text/html" in ctype_l

            if is_html:
                out_path = url_to_disk_path(url)
            else:
                rel = p.path.lstrip("/") or "index"
                out_path = MIRROR_ROOT / rel

            out_path.parent.mkdir(parents=True, exist_ok=True)
            if is_html and "text/html" in ctype.lower():
                try:
                    text = data.decode("utf-8", errors="replace")
                except Exception:
                    text = data.decode("latin-1", errors="replace")
                out_path.write_text(text, encoding="utf-8")
                enqueue_framer_search_routes(
                    text, queue, seen, fetched_search_indices, inv
                )
                parser = LinkExtractor()
                parser.feed(text)
                for raw in parser.urls:
                    n = normalize_url(url, raw)
                    if n and n not in seen:
                        queue.append(n)
            else:
                out_path.write_bytes(data)

            inv.write(
                json.dumps(
                    {
                        "url": url,
                        "status": code,
                        "content_type": ctype,
                        "saved": str(out_path.relative_to(MIRROR_ROOT.parent)),
                    }
                )
                + "\n"
            )
            inv.flush()

    # summary
    summary = Path(__file__).resolve().parent / "mirror" / "summary.json"
    summary.write_text(
        json.dumps({"pages_fetched": len(seen), "urls": sorted(seen)}, indent=2),
        encoding="utf-8",
    )
    print(f"Done. {len(seen)} URLs. Mirror: {MIRROR_ROOT}")


if __name__ == "__main__":
    main()
