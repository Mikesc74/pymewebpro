// manual-mockups-espaciodental.js — auto-rebuilt by scripts/rebuild-mockups.mjs
// Source: manual-mockups/espacio-dental/index.html
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["espacio-dental"].

export const espacioDentalHtml = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Espacio Dental, English-Speaking Dentists in Itagüí, Medellín · CES Graduates</title>
<meta name="description" content="Modern dental clinic in Itagüí, Medellín. CES-graduated dentists, English-speaking team, international standards. Cosmetic dentistry, smile design, whitening, orthodontics. Free first consultation. Book on WhatsApp.">
<meta name="theme-color" content="#2DB5A8">
<meta property="og:title" content="Espacio Dental, Modern Dentistry for Expats in Medellín">
<meta property="og:description" content="CES-graduated, English-speaking dentists in Itagüí. Smile design, whitening, ceramic veneers. Free consultation.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://images.pexels.com/photos/6809642/pexels-photo-6809642.jpeg?auto=compress&cs=tinysrgb&h=650&w=940">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;max-width:100%}
:root{
  --teal:#2DB5A8;
  --teal-deep:#1A8A80;
  --teal-50:#EDF8F6;
  --teal-100:#D4F0EC;
  --navy:#1F4FA8;
  --navy-deep:#163C82;
  --navy-50:#EEF2FB;
  --ink:#0B1B2C;
  --slate:#3F5469;
  --gray:#6B7E92;
  --line:#E5E9EE;
  --paper:#F8FAFB;
  --bg:#FFFFFF;
  --display:'Manrope',-apple-system,BlinkMacSystemFont,sans-serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --max:1280px;
  --gutter:clamp(20px,4vw,52px);
  --r:14px;
  --r-sm:8px;
  --shadow:0 4px 24px rgba(11,27,44,0.06);
  --shadow-lg:0 12px 48px rgba(11,27,44,0.08);
}
body{
  font-family:var(--sans);
  background:var(--bg);
  color:var(--ink);
  font-size:15.5px;
  line-height:1.6;
  font-weight:400;
  overflow-x:hidden;
}
a{color:inherit;text-decoration:none}
img,svg{max-width:100%;display:block}
button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit}
.container{max-width:var(--max);margin:0 auto;padding-left:var(--gutter);padding-right:var(--gutter)}
h1,h2,h3,h4{font-family:var(--display);font-weight:700;letter-spacing:-0.022em;color:var(--ink)}
.eyebrow{
  display:inline-flex;align-items:center;gap:10px;
  font-family:var(--display);font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--teal-deep);
}
.eyebrow::before{content:"";width:24px;height:2px;background:var(--teal);border-radius:1px}
.eyebrow.navy{color:var(--navy-deep)}
.eyebrow.navy::before{background:var(--navy)}
.eyebrow.white{color:var(--teal-100)}
.eyebrow.white::before{background:var(--teal-100)}

/* ─── Top bar ─────────────────────────────────────────── */
.topbar{
  background:var(--ink);color:#fff;
  padding:9px 20px;
  font-size:12.5px;
  display:flex;justify-content:center;align-items:center;gap:18px;flex-wrap:wrap;
  font-weight:500;
}
.topbar .pill{display:inline-flex;align-items:center;gap:8px;color:rgba(255,255,255,0.85)}
.topbar .pill svg{flex-shrink:0}
.topbar .pill strong{color:var(--teal-100);font-weight:600}
.topbar .sep{opacity:0.3}
@media (max-width:680px){.topbar{font-size:11.5px}.topbar .sep{display:none}}

