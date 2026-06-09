// widget.js · Embeddable chat widget for pymewebpro.com.
// Two endpoints exposed by index.js:
//   GET /widget.js  → WIDGET_JS  (registered into document; no inline styles)
//   GET /widget.css → WIDGET_CSS (loaded via <link rel="stylesheet">)
// Splitting JS / CSS keeps pymewebpro.com's hash-locked CSP happy without
// adding 'unsafe-inline'. CSP just needs to allow valentina.pymewebpro.com
// in script-src, style-src, and connect-src.

import WIDGET_CSS_TEXT from "./widget.css";
export const WIDGET_CSS = WIDGET_CSS_TEXT;

import WIDGET_JS_TEXT from "./widget.js.txt";
export const WIDGET_JS = WIDGET_JS_TEXT;
