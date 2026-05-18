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
  "sha256-8hU6ObIYJsYrtNOppSl3brqzWGNdAIdGve0ACCSMpaY=",
  "sha256-9k0WLGsb1QYKByMOK23HWMVGqGYhykaqb7CimTskxhk=",
  "sha256-EuAjbYN43Kr9ty3ZALOmbRpvy075XFXaM3/rQrD5t7s=",
  "sha256-HL4hi0H+zBfJAKqprTeSYOQuNIYLI1/uNc1MU5+YJxs=",
  "sha256-ILPMXQ+3vbtcQik5/VFgEcxdUMXLIYXEFRWpU/R7Wr4=",
  "sha256-MmZRF/Prb+4jtqcjMVaCHRUloHQCC8ntr3Qbmp1Px+A=",
  "sha256-MuUruypGhOa81dh/B1Bjhq5DXRZlbukLr4ugocqGUIk=",
  "sha256-NTDOTE2RBHaterAf8siX+b072QadVW7Nd59poSzLaag=",
  "sha256-NmiCtvYkOF/KPwqF13tC2FgKHYMTovAal4/pHNPjr4s=",
  "sha256-OzJiiWKIh0cgBV2in+C+wcMyj9XlkKJT/fx0k3mEyOo=",
  "sha256-P+OvErb1BBDyaaezPzpXwOkwzFoeNMvEFmuBCchZMBs=",
  "sha256-Quf8ZNCgSebhrNXqVHwXCUawvG+GKteyyseZwqdlWnY=",
  "sha256-Sn7UcbPkOescUSg9puuba5bXAOQ1eEaxH4ZPgvD0jic=",
  "sha256-THjKt27L85Hl4qGekc9SjRewD4OWry3MafdZgeB7EvQ=",
  "sha256-TfY2ErKfpmqjgjSfu2REipjwge7kCqO/ufFpisrPah4=",
  "sha256-VaWy8PtS6N9pwz8EXxXLzNe4nslRvZ733mSrtMxHpkI=",
  "sha256-YYHRNIwD9675647zoOoEO3kS5DreNftOVd6zmstn2Zc=",
  "sha256-YdBaQX1r+n4Zr+17Ro+m2nW0mCHWoZnOic5IEuyH2ss=",
  "sha256-bB3ycjISsXJKFpaVaGQuniFPsjitCvia9HK5+R3hjO0=",
  "sha256-bZzA//NqPrDEKDXREpr7va3++GCDPUk9+PPiNuuCdt4=",
  "sha256-bcxg30y/qI7+do/tSlFu9Qi8bzvv0es9JEAHXzf4j8I=",
  "sha256-brRz9xfJkK18m8/NfIVIIJdfavPHpsBI0H/umkorjrY=",
  "sha256-cQPDPe3z/a2swjkrYaKfHrvI0j/UOObqdvcuH6GsIMk=",
  "sha256-d/yirliPDVbbNbEYPusiW0rxpbH+eYNCSAtTKLJwTUA=",
  "sha256-dElzpj6ZAg5tW86CQOJiHGoGf7OID7xMOekKoxqWX54=",
  "sha256-dss+CoNYf9ls00JNLDe1wZ2lXcFYw/DVc5SKXb1vAls=",
  "sha256-g7NaPHSwiYAqqmC67jZOlK1LuYOJgTt6uoBsC70D/Kw=",
  "sha256-m3fYncpfJoqFmsCHb6fJv8m9cPTJ1MWCh1eLz4DfUfc=",
  "sha256-my7lmChJvGZAjxtr8iR6lSHRdwT/W10GHd9rCZ3qx28=",
  "sha256-qUxb/MmsUtNGb9ZD952CCjDWiZKleteqLD3UWvCSGPE=",
  "sha256-rBL0PN78SJSNNev7As5kIWYPL9Tnpdm5O7XW3pkHdrc=",
  "sha256-vOhM5Sr087MCqZBcYtJz61I+X0RZlmZA2ysJk7xJb2Y=",
  "sha256-vZnDzfWFe/3EonS42AgTWkj3/YDvij3ttuzF5E5wTaI=",
  "sha256-xHCrWYQwAgPuc5F8qcQ9E70ZbDl57mS1ghQrEbsoehY=",
  "sha256-zi2UeItvAYkd1qMVdj3BwXFJ5aXCKsvGffc0qO7D9Ms=",
  "sha256-zvYh90qcVjowS4rE14kf/Yl+4PHVyx/im6hq6Y9SxbI=",
];

const STYLE_HASHES = [
  "sha256-13ibskFxM+oBG1GOKCF2RlES6jq9ZsjpijA1hToibN8=",
  "sha256-1nPELemA6W56auTRzuELYIQ0Y00KXwgS7Pvn+J0V+a8=",
  "sha256-7nRJxaCwAoBm8Q2TIPJM3lvz0i93AW46r4kGfzixCRs=",
  "sha256-KNZQJoVLSiFjV9VT7nzhG+ER4g0oTxH1hZE/cta1clw=",
  "sha256-LFmGeFVusYQPLmvA2CSIZLalqovfUCd8Xkzg1W+XZ5Y=",
  "sha256-S26/GwbJjQlPbph9YoO29JMyt+6+c+m8lETNQT2O1nc=",
  "sha256-Sqr3A3nF2rYpiE1yGXW9/oX69QxkIJNIt+ZCF4BCa4Y=",
  "sha256-YEph6qo0neaQwZAiVE/stU9OWGO5DyeYPRP/tdmCFuI=",
  "sha256-he/U2UugO0I/zdHSoWJVnm8TCLC73TbZGeE6QSho6HE=",
  "sha256-htiNmIWK5S3SNoQbtC+k0ZpXAVSmYElvOwiti3ajUnw=",
  "sha256-lQmJkGn3a3qpgpXIzokJvMuw0FtWD+Sb7ZdaEXT+faY=",
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

export const onRequest = async (context) => {
  const response = await context.next();
  const ct = response.headers.get("content-type") || "";
  // Only attach CSP to HTML documents. Stylesheets, images, JSON, etc.
  // don't need it and stripping the header keeps cache entries small.
  if (!ct.includes("text/html")) return response;

  // Clone response so we can mutate headers (response.headers is immutable
  // when returned from context.next() in some runtime versions).
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);

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
