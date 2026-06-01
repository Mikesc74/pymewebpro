#!/usr/bin/env python3
"""
Build the deployable comisiones.pymewebpro.com site into ./dist.

This Pages project (pymewebpro-ventas) used to host the static ventas hub
(configurador + PDF + manuals), but that hub's hostname (ventas.pymewebpro.com)
is now owned by the pymewebpro-portal worker. So this project serves only one
host: comisiones.pymewebpro.com, which is purely the Comisiones tracker.

What gets shipped:
  - dist/index.html        : the Comisiones tracker (home page)
  - dist/comisiones/...    : alias for legacy /comisiones/ URLs
  - dist/_headers          : noindex + basic hardening

What does NOT ship (left in the repo as reference only):
  - configurador.html, one-pager.html, PymeWebPro-Funnels.pdf
  - internal/* and docs/* manual content
  - one-pager-print.html
"""
import os, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
SRC  = os.path.join(ROOT, "comisiones", "index.html")

# Files left over from the old ventas hub. Remove them so wrangler does not
# re-upload them and the new deploy ships a clean manifest.
STALE = [
    "configurador.html", "one-pager.html", "PymeWebPro-Funnels.pdf",
    "_redirects",
    "docs/sales-rulebook.html", "docs/client-qualification.html",
    "docs/scope-boundaries.html", "docs/guion-ventas.html",
    "docs/add-on-menu.html",
]

HEADERS = (
    "/*\n"
    "  X-Robots-Tag: noindex, nofollow\n"
    "  X-Content-Type-Options: nosniff\n"
    "  X-Frame-Options: DENY\n"
    "  Referrer-Policy: strict-origin-when-cross-origin\n"
)


def build():
    os.makedirs(DIST, exist_ok=True)

    if not os.path.exists(SRC):
        raise SystemExit(f"missing source: {SRC}")

    # Remove anything from the previous (old-hub) build that is no longer needed.
    for rel in STALE:
        p = os.path.join(DIST, rel)
        if os.path.exists(p):
            try: os.unlink(p)
            except Exception as e: print(f"  warn: could not remove {rel}: {e}")
    # If the docs/ folder is now empty, remove it.
    docs_dir = os.path.join(DIST, "docs")
    if os.path.isdir(docs_dir) and not os.listdir(docs_dir):
        try: os.rmdir(docs_dir)
        except Exception: pass

    # Tracker lives at /.
    shutil.copy2(SRC, os.path.join(DIST, "index.html"))

    # Alias at /comisiones/ for any links that point there.
    cdir = os.path.join(DIST, "comisiones")
    os.makedirs(cdir, exist_ok=True)
    shutil.copy2(SRC, os.path.join(cdir, "index.html"))

    open(os.path.join(DIST, "_headers"), "w", encoding="utf-8").write(HEADERS)

    print("Built dist/ (Comisiones tracker only):")
    for dirpath, _, files in os.walk(DIST):
        for fn in sorted(files):
            rel = os.path.relpath(os.path.join(dirpath, fn), DIST)
            print("  ", rel)


if __name__ == "__main__":
    build()
