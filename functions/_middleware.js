// Pages middleware , sets Content-Security-Policy on every HTML response.
//
// Why this lives here, not in _headers:
//
// Cloudflare Pages enforces a per-header-value byte limit on _headers entries
// (~2000 chars). Our CSP value is well over that because it hash-locks every
// inline <script> AND every inline <style> across the site (55 script hashes
// + 26 style hashes at last count). CF Pages silently strips oversized values,
// so a CSP defined in _headers never reaches the wire. Pages Functions have
// no such limit.
//
// Everything else (HSTS, X-Frame-Options, Permissions-Policy, COOP, CORP,
// Referrer-Policy, X-Content-Type-Options, cache rules) stays in _headers
// because those values fit comfortably.
//
// CSP HASH MAINTENANCE: when an inline <script> or <style> body changes
// (whitespace counts), recompute hashes for every HTML file under the repo
// root and update the SCRIPT_HASHES / STYLE_HASHES lists below. The script
// that emits both lists (run from repo root):
//
//   python3 -c "
//   import re,hashlib,base64,glob,os,json
//   files=[f for f in sorted(glob.glob('**/*.html', recursive=True))
//          if 'node_modules' not in f and 'manual-mockups' not in f and 'portal/' not in f]
//   def hashes_for(tag):
//     out=set()
//     for f in files:
//       if not os.path.exists(f): continue
//       for m in re.finditer(rf'<{tag}(\\s[^>]*)?>(.*?)</{tag}>', open(f).read(), re.DOTALL):
//         attrs=m.group(1) or ''
//         body=m.group(2)
//         if tag=='script' and 'src=' in attrs: continue
//         if not body.strip(): continue
//         out.add('sha256-'+base64.b64encode(hashlib.sha256(body.encode()).digest()).decode())
//     return sorted(out)
//   print('SCRIPT_HASHES:'); print(json.dumps(hashes_for('script'), indent=2))
//   print('STYLE_HASHES:'); print(json.dumps(hashes_for('style'), indent=2))
//   "

