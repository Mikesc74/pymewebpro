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
  "sha256-6gt3qBAc1TjJNlWg3bip8EBQD5AdnLnjWSHY/2uaX24=",
  "sha256-6o4RcIgyfc5UPTW6IkpOXoxUOCQ6pnCwwzHiShQn4PE=",
  "sha256-6pvnh+ggR3rx0+ejxtKOU65Sxdh/sJH/E83Fe2SGYSk=",
  "sha256-8hU6ObIYJsYrtNOppSl3brqzWGNdAIdGve0ACCSMpaY=",
  "sha256-9GIHlcCxqhxCsTQ9GzaxQhDa6AAm5+gaYgcFwZ5X7tY=",
  "sha256-9k0WLGsb1QYKByMOK23HWMVGqGYhykaqb7CimTskxhk=",
  "sha256-DYDqBiY2eQmiAdcVr/lhPyPlfdxjcR5kotO/GOGpwd0=",
  "sha256-EHFj0jeeky9W2Ei6oF3Fg7F3imE7aI+9vxXhuK8EGOo=",
  "sha256-G1fQscijotj/WOav7dPpGbDgxCVEMgSsbCOmFcMdfUc=",
  "sha256-HL4hi0H+zBfJAKqprTeSYOQuNIYLI1/uNc1MU5+YJxs=",
  "sha256-I4ODCvCv2kH4C8QMonIRib3emcwyO69XGYW2HMXAJko=",
  "sha256-IoVbTk5ntEIfUH5VZZvTsE/S+QSJ5WCQqrOhXdCnZds=",
  "sha256-JTsXmOv3uYKYL41TVe3Zz2n3WZNfRdXXf5YXaN/QzrY=",
  "sha256-LpbTEZI3dwpGgb+CsdYg3mm+1TYgRNJHigWFVgxF4B8=",
  "sha256-Lwledmw/HilVT+zr3NN4vTeaIYtIsewLyyHbFMHF3cg=",
  "sha256-MmZRF/Prb+4jtqcjMVaCHRUloHQCC8ntr3Qbmp1Px+A=",
  "sha256-Mod8y7DTfPt8cmH3m/o7jRyUEO8mcAGMYXOdsNphfbs=",
  "sha256-MuUruypGhOa81dh/B1Bjhq5DXRZlbukLr4ugocqGUIk=",
  "sha256-NpHhfL/CmdYIdRVUdwNORD8RUzELR/JC6OeX2mzFjDo=",
  "sha256-P+OvErb1BBDyaaezPzpXwOkwzFoeNMvEFmuBCchZMBs=",
  "sha256-RHdSg17RQrYS3zk8gb3aP97P5MNDX5J2W11vKAXBZns=",
  "sha256-TNBnH/pWuVPiwy5KwDjIZN+tRYSHBndR7/73nBgnHfU=",
  "sha256-TfY2ErKfpmqjgjSfu2REipjwge7kCqO/ufFpisrPah4=",
  "sha256-VaWy8PtS6N9pwz8EXxXLzNe4nslRvZ733mSrtMxHpkI=",
  "sha256-Y4PVBUaXvX8m58rzZS3JCff033KFVV7zy1ZAjl1jiLs=",
  "sha256-YFdQSLPZ8VN8Ysflt1sxfAGoFlkBruHfueA43jctF7A=",
  "sha256-YUvzmIAHZDwoA7xLNpBJlOWZ3z1uPCKvSGb6xY/HpuM=",
  "sha256-YdBaQX1r+n4Zr+17Ro+m2nW0mCHWoZnOic5IEuyH2ss=",
  "sha256-YxZU7wsEBfSpa5yK72Z5vHv4nqsp1row70HzkPdrmrc=",
  "sha256-altb7fLp1/RpkV4r8roH4lTA8ORqjHv5NheEktPcFPU=",
  "sha256-bB3ycjISsXJKFpaVaGQuniFPsjitCvia9HK5+R3hjO0=",
  "sha256-bIhQW4enP9e7kiwG1k4tNyRfDdqq5z4tXq5oesg2pUo=",
  "sha256-bcxg30y/qI7+do/tSlFu9Qi8bzvv0es9JEAHXzf4j8I=",
  "sha256-csi/5pQ/XKA3Us4LC2FlE1c4S7lrRWs3bX8aPH5dNds=",
  "sha256-d/yirliPDVbbNbEYPusiW0rxpbH+eYNCSAtTKLJwTUA=",
  "sha256-dss+CoNYf9ls00JNLDe1wZ2lXcFYw/DVc5SKXb1vAls=",
  "sha256-fl6+vGA2KV1gtvbSw2x6/LjIHf5uB7kecW6sEBI9G3Y=",
  "sha256-g7NaPHSwiYAqqmC67jZOlK1LuYOJgTt6uoBsC70D/Kw=",
  "sha256-iLxhcygx6d0yAEPxIDRZ3eY35idrUK0n2DpYEd4Juyo=",
  "sha256-kOUodk+OasLL+5p9LFkJ+hyGL35e9EL+9GVhrE1sw9c=",
  "sha256-lEG6LhcsPECK7uDWdBWtjndcg9BXZ54HMF8INACSKDI=",
  "sha256-md6GiOK9/4dujSiYpnsQkwfUj285qoL+kzLrOdsyuBE=",
  "sha256-n8QNKzmgolnNVayDI+BBSIPtKi/SyinNTg1RCAJSpaQ=",
  "sha256-pEhVG24++1MMM1pp/67N8pCFmbl4FRCpr7ftVXr4M3Y=",
  "sha256-qePrVM6EfJsP8v9OY+6lsPFFtbBGGf93QrqU792konw=",
  "sha256-rk1861BuiQl9jNIPJfFX8YnAlg3Ybm+849U59BwiP2k=",
  "sha256-vDDi3ZJn8gcNAY6CfcfYdL654PhkerHHjGuKUN5IKBQ=",
  "sha256-vOhM5Sr087MCqZBcYtJz61I+X0RZlmZA2ysJk7xJb2Y=",
  "sha256-vZnDzfWFe/3EonS42AgTWkj3/YDvij3ttuzF5E5wTaI=",
  "sha256-w6D8KavAo8iFp77Dg1oxo72/6NoYuhYIF45MNv15Fc4=",
  "sha256-wnIgqXukMptaE1t+eH3tWU0KCaqKGHbavIe04U71lAs=",
  "sha256-x6Q/pBtWHKjI2Dp3gpHbudwnDwfROt6VStAfB0GlHXE=",
  "sha256-xAbORcxQXe9UbVWDpbpsY/przpkWb2K5ETIugpa56t0=",
  "sha256-xHCrWYQwAgPuc5F8qcQ9E70ZbDl57mS1ghQrEbsoehY=",
  "sha256-xIPiZc9NYVb8zVoj8xiw9kh+MWSz1+MNyPze8L4MuJM=",
  "sha256-xbVfoqFy0rH1/aBlOjvChz/b6nh7mVIndGIKhb4MJR8=",
  "sha256-yZ6BTF+LcAzKu1ePYWyLnst6kPoIoQ08GM79IDElqV0=",
  "sha256-ynRNbHwHTfiwBGWnXuWodj7kRSMnY+4WH4bw6nt+/HM="
];

