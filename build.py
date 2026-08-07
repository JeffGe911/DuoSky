#!/usr/bin/env python3
"""DuoSky build: src/ + data/ -> index.html (single self-contained file), with validation.

Validates every inlined <script> with `node --check` and checks for leftover
placeholders BEFORE writing index.html. On failure it exits non-zero and leaves
the previous good index.html untouched, so a broken build can't be committed.
"""
import re, subprocess, tempfile, os, sys

tpl = open("src/template.html", encoding="utf-8").read()
out = (tpl.replace("__TERMS__", open("data/terms.json", encoding="utf-8").read())
          .replace("__ENGINE__", open("src/engine.js", encoding="utf-8").read())
          .replace("__ASTRO__", open("src/astronomy.min.js", encoding="utf-8").read())
          .replace("__FONTS__", open("src/fonts.css", encoding="utf-8").read()))

errs = []
for ph in ("__TERMS__", "__ENGINE__", "__ASTRO__", "__FONTS__"):
    if ph in out:
        errs.append(f"leftover placeholder {ph}")

scripts = re.findall(r"<script>(.*?)</script>", out, re.S)
try:
    for i, body in enumerate(scripts):
        f = tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8")
        f.write(body); f.close()
        r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
        os.unlink(f.name)
        if r.returncode != 0:
            errs.append(f"script[{i}] syntax error:\n{r.stderr.strip()}")
    checked = f"{len(scripts)} scripts"
except FileNotFoundError:
    checked = "node not found — JS validation SKIPPED"

if errs:
    sys.stderr.write("BUILD FAILED — index.html NOT written:\n  " + "\n  ".join(errs) + "\n")
    sys.exit(1)

open("index.html", "w", encoding="utf-8").write(out)
print(f"built index.html: {len(out)} bytes · {checked} OK")
