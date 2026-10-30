#!/usr/bin/env python3
"""Assemble index.html from the source files.

Usage:  python3 build.py
Output: index.html (the file to upload to GitHub Pages)

Source files:
  src/head.html   title, fonts and all CSS styles
  src/body.html   page structure (tabs, forms, panels)
  src/i18n.js     every text of the site, in French and English, + CPC/IPC labels
  src/app.js      the application logic, including SITE_CONFIG at the top
  data/espacenet_sample.json   the patent sample shown by "View sample"
"""
from pathlib import Path
root = Path(__file__).resolve().parent
read = lambda p: (root / p).read_text(encoding="utf-8")
sample = read("data/espacenet_sample.json").replace("</", "<\\/")
page = (
    "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}"
    "body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n"
    + read("src/head.html") + "</head>\n<body>\n"
    + read("src/body.html")
    + "\n<script type=\"application/json\" id=\"patSample\">" + sample + "</script>\n"
    + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js\"></script>\n"
    + "<script src=\"https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/world.js\"></script>\n"
    + "<script>\n" + read("src/i18n.js") + "\n" + read("src/app.js") + "</script>\n</body>\n</html>\n"
)
(root / "index.html").write_text(page, encoding="utf-8")
print("index.html written:", round(len(page) / 1024), "KB")
