#!/usr/bin/env python3
# refresh-csp-hashes.py, recompute SHA-256 hashes for every inline <script>
# across the deployed HTML, then rewrite functions/_middleware.js's
# SCRIPT_HASHES array in place.
#
# WHY: the Pages middleware hash-locks inline scripts (script execution is the
# real XSS surface). If a script hash doesn't match the actual page content the
# browser blocks it. style-src is NOT hash-locked anymore , it uses
# 'unsafe-inline' (inline styles are presentational, not executable), which
# ended the recurring "site renders unstyled" breakage that happened whenever
# _middleware.js lagged an HTML push. So this script only touches scripts now.
#
# WHICH FILES: every *.html under the repo root, excluding non-deployed
# paths (node_modules, manual-mockups, portal/). This matches the
# middleware's actual surface.
#
# Usage (from repo root):
#   python3 scripts/refresh-csp-hashes.py            # rewrites _middleware.js
#   python3 scripts/refresh-csp-hashes.py --check    # exits 1 if out of sync,
#                                                    # does not modify files
#
# The pre-push git hook runs --check to block pushes that would ship a
# broken CSP.

import re, hashlib, base64, glob, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

CHECK_ONLY = "--check" in sys.argv

# Every HTML file the Pages middleware will set a CSP header on.
def deployed_html_files():
    files = sorted(glob.glob("**/*.html", recursive=True))
    return [
        f for f in files
        if "node_modules" not in f
        and "manual-mockups" not in f
        and not f.startswith("portal/")
        and not f.startswith("pymewebpro-sales/")
        and not f.startswith("pymewebpro-agent/")
    ]

def hashes_for(tag, files):
    pat = re.compile(rf"<{tag}(\s[^>]*)?>(.*?)</{tag}>", re.DOTALL)
    out = set()
    for f in files:
        if not os.path.exists(f):
            continue
        html = open(f, encoding="utf-8").read()
        for m in pat.finditer(html):
            attrs = m.group(1) or ""
            body = m.group(2)
            if tag == "script" and "src=" in attrs:
                continue
            if not body.strip():
                continue
            d = hashlib.sha256(body.encode("utf-8")).digest()
            out.add("sha256-" + base64.b64encode(d).decode())
    return sorted(out)

def replace_array(mw, name, values):
    body = "\n" + "\n".join(f'  "{h}",' for h in values) + "\n"
    new_block = f"const {name} = [{body}];"
    new_mw, n = re.subn(rf"const {name} = \[[\s\S]*?\];", new_block, mw, count=1)
    if n == 0:
        print(f"[refresh-csp-hashes] FAIL: could not find {name} in _middleware.js",
              file=sys.stderr)
        sys.exit(2)
    return new_mw

files = deployed_html_files()
scripts = hashes_for("script", files)

if not scripts:
    print("[refresh-csp-hashes] No inline scripts found, did build:bilingual run?",
          file=sys.stderr)
    sys.exit(1)

mw_path = "functions/_middleware.js"
mw = open(mw_path, encoding="utf-8").read()

# Compare current array to actual hashes for the --check path.
def extract(name):
    m = re.search(rf"const {name} = \[(.*?)\];", mw, re.DOTALL)
    return set(re.findall(r'"(sha256-[^"]+)"', m.group(1))) if m else set()

cur_scripts = extract("SCRIPT_HASHES")

missing_scripts = set(scripts) - cur_scripts
stale_scripts   = cur_scripts - set(scripts)

if CHECK_ONLY:
    bad = []
    if missing_scripts:
        bad.append(f"{len(missing_scripts)} inline <script> hash(es) missing from CSP")
    if stale_scripts:
        bad.append(f"{len(stale_scripts)} stale <script> hash(es) in CSP")
    if bad:
        print("[refresh-csp-hashes] CSP HASHES OUT OF SYNC:", file=sys.stderr)
        for b in bad:
            print(f"  - {b}", file=sys.stderr)
        print("\n  Fix from repo root:\n"
              "    python3 scripts/refresh-csp-hashes.py\n"
              "    git add functions/_middleware.js\n"
              "    git commit --amend --no-edit   # or a new commit\n"
              "    git push\n", file=sys.stderr)
        sys.exit(1)
    print(f"[refresh-csp-hashes] OK · {len(scripts)} scripts match")
    sys.exit(0)

# Default: rewrite the file
new_mw = replace_array(mw, "SCRIPT_HASHES", scripts)

# Em dash check (Mike's house rule, no em dashes anywhere)
new_mw = new_mw.replace("—", ",")

if new_mw == mw:
    print(f"[refresh-csp-hashes] OK · already in sync ({len(scripts)} scripts)")
else:
    open(mw_path, "w", encoding="utf-8").write(new_mw)
    print(f"[refresh-csp-hashes] OK · wrote {len(scripts)} scripts to {mw_path}")
