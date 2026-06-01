// Pages middleware , sets Content-Security-Policy on every HTML response.
//
// Why this lives here, not in _headers:
//
// Cloudflare Pages enforces a per-header-value byte limit on _headers entries
// (~2000 chars). Our CSP value is well over that because it hash-locks every
// inline <script> across the site (63 script hashes at last count). CF Pages
// silently strips oversized values, so a CSP defined in _headers never reaches
// the wire. Pages Functions have no such limit.
//
// Everything else (HSTS, X-Frame-Options, Permissions-Policy, COOP, CORP,
// Referrer-Policy, X-Content-Type-Options, cache rules) stays in _headers
// because those values fit comfortably.
//
// CSP HASH MAINTENANCE: only inline <script> is hash-locked. style-src uses
// 'unsafe-inline' (inline styles are presentational, not executable), so
// editing a <style> block needs no hash refresh. When an inline <script> body
// changes (whitespace counts), regenerate the SCRIPT_HASHES list below:
//
//   python3 scripts/refresh-csp-hashes.py          # rewrites this file
//   python3 scripts/refresh-csp-hashes.py --check   # verifies sync (pre-push hook)

const SCRIPT_HASHES = [
  "sha256-+Km2JgOlLQLRi6/81ubHwKC15gRsPeDZA5RisvAUx84=",
  "sha256-/sOG8WvFJyr6wt/vAR2/3HaxBQziP4/BqGnY+Wqg33s=",
  "sha256-0DBDUGh2wJcmKVNnpQ50lPdkzUbFhXI+alAZzYcfGsc=",
  "sha256-0hmYxEsA5lfAf/yqNjwnVT7O/J26YmwPoKelU8aH+dM=",
  "sha256-172CqWaanpe+w/uwsGaoFaQSWrdwkVo4X67ymNAVLF0=",
  "sha256-1Tw3rkn5sGG+yxwnkw5G1RuWkzmVBbxK9FChOJ+JSEc=",
  "sha256-1ozAnAFiMl08nuXK2J4vZ9vsDG4r5m08NyLy+MxXUnk=",
  "sha256-26S8LSeW33KRrjcOd94gcNKsKxBEQs3DhFoTnk+DT0U=",
  "sha256-4KtmI6rWgtoNU0RlrE/DVpAcsdluZC0GwEY+osmvqO8=",
  "sha256-54M7f9EF7t4uVkwXSKRztXisUslxFBGBRhWMueOUukw=",
  "sha256-86GkMwXQyUUSY5bU2RgVL4kh7mPs6SCKfwn2I4OAJVY=",
  "sha256-8w1VP6tDs0irFzrMpwmkmJzVwdDVp6GTRFqGNHI6NGY=",
  "sha256-C4lk4BOHV6jIkhN0JvmqIqDM5Sbl8q/Y8e8R7XaIrXE=",
  "sha256-CqwFR5cxIpPU8NcSpDqq63Xbbj4SyMUDq/D4EB1Kh6Q=",
  "sha256-De2T7aBvmCFI6Tu1NtH98TIar3kpA9vGXo71DASpIss=",
  "sha256-DxNckgF+r3biK/p+0xFhZLiIMw07f3/xqv4lXesi/mE=",
  "sha256-E1ihA9q16yPifyd1by/X4CuZXxeergdUPhRQ+6QVvI0=",
  "sha256-G+zQUXnwYvyXbqM/+nxazbU+422evUBh7lBBULCnL6o=",
  "sha256-GNzSG+JD+AGVSnl9kcoRwnnsq1NT0omKeO/8RT77Zz0=",
  "sha256-GUNlN1EIqBJGKoJRi4QUFUcwszQVtrA5ptGfmaSokWk=",
  "sha256-HPj/LbwnRSygdZp1cAKo5zRXr2UztC0jXh9f8vI4GR4=",
  "sha256-HxQNaPSjKX4zIcVMwrlirBTYhmqHWr7A77Vfj5JwRh0=",
  "sha256-IDRnNzJMbWoq4CmQk1XHhgBQ1GATBUyhZdfGmd7cdLA=",
  "sha256-ILPMXQ+3vbtcQik5/VFgEcxdUMXLIYXEFRWpU/R7Wr4=",
  "sha256-Idu2q173F3YcjzeQjAsraU2yUjcH4M3kzGEDPbBSB/8=",
  "sha256-JLxzOr25mlIlLAwHI7wblee+bEwHvInC99XQ4X6RmeQ=",
  "sha256-LEt9n3O+PJosrowihc+P6ybibD23dQ3HBh9wceugN2A=",
  "sha256-LRfAsPcQle20Mbbj/fw0REnGK9KEb7QjKbytygcOaFU=",
  "sha256-MG7DmAdfX2nIGhxQQ26ibYuR53Ql/QMZlqpcFJKM6ps=",
  "sha256-MjUAZkHhSUhTrEZseRfa/fXf+9ZTAHk24X9+EBW1FdY=",
  "sha256-MuUruypGhOa81dh/B1Bjhq5DXRZlbukLr4ugocqGUIk=",
  "sha256-Mxg7eiXKFbG/DnP5G+BmNRtzt4Xnt+YI4cPactdM8nM=",
  "sha256-MzCVq8qV8dda7VyYuBkJXrpsrlU0cZSrT1/5uU7yndo=",
  "sha256-NLYmXfYgqnHuuPCEZHKNTCdRqf3SZ2RLxukyjP+nhfg=",
  "sha256-NTDOTE2RBHaterAf8siX+b072QadVW7Nd59poSzLaag=",
  "sha256-NbaPXciJY+V1BiBoXGkVVQ0dj6dBwaFsi8TRmzNeITo=",
  "sha256-NmiCtvYkOF/KPwqF13tC2FgKHYMTovAal4/pHNPjr4s=",
  "sha256-O1OwgatEkBwUG2KovKFEJ2WxNr6/IRdghHdFpAzRJiA=",
  "sha256-O8z4V3EQaFL00IFqli4i1yNSYlER82XdtuemaXJp1Po=",
  "sha256-OzJiiWKIh0cgBV2in+C+wcMyj9XlkKJT/fx0k3mEyOo=",
  "sha256-P+OvErb1BBDyaaezPzpXwOkwzFoeNMvEFmuBCchZMBs=",
  "sha256-SMgGhWCMIe6hMCFwpbMb4wj9IvyRZBc6iYDeoqKtBCg=",
  "sha256-T5BTDsamdRv4rPYn/o1ekb3JZQNGAUcZG32XUHzFJXg=",
  "sha256-TP4XUMaLFfFpPEpyC7xi7gG/NeNexz/3ecrOWNHdhlM=",
  "sha256-U/p6HeDxTYvmz4eA/i3GdYV0T8nA1TUWAtdWYFBfPLQ=",
  "sha256-VXkia3hmcOxHR/pOAKmnJXLvabhoKyT3WdB/yjAJta8=",
  "sha256-VaWy8PtS6N9pwz8EXxXLzNe4nslRvZ733mSrtMxHpkI=",
  "sha256-VnntiuwhWPVB88wz/Ig3aImzSfVErfdXjv5FgAWALvg=",
  "sha256-W1PMSMp061q45yl5W6fTzX0w9DKuSMQalmHasoGQvZw=",
  "sha256-WhmFk5Bq602xDLYrjYTBZyqPs9SQBZQheN6BGvZxAVk=",
  "sha256-YYHRNIwD9675647zoOoEO3kS5DreNftOVd6zmstn2Zc=",
  "sha256-YbeXTxHXMEQ9noaFyQ1uHPL0LXCNJALIxPVxiwmpuxI=",
  "sha256-YdBaQX1r+n4Zr+17Ro+m2nW0mCHWoZnOic5IEuyH2ss=",
  "sha256-b+gnbsZPsBqqpM1c8q2ZfKwpqF4v1FwAJTbEHi/RNDA=",
  "sha256-bZzA//NqPrDEKDXREpr7va3++GCDPUk9+PPiNuuCdt4=",
  "sha256-bcxg30y/qI7+do/tSlFu9Qi8bzvv0es9JEAHXzf4j8I=",
  "sha256-cQPDPe3z/a2swjkrYaKfHrvI0j/UOObqdvcuH6GsIMk=",
  "sha256-d/yirliPDVbbNbEYPusiW0rxpbH+eYNCSAtTKLJwTUA=",
  "sha256-d5OlTITfoSJz7cRSctV5sUyftpF83DTAa3A/eA3TIBY=",
  "sha256-dElzpj6ZAg5tW86CQOJiHGoGf7OID7xMOekKoxqWX54=",
  "sha256-dss+CoNYf9ls00JNLDe1wZ2lXcFYw/DVc5SKXb1vAls=",
  "sha256-eu1i5kxhzLaYBRW5gs/eAs2V7B6pK1FnyRyhcEoQfaw=",
  "sha256-fRmv8ywVSsWU0Hi1+/28B7OHNyo5//3iiWJX8R3UAag=",
  "sha256-fXPfCL4EAFRIiuVpRtI+YfBvemXPIHIIwBK7vjkzo+0=",
  "sha256-fe4cFKrvJZoSycKlO33mpw6czcbGJFS52Z39lPqu/AQ=",
  "sha256-g+o43Oe5SP9TZn26+Y9LbZd/lcznmRBnBWzKJco43f4=",
  "sha256-hdInBTCclPJxU4dbyIThQ5qRb7HesfGrCXj7ELJ9uC4=",
  "sha256-iscuYYSB81PTQYu8ed0wVjYjECLj4h2M3nHyN49PkGg=",
  "sha256-iyJJLRgq/roojg2jZHuDNlEnh7p2zJFYapmUD+CCvlU=",
  "sha256-my7lmChJvGZAjxtr8iR6lSHRdwT/W10GHd9rCZ3qx28=",
  "sha256-nEnRyh4ubm09SmkXgbFLkn9jcKL2QAwYEEiomKCSaH8=",
  "sha256-ow+xRV1N/4kROvcamuOJi3gnaGrG05w6Z+HrvONwVlo=",
  "sha256-qDmKZiphgwQaidSaxZqvYunYmuRBQBANgBuEBlN+lbc=",
  "sha256-qUxb/MmsUtNGb9ZD952CCjDWiZKleteqLD3UWvCSGPE=",
  "sha256-rBL0PN78SJSNNev7As5kIWYPL9Tnpdm5O7XW3pkHdrc=",
  "sha256-u1jBsBUcuemmNvUcavjlIWYLPBz3JO5GOeq0D3eu92w=",
  "sha256-vOhM5Sr087MCqZBcYtJz61I+X0RZlmZA2ysJk7xJb2Y=",
  "sha256-vZnDzfWFe/3EonS42AgTWkj3/YDvij3ttuzF5E5wTaI=",
  "sha256-voAHiu5C2mwoj653S0ab/1e2+E+vauzGOqaOPY2KvXc=",
  "sha256-wGyshhOsJpT3vTN0XdY2pCU4uKx5+yKGrAcRvSbnSwA=",
  "sha256-x+ooZEpSl5rUiCeKmDjcxKSDU5JXdjLTfg9E1cw8GTU=",
  "sha256-xY8nFq/TRlmp4XyWgQRGEritdEnzwcdpzpdcBPnFf/k=",
  "sha256-xZSrb5GggtSDZ/MlGDdfSrFQ2E4Gj1vlMeUSt4PDZaE=",
  "sha256-zKxCef1pMhu2xyRIngYj06OcbCHM3Ky0YOkIRQuWXU4=",
  "sha256-zfedea1ki/Nzwwp9F5+DFHW1Aq1N3DBmX3lNoQE79go=",
  "sha256-zi2UeItvAYkd1qMVdj3BwXFJ5aXCKsvGffc0qO7D9Ms=",
];