const SCRIPT_HASHES = [
  "sha256-+Km2JgOlLQLRi6/81ubHwKC15gRsPeDZA5RisvAUx84=",
  "sha256-0DBDUGh2wJcmKVNnpQ50lPdkzUbFhXI+alAZzYcfGsc=",
  "sha256-172CqWaanpe+w/uwsGaoFaQSWrdwkVo4X67ymNAVLF0=",
  "sha256-1Tw3rkn5sGG+yxwnkw5G1RuWkzmVBbxK9FChOJ+JSEc=",
  "sha256-1ozAnAFiMl08nuXK2J4vZ9vsDG4r5m08NyLy+MxXUnk=",
  "sha256-4KtmI6rWgtoNU0RlrE/DVpAcsdluZC0GwEY+osmvqO8=",
  "sha256-54M7f9EF7t4uVkwXSKRztXisUslxFBGBRhWMueOUukw=",
  "sha256-G+zQUXnwYvyXbqM/+nxazbU+422evUBh7lBBULCnL6o=",
  "sha256-GNzSG+JD+AGVSnl9kcoRwnnsq1NT0omKeO/8RT77Zz0=",
  "sha256-GUNlN1EIqBJGKoJRi4QUFUcwszQVtrA5ptGfmaSokWk=",
  "sha256-HL4hi0H+zBfJAKqprTeSYOQuNIYLI1/uNc1MU5+YJxs=",
  "sha256-HPj/LbwnRSygdZp1cAKo5zRXr2UztC0jXh9f8vI4GR4=",
  "sha256-HxQNaPSjKX4zIcVMwrlirBTYhmqHWr7A77Vfj5JwRh0=",
  "sha256-ILPMXQ+3vbtcQik5/VFgEcxdUMXLIYXEFRWpU/R7Wr4=",
  "sha256-JLxzOr25mlIlLAwHI7wblee+bEwHvInC99XQ4X6RmeQ=",
  "sha256-KYS1eP3FsrzLz96RL+xcmYPCu7Uhfmo3CL9GH5xv8SM=",
  "sha256-MG7DmAdfX2nIGhxQQ26ibYuR53Ql/QMZlqpcFJKM6ps=",
  "sha256-MjUAZkHhSUhTrEZseRfa/fXf+9ZTAHk24X9+EBW1FdY=",
  "sha256-MmZRF/Prb+4jtqcjMVaCHRUloHQCC8ntr3Qbmp1Px+A=",
  "sha256-MuUruypGhOa81dh/B1Bjhq5DXRZlbukLr4ugocqGUIk=",
  "sha256-Mxg7eiXKFbG/DnP5G+BmNRtzt4Xnt+YI4cPactdM8nM=",
  "sha256-NLYmXfYgqnHuuPCEZHKNTCdRqf3SZ2RLxukyjP+nhfg=",
  "sha256-NTDOTE2RBHaterAf8siX+b072QadVW7Nd59poSzLaag=",
  "sha256-NbaPXciJY+V1BiBoXGkVVQ0dj6dBwaFsi8TRmzNeITo=",
  "sha256-NmiCtvYkOF/KPwqF13tC2FgKHYMTovAal4/pHNPjr4s=",
  "sha256-NwHHwh+wFrq9jiPa6E9aJOW3tCvaPKCsj/RmNE5mEXw=",
  "sha256-OzJiiWKIh0cgBV2in+C+wcMyj9XlkKJT/fx0k3mEyOo=",
  "sha256-P+OvErb1BBDyaaezPzpXwOkwzFoeNMvEFmuBCchZMBs=",
  "sha256-P5YZvcwZy+zdAY9e714AkaF4XcNo9PChvTOR2FM3LzI=",
  "sha256-PS8GiiLtRW/LDKwgPmL0fGr2kddS98WuNMPQmn+ysNM=",
  "sha256-RY1JjHfUhCAZ/0FOcaq0tgVdPQDAss7XZnTWfNrDLk0=",
  "sha256-SMgGhWCMIe6hMCFwpbMb4wj9IvyRZBc6iYDeoqKtBCg=",
  "sha256-T5BTDsamdRv4rPYn/o1ekb3JZQNGAUcZG32XUHzFJXg=",
  "sha256-TP4XUMaLFfFpPEpyC7xi7gG/NeNexz/3ecrOWNHdhlM=",
  "sha256-VaWy8PtS6N9pwz8EXxXLzNe4nslRvZ733mSrtMxHpkI=",
  "sha256-ViGgnzUj7/4GmjIA3EwgWzZW3xGnue3By0Y0SAplFBQ=",
  "sha256-W1PMSMp061q45yl5W6fTzX0w9DKuSMQalmHasoGQvZw=",
  "sha256-WhmFk5Bq602xDLYrjYTBZyqPs9SQBZQheN6BGvZxAVk=",
  "sha256-YYHRNIwD9675647zoOoEO3kS5DreNftOVd6zmstn2Zc=",
  "sha256-YdBaQX1r+n4Zr+17Ro+m2nW0mCHWoZnOic5IEuyH2ss=",
  "sha256-Z4SG5jsWznPjAGkJi95QzVqpA4D9IVDVugErd7/WBIs=",
  "sha256-bSLvMlyGg9jpDdDlz9rhbhETrTchkkKEUWTFLXigMU8=",
  "sha256-bZzA//NqPrDEKDXREpr7va3++GCDPUk9+PPiNuuCdt4=",
  "sha256-bcxg30y/qI7+do/tSlFu9Qi8bzvv0es9JEAHXzf4j8I=",
  "sha256-cQPDPe3z/a2swjkrYaKfHrvI0j/UOObqdvcuH6GsIMk=",
  "sha256-d/yirliPDVbbNbEYPusiW0rxpbH+eYNCSAtTKLJwTUA=",
  "sha256-dElzpj6ZAg5tW86CQOJiHGoGf7OID7xMOekKoxqWX54=",
  "sha256-dG7hihC4b7RLN0UBG2t1/Pkk2s8vDOLJZZZStCi4+1Y=",
  "sha256-dss+CoNYf9ls00JNLDe1wZ2lXcFYw/DVc5SKXb1vAls=",
  "sha256-fRmv8ywVSsWU0Hi1+/28B7OHNyo5//3iiWJX8R3UAag=",
  "sha256-fe4cFKrvJZoSycKlO33mpw6czcbGJFS52Z39lPqu/AQ=",
  "sha256-gDbJtvFj2DMwuFZdBBUnOX6f3W1cRB7fH0+HLfQcmLQ=",
  "sha256-hZ2b8or6a07UTAHInng2oMn3OobewfoQBlfsTYLItRU=",
  "sha256-iscuYYSB81PTQYu8ed0wVjYjECLj4h2M3nHyN49PkGg=",
  "sha256-my7lmChJvGZAjxtr8iR6lSHRdwT/W10GHd9rCZ3qx28=",
  "sha256-nEnRyh4ubm09SmkXgbFLkn9jcKL2QAwYEEiomKCSaH8=",
  "sha256-ow+xRV1N/4kROvcamuOJi3gnaGrG05w6Z+HrvONwVlo=",
  "sha256-qUxb/MmsUtNGb9ZD952CCjDWiZKleteqLD3UWvCSGPE=",
  "sha256-rBL0PN78SJSNNev7As5kIWYPL9Tnpdm5O7XW3pkHdrc=",
  "sha256-tL06TjhrBnjcVeK3vyLPYFfFW1Hwx8I3oFQ5zC8ml8k=",
  "sha256-u1jBsBUcuemmNvUcavjlIWYLPBz3JO5GOeq0D3eu92w=",
  "sha256-vDgcCs2ZtyJHZ9SAIj/lExwX80UKM4VvO+22y8Cnao8=",
  "sha256-vOhM5Sr087MCqZBcYtJz61I+X0RZlmZA2ysJk7xJb2Y=",
  "sha256-vZnDzfWFe/3EonS42AgTWkj3/YDvij3ttuzF5E5wTaI=",
  "sha256-voAHiu5C2mwoj653S0ab/1e2+E+vauzGOqaOPY2KvXc=",
  "sha256-wGyshhOsJpT3vTN0XdY2pCU4uKx5+yKGrAcRvSbnSwA=",
  "sha256-zKxCef1pMhu2xyRIngYj06OcbCHM3Ky0YOkIRQuWXU4=",
  "sha256-zi2UeItvAYkd1qMVdj3BwXFJ5aXCKsvGffc0qO7D9Ms=",
];