const STYLE_HASHES = [
  "sha256-/FWfTFNCO3lqeDTtpSsp7XeIzTNAAaNUmcKtoNE/8D0=",
  "sha256-13ibskFxM+oBG1GOKCF2RlES6jq9ZsjpijA1hToibN8=",
  "sha256-1TTnTUCjeZWiPDfrIjDULGo9WtgYLhpdm4OO+728ihk=",
  "sha256-1nPELemA6W56auTRzuELYIQ0Y00KXwgS7Pvn+J0V+a8=",
  "sha256-2HqC71FssKaGjis9lPFPRlq1Yb99UiJaoD1kWvGhTA0=",
  "sha256-2JkVYTMbWJoiLbMcWr3NLu6kmOb6pDbJkcVGvAA+/a0=",
  "sha256-2k5lFDSA1d3pNH0uN1sn3FJ7AdATplEyhDPdwvq/GrU=",
  "sha256-3DcMn2WmeWPgq2jmGnlrYpR6Rts7gPFf+tKxJ7uMuUQ=",
  "sha256-3kjAJe+gQsyD6UXLWQVgZaszD7z2GXblbFCktZwvBoc=",
  "sha256-5qVs8rN9R+cJmCDt6bmWYUZr7rHy1WHnnGyJkZ6O5rQ=",
  "sha256-7nRJxaCwAoBm8Q2TIPJM3lvz0i93AW46r4kGfzixCRs=",
  "sha256-BieLMX0wc5nlJlx75bF5yd6Wt518yLVd6jwvYKYjGmI=",
  "sha256-DRPx7MgVdZEcvzrXVL5kc4AzhqrKxQf+pqjbN215TUE=",
  "sha256-IUnkZKM7Le39aCghCslwtvOJUJthKDQxiQrhj9LH2lk=",
  "sha256-KNZQJoVLSiFjV9VT7nzhG+ER4g0oTxH1hZE/cta1clw=",
  "sha256-MlA0YBr6gyCa4GqLpDuhPYTkR3A8fL/KcMY8qGJxby8=",
  "sha256-S26/GwbJjQlPbph9YoO29JMyt+6+c+m8lETNQT2O1nc=",
  "sha256-Sqr3A3nF2rYpiE1yGXW9/oX69QxkIJNIt+ZCF4BCa4Y=",
  "sha256-TLrw00ljrj/n2ir7nhs9LDue+0qPE7dew3qvvNYPG5c=",
  "sha256-YEph6qo0neaQwZAiVE/stU9OWGO5DyeYPRP/tdmCFuI=",
  "sha256-YsvcdoHqT1NFJQnCwWJcCKk20nUsFCnOZF825Aj+yPE=",
  "sha256-cFAML3pIvp0/lVw+jCpSp30fxEHkPvwYlCgvusSe3r0=",
  "sha256-kWSWu6DAfe3R9lbzNDix1dG4V3zrwShZMGBIeMyHPoA=",
  "sha256-mmhqnLP17QjDwYhGyIbRoeNK8MGINCq3zEwSPw67vJ4=",
  "sha256-n/V9ozr2Ffdr1konOiT+8GodcH4FJHdQRYfEkP049CE=",
  "sha256-tkldcovVxCmq7Hv0c/JoqM+RBZHndsHIZ3gvmp2X4mY=",
  "sha256-v6XeoMK6fY1n+abRDvtp28lqzX7ii2v1wWXSchncGVQ="
];

const SCRIPT_HASH_LIST = SCRIPT_HASHES.map((h) => `'${h}'`).join(" ");
const STYLE_HASH_LIST = STYLE_HASHES.map((h) => `'${h}'`).join(" ");

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${SCRIPT_HASH_LIST} https://www.googletagmanager.com`,
  // style-src is now hash-locked. All inline style="..." attributes have been
  // refactored to .u-* utility classes (see end of each page's <style> block).
  // Adding a new inline <style> block or editing an existing one means the
  // SHA-256 changes , recompute STYLE_HASHES per the maintenance script above.
  // If you absolutely must add a one-off inline style="" attribute, you can
  // either (a) refactor it to a utility class, or (b) add 'unsafe-hashes'
  // here plus a per-attribute hash (the latter is brittle, prefer option a).
  `style-src 'self' ${STYLE_HASH_LIST} https://fonts.googleapis.com`,
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://images.pexels.com https://www.google-analytics.com",
  "connect-src 'self' https://portal.pymewebpro.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com",
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