const SCRIPT_HASH_LIST = SCRIPT_HASHES.map((h) => `'${h}'`).join(" ");

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${SCRIPT_HASH_LIST} https://www.googletagmanager.com https://valentina.pymewebpro.com`,
  // script-src stays hash-locked (script execution is the real XSS surface).
  // style-src uses 'unsafe-inline' on purpose: inline <style> is presentational,
  // not executable, so the risk is low, and hash-locking styles was the recurring
  // cause of the live site rendering unstyled whenever _middleware.js lagged an
  // HTML push by even one commit. Per-page <style> blocks now edit freely with
  // no hash refresh. Note: a CSP3 browser ignores 'unsafe-inline' if any hash or
  // nonce is also present in style-src, so do NOT re-add style hashes here.
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://valentina.pymewebpro.com`,
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://images.pexels.com https://www.google-analytics.com",
  // blob: lets the "free example" preview render the generated mockup inside its tablet iframe.
  "frame-src 'self' blob:",
  "connect-src 'self' https://portal.pymewebpro.com https://valentina.pymewebpro.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Relaxed CSP for /manual-mockups/<slug>/* · the prospect mockups have their
// own self-contained inline <style> + <script> blocks that are NOT part of
// the marketing site's hash allowlist (the hash collector explicitly excludes
// `manual-mockups/`). Without this carve-out, every mockup page renders
// unstyled because the browser blocks the inline <style>. Mockups are sales
// previews, not the strict-CSP marketing site, so `'unsafe-inline'` is fine.
// connect-src allows the chat widget to POST to mockups.pymewebpro.com/api/*.
const CSP_MOCKUPS = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://mockups.pymewebpro.com https://valentina.pymewebpro.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://images.pexels.com https://www.google-analytics.com",
  "connect-src 'self' https://mockups.pymewebpro.com https://valentina.pymewebpro.com https://www.google-analytics.com https://www.googletagmanager.com",
  "form-action 'self' https://mockups.pymewebpro.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const onRequest = async (context) => {
  const response = await context.next();
  const ct = response.headers.get("content-type") || "";
  // Only attach CSP to HTML documents. Stylesheets, images, JSON, etc.
  // don't need it and stripping the header keeps cache entries small.
  if (!ct.includes("text/html")) return response;

  // Clone response so we can mutate headers (response.headers is immutable
  // when returned from context.next() in some runtime versions).
  const headers = new Headers(response.headers);

  // Path-aware CSP. Mockups get the relaxed policy so their inline blocks
  // render. Everything else gets the hash-locked marketing-site policy.
  const path = new URL(context.request.url).pathname;
  const isMockup = path.startsWith("/manual-mockups/");
  headers.set("Content-Security-Policy", isMockup ? CSP_MOCKUPS : CSP);

  // Cloudflare Pages adds Access-Control-Allow-Origin: * to every static
  // asset by default. Strip it from HTML , these pages never need to be
  // read cross-origin, and a wide-open ACAO is a recurring SSL-Labs ding.
  headers.delete("Access-Control-Allow-Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
