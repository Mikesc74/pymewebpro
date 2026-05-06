// Pages middleware — sets Content-Security-Policy on every HTML response.
//
// Why this lives here, not in _headers:
//
// Cloudflare Pages enforces a per-header-value byte limit on _headers entries
// (~2000 chars). Our CSP value is ~2100+ chars because it hash-locks every
// inline <script> across the site (34 unique sha256 hashes at last count).
// CF Pages silently strips oversized values, so a CSP defined in _headers
// never reaches the wire. Pages Functions have no such limit.
//
// Everything else (HSTS, X-Frame-Options, Permissions-Policy, COOP, CORP,
// Referrer-Policy, X-Content-Type-Options, cache rules) stays in _headers
// because those values fit comfortably.
//
// CSP HASH MAINTENANCE: when an inline <script> body changes (whitespace
// counts), recompute hashes for every HTML file under the repo root and
// update SCRIPT_HASHES below. The script that emits the list:
//
//   python3 -c "import re,hashlib,base64,glob,os,json; \
//   files=['index.html','es/index.html','terminos.html','politica-de-datos.html','hosting.html']+sorted(glob.glob('sitio-web-*/index.html')); \
//   hashes=set(); \
//   [hashes.add('sha256-'+base64.b64encode(hashlib.sha256(m.group(2).encode()).digest()).decode()) \
//     for f in files if os.path.exists(f) for m in re.finditer(r'<script(\s[^>]*)?>(.*?)</script>', open(f).read(), re.DOTALL) \
//     if 'src=' not in (m.group(1) or '') and m.group(2).strip()]; \
//   print(json.dumps(sorted(hashes), indent=2))"

const SCRIPT_HASHES = [
  "sha256-6gt3qBAc1TjJNlWg3bip8EBQD5AdnLnjWSHY/2uaX24=",
  "sha256-6o4RcIgyfc5UPTW6IkpOXoxUOCQ6pnCwwzHiShQn4PE=",
  "sha256-9GIHlcCxqhxCsTQ9GzaxQhDa6AAm5+gaYgcFwZ5X7tY=",
  "sha256-DYDqBiY2eQmiAdcVr/lhPyPlfdxjcR5kotO/GOGpwd0=",
  "sha256-EHFj0jeeky9W2Ei6oF3Fg7F3imE7aI+9vxXhuK8EGOo=",
  "sha256-GPipV/xR5Er6ctMZXrovSSESxUyMyZiaCA5E9vuSWTs=",
  "sha256-I4ODCvCv2kH4C8QMonIRib3emcwyO69XGYW2HMXAJko=",
  "sha256-IoVbTk5ntEIfUH5VZZvTsE/S+QSJ5WCQqrOhXdCnZds=",
  "sha256-Lwledmw/HilVT+zr3NN4vTeaIYtIsewLyyHbFMHF3cg=",
  "sha256-O7yTh7jvxYkTMyxoFvPbm3tGxDKQtZmGHJxCzjF2t2M=",
  "sha256-QaOqQAfmxfpxHRtvX9IRq9/yyPyDC2ZwyyXPteunX2w=",
  "sha256-RC9oTX6XdtLsxQg7VV1XK2bkiN2/+7DglkP6sb+nGVw=",
  "sha256-RHdSg17RQrYS3zk8gb3aP97P5MNDX5J2W11vKAXBZns=",
  "sha256-TZZsp2Il/xsbOfsEXmqX5Pq6HNkx+6Rln8ciaXhGrb0=",
  "sha256-TfY2ErKfpmqjgjSfu2REipjwge7kCqO/ufFpisrPah4=",
  "sha256-VaWy8PtS6N9pwz8EXxXLzNe4nslRvZ733mSrtMxHpkI=",
  "sha256-Y4PVBUaXvX8m58rzZS3JCff033KFVV7zy1ZAjl1jiLs=",
  "sha256-YxZU7wsEBfSpa5yK72Z5vHv4nqsp1row70HzkPdrmrc=",
  "sha256-altb7fLp1/RpkV4r8roH4lTA8ORqjHv5NheEktPcFPU=",
  "sha256-dss+CoNYf9ls00JNLDe1wZ2lXcFYw/DVc5SKXb1vAls=",
  "sha256-fl6+vGA2KV1gtvbSw2x6/LjIHf5uB7kecW6sEBI9G3Y=",
  "sha256-iLxhcygx6d0yAEPxIDRZ3eY35idrUK0n2DpYEd4Juyo=",
  "sha256-lEG6LhcsPECK7uDWdBWtjndcg9BXZ54HMF8INACSKDI=",
  "sha256-md6GiOK9/4dujSiYpnsQkwfUj285qoL+kzLrOdsyuBE=",
  "sha256-n8QNKzmgolnNVayDI+BBSIPtKi/SyinNTg1RCAJSpaQ=",
  "sha256-rWFB3t/iDfofT3ogSqeEebp3+8u6zPJt+3DtDnSgZb4=",
  "sha256-rk1861BuiQl9jNIPJfFX8YnAlg3Ybm+849U59BwiP2k=",
  "sha256-vDDi3ZJn8gcNAY6CfcfYdL654PhkerHHjGuKUN5IKBQ=",
  "sha256-w6D8KavAo8iFp77Dg1oxo72/6NoYuhYIF45MNv15Fc4=",
  "sha256-x6Q/pBtWHKjI2Dp3gpHbudwnDwfROt6VStAfB0GlHXE=",
  "sha256-xAbORcxQXe9UbVWDpbpsY/przpkWb2K5ETIugpa56t0=",
  "sha256-xIPiZc9NYVb8zVoj8xiw9kh+MWSz1+MNyPze8L4MuJM=",
  "sha256-yBfv3MY7QauuZoRqIDwB8BtAh8Mp7fJkYno3cA2WP88=",
  "sha256-ynRNbHwHTfiwBGWnXuWodj7kRSMnY+4WH4bw6nt+/HM=",
];

const SCRIPT_HASH_LIST = SCRIPT_HASHES.map((h) => `'${h}'`).join(" ");

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${SCRIPT_HASH_LIST}`,
  // style-src kept at 'unsafe-inline' deliberately. Each page has its own
  // inline <style> block (24+ unique style hashes across the site), and
  // every CSS edit would require recomputing all of them. The XSS exfil
  // vector for inline styles is `background: url(attacker)`, already
  // closed by `img-src 'self' data:`. All inline style= attrs have been
  // refactored to utility classes.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://images.pexels.com",
  "connect-src 'self'",
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
  // asset by default. Strip it from HTML — these pages never need to be
  // read cross-origin, and a wide-open ACAO is a recurring SSL-Labs ding.
  headers.delete("Access-Control-Allow-Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
