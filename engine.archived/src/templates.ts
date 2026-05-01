// Shared HTML chrome for the portal pages.

const baseCss = `
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#fbfaf6;color:#0a1840;line-height:1.5}
a{color:#003893}
.wrap{max-width:880px;margin:0 auto;padding:32px 20px}
.card{background:#fff;border:1px solid #e5e0c9;border-radius:14px;padding:24px;margin-bottom:18px;box-shadow:0 12px 30px -22px rgba(10,24,64,.25)}
h1,h2,h3{margin:0 0 12px;font-family:Georgia,serif;letter-spacing:-.01em}
h1{font-size:1.9rem}
h2{font-size:1.4rem}
label{display:block;font-weight:600;margin:14px 0 6px;font-size:.92rem}
input[type=text],input[type=email],input[type=tel],input[type=url],input[type=number],input[type=password],textarea,select{
  width:100%;padding:10px 12px;border:1px solid #d8d2bd;border-radius:8px;font:inherit;background:#fff
}
textarea{min-height:90px;resize:vertical}
.btn{display:inline-block;padding:10px 18px;border-radius:8px;background:#003893;color:#fff;border:0;font-weight:600;cursor:pointer;text-decoration:none}
.btn.ghost{background:#fff;color:#003893;border:1px solid #003893}
.btn.red{background:#ce1126}
.row{display:flex;gap:12px;flex-wrap:wrap}
.row > *{flex:1;min-width:200px}
.muted{color:#5e6883}
.tag{display:inline-block;padding:3px 9px;border-radius:999px;background:#e3eaf7;color:#003893;font-size:.78rem;font-weight:600}
.tag.ok{background:#dff5e3;color:#0e6b2c}
.tag.warn{background:#fff0c4;color:#7a5a00}
table{width:100%;border-collapse:collapse}
td,th{padding:10px 8px;border-bottom:1px solid #eee5cc;text-align:left;font-size:.92rem}
small{color:#5e6883}
.flash{padding:10px 14px;border-radius:8px;margin-bottom:14px}
.flash.ok{background:#dff5e3;color:#0e6b2c}
.flash.err{background:#ffd9de;color:#a30d1f}
`;

export function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>${baseCss}</style>
</head><body><div class="wrap">${body}</div></body></html>`;
}