const STYLE_HASHES = [
  "sha256-13ibskFxM+oBG1GOKCF2RlES6jq9ZsjpijA1hToibN8=",
  "sha256-1nPELemA6W56auTRzuELYIQ0Y00KXwgS7Pvn+J0V+a8=",
  "sha256-7nRJxaCwAoBm8Q2TIPJM3lvz0i93AW46r4kGfzixCRs=",
  "sha256-7nqvFdWleb7/odg040lroiCRBGOv/wdF/XovVUCj8cg=",
  "sha256-9XU+CCn2ChnNIRTRTh07hhVp4LP/1LDAkxxNCCrq1h0=",
  "sha256-GTC/lXr2VTbpywnjx1XeVE2pAkjoffLGC64hdPRQdPs=",
  "sha256-KNZQJoVLSiFjV9VT7nzhG+ER4g0oTxH1hZE/cta1clw=",
  "sha256-LFmGeFVusYQPLmvA2CSIZLalqovfUCd8Xkzg1W+XZ5Y=",
  "sha256-S26/GwbJjQlPbph9YoO29JMyt+6+c+m8lETNQT2O1nc=",
  "sha256-ShRMijwkimCMuHyoN56AKwZ722R7iGcqpEvAAUvtg+8=",
  "sha256-Sqr3A3nF2rYpiE1yGXW9/oX69QxkIJNIt+ZCF4BCa4Y=",
  "sha256-YEph6qo0neaQwZAiVE/stU9OWGO5DyeYPRP/tdmCFuI=",
  "sha256-doXDWDnFtR++rkKHwPPnw6kUf5ilZjfH1br6DHIaVe0=",
  "sha256-he/U2UugO0I/zdHSoWJVnm8TCLC73TbZGeE6QSho6HE=",
  "sha256-lWVMuCo0MpbjLXrbx+ZgF9cPY+Svag7Szm0eitGBmk4=",
  "sha256-tkldcovVxCmq7Hv0c/JoqM+RBZHndsHIZ3gvmp2X4mY=",
  "sha256-z78aRRwtiALpgnA2EoaF9e3HCbQY2wxXnsM3vLqf0ww=",
];

const SCRIPT_HASH_LIST = SCRIPT_HASHES.map((h) => `'${h}'`).join(" ");
const STYLE_HASH_LIST = STYLE_HASHES.map((h) => `'${h}'`).join(" ");

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${SCRIPT_HASH_LIST} https://www.googletagmanager.com https://valentina.pymewebpro.com`,
  // style-src is now hash-locked. All inline style="..." attributes have been
  // refactored to .u-* utility classes (see end of each page's <style> block).
  // Adding a new inline <style> block or editing an existing one means the
  // SHA-256 changes , recompute STYLE_HASHES per the maintenance script above.
  // If you absolutely must add a one-off inline style="" attribute, you can
  // either (a) refactor it to a utility class, or (b) add 'unsafe-hashes'
  // here plus a per-attribute hash (the latter is brittle, prefer option a).
  `style-src 'self' ${STYLE_HASH_LIST} https://fonts.googleapis.com https://valentina.pymewebpro.com`,
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://images.pexels.com https://www.google-analytics.com",
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