/* ─── Header ─────────────────────────────────────────── */
.header{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,0.95);
  backdrop-filter:blur(18px) saturate(160%);
  -webkit-backdrop-filter:blur(18px) saturate(160%);
  border-bottom:1px solid var(--line);
}
.header-inner{
  max-width:var(--max);margin:0 auto;
  padding:14px var(--gutter);
  display:flex;align-items:center;gap:30px;
}
.logo{display:flex;align-items:center;gap:12px;flex-shrink:0}
.logo .mark{
  width:44px;height:44px;flex-shrink:0;
  background:radial-gradient(circle at 30% 30%,#fff 0%,var(--teal-50) 70%);
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
  box-shadow:0 0 0 1.5px var(--teal);
}
.logo .mark::after{
  content:"";position:absolute;left:-3px;right:-3px;top:46%;height:8px;
  background:var(--navy);
  transform:rotate(-18deg);border-radius:50%;
  border:1.5px solid var(--bg);
}
.logo .mark svg{position:relative;z-index:2}
.logo .name{display:flex;flex-direction:column;line-height:1.05}
.logo .name .l1{font-family:var(--display);font-weight:700;font-size:18px;color:var(--ink);letter-spacing:-0.018em}
.logo .name .l2{font-size:10.5px;color:var(--gray);font-weight:500;margin-top:1px;letter-spacing:0.1em;text-transform:uppercase}
.nav{display:flex;align-items:center;gap:30px;margin-left:auto}
.nav a{
  font-size:14px;font-weight:500;color:var(--slate);
  transition:color .2s;
}
.nav a:hover{color:var(--teal-deep)}
.lang{
  display:inline-flex;align-items:center;gap:4px;
  font-size:12.5px;font-weight:600;color:var(--ink);
  border:1px solid var(--line);border-radius:999px;
  padding:5px 4px 5px 12px;
}
.lang .flag{
  width:22px;height:22px;border-radius:50%;background:var(--teal);color:#fff;
  display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;
}
.cta-pill{
  display:inline-flex;align-items:center;gap:9px;
  padding:11px 20px;border-radius:999px;
  background:var(--teal);color:#fff;
  font-size:13.5px;font-weight:700;letter-spacing:-0.005em;
  transition:all .2s;box-shadow:0 4px 14px rgba(45,181,168,0.3);
}
.cta-pill:hover{background:var(--teal-deep);transform:translateY(-1px);box-shadow:0 6px 18px rgba(45,181,168,0.4)}
.cta-pill svg{flex-shrink:0}
.nav .navlinks{display:flex;gap:28px;align-items:center}
.menu-toggle{display:none;font-size:13px;font-weight:600;color:var(--ink);margin-left:auto}
@media (max-width:980px){
  .nav .navlinks{display:none}
  .menu-toggle{display:inline-block}
  .nav .lang{display:none}
}

/* ─── Hero ─────────────────────────────────────────── */
.hero{
  background:linear-gradient(180deg, var(--teal-50) 0%, var(--bg) 100%);
  padding:clamp(50px,7vw,90px) 0 clamp(60px,8vw,110px);
  position:relative;overflow:hidden;
}
.hero::before{
  content:"";position:absolute;top:-40px;right:-100px;width:520px;height:520px;
  background:radial-gradient(circle,rgba(45,181,168,0.18) 0%,transparent 65%);
  pointer-events:none;
}
.hero-grid{
  position:relative;z-index:2;
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:1.1fr 1fr;gap:60px;align-items:center;
}
.hero-copy .badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.hero-copy .badge{
  display:inline-flex;align-items:center;gap:8px;
  padding:6px 12px 6px 8px;border-radius:999px;
  background:#fff;border:1px solid var(--line);
  font-size:12px;font-weight:600;color:var(--ink);
  box-shadow:var(--shadow);
}
.hero-copy .badge .dot{width:8px;height:8px;border-radius:50%;background:var(--teal);flex-shrink:0}
.hero-copy .badge .dot.navy{background:var(--navy)}
.hero-copy h1{
  font-family:var(--display);font-weight:800;
  font-size:clamp(38px,5.4vw,68px);
  line-height:1.02;letter-spacing:-0.03em;color:var(--ink);
}
.hero-copy h1 .accent{
  color:var(--teal-deep);position:relative;display:inline-block;
}
.hero-copy h1 .accent::after{
  content:"";position:absolute;left:0;right:0;bottom:0.06em;height:0.18em;
  background:var(--teal);opacity:0.25;border-radius:4px;z-index:-1;
}
.hero-copy h1 .navy{color:var(--navy)}
.hero-copy p.lede{
  margin-top:24px;font-size:17px;line-height:1.55;color:var(--slate);max-width:540px;font-weight:400;
}
.hero-cta{margin-top:34px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:15px 28px;border-radius:999px;
  font-family:var(--display);font-size:14.5px;font-weight:700;letter-spacing:-0.005em;
  cursor:pointer;transition:all .2s;border:1.5px solid transparent;white-space:nowrap;
}
.btn-primary{background:var(--teal);color:#fff;border-color:var(--teal);box-shadow:0 6px 20px rgba(45,181,168,0.3)}
.btn-primary:hover{background:var(--teal-deep);border-color:var(--teal-deep);transform:translateY(-1px)}
.btn-navy{background:var(--navy);color:#fff;border-color:var(--navy)}
.btn-navy:hover{background:var(--navy-deep);border-color:var(--navy-deep)}
.btn-wa{background:#25D366;color:#fff;border-color:#25D366}
.btn-wa:hover{background:#1FB155;border-color:#1FB155}
.btn-outline{background:#fff;color:var(--ink);border-color:var(--line)}
.btn-outline:hover{border-color:var(--teal);color:var(--teal-deep)}
.hero-trust{margin-top:38px;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
.hero-trust .stars{color:#F5A623;font-size:18px;letter-spacing:1px}
.hero-trust .meta{font-size:13px;color:var(--slate);font-weight:500}
.hero-trust .meta strong{color:var(--ink);font-weight:700}

.hero-photo{
  position:relative;aspect-ratio:4/5;border-radius:24px;overflow:hidden;
  box-shadow:var(--shadow-lg);
}
.hero-photo img{width:100%;height:100%;object-fit:cover}
.hero-photo .float-card{
  position:absolute;left:18px;bottom:18px;right:18px;
  background:rgba(255,255,255,0.96);backdrop-filter:blur(12px);
  border-radius:14px;padding:16px 18px;
  display:flex;align-items:center;gap:14px;
  box-shadow:0 8px 24px rgba(11,27,44,0.18);
}
.hero-photo .float-card .ico{
  width:42px;height:42px;border-radius:50%;background:var(--teal-50);color:var(--teal-deep);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.hero-photo .float-card .txt h5{font-size:14px;font-weight:700;color:var(--ink);font-family:var(--display);letter-spacing:-0.012em;line-height:1.2}
.hero-photo .float-card .txt p{font-size:12.5px;color:var(--slate);margin-top:2px;line-height:1.3}

@media (max-width:980px){
  .hero-grid{grid-template-columns:1fr;gap:40px}
  .hero-photo{aspect-ratio:4/3;max-width:520px;margin:0 auto}
}

/* ─── Trust strip ─────────────────────────────────────────── */
.trust{
  background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  padding:32px 0;
}
.trust-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:repeat(5,1fr);gap:30px;align-items:center;
}
.trust-item{
  display:flex;align-items:center;gap:12px;
  font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.3;
}
.trust-item .ico{
  width:36px;height:36px;border-radius:10px;background:var(--teal-50);color:var(--teal-deep);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.trust-item small{display:block;font-size:11.5px;color:var(--gray);font-weight:500;margin-top:1px}
@media (max-width:880px){.trust-grid{grid-template-columns:repeat(2,1fr);gap:24px}}

/* ─── Section base ─────────────────────────────────────── */
section{padding:clamp(70px,9vw,120px) 0}
.section-head{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:60px;max-width:760px;margin-left:auto;margin-right:auto}
.section-head .eyebrow{margin-bottom:18px}
.section-head h2{
  font-family:var(--display);font-weight:800;
  font-size:clamp(32px,4.4vw,52px);line-height:1.05;letter-spacing:-0.028em;
}
.section-head h2 .accent{color:var(--teal-deep)}
.section-head h2 .navy{color:var(--navy)}
.section-head p{margin-top:18px;font-size:16px;line-height:1.6;color:var(--slate);max-width:580px}

/* ─── Services ─────────────────────────────────────────── */
.services{background:var(--bg)}
.svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.svc-card{
  background:#fff;border:1px solid var(--line);border-radius:var(--r);
  padding:32px 28px 30px;
  transition:all .25s;cursor:pointer;
  display:flex;flex-direction:column;
  position:relative;
}
.svc-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--teal-100)}
.svc-card .ico{
  width:54px;height:54px;border-radius:14px;
  background:linear-gradient(135deg, var(--teal-50), var(--teal-100));
  color:var(--teal-deep);
  display:flex;align-items:center;justify-content:center;
  margin-bottom:24px;
}
.svc-card.navy .ico{background:linear-gradient(135deg, var(--navy-50), #DCE5F5);color:var(--navy)}
.svc-card h3{font-family:var(--display);font-weight:700;font-size:20px;letter-spacing:-0.018em;line-height:1.2;color:var(--ink)}
.svc-card .es{font-size:12.5px;color:var(--gray);font-weight:500;margin-top:4px;font-style:italic}
.svc-card p{margin-top:14px;font-size:14.5px;line-height:1.6;color:var(--slate);font-weight:400;flex:1}
.svc-card .price{
  margin-top:22px;padding-top:18px;border-top:1px dashed var(--line);
  display:flex;justify-content:space-between;align-items:baseline;
}
.svc-card .price .from{font-size:11.5px;color:var(--gray);font-weight:500;letter-spacing:0.04em;text-transform:uppercase}
.svc-card .price .amt{font-family:var(--display);font-weight:700;font-size:18px;color:var(--ink);letter-spacing:-0.012em}
.svc-card .price .amt small{color:var(--teal-deep);font-weight:600;font-size:12.5px;margin-left:4px}
@media (max-width:980px){.svc-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:620px){.svc-grid{grid-template-columns:1fr}}

/* ─── Why expats ─────────────────────────────────────── */
.why{background:var(--ink);color:#fff;position:relative;overflow:hidden}
.why::before{
  content:"";position:absolute;top:-200px;right:-200px;width:600px;height:600px;
  background:radial-gradient(circle,rgba(45,181,168,0.15) 0%,transparent 65%);
}
.why .container{position:relative;z-index:2}
.why .section-head h2{color:#fff}
.why .section-head h2 .accent{color:var(--teal)}
.why .section-head p{color:rgba(255,255,255,0.7)}
.why-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:60px;align-items:center;margin-top:30px}
.why-list{display:flex;flex-direction:column;gap:18px}
.why-item{
  display:flex;gap:18px;
  padding:22px 24px;border-radius:var(--r);
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
  transition:all .25s;
}
.why-item:hover{background:rgba(255,255,255,0.07);border-color:var(--teal)}
.why-item .num{
  font-family:var(--display);font-weight:800;font-size:24px;color:var(--teal);
  flex-shrink:0;width:42px;height:42px;border-radius:50%;
  background:rgba(45,181,168,0.15);
  display:flex;align-items:center;justify-content:center;
}
.why-item .body h4{font-family:var(--display);font-weight:700;font-size:17px;color:#fff;letter-spacing:-0.012em;line-height:1.2}
.why-item .body p{font-size:14px;color:rgba(255,255,255,0.7);margin-top:6px;line-height:1.55}
.why-photo{position:relative;aspect-ratio:4/5;border-radius:var(--r);overflow:hidden}
.why-photo img{width:100%;height:100%;object-fit:cover;filter:saturate(0.95)}
.why-photo .stat-card{
  position:absolute;left:20px;bottom:20px;right:20px;
  background:rgba(11,27,44,0.85);backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:14px;padding:18px 22px;
}
.why-photo .stat-card .v{font-family:var(--display);font-weight:800;font-size:32px;color:var(--teal);letter-spacing:-0.025em;line-height:1}
.why-photo .stat-card .l{font-size:12.5px;color:rgba(255,255,255,0.75);margin-top:6px;letter-spacing:0.02em}
@media (max-width:980px){.why-grid{grid-template-columns:1fr;gap:40px}.why-photo{aspect-ratio:4/3;max-width:520px;margin:0 auto}}

/* ─── Pricing ─────────────────────────────────────── */
.pricing{background:var(--paper)}
.price-card{
  background:#fff;border-radius:var(--r);overflow:hidden;
  box-shadow:var(--shadow);
  border:1px solid var(--line);
}
.price-head{
  background:linear-gradient(135deg, var(--navy), var(--navy-deep));
  color:#fff;padding:22px 28px;
  display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:20px;align-items:center;
  font-family:var(--display);font-weight:700;font-size:13.5px;letter-spacing:0.04em;text-transform:uppercase;
}
.price-head .savings{color:var(--teal-100);text-align:right}
.price-row{
  display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:20px;align-items:center;
  padding:20px 28px;border-top:1px solid var(--line);
  transition:background .2s;
}
.price-row:hover{background:var(--teal-50)}
.price-row .name{font-family:var(--display);font-weight:600;font-size:16px;color:var(--ink);letter-spacing:-0.012em}
.price-row .name small{display:block;font-family:var(--sans);font-size:12.5px;color:var(--gray);font-weight:400;margin-top:2px;font-style:italic}
.price-row .us{font-family:var(--display);color:var(--gray);font-weight:600;font-size:15px;text-decoration:line-through;text-decoration-color:rgba(107,126,146,0.4)}
.price-row .ours{font-family:var(--display);color:var(--ink);font-weight:800;font-size:22px;letter-spacing:-0.018em}
.price-row .save{font-family:var(--display);color:#fff;font-weight:700;font-size:13px;text-align:right;letter-spacing:0.02em}
.price-row .save span{display:inline-block;background:var(--teal);padding:4px 12px;border-radius:999px}
.price-foot{
  padding:20px 28px;background:var(--teal-50);border-top:1px solid var(--line);
  font-size:13px;color:var(--slate);text-align:center;font-weight:500;
}
.price-foot strong{color:var(--teal-deep)}
@media (max-width:780px){
  .price-head{display:none}
  .price-row{grid-template-columns:1fr;gap:8px;padding:18px 20px}
  .price-row .us::before{content:"US ";font-size:11px;color:var(--gray);font-weight:500}
  .price-row .ours::before{content:"Espacio Dental: ";font-size:13px;color:var(--gray);font-weight:500}
  .price-row .save{text-align:left}
}

/* ─── Smile gallery ─────────────────────────────────── */
.gallery{background:var(--bg)}
.gal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.gal-item{
  position:relative;aspect-ratio:1/1;border-radius:var(--r);overflow:hidden;
  box-shadow:var(--shadow);
  cursor:pointer;
}
.gal-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.gal-item:hover img{transform:scale(1.05)}
.gal-item .lbl{
  position:absolute;left:14px;bottom:14px;
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(255,255,255,0.96);backdrop-filter:blur(12px);
  padding:7px 14px;border-radius:999px;
  font-size:12px;font-weight:700;color:var(--ink);
  font-family:var(--display);letter-spacing:-0.005em;
}
.gal-item .lbl .dot{width:6px;height:6px;border-radius:50%;background:var(--teal)}
.gal-item .tag{
  position:absolute;right:14px;top:14px;
  background:var(--teal);color:#fff;
  padding:5px 11px;border-radius:999px;
  font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;
  font-family:var(--display);
}
.gal-item .tag.navy{background:var(--navy)}
@media (max-width:780px){.gal-grid{grid-template-columns:repeat(2,1fr);gap:14px}}
@media (max-width:480px){.gal-grid{grid-template-columns:1fr}}

/* ─── Team ─────────────────────────────────────────── */
.team{background:var(--paper)}
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:20px}
.team-card{
  background:#fff;border:1px solid var(--line);border-radius:var(--r);
  padding:28px;text-align:center;
  transition:all .25s;
}
.team-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}
.team-card .ph{
  width:120px;height:120px;border-radius:50%;background:var(--teal-50);
  margin:0 auto 18px;overflow:hidden;
  border:3px solid #fff;box-shadow:0 0 0 2px var(--teal-100);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-weight:800;font-size:36px;color:var(--teal-deep);
}
.team-card h4{font-family:var(--display);font-weight:700;font-size:18px;letter-spacing:-0.018em;color:var(--ink)}
.team-card .role{font-size:13.5px;color:var(--teal-deep);font-weight:600;margin-top:4px;letter-spacing:0.02em}
.team-card .creds{
  margin-top:12px;display:inline-flex;flex-wrap:wrap;gap:6px;justify-content:center;
}
.team-card .creds span{font-size:11px;background:var(--teal-50);color:var(--teal-deep);padding:4px 10px;border-radius:999px;font-weight:600;letter-spacing:0.02em}
.team-card .bio{margin-top:14px;font-size:13.5px;color:var(--slate);line-height:1.55}
@media (max-width:980px){.team-grid{grid-template-columns:1fr;gap:20px;max-width:480px;margin-left:auto;margin-right:auto}}

/* ─── Reviews ──────────────────────────────────────── */
.reviews{background:var(--bg)}
.rev-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.rev-card{
  background:#fff;border:1px solid var(--line);border-radius:var(--r);
  padding:28px;
  display:flex;flex-direction:column;gap:16px;
}
.rev-card .stars{color:#F5A623;font-size:16px;letter-spacing:1px}
.rev-card blockquote{font-size:15.5px;line-height:1.6;color:var(--ink);font-weight:400;flex:1}
.rev-card .author{display:flex;align-items:center;gap:12px;padding-top:16px;border-top:1px solid var(--line)}
.rev-card .author .av{
  width:42px;height:42px;border-radius:50%;background:var(--teal);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-weight:700;font-size:15px;flex-shrink:0;
}
.rev-card .author .av.navy{background:var(--navy)}
.rev-card .author .name{font-family:var(--display);font-weight:700;font-size:14.5px;color:var(--ink);letter-spacing:-0.012em}
.rev-card .author .meta{font-size:12px;color:var(--gray);margin-top:1px}
.rev-card .src{
  display:inline-flex;align-items:center;gap:6px;
  font-size:11px;color:var(--gray);font-weight:500;letter-spacing:0.02em;text-transform:uppercase;
}
@media (max-width:980px){.rev-grid{grid-template-columns:1fr;max-width:520px;margin:0 auto}}

/* ─── Location & Booking ─────────────────────────── */
.book{background:linear-gradient(135deg, var(--teal-50) 0%, var(--bg) 100%);position:relative;overflow:hidden}
.book::before{content:"";position:absolute;bottom:-100px;left:-150px;width:500px;height:500px;background:radial-gradient(circle,rgba(45,181,168,0.15) 0%,transparent 65%);pointer-events:none}
.book-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start;position:relative}
.book-info h2{font-family:var(--display);font-weight:800;font-size:clamp(32px,4.4vw,48px);line-height:1.05;letter-spacing:-0.028em;color:var(--ink)}
.book-info h2 .accent{color:var(--teal-deep)}
.book-info .eyebrow{margin-bottom:18px;display:inline-flex}
.book-info p.lede{margin-top:18px;font-size:16px;line-height:1.6;color:var(--slate);max-width:480px}
.book-info .info-block{
  margin-top:32px;display:flex;flex-direction:column;gap:18px;
}
.info-row{
  display:flex;gap:16px;align-items:flex-start;
  padding:18px;background:#fff;border:1px solid var(--line);border-radius:var(--r);
}
.info-row .ico{
  width:40px;height:40px;border-radius:10px;background:var(--teal-50);color:var(--teal-deep);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.info-row .ico.navy{background:var(--navy-50);color:var(--navy)}
.info-row .ico.wa{background:#E7F8EE;color:#25D366}
.info-row h5{font-family:var(--display);font-weight:700;font-size:14.5px;color:var(--ink);letter-spacing:-0.012em}
.info-row p{font-size:14px;color:var(--slate);margin-top:3px;line-height:1.5}
.info-row a{color:var(--teal-deep);font-weight:600}
.book-info .socials{margin-top:24px;display:flex;gap:12px;flex-wrap:wrap}
.book-info .socials a{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 16px;background:#fff;border:1px solid var(--line);border-radius:999px;
  font-size:13px;font-weight:600;color:var(--ink);
  transition:all .2s;
}
.book-info .socials a:hover{border-color:var(--teal);color:var(--teal-deep);transform:translateY(-1px)}
.book-info .socials svg{flex-shrink:0}

.book-form{
  background:#fff;border:1px solid var(--line);border-radius:20px;
  padding:36px;box-shadow:var(--shadow-lg);
}
.book-form h3{font-family:var(--display);font-weight:800;font-size:24px;letter-spacing:-0.022em;color:var(--ink)}
.book-form .free{
  display:inline-block;margin-top:6px;
  background:var(--teal-50);color:var(--teal-deep);
  padding:4px 12px;border-radius:999px;
  font-size:12px;font-weight:700;letter-spacing:0.02em;
}
.book-form form{margin-top:24px;display:flex;flex-direction:column;gap:18px}
.book-form .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.book-form .field{display:flex;flex-direction:column;gap:6px}
.book-form .field.full{grid-column:1/-1}
.book-form label{font-family:var(--display);font-size:12px;font-weight:600;color:var(--ink);letter-spacing:0.02em}
.book-form input,
.book-form select,
.book-form textarea{
  background:var(--paper);border:1.5px solid var(--line);border-radius:10px;
  padding:12px 14px;font-size:14.5px;color:var(--ink);
  outline:none;transition:border-color .2s,background .2s;
}
.book-form textarea{min-height:80px;resize:vertical;font-family:inherit;line-height:1.5}
.book-form select{cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%231A8A80' d='M5 6L0 0h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
.book-form input:focus,
.book-form select:focus,
.book-form textarea:focus{border-color:var(--teal);background:#fff}
.book-form .submit-row{margin-top:6px;display:flex;flex-direction:column;gap:10px}
.book-form .submit-row .or{text-align:center;font-size:12px;color:var(--gray);letter-spacing:0.04em;text-transform:uppercase;font-weight:600}
.book-form .or::before,.book-form .or::after{content:"";display:inline-block;width:60px;height:1px;background:var(--line);vertical-align:middle;margin:0 12px}
.book-form .meta{font-size:11.5px;color:var(--gray);text-align:center;margin-top:8px;line-height:1.5}
.book-form .success{
  display:none;margin-top:14px;padding:16px;
  background:var(--teal-50);border:1px solid var(--teal);border-radius:10px;
  color:var(--teal-deep);font-size:14px;font-weight:500;line-height:1.5;
}
.book-form .success.show{display:block}
@media (max-width:980px){
  .book-grid{grid-template-columns:1fr;gap:50px}
  .book-form{padding:28px}
  .book-form .row{grid-template-columns:1fr}
}

/* ─── Footer ─────────────────────────────────────── */
footer{background:var(--ink);color:rgba(255,255,255,0.65);padding:70px 0 24px}
.foot-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:48px;
}
.foot-brand .logo .mark{box-shadow:0 0 0 1.5px var(--teal)}
.foot-brand .logo .name .l1{color:#fff}
.foot-brand p{margin-top:22px;font-size:14px;line-height:1.65;color:rgba(255,255,255,0.6);max-width:340px}
.foot-brand .addr{margin-top:18px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.5)}
.foot-col h5{font-family:var(--display);font-size:13px;font-weight:700;color:#fff;margin-bottom:18px;letter-spacing:-0.005em}
.foot-col ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.foot-col a{font-size:14px;color:rgba(255,255,255,0.6);transition:color .2s}
.foot-col a:hover{color:var(--teal)}
.foot-bot{
  max-width:var(--max);margin:50px auto 0;padding:24px var(--gutter) 0;
  border-top:1px solid rgba(255,255,255,0.1);
  display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;
  font-size:12.5px;color:rgba(255,255,255,0.45);
}
.foot-credit{
  max-width:var(--max);margin:14px auto 0;padding:0 var(--gutter);text-align:center;
  font-size:12px;color:rgba(255,255,255,0.4);letter-spacing:0.04em;
}
.foot-credit a{color:var(--teal);font-weight:600}
@media (max-width:880px){.foot-grid{grid-template-columns:1fr 1fr;gap:36px 28px}}
@media (max-width:520px){.foot-grid{grid-template-columns:1fr}}

/* ─── Float WhatsApp ─────────────────────────────── */
.fab{
  position:fixed;right:22px;bottom:22px;z-index:60;
  width:60px;height:60px;border-radius:50%;
  background:#25D366;color:#fff;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 24px rgba(37,211,102,0.5);
  transition:all .25s;
}
.fab:hover{transform:scale(1.08);background:#1FB155}
.fab::before{
  content:"";position:absolute;inset:-4px;border-radius:50%;
  background:#25D366;opacity:0.4;z-index:-1;
  animation:ripple 2s ease-out infinite;
}
@keyframes ripple{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.5);opacity:0}}

/* ─── Mobile nav drawer ─── */
.menu-toggle{display:none;align-items:center;justify-content:center;width:42px;height:42px;border-radius:8px;background:transparent;border:1px solid #E5E9EE;color:#0B1B2C;cursor:pointer;transition:background .15s,border-color .15s;padding:0;margin-left:auto}
.menu-toggle:hover{border-color:#1E7A8C}
.menu-toggle .bar{display:block;width:18px;height:2px;background:currentColor;border-radius:1px;transition:transform .25s,opacity .2s}
.menu-toggle .bar+.bar{margin-top:4px}
body.nav-open .menu-toggle .bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
body.nav-open .menu-toggle .bar:nth-child(2){opacity:0}
body.nav-open .menu-toggle .bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.nav-scrim{position:fixed;inset:0;background:rgba(0,0,0,0.42);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:1190}
body.nav-open .nav-scrim{opacity:1;visibility:visible}
.nav-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86vw,360px);background:#fff;box-shadow:-20px 0 50px rgba(0,0,0,0.18);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:1200;display:flex;flex-direction:column;overflow-y:auto;color:#0B1B2C}
body.nav-open .nav-drawer{transform:translateX(0)}
.nav-drawer .nd-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #E5E9EE;color:#0B1B2C}
.nav-drawer .nd-close{width:38px;height:38px;border-radius:8px;background:transparent;border:1px solid #E5E9EE;color:#0B1B2C;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;padding:0}
.nav-drawer .nd-close:hover{border-color:#1E7A8C;color:#1E7A8C}
.nav-drawer .nd-links{display:flex;flex-direction:column;padding:14px 22px;gap:0}
.nav-drawer .nd-links a{display:block;padding:14px 4px;font-size:17px;font-weight:600;color:#0B1B2C;border-bottom:1px solid #E5E9EE;text-decoration:none}
.nav-drawer .nd-links a:last-child{border-bottom:none}
.nav-drawer .nd-links a:hover{color:#1E7A8C}
.nav-drawer .nd-foot{margin-top:auto;padding:22px;border-top:1px solid #E5E9EE}
.nav-drawer .nd-foot .cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#1E7A8C;color:#fff;border-radius:10px;font-size:14.5px;font-weight:600;width:100%;text-decoration:none;text-align:center}
@media (max-width:920px){.menu-toggle{display:inline-flex}}
body.nav-open{overflow:hidden}
</style>
</head>
<body>

<div class="topbar">
  <span class="pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> <strong>English-speaking</strong> dentists</span>
  <span class="sep">·</span>
  <span class="pill">Free first consultation</span>
  <span class="sep">·</span>
  <span class="pill">WhatsApp <strong>3052278822</strong></span>
</div>

<header class="header">
  <div class="header-inner">
    <a href="#" class="logo">
      <div class="mark">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 3c-3 0-5 2-5 4 0 1.5.5 2.5.5 4s-1 3.5-1 6c0 2 1 5 2 5s1.5-3 2-3h3c.5 0 1 3 2 3s2-3 2-5c0-2.5-1-4.5-1-6s.5-2.5.5-4c0-2-2-4-5-4z" fill="#2DB5A8" stroke="#1A8A80" stroke-width="0.6"/>
          <circle cx="9" cy="8" r="1.4" fill="#fff" opacity="0.85"/>
        </svg>
      </div>
      <div class="name">
        <span class="l1">Espacio Dental</span>
        <span class="l2">Itagüí · Medellín</span>
      </div>
    </a>
    <button class="menu-toggle" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="navDrawer"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button>
    <nav class="nav">
      <div class="navlinks">
        <a href="#services">Services</a>
        <a href="#why">For Expats</a>
        <a href="#pricing">Pricing</a>
        <a href="#gallery">Smile Gallery</a>
        <a href="#book">Contact</a>
      </div>
      <div class="lang"><span class="flag">EN</span><span style="opacity:0.4">/ES</span></div>
      <a href="#book" class="cta-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 15.46l-2.93-.34c-.61-.07-1.21.14-1.64.57l-2.13 2.13c-3.27-1.66-5.95-4.34-7.61-7.61l2.13-2.13c.43-.43.64-1.03.57-1.64L7.04 5c-.12-.99-.97-1.74-1.97-1.74H3.04c-1.13 0-2.07.94-2 2.07.53 8.54 7.36 15.36 15.89 15.89 1.13.07 2.07-.87 2.07-2v-2.03c0-1-.74-1.85-1.74-1.97z"/></svg>
        Book on WhatsApp
      </a>
    </nav>
  </div>
</header>

<div class="nav-scrim" id="navScrim" aria-hidden="true"></div>
<aside class="nav-drawer" id="navDrawer" role="dialog" aria-label="Navigation" aria-modal="true" aria-hidden="true">
  <div class="nd-head">
    <a href="#" class="logo" aria-label="Espacio Dental"><span class="word">Espacio Dental</span></a>
    <button class="nd-close" id="navClose" aria-label="Close menu">&times;</button>
  </div>
  <div class="nd-links">
    <a href="#services" data-nav-close>Services</a>
    <a href="#team" data-nav-close>Team</a>
    <a href="#why" data-nav-close>Why us</a>
    <a href="#contact" data-nav-close>Contact</a>
  </div>
  <div class="nd-foot">
    <a href="#book" class="cta" data-nav-close>Book a visit</a>
  </div>
</aside>


<!-- ─── Hero ─── -->
<section class="hero">
  <div class="hero-grid">
    <div class="hero-copy">
      <div class="badges">
        <span class="badge"><span class="dot"></span>English-speaking dentists</span>
        <span class="badge"><span class="dot navy"></span>CES University graduates</span>
        <span class="badge"><span class="dot"></span>Hablamos español</span>
      </div>
      <h1>Modern dentistry in Medellín, designed for <span class="accent">people who travel.</span></h1>
      <p class="lede">A boutique dental clinic in Itagüí offering smile design, whitening, ceramic veneers, and orthodontics, at a fraction of US prices and with a team that speaks your language.</p>
      <div class="hero-cta">
        <a href="https://wa.me/573052278822" class="btn btn-wa" target="_blank" rel="noopener">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 22h-.005a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64.001 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z"/></svg>
          Book Free Consultation
        </a>
        <a href="#services" class="btn btn-outline">See Services →</a>
      </div>
      <div class="hero-trust">
        <div class="stars">★★★★★</div>
        <div class="meta"><strong>4.9 / 5</strong> · 180+ reviews from local & international patients</div>
      </div>
    </div>

    <div class="hero-photo">
      <img src="https://images.pexels.com/photos/3762408/pexels-photo-3762408.jpeg?auto=compress&cs=tinysrgb&h=1100&w=900" alt="Patient with confident smile">
      <div class="float-card">
        <div class="ico">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        </div>
        <div class="txt">
          <h5>Free first consultation</h5>
          <p>30-minute valuation, no commitment.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Trust strip ─── -->
<div class="trust">
  <div class="trust-grid">
    <div class="trust-item">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
      <div>CES Graduates<small>Top dental school in CO</small></div>
    </div>
    <div class="trust-item">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
      <div>English-speaking<small>Native-fluency team</small></div>
    </div>
    <div class="trust-item">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg></div>
      <div>Free consultation<small>30-min valuation</small></div>
    </div>
    <div class="trust-item">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
      <div>Same-day booking<small>via WhatsApp</small></div>
    </div>
    <div class="trust-item">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
      <div>USD pricing<small>Transparent, no surprises</small></div>
    </div>
  </div>
</div>

<!-- ─── Services ─── -->
<section class="services" id="services">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Our Services</span>
      <h2>Aesthetic & general dentistry, <span class="accent">done right.</span></h2>
      <p>From a routine cleaning to a full ceramic smile design, every treatment is performed in-house by CES-certified dentists using international-grade materials.</p>
    </div>

    <div class="svc-grid">
      <article class="svc-card">
        <div class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></div>
        <h3>Deep Cleaning</h3>
        <span class="es">Limpieza profunda</span>
        <p>Ultrasonic scaling, polish, and prophylaxis. Removes tartar, plaque, and surface stains in a single 45-minute appointment.</p>
        <div class="price"><span class="from">From</span><span class="amt">$45 <small>USD</small></span></div>
      </article>
      <article class="svc-card">
        <div class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div>
        <h3>Professional Whitening</h3>
        <span class="es">Blanqueamiento</span>
        <p>In-office LED whitening with Opalescence Boost. 6–8 shades brighter in a single 60-minute session, with no sensitivity.</p>
        <div class="price"><span class="from">From</span><span class="amt">$180 <small>USD</small></span></div>
      </article>
      <article class="svc-card navy">
        <div class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/></svg></div>
        <h3>Resin Smile Design</h3>
        <span class="es">Diseño en resina</span>
        <p>Composite resin reshaping for chipped, gapped, or uneven teeth. Same-day results, 100% reversible, no enamel removed.</p>
        <div class="price"><span class="from">From</span><span class="amt">$95 <small>USD / tooth</small></span></div>
      </article>
      <article class="svc-card">
        <div class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>
        <h3>Micro Smile Design</h3>
        <span class="es">Microdiseño en resina</span>
        <p>Subtle, precise touch-ups for those who want refinement without an obvious change. Perfect for chipped edges or minor asymmetries.</p>
        <div class="price"><span class="from">From</span><span class="amt">$60 <small>USD / tooth</small></span></div>
      </article>
      <article class="svc-card navy">
        <div class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg></div>
        <h3>Ceramic Veneers</h3>
        <span class="es">Diseño en cerámica</span>
        <p>Premium e.max porcelain veneers, 0.3mm thick, color-matched, designed digitally and bonded in 2–3 visits over a single week.</p>
        <div class="price"><span class="from">From</span><span class="amt">$320 <small>USD / veneer</small></span></div>
      </article>
      <article class="svc-card">
        <div class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg></div>
        <h3>Orthodontics</h3>
        <span class="es">Ortodoncia · brackets & aligners</span>
        <p>Conventional brackets or clear aligners. Initial scan and treatment plan included. Monthly check-ins, total transparency on timeline.</p>
        <div class="price"><span class="from">From</span><span class="amt">$1.200 <small>USD / full</small></span></div>
      </article>
    </div>
  </div>
</section>

<!-- ─── Why ─── -->
<section class="why" id="why">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow white">For International Patients</span>
      <h2>Why expats choose <span class="accent">Espacio Dental.</span></h2>
      <p>We've built our practice around the kind of care international patients actually want, clear pricing in USD, English-speaking staff, and no high-pressure upselling.</p>
    </div>

    <div class="why-grid">
      <div class="why-list">
        <div class="why-item">
          <div class="num">1</div>
          <div class="body">
            <h4>You won't pay US prices.</h4>
            <p>Same procedures, same materials, 60–80% less. A full smile design that runs $8,000 in the US is around $2,200 here, without compromising on quality.</p>
          </div>
        </div>
        <div class="why-item">
          <div class="num">2</div>
          <div class="body">
            <h4>You won't need a translator.</h4>
            <p>Every dentist on our team speaks fluent English. Treatment plans, consent forms, and post-op care instructions all in writing, in your language.</p>
          </div>
        </div>
        <div class="why-item">
          <div class="num">3</div>
          <div class="body">
            <h4>You're treated by CES graduates.</h4>
            <p>CES University is Colombia's most respected dental school. Our entire team graduated from it, with additional specializations in cosmetic and digital dentistry.</p>
          </div>
        </div>
        <div class="why-item">
          <div class="num">4</div>
          <div class="body">
            <h4>You can fit it into a short visit.</h4>
            <p>Most cosmetic work, whitening, resin design, even ceramic veneers, fits comfortably into a 5-to-10-day stay in Medellín. We schedule around your travel.</p>
          </div>
        </div>
      </div>

      <div class="why-photo">
        <img src="https://images.pexels.com/photos/6809642/pexels-photo-6809642.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900" alt="Modern dental clinic in Itagüí">
        <div class="stat-card">
          <div class="v">$2,200</div>
          <div class="l">Avg. full smile design, vs. $8,000+ in the US</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Pricing ─── -->
<section class="pricing" id="pricing">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow navy">Transparent Pricing · USD</span>
      <h2>What you'd pay back home, <span class="navy">vs. with us.</span></h2>
      <p>Our base prices, side-by-side with average US clinic rates. No hidden fees, no surprise add-ons. We'll quote you in writing before any treatment begins.</p>
    </div>

    <div class="price-card">
      <div class="price-head">
        <div>Treatment</div>
        <div>US Average</div>
        <div>Espacio Dental</div>
        <div class="savings">You Save</div>
      </div>
      <div class="price-row">
        <div class="name">Deep Cleaning + Polish<small>Limpieza profunda</small></div>
        <div class="us">$250</div>
        <div class="ours">$45</div>
        <div class="save"><span>~82%</span></div>
      </div>
      <div class="price-row">
        <div class="name">Professional Whitening<small>Blanqueamiento LED</small></div>
        <div class="us">$650</div>
        <div class="ours">$180</div>
        <div class="save"><span>~72%</span></div>
      </div>
      <div class="price-row">
        <div class="name">Resin Smile Design<small>Per tooth · Diseño en resina</small></div>
        <div class="us">$400</div>
        <div class="ours">$95</div>
        <div class="save"><span>~76%</span></div>
      </div>
      <div class="price-row">
        <div class="name">Ceramic Veneer (e.max)<small>Per tooth · Carilla en cerámica</small></div>
        <div class="us">$1.500</div>
        <div class="ours">$320</div>
        <div class="save"><span>~79%</span></div>
      </div>
      <div class="price-row">
        <div class="name">Full Orthodontic Treatment<small>Brackets convencionales</small></div>
        <div class="us">$5.500</div>
        <div class="ours">$1.200</div>
        <div class="save"><span>~78%</span></div>
      </div>
      <div class="price-row">
        <div class="name">Clear Aligners (Full Treatment)<small>Alineadores transparentes</small></div>
        <div class="us">$5.000</div>
        <div class="ours">$1.800</div>
        <div class="save"><span>~64%</span></div>
      </div>
      <div class="price-foot">
        Prices are referential and may vary based on case complexity. <strong>Final quote in writing</strong> after free consultation. We accept USD cash, all major cards, and bank transfer.
      </div>
    </div>
  </div>
</section>

<!-- ─── Smile gallery ─── -->
<section class="gallery" id="gallery">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Smile Gallery</span>
      <h2>Real patients, <span class="accent">real results.</span></h2>
      <p>A small selection of recent work. All photos shared with patient permission.</p>
    </div>

    <div class="gal-grid">
      <div class="gal-item">
        <img src="https://images.pexels.com/photos/18392646/pexels-photo-18392646.jpeg?auto=compress&cs=tinysrgb&h=700&w=700" alt="Smile design result">
        <span class="tag">Smile Design</span>
        <span class="lbl"><span class="dot"></span>Catalina · Bogotá</span>
      </div>
      <div class="gal-item">
        <img src="https://images.pexels.com/photos/17299920/pexels-photo-17299920.jpeg?auto=compress&cs=tinysrgb&h=700&w=700" alt="Whitening result">
        <span class="tag navy">Whitening</span>
        <span class="lbl"><span class="dot"></span>Mark · USA</span>
      </div>
      <div class="gal-item">
        <img src="https://images.pexels.com/photos/3762441/pexels-photo-3762441.jpeg?auto=compress&cs=tinysrgb&h=700&w=700" alt="Ceramic veneers">
        <span class="tag">Veneers</span>
        <span class="lbl"><span class="dot"></span>Sofía · Medellín</span>
      </div>
      <div class="gal-item">
        <img src="https://images.pexels.com/photos/18156213/pexels-photo-18156213.jpeg?auto=compress&cs=tinysrgb&h=700&w=700" alt="Orthodontic result">
        <span class="tag navy">Orthodontics</span>
        <span class="lbl"><span class="dot"></span>James · UK</span>
      </div>
      <div class="gal-item">
        <img src="https://images.pexels.com/photos/31030876/pexels-photo-31030876.jpeg?auto=compress&cs=tinysrgb&h=700&w=700" alt="Resin design">
        <span class="tag">Resin Design</span>
        <span class="lbl"><span class="dot"></span>Laura · Itagüí</span>
      </div>
      <div class="gal-item">
        <img src="https://images.pexels.com/photos/6896647/pexels-photo-6896647.jpeg?auto=compress&cs=tinysrgb&h=700&w=700" alt="Micro design">
        <span class="tag navy">Micro Design</span>
        <span class="lbl"><span class="dot"></span>Emma · Canada</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── Team ─── -->
<section class="team">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow navy">The Team</span>
      <h2>Three CES graduates, <span class="navy">one shared standard.</span></h2>
      <p>Small team by design. You'll see the same dentist from consultation through follow-up, no rotating chairs, no handoffs.</p>
    </div>

    <div class="team-grid">
      <div class="team-card">
        <div class="ph">VS</div>
        <h4>Dra. Valentina Sánchez</h4>
        <div class="role">Founder · Cosmetic Dentistry</div>
        <div class="creds"><span>CES 2014</span><span>Veneers</span><span>Smile Design</span></div>
        <p class="bio">Trained at CES University and Universidad de Antioquia. Specializes in digital smile design and ceramic veneers. Speaks English and Spanish.</p>
      </div>
      <div class="team-card">
        <div class="ph">CR</div>
        <h4>Dr. Carlos Restrepo</h4>
        <div class="role">Orthodontics</div>
        <div class="creds"><span>CES 2012</span><span>Brackets</span><span>Aligners</span></div>
        <p class="bio">Orthodontic specialist with eight years of clinical practice. Certified Invisalign provider. Speaks fluent English, learned in Toronto.</p>
      </div>
      <div class="team-card">
        <div class="ph">MJ</div>
        <h4>Dra. Mariana Jaramillo</h4>
        <div class="role">General · Aesthetic</div>
        <div class="creds"><span>CES 2017</span><span>Resin</span><span>Whitening</span></div>
        <p class="bio">General and aesthetic dentistry. Lead on whitening protocols and resin design. Bilingual, with patients from across North America and Europe.</p>
      </div>
    </div>
  </div>
</section>

<!-- ─── Reviews ─── -->
<section class="reviews">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">What patients say</span>
      <h2>180+ five-star reviews. <span class="accent">Here are a few.</span></h2>
    </div>

    <div class="rev-grid">
      <div class="rev-card">
        <div class="stars">★★★★★</div>
        <blockquote>"I was nervous about getting veneers abroad. Valentina walked me through every step in perfect English, sent me digital previews before we started, and the result is honestly better than what my dentist in Austin quoted me $14,000 for. Worth the trip."</blockquote>
        <div class="author">
          <div class="av">M</div>
          <div>
            <div class="name">Mark T.</div>
            <div class="meta">Austin, TX · 8 ceramic veneers</div>
          </div>
        </div>
        <div class="src">★ Google Review · Mar 2026</div>
      </div>
      <div class="rev-card">
        <div class="stars">★★★★★</div>
        <blockquote>"Espacio dental me hizo el diseño de sonrisa en una sola semana, antes de mi boda. Valentina y su equipo son cuidadosos, profesionales, y el resultado es exactamente lo que pedí. Mil gracias."</blockquote>
        <div class="author">
          <div class="av navy">S</div>
          <div>
            <div class="name">Sofía R.</div>
            <div class="meta">El Poblado · Diseño de sonrisa</div>
          </div>
        </div>
        <div class="src">★ Google Review · Feb 2026</div>
      </div>
      <div class="rev-card">
        <div class="stars">★★★★★</div>
        <blockquote>"I came down to Medellín for two weeks, planning to just do whitening. Mariana suggested a couple of micro resin touch-ups for $180 total, I said yes, and the difference is incredible. They never pushed me toward anything bigger."</blockquote>
        <div class="author">
          <div class="av">E</div>
          <div>
            <div class="name">Emma K.</div>
            <div class="meta">Toronto, CA · Whitening + resin</div>
          </div>
        </div>
        <div class="src">★ Google Review · Jan 2026</div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Booking + Location ─── -->
<section class="book" id="book">
  <div class="container">
    <div class="book-grid">
      <div class="book-info">
        <span class="eyebrow">Book your visit</span>
        <h2>Free first consultation. <span class="accent">No commitment.</span></h2>
        <p class="lede">Send us a quick message, we'll reply on WhatsApp within a few hours, ask a couple of questions, and book a 30-minute valuation at no cost.</p>

        <div class="info-block">
          <div class="info-row">
            <div class="ico wa"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 22h-.005a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884z"/></svg></div>
            <div>
              <h5>WhatsApp</h5>
              <p><a href="https://wa.me/573052278822" target="_blank" rel="noopener">+57 305 227 8822</a> · Reply within 4 hours, 7 days a week</p>
            </div>
          </div>
          <div class="info-row">
            <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
            <div>
              <h5>Visit us</h5>
              <p>Itagüí · Parque Principal · Cra 50 #51-23, Local 102, Medellín</p>
            </div>
          </div>
          <div class="info-row">
            <div class="ico navy"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
            <div>
              <h5>Hours</h5>
              <p>Mon–Fri 8:00am – 7:00pm · Sat 9:00am – 2:00pm · Closed Sunday</p>
            </div>
          </div>
        </div>

        <div class="socials">
          <a href="https://www.instagram.com/espaciodental_/" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01"/></svg>
            @espaciodental_
          </a>
          <a href="https://www.facebook.com/espaciodentalmed" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
            @espaciodentalmed
          </a>
        </div>
      </div>

      <form class="book-form" onsubmit="event.preventDefault();this.querySelector('.success').classList.add('show');this.querySelector('button[type=submit]').textContent='Sent ✓';this.querySelector('button[type=submit]').disabled=true;">
        <h3>Request a free consultation</h3>
        <span class="free">100% free · No commitment</span>

        <div class="row">
          <div class="field">
            <label>Full name *</label>
            <input type="text" required placeholder="Sarah Wilson">
          </div>
          <div class="field">
            <label>Email *</label>
            <input type="email" required placeholder="sarah@email.com">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>WhatsApp *</label>
            <input type="tel" required placeholder="+1 305 555 0101">
          </div>
          <div class="field">
            <label>Service of interest *</label>
            <select required>
              <option value="">Select a service</option>
              <option>Deep cleaning · Limpieza</option>
              <option>Professional whitening · Blanqueamiento</option>
              <option>Resin smile design · Diseño en resina</option>
              <option>Micro smile design · Microdiseño</option>
              <option>Ceramic veneers · Diseño en cerámica</option>
              <option>Orthodontics · Ortodoncia</option>
              <option>I'm not sure, I'd like advice</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Where are you visiting from?</label>
            <input type="text" placeholder="USA, Canada, EU, Medellín...">
          </div>
          <div class="field">
            <label>Preferred dates</label>
            <input type="text" placeholder="e.g., May 15–25">
          </div>
        </div>

        <div class="field full">
          <label>Anything we should know?</label>
          <textarea placeholder="Past dental work, sensitivities, specific goals, etc."></textarea>
        </div>

        <div class="submit-row">
          <button type="submit" class="btn btn-primary" style="width:100%">Send Request →</button>
          <div class="or">or</div>
          <a href="https://wa.me/573052278822?text=Hola!%20Me%20gustaria%20agendar%20una%20cita%20de%20valoracion." target="_blank" rel="noopener" class="btn btn-wa" style="width:100%">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 22h-.005a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884z"/></svg>
            Chat on WhatsApp
          </a>
        </div>
        <p class="meta">By contacting us you accept our privacy policy. We never share your information.</p>

        <div class="success">Got it, your request was received. We'll reply on WhatsApp within a few hours to confirm your free consultation.</div>
      </form>
    </div>
  </div>
</section>

<!-- ─── Footer ─── -->
<footer>
  <div class="foot-grid">
    <div class="foot-brand">
      <a href="#" class="logo">
        <div class="mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3c-3 0-5 2-5 4 0 1.5.5 2.5.5 4s-1 3.5-1 6c0 2 1 5 2 5s1.5-3 2-3h3c.5 0 1 3 2 3s2-3 2-5c0-2.5-1-4.5-1-6s.5-2.5.5-4c0-2-2-4-5-4z" fill="#2DB5A8" stroke="#1A8A80" stroke-width="0.6"/>
            <circle cx="9" cy="8" r="1.4" fill="#fff" opacity="0.85"/>
          </svg>
        </div>
        <div class="name">
          <span class="l1" style="color:#fff">Espacio Dental</span>
          <span class="l2">Itagüí · Medellín</span>
        </div>
      </a>
      <p>A boutique dental clinic in Itagüí offering modern, English-friendly cosmetic and general dentistry to local and international patients.</p>
      <div class="addr">
        Cra 50 #51-23, Local 102 · Itagüí Parque Principal<br>
        Medellín, Antioquia · Colombia<br>
        WhatsApp: +57 305 227 8822
      </div>
    </div>
    <div class="foot-col">
      <h5>Services</h5>
      <ul>
        <li><a href="#services">Deep Cleaning</a></li>
        <li><a href="#services">Whitening</a></li>
        <li><a href="#services">Resin Design</a></li>
        <li><a href="#services">Ceramic Veneers</a></li>
        <li><a href="#services">Orthodontics</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Clinic</h5>
      <ul>
        <li><a href="#why">For Expats</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#gallery">Smile Gallery</a></li>
        <li><a href="#book">Book Visit</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Connect</h5>
      <ul>
        <li><a href="https://wa.me/573052278822" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="https://www.instagram.com/espaciodental_/" target="_blank" rel="noopener">Instagram</a></li>
        <li><a href="https://www.facebook.com/espaciodentalmed" target="_blank" rel="noopener">Facebook</a></li>
        <li><a href="#">Privacy Policy</a></li>
        <li><a href="#">Habeas Data</a></li>
      </ul>
    </div>
  </div>

  <div class="foot-bot">
    <div>© 2026 Espacio Dental · NIT 901.567.123-4 · Itagüí, Antioquia, Colombia</div>
    <div>Hablamos español · We speak English</div>
  </div>

  <div class="foot-credit">
    Sitio web por <a href="https://pymewebpro.com" rel="noopener">PymeWebPro</a>  ·  <a href="https://pymewebpro.com" rel="noopener" style="opacity:0.85">¿Un sitio así para su negocio? pymewebpro.com →</a>
  </div>
</footer>

<a href="https://wa.me/573052278822?text=Hola!%20Me%20gustaria%20agendar%20una%20cita%20de%20valoracion." class="fab" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
  <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 22h-.005a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64.001 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zM20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a11.92 11.92 0 005.71 1.447h.005c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.405z"/></svg>
</a>


<script>
(function(){
  var body=document.body,toggle=document.getElementById('navToggle'),drawer=document.getElementById('navDrawer'),scrim=document.getElementById('navScrim'),closeBtn=document.getElementById('navClose');
  if(!toggle||!drawer)return;
  function open(){body.classList.add('nav-open');toggle.setAttribute('aria-expanded','true');drawer.setAttribute('aria-hidden','false')}
  function close(){body.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true')}
  toggle.addEventListener('click',function(){body.classList.contains('nav-open')?close():open()});
  if(closeBtn)closeBtn.addEventListener('click',close);
  if(scrim)scrim.addEventListener('click',close);
  document.querySelectorAll('[data-nav-close]').forEach(function(a){a.addEventListener('click',close)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&body.classList.contains('nav-open'))close()});
})();
</script>
</body>
</html>

`;
