#!/usr/bin/env python3
"""DuoSky build: src/ + data/ -> index.html (single self-contained file)"""
tpl = open("src/template.html", encoding="utf-8").read()
out = tpl.replace("__TERMS__", open("data/terms.json", encoding="utf-8").read()) \
         .replace("__ENGINE__", open("src/engine.js", encoding="utf-8").read())
open("index.html", "w", encoding="utf-8").write(out)
print("built index.html:", len(out), "bytes")
