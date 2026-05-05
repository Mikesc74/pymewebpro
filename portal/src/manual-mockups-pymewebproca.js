// manual-mockups-pymewebproca.js — auto-rebuilt by scripts/rebuild-mockups.mjs
// Source: manual-mockups/pymewebpro-ca/index.html
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["pymewebpro-ca"].

export const pymewebproCaHtml = `
<!doctype html>
<html lang="en" class="lang-en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>PymeWebPro, Custom websites for Canadian businesses · From $500 CAD · Built on Cloudflare</title>
<meta name="description" content="Canadian-owned web studio building enterprise-grade custom sites for North American small businesses. Hand-built on Cloudflare, deployed in 48 hours, sub-1-second load times. Starting at $500 CAD. Based in Medellín, leveraging Anthropic AI to deliver agency-quality work without the agency markup.">
<meta name="theme-color" content="#0A0A0B">
<meta property="og:title" content="PymeWebPro, Enterprise web studio at SMB pricing">
<meta property="og:description" content="Custom sites for Canadian businesses, $500 CAD. Cloudflare hosted, sub-1s load, Lighthouse 100. Canadian-owned, Medellín-based, AI-leveraged.">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%230A0A0B%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-family%3D%22ui-monospace%2CSFMono-Regular%2CMenlo%2Cmonospace%22%20font-size%3D%2218%22%20font-weight%3D%22600%22%20fill%3D%22%23FAFAF7%22%3E%3Ctspan%20fill%3D%22%23FF5C2E%22%3E%26lt%3B%3C/tspan%3Epwp%3Ctspan%20fill%3D%22%23FF5C2E%22%3E/%26gt%3B%3C/tspan%3E%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;max-width:100%}
:root{
  --bg:#FFFFFF;
  --paper:#FAF9F6;
  --soft:#F4F2ED;
  --ink:#0A0A0B;
  --smoke:#1F1F22;
  --slate:#52525B;
  --gray:#8B8B92;
  --line:#E8E8EA;
  --line-soft:#F0F0F2;
  --accent:#FF5C2E;
  --accent-deep:#E84A1E;
  --accent-soft:#FFE9E0;
  --tech:#0066FF;
  --green:#00B779;
  --display:'Inter Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --max:1280px;
  --gutter:clamp(20px,4vw,52px);
  --r:10px;
  --r-sm:6px;
}
body{
  font-family:var(--sans);
  background:var(--bg);
  color:var(--ink);
  font-size:15px;
  line-height:1.6;
  font-weight:400;
  overflow-x:hidden;
}
a{color:inherit;text-decoration:none}
img,svg{max-width:100%;display:block}
button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit}
.container{max-width:var(--max);margin:0 auto;padding-left:var(--gutter);padding-right:var(--gutter)}
h1,h2,h3,h4,h5{font-family:var(--display);color:var(--ink);font-weight:700;letter-spacing:-0.025em}
.eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--mono);font-size:12px;font-weight:500;letter-spacing:0.04em;color:var(--slate);
  padding:5px 11px;border:1px solid var(--line);border-radius:999px;background:var(--bg);
}
.eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0}
.eyebrow .dot.live{background:var(--green);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}


/* ─── Bilingual switching ──────────────────────────── */
html.lang-en .ml-es,html.lang-es .ml-en{display:none!important}
.lang-toggle{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--bg);font-family:var(--mono);font-size:11px;letter-spacing:0.04em;font-weight:600;flex-shrink:0;margin-right:6px}
.lang-toggle button{padding:5px 11px;border-radius:999px;background:transparent;color:var(--gray);cursor:pointer;border:0;font:inherit;letter-spacing:inherit;font-weight:inherit;transition:all .2s}
html.lang-en .lang-toggle button[data-l="en"],html.lang-es .lang-toggle button[data-l="es"]{background:var(--ink);color:#fff}

/* Two-locations footer block */
.locations{display:grid;grid-template-columns:repeat(2,1fr);gap:30px;padding:28px 0;margin-top:24px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.locations .loc{display:flex;align-items:flex-start;gap:14px}
.locations .loc .ico{width:36px;height:36px;border-radius:50%;background:var(--accent-soft);color:var(--accent-deep);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:0.04em}
.locations .loc .h{font-family:var(--display);font-weight:700;font-size:14.5px;color:var(--ink);letter-spacing:-0.01em}
.locations .loc .city{font-family:var(--mono);font-size:11.5px;color:var(--slate);font-weight:500;letter-spacing:0.04em;margin-top:3px;text-transform:uppercase}
.locations .loc .role{font-size:13px;color:var(--slate);margin-top:6px;line-height:1.5}
@media (max-width:680px){.locations{grid-template-columns:1fr;gap:18px}}

/* ─── Top bar ───────────────────────────────────────── */
.topbar{
  background:var(--ink);color:rgba(255,255,255,0.85);
  padding:9px 20px;text-align:center;
  font-family:var(--mono);font-size:11.5px;letter-spacing:0.04em;font-weight:400;
}
.topbar strong{color:#fff;font-weight:500}
.topbar .accent{color:var(--accent)}
.topbar .sep{opacity:0.3;margin:0 12px}
@media (max-width:680px){.topbar .sep{display:none}.topbar{font-size:11px}}

/* ─── Header ─────────────────────────────────────────── */
.header{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,0.85);
  backdrop-filter:blur(20px) saturate(160%);
  -webkit-backdrop-filter:blur(20px) saturate(160%);
  border-bottom:1px solid var(--line);
}
.header-inner{
  max-width:var(--max);margin:0 auto;
  padding:14px var(--gutter);
  display:flex;align-items:center;gap:30px;
}
.logo{
  display:inline-flex;align-items:baseline;gap:0;flex-shrink:0;
  font-family:var(--display);font-weight:700;font-size:20px;color:var(--ink);
  letter-spacing:-0.024em;line-height:1;
  transition:opacity .15s;
}
.logo:hover{opacity:0.7}
.logo .br{
  font-family:var(--mono);font-weight:500;color:var(--gray);
  letter-spacing:0;font-size:0.92em;
  transition:color .2s;
}
.logo:hover .br{color:var(--accent)}
.logo .word{
  font-family:var(--display);font-weight:700;color:var(--ink);
  letter-spacing:-0.024em;
  margin:0 1.5px;
}
footer .logo .word{color:var(--ink)}
footer .logo .br{color:var(--gray)}
.nav{display:flex;align-items:center;gap:28px;margin-left:auto}
.nav a{
  font-size:14px;font-weight:500;color:var(--smoke);
  transition:color .15s;
}
.nav a:hover{color:var(--accent-deep)}
.cta{
  display:inline-flex;align-items:center;gap:8px;
  padding:9px 18px;border-radius:8px;
  background:var(--ink);color:#fff;
  font-size:13.5px;font-weight:600;letter-spacing:-0.005em;
  transition:all .15s;
}
.cta:hover{background:var(--accent);transform:translateY(-1px)}
.cta .arrow{font-family:var(--mono);font-size:14px}
.nav .navlinks{display:flex;gap:28px;align-items:center}
@media (max-width:980px){
  .nav{display:none}
}

/* ─── Hero ─────────────────────────────────────────── */
.hero{
  padding:clamp(60px,8vw,110px) 0 clamp(50px,6vw,80px);
  position:relative;overflow:hidden;
  background:
    radial-gradient(ellipse 800px 400px at 50% 100%, rgba(255,92,46,0.06) 0%, transparent 70%),
    var(--bg);
}
.hero-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:flex;flex-direction:column;align-items:center;text-align:center;gap:0;
}
.hero .eyebrow{margin-bottom:28px}
.hero h1{
  font-family:var(--display);font-weight:700;
  font-size:clamp(40px,6.4vw,82px);
  line-height:1.0;letter-spacing:-0.038em;
  max-width:920px;
}
.hero h1 .accent{color:var(--accent)}
.hero h1 .strike{position:relative;display:inline-block;color:var(--gray)}
.hero h1 .strike::after{
  content:"";position:absolute;left:-3%;right:-3%;top:55%;height:8%;
  background:var(--accent);opacity:0.7;border-radius:3px;transform:rotate(-3deg);
}
.hero p.lede{
  margin-top:30px;
  font-size:clamp(17px,1.6vw,20px);line-height:1.55;color:var(--slate);max-width:680px;font-weight:400;
}
.hero-cta{margin-top:38px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;
  padding:14px 28px;border-radius:10px;
  font-family:var(--display);font-size:14.5px;font-weight:600;letter-spacing:-0.01em;
  cursor:pointer;transition:all .2s;border:1.5px solid transparent;white-space:nowrap;
}
.btn .arrow{font-family:var(--mono);font-size:14px;line-height:1;font-weight:500}
.btn-primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.btn-primary:hover{background:var(--accent);border-color:var(--accent);transform:translateY(-1px)}
.btn-accent{background:var(--accent);color:#fff;border-color:var(--accent)}
.btn-accent:hover{background:var(--accent-deep);border-color:var(--accent-deep);transform:translateY(-1px)}
.btn-outline{background:#fff;color:var(--ink);border-color:var(--line)}
.btn-outline:hover{border-color:var(--ink);background:var(--paper)}

.hero-meta{margin-top:34px;display:flex;flex-wrap:wrap;gap:30px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--gray);font-weight:400}
.hero-meta .item{display:inline-flex;align-items:center;gap:8px}
.hero-meta .item .ico{color:var(--green)}
.hero-meta .item strong{color:var(--ink);font-weight:500;letter-spacing:0.02em}

/* Hero visual: terminal/preview */
.hero-preview{
  margin-top:60px;width:100%;max-width:1080px;
  border:1px solid var(--line);border-radius:14px;overflow:hidden;
  box-shadow:0 24px 80px -20px rgba(10,10,11,0.18), 0 8px 24px -8px rgba(10,10,11,0.08);
  background:var(--bg);
}
.hp-bar{
  padding:12px 18px;background:var(--paper);border-bottom:1px solid var(--line);
  display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:12px;color:var(--gray);
}
.hp-bar .dots{display:flex;gap:6px}
.hp-bar .dots span{width:11px;height:11px;border-radius:50%;background:var(--line)}
.hp-bar .url{
  flex:1;text-align:center;background:#fff;border:1px solid var(--line);border-radius:6px;
  padding:5px 14px;color:var(--smoke);font-size:11.5px;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
}
.hp-bar .url .lock{color:var(--green)}
.hp-bar .badge{background:var(--green);color:#fff;font-size:10px;padding:3px 8px;border-radius:4px;font-weight:600;letter-spacing:0.04em}
.hp-content{
  padding:36px 30px;background:var(--bg);
  display:grid;grid-template-columns:repeat(4,1fr);gap:1px;
  background:var(--line-soft);
}
.hp-stat{
  padding:24px 22px;background:var(--bg);
  display:flex;flex-direction:column;gap:8px;
}
.hp-stat .v{
  font-family:var(--display);font-weight:700;font-size:34px;color:var(--ink);letter-spacing:-0.03em;line-height:1;
  display:flex;align-items:baseline;gap:4px;
}
.hp-stat .v .unit{font-family:var(--mono);font-size:13px;color:var(--gray);font-weight:500;letter-spacing:0;margin-left:2px}
.hp-stat .v .accent{color:var(--green)}
.hp-stat .l{font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--gray);font-weight:500;text-transform:uppercase}
.hp-stat .d{font-size:12.5px;color:var(--slate);line-height:1.45}
@media (max-width:780px){.hp-content{grid-template-columns:repeat(2,1fr)}}

/* ─── Logos / trust strip ─────────────────────────────────── */
.logos{padding:50px 0;border-bottom:1px solid var(--line)}
.logos-inner{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:flex;align-items:center;gap:50px;flex-wrap:wrap;justify-content:space-between;
}
.logos-tag{font-family:var(--mono);font-size:11.5px;letter-spacing:0.06em;color:var(--gray);font-weight:500;text-transform:uppercase;flex-shrink:0}
.logos-row{display:flex;gap:46px;align-items:center;flex-wrap:wrap}
.logos-row span{font-family:var(--display);font-weight:700;font-size:18px;color:var(--smoke);letter-spacing:-0.022em;opacity:0.55;transition:opacity .2s}
.logos-row span:hover{opacity:1}

/* ─── Section base ─────────────────────────────────────── */
section{padding:clamp(80px,9vw,130px) 0}
.section-head{margin-bottom:60px;max-width:780px}
.section-head.center{margin-left:auto;margin-right:auto;text-align:center}
.section-head .eyebrow{margin-bottom:18px}
.section-head h2{
  font-family:var(--display);font-weight:700;
  font-size:clamp(32px,4.4vw,54px);line-height:1.05;letter-spacing:-0.032em;
}
.section-head h2 .accent{color:var(--accent)}
.section-head h2 .gray{color:var(--gray)}
.section-head p{margin-top:18px;font-size:17px;line-height:1.55;color:var(--slate);max-width:600px}
.section-head.center p{margin-left:auto;margin-right:auto}

/* ─── Stack / Tech ─────────────────────────────────────── */
.stack{background:var(--bg)}
.stack-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:80px;align-items:start}
.stack-list{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--line)}
.stack-item{
  display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center;
  padding:22px 0;border-bottom:1px solid var(--line);
}
.stack-item .ico{
  width:40px;height:40px;border-radius:9px;
  background:var(--paper);display:flex;align-items:center;justify-content:center;
  flex-shrink:0;color:var(--ink);
}
.stack-item .body h4{font-family:var(--display);font-weight:600;font-size:16px;letter-spacing:-0.018em;color:var(--ink)}
.stack-item .body p{margin-top:4px;font-size:13.5px;color:var(--slate);line-height:1.5}
.stack-item .badge{
  font-family:var(--mono);font-size:10.5px;letter-spacing:0.04em;color:var(--green);font-weight:500;
  padding:4px 10px;background:rgba(0,183,121,0.08);border-radius:999px;
  display:inline-flex;align-items:center;gap:6px;
}
.stack-item .badge::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--green)}
.stack-item .badge.accent{color:var(--accent-deep);background:rgba(255,92,46,0.08)}
.stack-item .badge.accent::before{background:var(--accent)}

.stack-card{
  background:var(--ink);color:#fff;border-radius:14px;padding:40px 36px;
  position:sticky;top:90px;
}
.stack-card h3{font-family:var(--display);font-weight:700;font-size:24px;color:#fff;letter-spacing:-0.025em;margin-bottom:8px}
.stack-card .sub{font-size:14px;color:rgba(255,255,255,0.65);line-height:1.55}
.stack-card .scores{margin-top:30px;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.stack-card .score{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:10px;padding:18px;text-align:center;
}
.stack-card .score .v{font-family:var(--display);font-weight:700;font-size:34px;color:#fff;letter-spacing:-0.03em;line-height:1}
.stack-card .score .v .accent{color:var(--accent)}
.stack-card .score .l{font-family:var(--mono);font-size:10.5px;color:rgba(255,255,255,0.6);font-weight:500;margin-top:8px;letter-spacing:0.04em;text-transform:uppercase}
.stack-card .perf{
  margin-top:20px;padding:16px 18px;
  background:rgba(0,183,121,0.12);border:1px solid rgba(0,183,121,0.25);
  border-radius:10px;
  font-family:var(--mono);font-size:12px;color:#7AE5C0;
  display:flex;align-items:center;gap:10px;
}
.stack-card .perf::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2.4s ease-in-out infinite}

@media (max-width:980px){.stack-grid{grid-template-columns:1fr;gap:50px}.stack-card{position:relative;top:auto}}

/* ─── Pricing ─────────────────────────────────────── */
.pricing{background:var(--paper)}
.price-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:920px;margin:0 auto}
.price-card{
  background:#fff;border:1px solid var(--line);border-radius:16px;
  padding:38px 34px 36px;
  display:flex;flex-direction:column;
  position:relative;
  transition:transform .25s,box-shadow .25s;
}
.price-card:hover{transform:translateY(-3px);box-shadow:0 20px 60px -20px rgba(10,10,11,0.12)}
.price-card.featured{border-color:var(--ink);background:var(--ink);color:#fff;position:relative;overflow:hidden}
.price-card.featured::before{
  content:"";position:absolute;top:-100px;right:-100px;width:300px;height:300px;
  background:radial-gradient(circle,rgba(255,92,46,0.18) 0%,transparent 70%);
  pointer-events:none;
}
.price-card .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.price-card .name{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:-0.022em;color:var(--ink)}
.price-card.featured .name{color:#fff}
.price-card .tag{
  font-family:var(--mono);font-size:10.5px;letter-spacing:0.06em;color:var(--accent);font-weight:500;
  padding:5px 11px;border:1px solid rgba(255,92,46,0.3);border-radius:999px;background:rgba(255,92,46,0.06);
  text-transform:uppercase;
}
.price-card.featured .tag{background:rgba(255,92,46,0.15);border-color:rgba(255,92,46,0.4)}
.price-card .price-amt{
  font-family:var(--display);font-weight:700;font-size:60px;color:var(--ink);letter-spacing:-0.04em;line-height:1;
  display:flex;align-items:baseline;gap:6px;
}
.price-card.featured .price-amt{color:#fff}
.price-card .price-amt .ccy{font-family:var(--mono);font-size:0.32em;color:var(--gray);font-weight:500;letter-spacing:0.02em;align-self:flex-start;margin-top:0.5em}
.price-card.featured .price-amt .ccy{color:rgba(255,255,255,0.5)}
.price-card .price-suffix{font-family:var(--sans);font-size:14px;color:var(--gray);font-weight:500}
.price-card.featured .price-suffix{color:rgba(255,255,255,0.55)}
.price-card .desc{margin-top:14px;font-size:14.5px;line-height:1.55;color:var(--slate)}
.price-card.featured .desc{color:rgba(255,255,255,0.7)}
.price-card ul{
  margin-top:26px;padding-top:26px;border-top:1px solid var(--line);
  list-style:none;display:flex;flex-direction:column;gap:13px;flex:1;
}
.price-card.featured ul{border-top-color:rgba(255,255,255,0.12)}
.price-card li{display:flex;align-items:flex-start;gap:11px;font-size:14px;color:var(--smoke);line-height:1.5}
.price-card.featured li{color:rgba(255,255,255,0.85)}
.price-card li svg{flex-shrink:0;color:var(--green);margin-top:3px}
.price-card .cta-row{margin-top:30px;display:flex;flex-direction:column;gap:10px;align-items:center}
.price-card .cta-row .btn{width:100%}
.price-card .cta-row .btn-link{display:inline-flex;align-items:center;justify-content:center;width:auto;padding:6px 4px;background:transparent;border:none;color:var(--gray);font-family:var(--mono);font-size:12px;letter-spacing:0.04em;font-weight:500;text-decoration:none}
.price-card .cta-row .btn-link:hover{color:var(--accent-deep)}
@media (max-width:780px){.price-grid{grid-template-columns:1fr}}

.price-foot{
  margin:36px auto 0;max-width:920px;
  padding:18px 24px;background:#fff;border:1px solid var(--line);border-radius:12px;
  display:flex;gap:16px;align-items:center;
  font-size:13.5px;color:var(--slate);line-height:1.5;
}
.price-foot .ico{
  width:36px;height:36px;border-radius:8px;
  background:var(--accent-soft);color:var(--accent-deep);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.price-foot strong{color:var(--ink);font-weight:600}

/* ─── Why we cost less ─────────────────────────────────── */
.honest{background:var(--bg)}
.honest-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.honest-cell{
  background:#fff;padding:36px 32px 38px;
}
.honest-cell .num{
  font-family:var(--mono);font-size:11px;letter-spacing:0.08em;color:var(--accent-deep);font-weight:500;
  text-transform:uppercase;margin-bottom:18px;
}
.honest-cell h3{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:-0.022em;color:var(--ink);margin-bottom:14px;line-height:1.15}
.honest-cell h3 .accent{color:var(--accent)}
.honest-cell p{font-size:14.5px;line-height:1.65;color:var(--slate)}
.honest-cell .tag{
  margin-top:20px;display:inline-flex;align-items:center;gap:8px;
  font-family:var(--mono);font-size:11px;color:var(--gray);font-weight:500;letter-spacing:0.04em;text-transform:uppercase;
}
.honest-cell .tag::before{content:"";width:14px;height:1px;background:var(--ink)}
@media (max-width:880px){.honest-grid{grid-template-columns:1fr}}

/* ─── Process ─────────────────────────────────────── */
.process{background:var(--paper);padding-top:clamp(90px,10vw,140px);padding-bottom:clamp(90px,10vw,140px)}
.proc-list{display:grid;grid-template-columns:repeat(4,1fr);gap:36px 28px;position:relative;margin-top:30px}
.proc-list::before{
  content:"";position:absolute;top:42px;left:80px;right:80px;height:2px;
  background:linear-gradient(to right, var(--line) 0%, var(--line-soft) 50%, var(--line) 100%);z-index:0;
}
.proc-step{position:relative;z-index:2;padding:0 4px}
.proc-step .num{
  width:84px;height:84px;border-radius:50%;
  background:#fff;border:2px solid var(--ink);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-weight:700;font-size:38px;color:var(--ink);
  margin-bottom:30px;letter-spacing:-0.04em;
  box-shadow:0 6px 20px -8px rgba(10,10,11,0.18);
  transition:transform .25s;
}
.proc-step:hover .num{transform:translateY(-2px)}
.proc-step .num.accent{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 8px 24px -8px rgba(255,92,46,0.45)}
.proc-step h4{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:-0.022em;color:var(--ink);margin-bottom:10px;line-height:1.2}
.proc-step .time{font-family:var(--mono);font-size:11.5px;color:var(--accent-deep);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px;display:inline-flex;align-items:center;gap:8px}
.proc-step .time::before{content:"";width:14px;height:1px;background:var(--accent)}
.proc-step p{font-size:14.5px;line-height:1.65;color:var(--slate)}
.proc-cta{margin-top:64px;text-align:center;padding-top:48px;border-top:1px solid var(--line)}
.proc-cta .pre{font-family:var(--mono);font-size:11.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gray);font-weight:500;margin-bottom:18px;display:block}
.proc-cta h3{font-family:var(--display);font-weight:700;font-size:clamp(24px,2.6vw,32px);letter-spacing:-0.025em;color:var(--ink);margin-bottom:24px;line-height:1.2}
.proc-cta h3 .accent{color:var(--accent)}
@media (max-width:780px){.proc-list{grid-template-columns:1fr;gap:42px}.proc-list::before{display:none}.proc-step .num{width:64px;height:64px;font-size:28px;margin-bottom:20px}}

/* ─── Portfolio ─────────────────────────────────────── */
.portfolio{background:var(--bg)}
.port-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.port-card{
  border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;
  transition:all .25s;
  display:flex;flex-direction:column;
}
.port-card:hover{transform:translateY(-3px);box-shadow:0 16px 48px -16px rgba(10,10,11,0.15);border-color:var(--ink)}
.port-card .preview{
  aspect-ratio:16/10;
  background:var(--paper);
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
  font-family:var(--display);font-weight:800;font-size:32px;color:var(--ink);letter-spacing:-0.025em;
}
.port-card .preview::before{
  content:"";position:absolute;inset:0;
  background:linear-gradient(135deg, var(--bg-color, var(--paper)) 0%, var(--bg-color-2, var(--soft)) 100%);
}
.port-card .preview span{position:relative;z-index:2;text-align:center;line-height:1.1}
.port-card .preview img{position:relative;z-index:3;width:100%;height:100%;object-fit:cover;object-position:top center;display:block;background:#fff}
.port-card .preview .em{font-family:var(--display);font-style:italic;font-weight:500;color:var(--accent);display:block;font-size:0.7em;margin-top:4px;letter-spacing:0.01em}
.port-card.daga .preview{background:linear-gradient(135deg,#F4EFE7 0%,#EBE3D5 100%);color:#0F0E0C}
.port-card.daga .preview .em{color:#A88B5B}
.port-card.bwi .preview{background:linear-gradient(135deg,#0A1F3A 0%,#06152B 100%);color:#FAFAF7}
.port-card.bwi .preview .em{color:#D4A24C}
.port-card.dental .preview{background:linear-gradient(135deg,#EDF8F6 0%,#D4F0EC 100%);color:#0B1B2C}
.port-card.dental .preview .em{color:#1A8A80}
.port-card.blues .preview{background:linear-gradient(135deg,#1a1a2e 0%,#0f0f1e 100%);color:#fbbf24}
.port-card.blues .preview .em{color:#fff;font-style:normal;font-weight:400}
.port-card.sched .preview{background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);color:#0a0e1a}
.port-card.sched .preview .em{color:#dc2626;font-style:normal;font-weight:500}
.port-card .info{padding:22px 24px}
.port-card .info .head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px}
.port-card .info h4{font-family:var(--display);font-weight:700;font-size:18px;letter-spacing:-0.02em;color:var(--ink)}
.port-card .info .sector{
  font-family:var(--mono);font-size:10px;letter-spacing:0.06em;color:var(--gray);font-weight:500;
  padding:4px 10px;border:1px solid var(--line);border-radius:999px;text-transform:uppercase;flex-shrink:0;
}
.port-card .info p{font-size:13.5px;line-height:1.55;color:var(--slate);margin-top:6px}
.port-card .info .meta{margin-top:14px;display:flex;flex-wrap:wrap;gap:6px}
.port-card .info .meta span{font-family:var(--mono);font-size:10.5px;color:var(--slate);background:var(--paper);padding:3px 9px;border-radius:5px;font-weight:500}
@media (max-width:980px){.port-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:620px){.port-grid{grid-template-columns:1fr}}

/* ─── Testimonial ──────────────────────────────────── */
.testimonial{background:var(--bg);padding:clamp(70px,8vw,110px) 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.testimonial-inner{max-width:880px;margin:0 auto;padding:0 var(--gutter);text-align:center}
.testimonial .eyebrow{margin-bottom:28px}
.testimonial blockquote{
  font-family:var(--display);font-weight:500;
  font-size:clamp(22px,2.6vw,32px);
  line-height:1.4;letter-spacing:-0.022em;color:var(--ink);
  margin:0;quotes:none;
}
.testimonial blockquote::before{
  content:"";display:block;width:40px;height:2px;background:var(--accent);margin:0 auto 28px;
}
.testimonial blockquote .accent{color:var(--accent-deep)}
.testimonial cite{
  display:block;margin-top:32px;font-style:normal;
  font-family:var(--mono);font-size:11.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--slate);font-weight:600;
}
.testimonial cite .name{color:var(--ink);font-weight:700;display:block;font-family:var(--display);font-size:14px;letter-spacing:-0.005em;text-transform:none;margin-bottom:4px}
.testimonial cite .role{display:block}
.testimonial-link{margin-top:24px;display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--gray);letter-spacing:0.06em;text-transform:uppercase;font-weight:500}
.testimonial-link a{color:var(--accent-deep);font-weight:600}

/* ─── Comparison ─────────────────────────────────── */
.compare{background:var(--ink);color:#fff;position:relative;overflow:hidden}
.compare::before{
  content:"";position:absolute;top:-200px;right:-200px;width:600px;height:600px;
  background:radial-gradient(circle,rgba(255,92,46,0.15) 0%,transparent 65%);
  pointer-events:none;
}
.compare .container{position:relative}
.compare .section-head h2{color:#fff}
.compare .section-head h2 .accent{color:var(--accent)}
.compare .section-head p{color:rgba(255,255,255,0.7)}
.cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px}
.cmp-card{
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:14px;padding:30px 30px 32px;
}
.cmp-card.us{border-color:var(--accent);background:rgba(255,92,46,0.04)}
.cmp-card.them{position:relative;border-color:rgba(255,76,76,0.45);overflow:hidden}
.cmp-card.them .x-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4}
.cmp-card.them .head h3,
.cmp-card.them .head .price-line,
.cmp-card.them ul,
.cmp-card.them .timeline{opacity:0.55}
.cmp-card.them .stamp{
  position:absolute;top:18px;right:-44px;z-index:5;
  background:#FF4C4C;color:#fff;
  padding:5px 50px;
  font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;
  transform:rotate(35deg);
  box-shadow:0 4px 12px rgba(255,76,76,0.4);
}
.cmp-card .head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:24px;gap:14px}
.cmp-card h3{font-family:var(--display);font-weight:700;font-size:20px;color:#fff;letter-spacing:-0.022em}
.cmp-card .price-line{font-family:var(--display);font-weight:700;font-size:30px;color:#fff;letter-spacing:-0.03em;line-height:1}
.cmp-card .price-line .ccy{font-family:var(--mono);font-size:0.4em;color:rgba(255,255,255,0.5);font-weight:500;margin-right:4px}
.cmp-card.us .price-line{color:var(--accent)}
.cmp-card ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.cmp-card li{display:flex;align-items:flex-start;gap:11px;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.5}
.cmp-card li svg{flex-shrink:0;margin-top:3px}
.cmp-card li.no svg{color:#FF6B6B}
.cmp-card li.yes svg{color:var(--green)}
.cmp-card.them li.no{color:rgba(255,255,255,0.5)}
.cmp-card .timeline{
  margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);
  font-family:var(--mono);font-size:12.5px;color:rgba(255,255,255,0.6);
}
.cmp-card .timeline strong{color:#fff;font-weight:500}
.cmp-card.us .timeline strong{color:var(--accent)}
@media (max-width:780px){.cmp-grid{grid-template-columns:1fr}}

/* ─── FAQ ─────────────────────────────────────── */
.faq{background:var(--bg)}
.faq-list{max-width:840px;margin:0 auto;display:flex;flex-direction:column;border-top:1px solid var(--line)}
.faq-item{border-bottom:1px solid var(--line)}
.faq-item summary{
  list-style:none;cursor:pointer;
  padding:24px 0;
  display:flex;justify-content:space-between;align-items:center;gap:20px;
  font-family:var(--display);font-weight:600;font-size:18px;color:var(--ink);letter-spacing:-0.018em;
  transition:color .15s;
}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary:hover{color:var(--accent-deep)}
.faq-item summary .ico{
  width:28px;height:28px;border-radius:50%;border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;color:var(--ink);transition:all .2s;
  font-family:var(--mono);font-size:14px;
}
.faq-item[open] summary .ico{background:var(--ink);color:#fff;border-color:var(--ink);transform:rotate(45deg)}
.faq-item .ans{padding:0 0 24px;font-size:15px;line-height:1.7;color:var(--slate)}
.faq-item .ans a{color:var(--accent-deep);font-weight:500;border-bottom:1px solid var(--accent);padding-bottom:1px}

/* ─── Final CTA ─────────────────────────────── */
.cta-final{
  background:linear-gradient(135deg, var(--ink) 0%, #1F1F22 100%);
  color:#fff;padding:clamp(80px,9vw,130px) var(--gutter);
  text-align:center;position:relative;overflow:hidden;
}
.cta-final::before{
  content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:800px;height:800px;
  background:radial-gradient(circle,rgba(255,92,46,0.18) 0%,transparent 65%);
  pointer-events:none;
}
.cta-final .inner{max-width:780px;margin:0 auto;position:relative}
.cta-final .eyebrow{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.85);margin-bottom:28px}
.cta-final h2{font-family:var(--display);font-weight:700;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.035em;color:#fff}
.cta-final h2 .accent{color:var(--accent)}
.cta-final p{margin-top:22px;font-size:17px;line-height:1.55;color:rgba(255,255,255,0.7);max-width:560px;margin-left:auto;margin-right:auto}
.cta-final .btn-row{margin-top:36px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.cta-final .btn-outline{background:transparent;color:#fff;border-color:rgba(255,255,255,0.25)}
.cta-final .btn-outline:hover{background:rgba(255,255,255,0.08);border-color:#fff}
.cta-final .meta{margin-top:24px;display:flex;justify-content:center;gap:24px;flex-wrap:wrap;font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,0.5);font-weight:400}
.cta-final .meta .item{display:inline-flex;align-items:center;gap:6px}
.cta-final .meta .ico{color:var(--green)}

/* ─── Footer ─────────────────────────────────── */
footer{background:var(--bg);color:var(--slate);padding:70px 0 28px;border-top:1px solid var(--line)}
.foot-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:50px;
}
.foot-brand p{margin-top:20px;font-size:13.5px;line-height:1.65;color:var(--slate);max-width:340px}
.foot-brand .addr{margin-top:18px;font-family:var(--mono);font-size:11.5px;line-height:1.7;color:var(--gray)}
.foot-col h5{font-family:var(--display);font-size:13px;font-weight:700;color:var(--ink);margin-bottom:18px;letter-spacing:-0.005em}
.foot-col ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.foot-col a{font-size:13.5px;color:var(--slate);transition:color .15s}
.foot-col a:hover{color:var(--accent-deep)}
.foot-bot{
  max-width:var(--max);margin:50px auto 0;padding:24px var(--gutter) 0;
  border-top:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;
  font-size:12.5px;color:var(--gray);
}
.foot-bot .stack{display:flex;gap:20px;flex-wrap:wrap;font-family:var(--mono);font-size:11px;letter-spacing:0.04em}
.foot-bot .stack span{opacity:0.7}
@media (max-width:880px){.foot-grid{grid-template-columns:1fr 1fr;gap:36px 28px}}
@media (max-width:520px){.foot-grid{grid-template-columns:1fr}}

/* ─── Mobile nav drawer ─── */
.menu-toggle{display:none;align-items:center;justify-content:center;width:42px;height:42px;border-radius:8px;background:transparent;border:1px solid var(--line);color:var(--ink);cursor:pointer;transition:background .15s,border-color .15s}
.menu-toggle:hover{background:var(--accent-soft);border-color:var(--accent)}
.menu-toggle .bar{display:block;width:18px;height:2px;background:currentColor;border-radius:1px;transition:transform .25s,opacity .2s}
.menu-toggle .bar+.bar{margin-top:4px}
body.nav-open .menu-toggle .bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
body.nav-open .menu-toggle .bar:nth-child(2){opacity:0}
body.nav-open .menu-toggle .bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.nav-scrim{position:fixed;inset:0;background:rgba(11,18,32,0.42);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:90}
body.nav-open .nav-scrim{opacity:1;visibility:visible}
.nav-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86vw,360px);background:#fff;box-shadow:-20px 0 50px rgba(11,18,32,0.16);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:100;display:flex;flex-direction:column;overflow-y:auto}
body.nav-open .nav-drawer{transform:translateX(0)}
.nav-drawer .nd-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--line)}
.nav-drawer .nd-close{width:38px;height:38px;border-radius:8px;background:transparent;border:1px solid var(--line);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1}
.nav-drawer .nd-close:hover{background:var(--accent-soft);border-color:var(--accent)}
.nav-drawer .nd-links{display:flex;flex-direction:column;padding:14px 22px;gap:2px}
.nav-drawer .nd-links a{display:block;padding:14px 4px;font-family:var(--display);font-size:17px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;border-bottom:1px solid var(--line)}
.nav-drawer .nd-links a:last-child{border-bottom:none}
.nav-drawer .nd-links a:hover{color:var(--accent-deep)}
.nav-drawer .nd-foot{margin-top:auto;padding:22px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:14px}
.nav-drawer .nd-foot .lang-toggle{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;align-self:flex-start}
.nav-drawer .nd-foot .lang-toggle button{padding:8px 14px;background:transparent;border:none;font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--slate);cursor:pointer;letter-spacing:0.04em}
.nav-drawer .nd-foot .lang-toggle button.on{background:var(--accent);color:#fff}
.nav-drawer .nd-foot .cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:var(--ink);color:#fff;border-radius:10px;font-family:var(--display);font-size:14.5px;font-weight:600}
.nav-drawer .nd-foot .cta:hover{background:var(--accent-deep)}
@media (max-width:980px){.menu-toggle{display:inline-flex}}
body.nav-open{overflow:hidden}
</style>
</head>
<body>

<div class="topbar">
  <span class="ml-en"><strong>Now booking <span class="accent">July 2026</span> builds</strong><span class="sep">·</span>48-hour delivery<span class="sep">·</span>From <strong class="accent">$500 CAD</strong></span><span class="ml-es"><strong>Cupos abiertos <span class="accent">julio 2026</span></strong><span class="sep">·</span>Entrega en 48 horas<span class="sep">·</span>Desde <strong class="accent">$690.000 COP</strong></span>
</div>

<header class="header">
  <div class="header-inner">
    <a href="#" class="logo" aria-label="PymeWebPro home">
      <span class="br">&lt;</span><span class="word">pymewebpro</span><span class="br">/&gt;</span>
    </a>
    <button class="menu-toggle" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="navDrawer">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    <nav class="nav">
      <div class="navlinks">
        <a href="#stack"><span class="ml-en">Tech Stack</span><span class="ml-es">Tecnología</span></a>
        <a href="#pricing"><span class="ml-en">Pricing</span><span class="ml-es">Precios</span></a>
        <a href="#portfolio"><span class="ml-en">Work</span><span class="ml-es">Trabajo</span></a>
        <a href="#process"><span class="ml-en">Process</span><span class="ml-es">Proceso</span></a>
        <a href="#faq"><span class="ml-en">FAQ</span><span class="ml-es">Preguntas</span></a>
      </div>
      <div class="lang-toggle" role="group" aria-label="Language">
        <button data-l="en" type="button" aria-label="English">EN</button>
        <button data-l="es" type="button" aria-label="Español">ES</button>
      </div>
      <a href="#pricing" class="cta"><span class="ml-en">Buy now</span><span class="ml-es">Comprar</span> <span class="arrow">→</span></a>
    </nav>
  </div>
</header>

<div class="nav-scrim" id="navScrim" aria-hidden="true"></div>
<aside class="nav-drawer" id="navDrawer" role="dialog" aria-label="Navigation" aria-modal="true">
  <div class="nd-head">
    <a href="#" class="logo" aria-label="PymeWebPro home">
      <span class="br">&lt;</span><span class="word">pymewebpro</span><span class="br">/&gt;</span>
    </a>
    <button class="nd-close" id="navClose" aria-label="Close menu">&times;</button>
  </div>
  <div class="nd-links">
    <a href="#stack" data-nav-close><span class="ml-en">Tech Stack</span><span class="ml-es">Tecnología</span></a>
    <a href="#pricing" data-nav-close><span class="ml-en">Pricing</span><span class="ml-es">Precios</span></a>
    <a href="#portfolio" data-nav-close><span class="ml-en">Work</span><span class="ml-es">Trabajo</span></a>
    <a href="#process" data-nav-close><span class="ml-en">Process</span><span class="ml-es">Proceso</span></a>
    <a href="#faq" data-nav-close><span class="ml-en">FAQ</span><span class="ml-es">Preguntas</span></a>
  </div>
  <div class="nd-foot">
    <div class="lang-toggle" role="group" aria-label="Language">
      <button data-l="en" type="button" aria-label="English">EN</button>
      <button data-l="es" type="button" aria-label="Español">ES</button>
    </div>
    <a href="#pricing" class="cta" data-nav-close><span class="ml-en">Buy now</span><span class="ml-es">Comprar</span> <span class="arrow">→</span></a>
  </div>
</aside>

<!-- ─── Hero ─── -->
<section class="hero">
  <div class="hero-grid">
    <span class="eyebrow"><span class="dot live"></span><span class="ml-en">Canadian-owned · Built in Medellín · Powered by Anthropic</span><span class="ml-es">Liderazgo canadiense · Construido en Medellín · Impulsado por Anthropic</span></span>
    <h1><span class="ml-en">Enterprise-grade websites at <span class="accent">small-business prices.</span></span><span class="ml-es">Sitios web nivel enterprise, a <span class="accent">precios de pyme.</span></span></h1>
    <p class="lede"><span class="ml-en">Custom-coded, hand-designed, deployed on Cloudflare's edge network. Sub-second load times, perfect Lighthouse scores, A+ security headers, built in 48 hours, not 8 weeks. Starting at $500 CAD.</span><span class="ml-es">Código a la medida, diseño hecho a mano, desplegado en la red edge de Cloudflare. Carga sub-segundo, Lighthouse perfecto, encabezados de seguridad A+. Construido en 48 horas, no 8 semanas. Desde $690.000 COP.</span></p>
    <div class="hero-cta">
      <a href="#pricing" class="btn btn-primary"><span class="ml-en">See pricing &amp; start</span><span class="ml-es">Ver precios y empezar</span> <span class="arrow">→</span></a>
      <a href="#cta-final" class="btn btn-outline"><span class="ml-en">Or schedule a call</span><span class="ml-es">O agendar una llamada</span></a>
    </div>
    <div class="hero-meta">
      <div class="item"><svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Lighthouse <strong>100/100/100</strong></div>
      <div class="item"><svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>LCP <strong>&lt; 0.9s</strong></div>
      <div class="item"><svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Security <strong>A+</strong></div>
      <div class="item"><svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Delivered <strong>in 48hr</strong></div>
    </div>

    <!-- Hero preview -->
    <div class="hero-preview">
      <div class="hp-bar">
        <div class="dots"><span></span><span></span><span></span></div>
        <div class="url"><svg class="lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>yourdomain.com</div>
        <span class="badge">LIVE</span>
      </div>
      <div class="hp-content">
        <div class="hp-stat">
          <span class="l">LCP · Largest Paint</span>
          <span class="v">0.84<span class="unit">s</span></span>
          <span class="d">95th percentile across 14-day field data.</span>
        </div>
        <div class="hp-stat">
          <span class="l">Lighthouse · Mobile</span>
          <span class="v"><span class="accent">100</span><span class="unit">/100</span></span>
          <span class="d">Performance, Accessibility, Best Practices, SEO.</span>
        </div>
        <div class="hp-stat">
          <span class="l">Edge Locations</span>
          <span class="v">330<span class="unit">+</span></span>
          <span class="d">Cloudflare's global anycast network.</span>
        </div>
        <div class="hp-stat">
          <span class="l">Uptime · Last 90d</span>
          <span class="v">99.99<span class="unit">%</span></span>
          <span class="d">Backed by Cloudflare's 100% uptime SLA.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Logos / trust ─── -->
<div class="logos">
  <div class="logos-inner">
    <span class="logos-tag">Built on the same stack as</span>
    <div class="logos-row">
      <span>Cloudflare</span>
      <span>Anthropic</span>
      <span>Wise</span>
      <span>Linear</span>
      <span>Vercel</span>
    </div>
  </div>
</div>

<!-- ─── Tech Stack ─── -->
<section class="stack" id="stack">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow"><span class="dot"></span>Engineering</span>
      <h2>The same infrastructure Fortune 500s pay <span class="accent">millions</span> for.</h2>
      <p>Every site we build runs on Cloudflare's edge network, the same one that serves Shopify, Discord, OpenAI, and Anthropic. You get enterprise-grade performance and security as a baseline, not an upsell.</p>
    </div>

    <div class="stack-grid">
      <div class="stack-list">
        <div class="stack-item">
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12c0-4.97-4.03-9-9-9-2.5 0-4.76 1.02-6.4 2.66"/><path d="M3 12c0 4.97 4.03 9 9 9 2.5 0 4.76-1.02 6.4-2.66"/><path d="M3 8l3-2v4M21 16l-3 2v-4"/></svg></div>
          <div class="body">
            <h4>Cloudflare Workers · Edge compute</h4>
            <p>Server-side rendering at 330+ locations worldwide. Your site loads in under a second from Toronto, Tokyo, or Tegucigalpa.</p>
          </div>
          <span class="badge">Active</span>
        </div>
        <div class="stack-item">
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
          <div class="body">
            <h4>Automatic SSL · A+ headers · DDoS protection</h4>
            <p>HTTPS by default, HSTS preload, CSP hash-locked, X-Frame, Referrer-Policy, all configured to qualys.ssllabs.com A+ on day one.</p>
          </div>
          <span class="badge">Active</span>
        </div>
        <div class="stack-item">
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          <div class="body">
            <h4>Sub-second load · CDN-cached assets</h4>
            <p>Critical CSS inlined, fonts preconnected, images width/height locked, lazy-loaded below the fold. Lighthouse 100s aren't lucky, they're built in.</p>
          </div>
          <span class="badge accent">&lt; 0.9s LCP</span>
        </div>
        <div class="stack-item">
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div>
          <div class="body">
            <h4>Hand-coded HTML · No WordPress, no themes</h4>
            <p>Every line written for you. No plugin sprawl, no theme bloat, no security CVEs to patch every Tuesday. Your site outlives the next CMS trend.</p>
          </div>
          <span class="badge">Custom</span>
        </div>
        <div class="stack-item">
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
          <div class="body">
            <h4>Schema.org markup · Open Graph · SEO baseline</h4>
            <p>Service / Organization / FAQ JSON-LD, Open Graph for previews on every platform, sitemap, robots.txt, canonical headers, all present at launch.</p>
          </div>
          <span class="badge">Active</span>
        </div>
        <div class="stack-item">
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg></div>
          <div class="body">
            <h4>Privacy-first analytics · GDPR/PIPEDA-compliant</h4>
            <p>Cloudflare Web Analytics, no cookies, no fingerprints, no consent banner needed in Canada or the EU. You get the data, your visitors keep their privacy.</p>
          </div>
          <span class="badge">Active</span>
        </div>
      </div>

      <aside class="stack-card">
        <h3>Production scores</h3>
        <p class="sub">Real numbers from sites we've shipped. Pulled from Cloudflare RUM and Google Lighthouse.</p>
        <div class="scores">
          <div class="score">
            <div class="v"><span class="accent">100</span></div>
            <div class="l">Performance</div>
          </div>
          <div class="score">
            <div class="v"><span class="accent">100</span></div>
            <div class="l">Accessibility</div>
          </div>
          <div class="score">
            <div class="v"><span class="accent">100</span></div>
            <div class="l">Best Practices</div>
          </div>
          <div class="score">
            <div class="v"><span class="accent">100</span></div>
            <div class="l">SEO</div>
          </div>
        </div>
        <div class="perf">Live deployment · LCP 0.84s · TTFB 42ms</div>
      </aside>
    </div>
  </div>
</section>

<!-- ─── Pricing ─── -->
<section class="pricing" id="pricing">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow"><span class="dot"></span>Pricing</span>
      <h2>One price. <span class="accent">Everything included.</span></h2>
      <p>No phased proposals, no "design phase" upsells, no surprise hosting bills. Two tiers, pick the one that matches your business.</p>
    </div>

    <!-- EN pricing grid -->
    <div class="price-grid ml-en">
      <div class="price-card">
        <div class="head">
          <div class="name">Essential</div>
          <span class="tag">Most clinics & cafés</span>
        </div>
        <div class="price-amt"><span class="ccy">CAD</span>$500</div>
        <div class="price-suffix">one-time · 1 year hosting included · $150 deposit to start</div>
        <p class="desc">A premium one-page marketing site with everything an SMB actually needs. Perfect for clinics, restaurants, salons, studios, and service businesses.</p>
        <ul>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Single-page multi-section custom site</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Cloudflare hosting · 1 year included</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Custom domain setup &amp; SSL</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Mobile responsive · all devices</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Lighthouse 100 · Sub-1s load</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Contact form &amp; email forwarding</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Privacy-first analytics</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>2 rounds of revisions</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>48-hour delivery</li>
        </ul>
        <div class="cta-row">
          <!-- TODO: replace with real Wise pay-link for $150 CAD Essential deposit -->
          <a href="https://wise.com/pay/business/pymewebpro?ref=essential-deposit" class="btn btn-outline">Pay $150 deposit &amp; start <span class="arrow">→</span></a>
          <a href="#cta-final" class="btn btn-link">Or schedule a call →</a>
        </div>
      </div>

      <div class="price-card featured">
        <div class="head">
          <div class="name" style="color:#fff">Pro</div>
          <span class="tag">Boutique brands &amp; e-comm</span>
        </div>
        <div class="price-amt"><span class="ccy">CAD</span>$800</div>
        <div class="price-suffix">one-time · 2 years hosting included · $240 deposit to start</div>
        <p class="desc">Multi-section site with integrations, bilingual support, advanced forms, and ongoing edits. For brands that need a real digital presence.</p>
        <ul>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Everything in Essential, plus:</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Bilingual EN / FR or EN / ES</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Cloudflare hosting · 2 years included</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Booking / payment integration</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Newsletter capture &amp; CRM sync</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Schema markup · advanced SEO</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>4 rounds of revisions</li>
        </ul>
        <div class="cta-row">
          <!-- TODO: replace with real Wise pay-link for $240 CAD Pro deposit -->
          <a href="https://wise.com/pay/business/pymewebpro?ref=pro-deposit" class="btn btn-accent">Pay $240 deposit &amp; start <span class="arrow">→</span></a>
          <a href="#cta-final" class="btn btn-link" style="color:rgba(255,255,255,0.75)">Or schedule a call →</a>
        </div>
      </div>
    </div>

    <!-- ES pricing grid -->
    <div class="price-grid ml-es">
      <div class="price-card">
        <div class="head">
          <div class="name">Esencial</div>
          <span class="tag">Clínicas y cafés</span>
        </div>
        <div class="price-amt"><span class="ccy">COP</span>$690.000</div>
        <div class="price-suffix">pago único · 1 año de hosting incluido · depósito de $207.000 para empezar</div>
        <p class="desc">Sitio de marketing de una página con todo lo que una pyme necesita. Ideal para clínicas, restaurantes, salones, estudios y servicios.</p>
        <ul>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Sitio de una sola página con múltiples secciones</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Hosting Cloudflare · 1 año incluido</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Configuración de dominio propio y SSL</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Responsive · todos los dispositivos</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Lighthouse 100 · carga sub-1s</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Formulario de contacto y reenvío de correo</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Analítica respetuosa con la privacidad</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>2 rondas de revisiones</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Entrega en 48 horas</li>
        </ul>
        <div class="cta-row">
          <!-- TODO: replace with real Wompi link for $207.000 COP Esencial deposit -->
          <a href="https://checkout.wompi.co/l/PWP_ESENCIAL_DEPOSITO" class="btn btn-outline">Pagar depósito $207.000 y empezar <span class="arrow">→</span></a>
          <a href="#cta-final" class="btn btn-link">O agendar una llamada →</a>
        </div>
      </div>

      <div class="price-card featured">
        <div class="head">
          <div class="name" style="color:#fff">Crecimiento</div>
          <span class="tag">Marcas boutique y e-comm</span>
        </div>
        <div class="price-amt"><span class="ccy">COP</span>$1.080.000</div>
        <div class="price-suffix">pago único · 2 años de hosting incluido · depósito de $324.000 para empezar</div>
        <p class="desc">Sitio multi-sección con integraciones, soporte bilingüe, formularios avanzados y ediciones continuas. Para marcas que necesitan presencia digital real.</p>
        <ul>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Todo lo de Esencial, más:</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Bilingüe ES / EN</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Hosting Cloudflare · 2 años incluidos</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Integración de reservas o pagos</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Captura newsletter y sync con CRM</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Schema markup · SEO avanzado</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>4 rondas de revisiones</li>
        </ul>
        <div class="cta-row">
          <!-- TODO: replace with real Wompi link for $324.000 COP Crecimiento deposit -->
          <a href="https://checkout.wompi.co/l/PWP_CRECIMIENTO_DEPOSITO" class="btn btn-accent">Pagar depósito $324.000 y empezar <span class="arrow">→</span></a>
          <a href="#cta-final" class="btn btn-link" style="color:rgba(255,255,255,0.75)">O agendar una llamada →</a>
        </div>
      </div>
    </div>

    <div class="price-foot">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A5.2 5.2 0 0112 5a5.2 5.2 0 018 5.2c0 7.3-8 11.8-8 11.8z"/></svg></div>
      <div><strong>What an equivalent site would cost in Toronto:</strong> $4.500–$12.000 CAD with a 6–10 week timeline. Same code, same hosting, same security headers, we just don't have the agency overhead to pass along.</div>
    </div>

    <div class="price-foot" style="margin-top:12px">
      <div class="ico" style="background:rgba(0,183,121,0.12);color:var(--green)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 9h20M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2M5 9v10a2 2 0 002 2h10a2 2 0 002-2V9M9 14h6"/></svg></div>
      <div><span class="ml-en"><strong>CAD or USD pricing · 30% deposit to start, 70% on launch.</strong> Pay by credit card, Apple Pay, Google Pay, or direct wire via our Wise Business account. <strong>30-day money-back guarantee</strong> after launch. Hosting included for the first 1–2 years; $15/mo or $180/yr after that.</span><span class="ml-es"><strong>Precio en COP · 30% de depósito para empezar, 70% al lanzar.</strong> Pago con tarjeta, PSE, o transferencia bancaria vía Wompi. <strong>Garantía de devolución de 30 días</strong> tras el lanzamiento. Hosting incluido los primeros 1–2 años; $60.000 COP/mes o $720.000 COP/año después.</span></div>
    </div>
  </div>
</section>

<!-- ─── Why we cost less ─── -->
<section class="honest">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow"><span class="dot"></span><span class="ml-en">The Honest Pitch</span><span class="ml-es">El argumento honesto</span></span>
      <h2>Why we can charge a tenth of what an agency does <span class="accent">, without cutting corners.</span></h2>
      <p>Most of what you pay an agency isn't the design or the code. It's the studio in Toronto, the project managers, the unbillable Tuesdays. We built around all three.</p>
    </div>

    <div class="honest-grid">
      <div class="honest-cell">
        <div class="num">01 · Geography</div>
        <h3>Canadian-led. <span class="accent">Built in Medellín.</span></h3>
        <p>You're working with a Canadian-owned studio, with multi-currency banking through Wise Business (CAD and USD). Invoicing in your currency, payment by credit card or wire. The actual work happens in Medellín, where rent and salaries cost a fifth of what they do in Toronto. We pass that delta straight through to you.</p>
        <span class="tag">Real, structural cost advantage</span>
      </div>
      <div class="honest-cell">
        <div class="num">02 · Tooling</div>
        <h3>Anthropic AI as our <span class="accent">design partner.</span></h3>
        <p>We use Claude, the same AI behind serious enterprise products, as a force multiplier through every step of the build. What used to take a designer two weeks now takes two days. The output is hand-tuned, but the speed is real.</p>
        <span class="tag">Capability that's still novel in 2026</span>
      </div>
      <div class="honest-cell">
        <div class="num">03 · Stack</div>
        <h3>No WordPress. <span class="accent">No subscriptions.</span></h3>
        <p>We don't need a $200/mo CMS, a $99/mo hosting plan, a $40/mo plugin license, or a $25/mo backup service. Cloudflare hosts everything for cents per month. You don't subsidize tooling we never use.</p>
        <span class="tag">Smaller cost base, smaller invoice</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── Process ─── -->
<section class="process" id="process">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow"><span class="dot"></span>Process</span>
      <h2>From brief to live site, <span class="accent">in 48 hours.</span></h2>
      <p>No discovery sprints, no Figma reviews, no Slack channels. Three short conversations, one live website.</p>
    </div>

    <div class="proc-list">
      <div class="proc-step">
        <div class="num">1</div>
        <div class="time">Day 0 · 20 min</div>
        <h4>The Brief</h4>
        <p>20-minute call. We capture your services, audience, brand cues, and the few things you'd want differently from your competition. That's all the brief we need.</p>
      </div>
      <div class="proc-step">
        <div class="num">2</div>
        <div class="time">Day 1 · 24 hr</div>
        <h4>The Build</h4>
        <p>We design and code the site in one focused day. You get a private preview link by end-of-day-one, fully interactive, on your real domain or ours.</p>
      </div>
      <div class="proc-step">
        <div class="num">3</div>
        <div class="time">Day 2 · 24 hr</div>
        <h4>The Revision</h4>
        <p>You walk through it, send notes (text, voice, even WhatsApp screenshots). We iterate live the same day. Two rounds included on Essential, four on Pro.</p>
      </div>
      <div class="proc-step">
        <div class="num accent">4</div>
        <div class="time">Day 2 · Live</div>
        <h4>Deploy</h4>
        <p>We point your domain to Cloudflare, configure SSL, push the production build. Your site is live, fast, and indexed by Google within an hour.</p>
      </div>
    </div>

    <div class="proc-cta">
      <span class="pre">Ready to start</span>
      <h3>Walk through the full step-by-step <span class="accent">on the Start page →</span></h3>
      <a href="https://mockups.pymewebpro.com/start/" class="btn btn-primary" target="_blank" rel="noopener">Open the Start guide <span class="arrow">→</span></a>
    </div>
  </div>
</section>

<!-- ─── Portfolio ─── -->
<section class="portfolio" id="portfolio">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow"><span class="dot"></span>Recent Work</span>
      <h2>Five sites shipped in the last <span class="accent">30 days.</span></h2>
      <p>A range of categories, all built on the same stack and process.</p>
    </div>

    <div class="port-grid">
      <a class="port-card daga" href="https://mockups.pymewebpro.com/daga-parfum/" target="_blank" rel="noopener">
        <div class="preview"><span>DAGA<span class="em">Parfum</span></span></div>
        <div class="info">
          <div class="head"><h4>Daga Parfum</h4><span class="sector">E-commerce</span></div>
          <p>Luxury fragrance brand from Medellín, full e-commerce with product cards, cart, discovery set.</p>
          <div class="meta"><span>Cormorant + Inter</span><span>Cart drawer</span><span>Sub-1s</span></div>
        </div>
      </a>

      <a class="port-card bwi" href="https://mockups.pymewebpro.com/blue-whale-international/" target="_blank" rel="noopener">
        <div class="preview"><span>BWI<span class="em">A universe of opportunities</span></span></div>
        <div class="info">
          <div class="head"><h4>Blue Whale International</h4><span class="sector">Finance</span></div>
          <p>$1B AUM finance group across LATAM. Corporate site with resume upload &amp; careers form.</p>
          <div class="meta"><span>Inter Tight</span><span>File upload</span><span>5 sections</span></div>
        </div>
      </a>

      <a class="port-card dental" href="https://mockups.pymewebpro.com/espacio-dental/" target="_blank" rel="noopener">
        <div class="preview"><span>Espacio<span class="em">Dental</span></span></div>
        <div class="info">
          <div class="head"><h4>Espacio Dental</h4><span class="sector">Healthcare</span></div>
          <p>Modern dental clinic in Medellín positioned for expat patients. WhatsApp-first booking.</p>
          <div class="meta"><span>Manrope</span><span>USD pricing</span><span>WhatsApp</span></div>
        </div>
      </a>

      <a class="port-card blues" href="https://mockups.pymewebpro.com/blues-kitchen/" target="_blank" rel="noopener">
        <div class="preview"><span>The Blues<span class="em">Kitchen</span></span></div>
        <div class="info">
          <div class="head"><h4>The Blues Kitchen</h4><span class="sector">Events</span></div>
          <p>Wedding &amp; events venue in Bogotá. Photo gallery, lead form, full Spanish localization.</p>
          <div class="meta"><span>Embedded photos</span><span>Lead form</span><span>SEO ready</span></div>
        </div>
      </a>

      <a class="port-card sched" href="https://mockups.pymewebpro.com/schedulator/" target="_blank" rel="noopener">
        <div class="preview"><span>The<span class="em">Schedulator</span></span></div>
        <div class="info">
          <div class="head"><h4>The Schedulator</h4><span class="sector">B2B SaaS</span></div>
          <p>SaaS marketing site for elementary-school admins. Drag-and-drop scheduling product page.</p>
          <div class="meta"><span>Dark theme</span><span>Long-form</span><span>Demo CTA</span></div>
        </div>
      </a>

      <a class="port-card" href="#cta-final" style="background:linear-gradient(135deg, var(--soft) 0%, var(--paper) 100%);align-items:center;justify-content:center;display:flex;flex-direction:column;border-style:dashed">
        <div class="preview" style="background:transparent;color:var(--ink);font-size:24px">
          <span>Your site<span class="em">+ 6 days from now</span></span>
        </div>
        <div class="info" style="text-align:center;width:100%">
          <h4 style="text-align:center">Get in line</h4>
          <p>July 2026 builds open. Reserve your slot in 20 minutes.</p>
        </div>
      </a>
    </div>
  </div>
</section>

<!-- ─── Testimonial ─── -->
<section class="testimonial">
  <div class="testimonial-inner">
    <span class="eyebrow"><span class="dot"></span>What clients say</span>
    <blockquote>
      I'm an elementary PE teacher who built a SaaS for school admins, and I needed a marketing site that didn't look like every other Stripe-template launch page. <span class="accent">Mike got the brief on the first call and shipped a polished v1 in 48 hours.</span> Half the price of what a Toronto agency wanted, faster turnaround, and source code I could take with me, pretty hard to argue with that.
    </blockquote>
    <cite>
      <span class="name">Patrick Detzner</span>
      <span class="role">Founder · The Schedulator</span>
    </cite>
    <div class="testimonial-link">
      See Patrick's site → <a href="https://mockups.pymewebpro.com/schedulator/" target="_blank" rel="noopener">mockups.pymewebpro.com/schedulator</a>
    </div>
  </div>
</section>

<!-- ─── Comparison ─── -->
<section class="compare">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.85)"><span class="dot"></span>Apples to Apples</span>
      <h2>Same site. <span class="accent">Different invoice.</span></h2>
      <p>Side-by-side: a typical Toronto agency proposal for a 5-section marketing site, vs. our Pro tier. Same code quality, same hosting, same security baseline.</p>
    </div>

    <div class="cmp-grid">
      <div class="cmp-card them">
        <span class="stamp">Not us</span>
        <svg class="x-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="2" y1="2" x2="98" y2="98" stroke="#FF4C4C" stroke-width="5" opacity="0.75" vector-effect="non-scaling-stroke" stroke-linecap="round"/>
          <line x1="98" y1="2" x2="2" y2="98" stroke="#FF4C4C" stroke-width="5" opacity="0.75" vector-effect="non-scaling-stroke" stroke-linecap="round"/>
        </svg>
        <div class="head">
          <h3>Toronto Agency</h3>
          <div class="price-line"><span class="ccy">CAD</span>$8,500</div>
        </div>
        <ul>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Custom-designed marketing site</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Mobile responsive</li>
          <li class="no"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>WordPress (CVE patches every Tuesday)</li>
          <li class="no"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>$120/mo hosting + plugin subscriptions</li>
          <li class="no"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>3-second LCP (typical Wordpress)</li>
          <li class="no"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>3 rounds of revisions ($800/round after)</li>
          <li class="no"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>Cookie-banner-required analytics</li>
        </ul>
        <div class="timeline">Timeline: <strong>6–10 weeks</strong> · Project manager included whether you want one or not</div>
      </div>

      <div class="cmp-card us">
        <div class="head">
          <h3>PymeWebPro · Pro</h3>
          <div class="price-line"><span class="ccy">CAD</span>$800</div>
        </div>
        <ul>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Custom-designed multi-section site</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Mobile responsive · Lighthouse 100</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Hand-coded HTML · zero dependencies</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Cloudflare hosting · 2 years included</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>LCP &lt; 0.9s · TTFB &lt; 50ms</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>4 rounds of revisions · 3 months edits</li>
          <li class="yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>Privacy-first analytics, no banner needed</li>
        </ul>
        <div class="timeline">Timeline: <strong>48 hours</strong> · You talk directly with the people building it</div>
      </div>
    </div>
  </div>
</section>

<!-- ─── FAQ ─── -->
<section class="faq" id="faq">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow"><span class="dot"></span>Common Questions</span>
      <h2>What people ask before they <span class="accent">say yes.</span></h2>
    </div>

    <div class="faq-list">
      <details class="faq-item">
        <summary>Is the price really $500 CAD? What's the catch? <span class="ico">+</span></summary>
        <div class="ans">No catch, that's the price for the Essential tier, all-in. The reason it works is structural: we're a Canadian-owned studio operating from Medellín, with a small senior team using Anthropic AI as a multiplier. Every line of code is hand-tuned, but our cost base is a fraction of a Toronto agency's. We pass the delta straight through.</div>
      </details>
      <details class="faq-item">
        <summary>You said Canadian-owned, but built in Medellín. How does that work? <span class="ico">+</span></summary>
        <div class="ans">You're working with a Canadian-owned studio operating from Medellín. Pricing in CAD or USD, payment by credit card, Apple Pay, or direct wire via our Wise Business account. Contracts in English, signed digitally, governed by the laws of your home province (or Ontario by default). The build team is in Medellín, same English-speaking time zone, same business norms, no offshore-handoff awkwardness.</div>
      </details>
      <details class="faq-item">
        <summary>What does "powered by Anthropic AI" actually mean for me? <span class="ico">+</span></summary>
        <div class="ans">Claude, Anthropic's flagship model, is used through every step of design and build, the same way modern engineering teams use it internally. It doesn't replace the designer or the developer; it makes them dramatically faster. The result is a hand-crafted site delivered in 48 hours instead of six weeks. You're not buying AI-generated slop, you're buying senior craft accelerated by serious tooling.</div>
      </details>
      <details class="faq-item">
        <summary>What if I don't like the first version? <span class="ico">+</span></summary>
        <div class="ans">Two rounds of revisions are included on Essential, four on Pro. We work fast, most revisions ship the same day. If after revisions you're still not satisfied, our 30-day post-launch guarantee covers you (see next).</div>
      </details>
      <details class="faq-item">
        <summary>Is there a money-back guarantee? <span class="ico">+</span></summary>
        <div class="ans">Yes. If you're not happy with the launched site for any reason within 30 days, we take it offline and refund the full fee within 14 days. No questions, no haggling. We also hand you a portable archive of the work in case you want to take it elsewhere. After 30 days the fee is non-refundable, but ongoing hosting is always month-to-month and cancellable anytime.</div>
      </details>
      <details class="faq-item">
        <summary>How does payment work? <span class="ico">+</span></summary>
        <div class="ans"><span class="ml-en">30% deposit to start (we don't begin design or development until the deposit clears) and 70% on launch (we hold the finished site on a staging URL and don't connect your domain until the balance lands). NA clients pay via Wise Business: credit card, Apple Pay, Google Pay, or direct wire in CAD or USD. Latin American clients pay via Wompi: card, PSE, or bank transfer in COP.</span><span class="ml-es">30% de depósito para empezar (no iniciamos diseño ni desarrollo hasta que el depósito se confirma) y 70% al lanzar (mantenemos el sitio terminado en una URL de staging y no conectamos su dominio hasta que el saldo llega). Clientes en Colombia pagan vía Wompi: tarjeta, PSE o transferencia bancaria en COP. Clientes en Norteamérica pagan vía Wise Business en CAD o USD.</span></div>
      </details>
      <details class="faq-item">
        <summary>Do I own the site? Can I move it later? <span class="ico">+</span></summary>
        <div class="ans">You own everything. Source code, copy, designs, domain. If you ever want to leave, we package the full source as a portable archive, it'll run on any host that supports Cloudflare Workers, Netlify, Vercel, or even a basic static server. We don't lock you in.</div>
      </details>
      <details class="faq-item">
        <summary>Can you do French / bilingual sites? <span class="ico">+</span></summary>
        <div class="ans">Yes, bilingual EN/FR is included in the Pro tier. We handle the translation, the language toggle, the SEO hreflang tags, and the OG metadata for both languages. Quebec-compliant by design.</div>
      </details>
      <details class="faq-item">
        <summary>What about ongoing updates after launch? <span class="ico">+</span></summary>
        <div class="ans">Hosting is $15/mo (or $180/yr) after the included period. Ad-hoc edits are billed at $75/hr with a 30-min minimum. If you want regular updates, the optional maintenance add-on is $35/mo on top of hosting and covers monthly content updates, security patches, and minor design adjustments.</div>
      </details>
      <details class="faq-item">
        <summary>Do you do e-commerce integration? <span class="ico">+</span></summary>
        <div class="ans">Yes. We integrate any major payment processor into your site, Stripe, PayPal, Square, Wise, or Wompi for Latin American businesses. You provide your own merchant account, we build the checkout flow. For straightforward catalogs (under 50 products), this is included in the Pro tier. For full Shopify-replacement projects, that's a custom quote, but typically lands at $1,500–2,500 CAD vs. an agency's $10,000+.</div>
      </details>
    </div>
  </div>
</section>

<!-- ─── Final CTA ─── -->
<section class="cta-final" id="cta-final">
  <div class="inner">
    <span class="eyebrow"><span class="dot live"></span><span class="ml-en">Have questions first?</span><span class="ml-es">¿Tiene preguntas?</span></span>
    <h2><span class="ml-en">Not sure which tier? <span class="accent">Let's talk.</span></span><span class="ml-es">¿Dudas sobre el plan? <span class="accent">Hablemos.</span></span></h2>
    <p><span class="ml-en">If you'd rather chat before paying, book a 20-minute call or email us. No sales pressure. We'll point you to the right tier and answer anything technical.</span><span class="ml-es">Si prefiere hablar antes de pagar, agende una llamada de 20 minutos o escríbanos. Sin presión de ventas. Le indicamos el plan correcto y resolvemos cualquier duda técnica.</span></p>
    <div class="btn-row">
      <!-- TODO: replace with real Cal.com / Calendly link -->
      <a href="https://cal.com/pymewebpro/discovery" class="btn btn-accent"><span class="ml-en">Schedule a 20-min call</span><span class="ml-es">Agendar llamada de 20 min</span> <span class="arrow">→</span></a>
      <a href="mailto:hello@pymewebpro.com" class="btn btn-outline"><span class="ml-en">Email hello@pymewebpro.com</span><span class="ml-es">Escribir a hola@pymewebpro.com</span></a>
    </div>
    <div class="meta">
      <div class="item"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span class="ml-en">20-min call</span><span class="ml-es">Llamada de 20 min</span></div>
      <div class="item"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span class="ml-en">Zero sales pressure</span><span class="ml-es">Cero presión de ventas</span></div>
      <div class="item"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span class="ml-en">Or just buy above</span><span class="ml-es">O compre arriba</span></div>
    </div>
  </div>
</section>

<!-- ─── Footer ─── -->
<footer>
  <div class="foot-grid">
    <div class="foot-brand">
      <a href="#" class="logo" aria-label="PymeWebPro home">
        <span class="br">&lt;</span><span class="word">pymewebpro</span><span class="br">/&gt;</span>
      </a>
      <p><span class="ml-en">Canadian-led web studio building enterprise-grade sites for SMBs across North America and Latin America. Hand-crafted in Medellín, deployed on Cloudflare's global edge.</span><span class="ml-es">Estudio web liderado por canadiense que construye sitios nivel enterprise para pymes en Norteamérica y Latinoamérica. Hecho a mano en Medellín, desplegado en la red edge global de Cloudflare.</span></p>
      <div class="addr">
        <span class="ml-en">Norte Sur Consulting S.A.S.<br>NIT 901.956.771-1<br>hello@pymewebpro.com</span>
        <span class="ml-es">Norte Sur Consulting S.A.S.<br>NIT 901.956.771-1<br>hola@pymewebpro.com</span>
      </div>
    </div>
    <div class="foot-col">
      <h5><span class="ml-en">Product</span><span class="ml-es">Producto</span></h5>
      <ul>
        <li><a href="#pricing"><span class="ml-en">Pricing</span><span class="ml-es">Precios</span></a></li>
        <li><a href="#stack"><span class="ml-en">Tech Stack</span><span class="ml-es">Tecnología</span></a></li>
        <li><a href="#process"><span class="ml-en">Process</span><span class="ml-es">Proceso</span></a></li>
        <li><a href="#portfolio"><span class="ml-en">Recent Work</span><span class="ml-es">Trabajo reciente</span></a></li>
        <li><a href="#faq"><span class="ml-en">FAQ</span><span class="ml-es">Preguntas</span></a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5><span class="ml-en">Studio</span><span class="ml-es">Estudio</span></h5>
      <ul>
        <li><a href="#"><span class="ml-en">About</span><span class="ml-es">Acerca</span></a></li>
        <li><a href="#"><span class="ml-en">Why Medellín</span><span class="ml-es">Por qué Medellín</span></a></li>
        <li><a href="#"><span class="ml-en">Powered by Anthropic</span><span class="ml-es">Impulsado por Anthropic</span></a></li>
        <li><a href="#"><span class="ml-en">Press</span><span class="ml-es">Prensa</span></a></li>
        <li><a href="#cta-final"><span class="ml-en">Contact</span><span class="ml-es">Contacto</span></a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Legal</h5>
      <ul>
        <li><a href="#">Privacy Policy (PIPEDA)</a></li>
        <li><a href="#">Terms of Service</a></li>
        <li><a href="#">Master Services Agreement</a></li>
        <li><a href="#">Acceptable Use</a></li>
        <li><a href="#">Status</a></li>
      </ul>
    </div>
  </div>

  <div class="locations">
    <div class="loc">
      <div class="ico">CA</div>
      <div>
        <div class="h">London, Ontario</div>
        <div class="city"><span class="ml-en">Canada</span><span class="ml-es">Canadá</span></div>
        <div class="role"><span class="ml-en">North American operations · client communications · contracts &amp; billing in CAD/USD via Wise.</span><span class="ml-es">Operaciones en Norteamérica · comunicación con clientes · contratos y facturación en CAD/USD vía Wise.</span></div>
      </div>
    </div>
    <div class="loc">
      <div class="ico">CO</div>
      <div>
        <div class="h">Medellín, Antioquia</div>
        <div class="city"><span class="ml-en">Colombia</span><span class="ml-es">Colombia</span></div>
        <div class="role"><span class="ml-en">Build studio · design, code &amp; deploy · Latin American clients billed in COP via Wompi.</span><span class="ml-es">Estudio de producción · diseño, código y despliegue · clientes latinoamericanos facturados en COP vía Wompi.</span></div>
      </div>
    </div>
  </div>

  <div class="foot-bot">
    <div><span class="ml-en">© 2026 Norte Sur Consulting S.A.S. (DBA PymeWebPro) · All rights reserved.</span><span class="ml-es">© 2026 Norte Sur Consulting S.A.S. (DBA PymeWebPro) · Todos los derechos reservados.</span></div>
    <div class="stack">
      <span>Cloudflare Workers</span><span>·</span><span>Anthropic</span><span>·</span><span>Hand-coded HTML</span>
    </div>
  </div>
</footer>

<script>
(function(){
  var saved = localStorage.getItem('pwp-lang');
  var browser = (navigator.language || 'en').slice(0,2).toLowerCase();
  var lang = saved || (browser === 'es' ? 'es' : 'en');
  document.documentElement.classList.remove('lang-en','lang-es');
  document.documentElement.classList.add('lang-' + lang);
  document.documentElement.lang = lang;
  function syncLangButtons(l){
    document.querySelectorAll('.lang-toggle button').forEach(function(x){
      x.classList.toggle('on', x.getAttribute('data-l') === l);
    });
  }
  syncLangButtons(lang);
  document.querySelectorAll('.lang-toggle button').forEach(function(b){
    b.addEventListener('click', function(){
      var l = b.getAttribute('data-l');
      document.documentElement.classList.remove('lang-en','lang-es');
      document.documentElement.classList.add('lang-' + l);
      document.documentElement.lang = l;
      localStorage.setItem('pwp-lang', l);
      syncLangButtons(l);
    });
  });
})();
(function(){
  var body = document.body;
  var toggle = document.getElementById('navToggle');
  var drawer = document.getElementById('navDrawer');
  var scrim = document.getElementById('navScrim');
  var closeBtn = document.getElementById('navClose');
  if(!toggle || !drawer) return;
  function open(){ body.classList.add('nav-open'); toggle.setAttribute('aria-expanded','true'); drawer.setAttribute('aria-hidden','false'); }
  function close(){ body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded','false'); drawer.setAttribute('aria-hidden','true'); }
  toggle.addEventListener('click', function(){ body.classList.contains('nav-open') ? close() : open(); });
  if(closeBtn) closeBtn.addEventListener('click', close);
  if(scrim) scrim.addEventListener('click', close);
  document.querySelectorAll('[data-nav-close]').forEach(function(a){ a.addEventListener('click', close); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && body.classList.contains('nav-open')) close(); });
})();
</script>
</body>
</html>

`;
