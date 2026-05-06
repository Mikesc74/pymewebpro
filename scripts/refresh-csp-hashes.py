#!/usr/bin/env python3
# refresh-csp-hashes.py — recompute SHA-256 hashes for every inline <script>
# in the deployed HTML files, then rewrite functions/_middleware.js's
# SCRIPT_HASHES array in place.
#
# Run after editing any HTML page that ships inline JS, after `npm run
# build:bilingual` has regenerated root index.html and es/index.html.
#
# Usage (from repo root):
#   python3 scripts/refresh-csp-hashes.py

import re, hashlib, base64, glob, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# Every HTML file that goes through Pages middleware and gets a CSP header.
FILES = [
    "index.html",
    "es/index.html",
    "start/index.html",
    "es/start/index.html",
    "terminos.html",
    "politica-de-datos.html",
    "hosting.html",
] + sorted(glob.glob("sitio-web-*/index.html"))

INLINE_SCRIPT = re.compile(r"<script(\s[^>]*)?>(.*?)</script>", re.DOTALL)

hashes = set()
for f in FILES:
    if not os.path.exists(f):
        continue
    html = open(f, encoding="utf-8").read()
    for m in INLINE_SCRIPT.finditer(html):
        attrs = m.group(1) or ""
        body = m.group(2)
        if "src=" in attrs:           # external script, skip
            continue
        if not body.strip():          # empty tag, skip
            continue
        digest = hashlib.sha256(body.encode("utf-8")).digest()
        hashes.add("sha256-" + base64.b64encode(digest).decode())

if not hashes:
    print("[refresh-csp-hashes] No inline scripts found, did build:bilingual run?", file=sys.stderr)
    sys.exit(1)

sorted_hashes = sorted(hashes)
new_block = (
    "const SCRIPT_HASHES = [\n"
    + "\n".join(f'  "{h}",' for h in sorted_hashes)
    + "\n];"
)

mw_path = "functions/_middleware.js"
mw = open(mw_path, encoding="utf-8").read()
new_mw, n = re.subn(r"const SCRIPT_HASHES = \[[\s\S]*?\];", new_block, mw, count=1)

if n == 0:
    print("[refresh-csp-hashes] FAIL: could not find SCRIPT_HASHES array in", mw_path, file=sys.stderr)
    sys.exit(2)

open(mw_path, "w", encoding="utf-8").write(new_mw)
print(f"[refresh-csp-hashes] OK · wrote {len(sorted_hashes)} hashes to {mw_path}")
