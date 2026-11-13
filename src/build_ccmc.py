#!/usr/bin/env python3
"""Build site/dose/ccmc.html from src/ccmc/ (page.html + AMDC base CSS + ccmc.css + data.js + app.js).

AMDC is only read (its <style> block is reused for a consistent look); it is never modified.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "ccmc"
amdc = (ROOT / "site" / "dose" / "amdc.html").read_text(encoding="utf-8")
m = re.search(r"</head><body><style>\n(.*?)\n</style>", amdc, re.S)
if not m:
    raise SystemExit("AMDC style block not found")
page = (SRC / "page.html").read_text(encoding="utf-8")
js = (SRC / "data.js").read_text(encoding="utf-8") + "\n" + (SRC / "app.js").read_text(encoding="utf-8")
out = (page.replace("/*AMDC_CSS*/", m.group(1))
           .replace("/*CCMC_CSS*/", (SRC / "ccmc.css").read_text(encoding="utf-8"))
           .replace("/*CCMC_JS*/", js))
svg = (ROOT / "site" / "dose" / "ccmc-icon.svg").read_text(encoding="utf-8")
ICON_URI = "data:image/svg+xml," + __import__("urllib.parse").parse.quote(" ".join(svg.split()))
out = out.replace('href="ccmc-icon.svg"', f'href="{ICON_URI}"').replace('src="ccmc-icon.svg"', f'src="{ICON_URI}"')
(ROOT / "site" / "dose" / "ccmc.html").write_text(out, encoding="utf-8")
print("wrote site/dose/ccmc.html", len(out), "bytes")
