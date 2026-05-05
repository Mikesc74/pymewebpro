// manual-mockups-dagaparfum.js — auto-rebuilt by scripts/rebuild-mockups.mjs
// Source: manual-mockups/daga-parfum/index.html
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["daga-parfum"].

export const dagaParfumHtml = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Daga Parfum, Modern Latin American Luxury Fragrance · Medellín</title>
<meta name="description" content="Daga Parfum is a luxury fragrance house from Medellín, Colombia. Layered compositions of rare botanicals, warm resins, citrus and deep woods. Refined parfums for those who value identity, presence, and subtle distinction.">
<meta name="theme-color" content="#0F0E0C">
<meta property="og:title" content="Daga Parfum, Modern Latin American Luxury Fragrance">
<meta property="og:description" content="Layered compositions of rare botanicals, warm resins, and deep woods. Crafted in Medellín for a global audience.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://images.pexels.com/photos/9980247/pexels-photo-9980247.jpeg?auto=compress&cs=tinysrgb&h=650&w=940">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;max-width:100%}
:root{
  --bone:#F4EFE7;
  --ivory:#EBE3D5;
  --linen:#DDD3BE;
  --ink:#0F0E0C;
  --smoke:#2A2724;
  --ash:#5C574E;
  --brass:#A88B5B;
  --brass-deep:#8C6F40;
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --max:1320px;
  --gutter:clamp(20px,4vw,60px);
}
body{
  font-family:var(--sans);
  background:var(--bone);
  color:var(--ink);
  font-size:15px;
  line-height:1.6;
  font-weight:400;
  overflow-x:hidden;
}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit}
.container{max-width:var(--max);margin:0 auto;padding-left:var(--gutter);padding-right:var(--gutter)}
.serif{font-family:var(--serif);font-weight:400}
.eyebrow{font-family:var(--sans);font-size:11px;font-weight:500;letter-spacing:0.28em;text-transform:uppercase;color:var(--ash)}
.eyebrow.brass{color:var(--brass-deep)}

/* ─── Top notice bar ─────────────────────────────────────── */
.notice{
  background:var(--ink);
  color:var(--linen);
  text-align:center;
  font-size:11.5px;
  letter-spacing:0.18em;
  text-transform:uppercase;
  padding:11px 20px;
  font-weight:300;
}
.notice span{margin:0 18px;opacity:0.85}
@media (max-width:720px){.notice span{display:block;margin:2px 0}}

/* ─── Header ─────────────────────────────────────────────── */
.header{
  position:sticky;top:0;z-index:50;
  background:rgba(244,239,231,0.88);
  backdrop-filter:blur(14px);
  -webkit-backdrop-filter:blur(14px);
  border-bottom:1px solid rgba(15,14,12,0.08);
}
.header-inner{
  max-width:var(--max);
  margin:0 auto;
  padding:18px var(--gutter);
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  gap:30px;
}
.nav-left,.nav-right{display:flex;align-items:center;gap:32px}
.nav-right{justify-content:flex-end}
.nav-left .navlinks{display:flex;gap:32px}
.nav-right .navlinks{display:flex;gap:28px}
.nav a, .nav button{
  font-size:11.5px;
  letter-spacing:0.22em;
  text-transform:uppercase;
  font-weight:500;
  color:var(--smoke);
  transition:color .25s;
  padding:6px 0;
}
.nav a:hover, .nav button:hover{color:var(--brass-deep)}
.wordmark{
  font-family:var(--sans);
  font-size:22px;
  font-weight:300;
  letter-spacing:0.42em;
  text-transform:uppercase;
  color:var(--ink);
  text-align:center;
  padding-left:0.42em; /* optical balance for tracking */
}
.wordmark .dot{display:inline-block;width:4px;height:4px;background:var(--brass);border-radius:50%;vertical-align:middle;margin:0 9px 4px}
.bag-btn{position:relative;display:inline-flex;align-items:center;gap:6px}
.bag-count{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:18px;height:18px;padding:0 5px;border-radius:9px;
  background:var(--ink);color:var(--bone);
  font-size:10px;font-weight:500;letter-spacing:0;
}
.menu-toggle{display:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:500}
@media (max-width:880px){
  .header-inner{grid-template-columns:auto 1fr auto;gap:14px}
  .nav-left .navlinks,.nav-right .navlinks{display:none}
  .menu-toggle{display:inline-block}
  .wordmark{font-size:18px;text-align:center;padding-left:0.42em}
}

/* ─── Hero ───────────────────────────────────────────────── */
.hero{
  background:var(--ink);
  color:var(--bone);
  position:relative;
  overflow:hidden;
}
.hero-grid{
  max-width:var(--max);
  margin:0 auto;
  padding:clamp(70px,11vw,140px) var(--gutter) clamp(60px,9vw,120px);
  display:grid;
  grid-template-columns:1.05fr 1fr;
  gap:clamp(40px,7vw,90px);
  align-items:center;
}
.hero-copy .eyebrow{color:var(--brass);margin-bottom:28px;display:block}
.hero-copy h1{
  font-family:var(--serif);
  font-weight:300;
  font-size:clamp(48px,7vw,96px);
  line-height:0.98;
  letter-spacing:-0.012em;
  color:var(--bone);
}
.hero-copy h1 em{font-style:italic;color:var(--linen);font-weight:300}
.hero-copy h1 .amp{color:var(--brass);font-style:italic}
.hero-copy p.lede{
  margin-top:34px;
  max-width:480px;
  font-size:15.5px;
  line-height:1.75;
  color:rgba(244,239,231,0.78);
  font-weight:300;
}
.hero-cta-row{
  margin-top:44px;
  display:flex;
  gap:14px;
  flex-wrap:wrap;
  align-items:center;
}
.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:16px 30px;
  font-family:var(--sans);
  font-size:11.5px;
  font-weight:500;
  letter-spacing:0.24em;
  text-transform:uppercase;
  background:var(--bone);
  color:var(--ink);
  border:1px solid var(--bone);
  cursor:pointer;
  transition:all .3s ease;
  white-space:nowrap;
}
.btn:hover{background:transparent;color:var(--bone)}
.btn.outline{background:transparent;color:var(--bone);border-color:rgba(244,239,231,0.4)}
.btn.outline:hover{background:var(--bone);color:var(--ink);border-color:var(--bone)}
.btn.ink{background:var(--ink);color:var(--bone);border-color:var(--ink)}
.btn.ink:hover{background:transparent;color:var(--ink)}
.btn .arrow{font-size:14px;letter-spacing:0;line-height:1}

.hero-image{
  position:relative;
  aspect-ratio:4/5;
  overflow:hidden;
  border-radius:2px;
}
.hero-image img{
  width:100%;height:100%;object-fit:cover;
  filter:contrast(1.02) saturate(0.92);
}
.hero-image::after{
  content:"";
  position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 60%,rgba(15,14,12,0.35) 100%);
  pointer-events:none;
}
.hero-tag{
  position:absolute;left:24px;bottom:22px;
  color:var(--bone);
  font-size:10.5px;letter-spacing:0.26em;text-transform:uppercase;font-weight:400;
  display:flex;align-items:center;gap:10px;
}
.hero-tag .line{display:inline-block;width:30px;height:1px;background:var(--brass)}

@media (max-width:880px){
  .hero-grid{grid-template-columns:1fr;gap:40px;padding-top:60px;padding-bottom:50px}
  .hero-image{aspect-ratio:4/3}
}

/* ─── Marquee ────────────────────────────────────────────── */
.marquee{
  background:var(--ink);
  color:var(--linen);
  border-top:1px solid rgba(244,239,231,0.08);
  padding:18px 0;
  overflow:hidden;
}
.marquee-track{
  display:flex;gap:60px;
  animation:scroll 38s linear infinite;
  white-space:nowrap;
  font-size:11px;letter-spacing:0.32em;text-transform:uppercase;font-weight:400;
}
.marquee-track span{display:inline-flex;align-items:center;gap:60px;flex-shrink:0}
.marquee-track .dot{width:4px;height:4px;background:var(--brass);border-radius:50%;display:inline-block}
@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ─── Section base ────────────────────────────────────────── */
section{padding:clamp(80px,11vw,140px) 0}
.section-head{
  display:grid;
  grid-template-columns:1fr 1.4fr;
  gap:60px;
  align-items:end;
  margin-bottom:70px;
}
.section-head h2{
  font-family:var(--serif);
  font-weight:300;
  font-size:clamp(38px,5vw,68px);
  line-height:1;
  letter-spacing:-0.01em;
}
.section-head h2 em{font-style:italic;color:var(--ash)}
.section-head p{
  font-size:15px;
  line-height:1.75;
  color:var(--ash);
  max-width:460px;
  font-weight:300;
}
.section-head .eyebrow{margin-bottom:24px;display:block}
@media (max-width:780px){
  .section-head{grid-template-columns:1fr;gap:24px;margin-bottom:50px}
}

/* ─── Collection grid ─────────────────────────────────────── */
.collection{background:var(--bone)}
.col-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:36px 28px;
}
.fragrance{
  display:flex;flex-direction:column;
  cursor:pointer;
  transition:transform .4s ease;
}
.fragrance:hover{transform:translateY(-4px)}
.fragrance .photo{
  position:relative;
  aspect-ratio:3/4;
  overflow:hidden;
  background:var(--ivory);
  border-radius:2px;
  margin-bottom:22px;
}
.fragrance .photo img{
  width:100%;height:100%;object-fit:cover;
  transition:transform .8s cubic-bezier(.2,.6,.2,1), filter .4s;
  filter:contrast(1) saturate(0.95);
}
.fragrance:hover .photo img{transform:scale(1.04)}
.fragrance .quick{
  position:absolute;left:14px;right:14px;bottom:14px;
  background:var(--bone);color:var(--ink);
  padding:11px 16px;
  font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;text-align:center;
  opacity:0;transform:translateY(6px);
  transition:opacity .35s ease,transform .35s ease;
}
.fragrance:hover .quick{opacity:1;transform:translateY(0)}
.fragrance .meta{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.fragrance .name{font-family:var(--serif);font-size:24px;font-weight:400;letter-spacing:0.01em;line-height:1.1}
.fragrance .price{font-size:13px;color:var(--smoke);font-weight:400;white-space:nowrap}
.fragrance .desc{
  margin-top:6px;
  font-size:12.5px;
  letter-spacing:0.06em;
  color:var(--ash);
  text-transform:uppercase;
  font-weight:400;
}
.fragrance .notes{
  margin-top:10px;
  font-size:13px;color:var(--ash);font-style:italic;font-family:var(--serif);font-weight:400;line-height:1.4;
}
@media (max-width:980px){.col-grid{grid-template-columns:repeat(2,1fr);gap:46px 24px}}
@media (max-width:520px){.col-grid{grid-template-columns:1fr;gap:42px}}

/* ─── Featured / signature ───────────────────────────────── */
.feature{
  background:var(--ivory);
  position:relative;
}
.feature-grid{
  max-width:var(--max);
  margin:0 auto;
  padding:clamp(60px,8vw,110px) var(--gutter);
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:clamp(40px,6vw,80px);
  align-items:center;
}
.feature-image{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:2px}
.feature-image img{width:100%;height:100%;object-fit:cover}
.feature-copy .eyebrow{color:var(--brass-deep);display:block;margin-bottom:22px}
.feature-copy h3{
  font-family:var(--serif);
  font-weight:300;
  font-size:clamp(40px,5.4vw,68px);
  line-height:1;
  letter-spacing:-0.01em;
}
.feature-copy h3 em{font-style:italic;color:var(--brass-deep)}
.feature-copy p.story{margin-top:26px;font-size:15px;line-height:1.8;color:var(--smoke);font-weight:300;max-width:480px}
.note-pyramid{
  margin-top:36px;
  display:grid;
  grid-template-columns:80px 1fr;
  gap:14px 20px;
  font-size:13px;
  align-items:baseline;
}
.note-pyramid dt{
  font-size:10.5px;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass-deep);font-weight:500;
  border-top:1px solid var(--linen);padding-top:14px;
}
.note-pyramid dd{
  font-family:var(--serif);font-style:italic;font-size:17px;color:var(--smoke);font-weight:400;
  border-top:1px solid var(--linen);padding-top:14px;
}
.feature-buy{
  margin-top:38px;
  display:flex;flex-wrap:wrap;gap:24px;align-items:center;
}
.size-row{display:flex;gap:8px}
.size-chip{
  padding:11px 18px;
  border:1px solid var(--ash);
  background:transparent;
  color:var(--smoke);
  font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:500;
  cursor:pointer;
  transition:all .25s;
}
.size-chip:hover{border-color:var(--ink)}
.size-chip.active{background:var(--ink);color:var(--bone);border-color:var(--ink)}
@media (max-width:780px){.feature-grid{grid-template-columns:1fr;gap:36px}}

/* ─── Composition ─────────────────────────────────────────── */
.composition{background:var(--ink);color:var(--bone)}
.composition .section-head h2{color:var(--bone)}
.composition .section-head h2 em{color:var(--brass)}
.composition .section-head p{color:rgba(244,239,231,0.7)}
.composition .section-head .eyebrow{color:var(--brass)}
.comp-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:1px;
  background:rgba(244,239,231,0.1);
}
.comp-cell{
  background:var(--ink);
  padding:54px 34px 60px;
}
.comp-cell .num{
  font-family:var(--serif);font-style:italic;font-size:48px;color:var(--brass);font-weight:300;line-height:1;
  display:block;margin-bottom:18px;
}
.comp-cell h4{
  font-family:var(--serif);font-weight:400;font-size:32px;letter-spacing:-0.005em;line-height:1.1;color:var(--bone);
  margin-bottom:14px;
}
.comp-cell h4 em{color:var(--linen);font-style:italic;font-weight:300}
.comp-cell p{
  font-size:14px;line-height:1.75;color:rgba(244,239,231,0.7);font-weight:300;
}
.comp-cell .tag{
  margin-top:24px;display:block;
  font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);
}
@media (max-width:880px){.comp-grid{grid-template-columns:1fr}}

/* ─── Heritage ───────────────────────────────────────────── */
.heritage{background:var(--bone);position:relative}
.her-grid{
  display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(50px,7vw,90px);align-items:center;
}
.her-image{position:relative;aspect-ratio:4/5;overflow:hidden}
.her-image img{width:100%;height:100%;object-fit:cover;filter:saturate(0.85) contrast(1.03)}
.her-image .label{
  position:absolute;left:0;bottom:0;right:0;
  padding:18px 20px;background:linear-gradient(transparent,rgba(15,14,12,0.65));
  color:var(--bone);font-size:11px;letter-spacing:0.26em;text-transform:uppercase;font-weight:400;
}
.her-copy h2{
  font-family:var(--serif);font-weight:300;font-size:clamp(40px,5.5vw,72px);line-height:1;letter-spacing:-0.01em;
}
.her-copy h2 em{font-style:italic;color:var(--brass-deep)}
.her-copy .body{margin-top:30px;display:flex;flex-direction:column;gap:18px;font-size:15px;line-height:1.85;color:var(--smoke);font-weight:300;max-width:480px}
.her-copy .signature{
  margin-top:36px;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--brass-deep);font-weight:400;
}
.her-stats{
  margin-top:50px;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;
}
.her-stat .num{font-family:var(--serif);font-size:42px;font-weight:300;color:var(--ink);line-height:1;letter-spacing:-0.01em}
.her-stat .lab{margin-top:8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ash);font-weight:500}
@media (max-width:880px){.her-grid{grid-template-columns:1fr;gap:40px}.her-image{aspect-ratio:4/3}}

/* ─── Discovery set ──────────────────────────────────────── */
.discovery{
  background:var(--linen);
  text-align:center;
  padding:clamp(80px,10vw,130px) var(--gutter);
}
.discovery-inner{max-width:740px;margin:0 auto}
.discovery .eyebrow{color:var(--brass-deep);margin-bottom:24px;display:block}
.discovery h2{
  font-family:var(--serif);font-weight:300;
  font-size:clamp(40px,5.4vw,72px);
  line-height:1.05;letter-spacing:-0.01em;color:var(--ink);
}
.discovery h2 em{font-style:italic}
.discovery p{margin:30px auto 0;font-size:16px;line-height:1.8;color:var(--smoke);max-width:560px;font-weight:300}
.discovery .price{
  margin-top:36px;font-family:var(--serif);font-style:italic;font-size:24px;color:var(--brass-deep);font-weight:400;
}
.discovery .price s{color:var(--ash);margin-right:14px;font-style:normal;font-family:var(--sans);font-size:15px;font-weight:300}
.discovery .btn-row{margin-top:32px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap}

/* ─── Editorial / press strip ────────────────────────────── */
.press{
  background:var(--bone);
  border-top:1px solid var(--linen);
  border-bottom:1px solid var(--linen);
  padding:60px 0;
}
.press-inner{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:flex;justify-content:space-between;align-items:center;gap:40px;flex-wrap:wrap;
}
.press-tag{
  font-size:10.5px;letter-spacing:0.28em;text-transform:uppercase;color:var(--ash);font-weight:500;
}
.press-logos{display:flex;gap:50px;align-items:center;flex-wrap:wrap}
.press-logos span{
  font-family:var(--serif);font-style:italic;font-size:22px;color:var(--smoke);font-weight:400;letter-spacing:0.02em;
  opacity:0.75;
}

/* ─── Testimonial ────────────────────────────────────────── */
.quote{
  background:var(--bone);
  padding:clamp(80px,10vw,130px) var(--gutter);
  text-align:center;
}
.quote-inner{max-width:880px;margin:0 auto;position:relative}
.quote .mark{
  font-family:var(--serif);font-style:italic;font-size:120px;color:var(--linen);line-height:0.5;
  display:block;margin-bottom:0;font-weight:300;
}
.quote blockquote{
  font-family:var(--serif);font-weight:300;
  font-size:clamp(26px,3.4vw,42px);
  line-height:1.3;letter-spacing:-0.005em;color:var(--smoke);font-style:italic;
}
.quote cite{
  display:block;margin-top:32px;
  font-style:normal;
  font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--brass-deep);font-weight:500;
}

/* ─── Newsletter ─────────────────────────────────────────── */
.news{
  background:var(--ink);color:var(--bone);
  padding:clamp(80px,9vw,120px) var(--gutter);
  text-align:center;
}
.news-inner{max-width:560px;margin:0 auto}
.news .eyebrow{color:var(--brass);margin-bottom:24px;display:block}
.news h3{
  font-family:var(--serif);font-weight:300;
  font-size:clamp(34px,4.2vw,52px);line-height:1.1;letter-spacing:-0.01em;
}
.news h3 em{font-style:italic;color:var(--linen)}
.news p{margin-top:20px;font-size:14.5px;line-height:1.75;color:rgba(244,239,231,0.7);font-weight:300}
.news form{
  margin-top:34px;
  display:flex;gap:0;
  border-bottom:1px solid rgba(244,239,231,0.3);
  transition:border-color .25s;
}
.news form:focus-within{border-color:var(--brass)}
.news input{
  flex:1;
  background:transparent;border:none;outline:none;
  color:var(--bone);
  font-family:inherit;font-size:14px;
  padding:14px 4px;
}
.news input::placeholder{color:rgba(244,239,231,0.45);font-style:italic;font-family:var(--serif);font-size:16px}
.news button{
  font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--bone);font-weight:500;
  padding:14px 0 14px 16px;
}
.news .fine{margin-top:18px;font-size:11px;color:rgba(244,239,231,0.45);letter-spacing:0.05em;font-weight:300}

/* ─── Footer ─────────────────────────────────────────────── */
footer{background:var(--ink);color:var(--linen);padding:80px 0 28px;border-top:1px solid rgba(244,239,231,0.1)}
.foot-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:50px;
}
.foot-brand .word{
  font-family:var(--sans);font-size:24px;font-weight:300;letter-spacing:0.42em;text-transform:uppercase;color:var(--bone);
}
.foot-brand .word .dot{display:inline-block;width:5px;height:5px;background:var(--brass);border-radius:50%;vertical-align:middle;margin:0 10px 4px}
.foot-brand p{margin-top:22px;font-size:13.5px;line-height:1.75;color:rgba(244,239,231,0.6);max-width:340px;font-weight:300}
.foot-brand .addr{margin-top:18px;font-size:12px;line-height:1.7;color:rgba(244,239,231,0.5);font-weight:300}
.foot-col h5{
  font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:var(--bone);font-weight:500;margin-bottom:22px;
}
.foot-col ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.foot-col a{font-size:13.5px;color:rgba(244,239,231,0.65);transition:color .2s;font-weight:300}
.foot-col a:hover{color:var(--brass)}
.foot-bot{
  max-width:var(--max);margin:60px auto 0;padding:24px var(--gutter) 0;
  border-top:1px solid rgba(244,239,231,0.1);
  display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;
  font-size:11.5px;color:rgba(244,239,231,0.4);letter-spacing:0.04em;font-weight:300;
}
.foot-bot .pay{display:flex;gap:18px;align-items:center}
.foot-bot .pay span{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-weight:400;opacity:0.7}
@media (max-width:880px){.foot-grid{grid-template-columns:1fr 1fr;gap:40px 32px}}
@media (max-width:520px){.foot-grid{grid-template-columns:1fr}}

/* ─── Cart drawer ─────────────────────────────────────────── */
.scrim{
  position:fixed;inset:0;background:rgba(15,14,12,0.5);
  opacity:0;pointer-events:none;transition:opacity .35s;z-index:80;
}
.scrim.open{opacity:1;pointer-events:auto}
.drawer{
  position:fixed;top:0;right:0;bottom:0;width:min(420px,90vw);
  background:var(--bone);z-index:90;
  transform:translateX(100%);transition:transform .4s cubic-bezier(.5,.05,.2,1);
  display:flex;flex-direction:column;
}
.drawer.open{transform:translateX(0)}
.drawer-head{padding:24px 28px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--linen)}
.drawer-head h4{font-family:var(--serif);font-size:24px;font-weight:400}
.drawer-head .close{font-size:22px;color:var(--ink);line-height:1}
.drawer-body{flex:1;padding:24px 28px;overflow-y:auto}
.drawer-body .empty{text-align:center;color:var(--ash);font-style:italic;font-family:var(--serif);font-size:18px;padding:40px 0}
.drawer-foot{padding:22px 28px 28px;border-top:1px solid var(--linen)}
.drawer-foot .totals{display:flex;justify-content:space-between;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ash);margin-bottom:18px}
.drawer-foot .totals strong{color:var(--ink);font-weight:500}
.cart-line{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--linen)}
.cart-line .thumb{width:64px;height:80px;background:var(--ivory);flex-shrink:0;overflow:hidden}
.cart-line .thumb img{width:100%;height:100%;object-fit:cover}
.cart-line .info{flex:1;display:flex;flex-direction:column;gap:4px}
.cart-line .nm{font-family:var(--serif);font-size:18px;font-weight:400}
.cart-line .sz{font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ash)}
.cart-line .pr{margin-top:auto;font-size:13px;color:var(--smoke)}
.cart-line .rm{font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ash);align-self:flex-start;text-decoration:underline;text-underline-offset:3px}

/* ─── Mobile nav drawer ─── */
.menu-toggle{display:none;align-items:center;justify-content:center;width:42px;height:42px;border-radius:8px;background:transparent;border:1px solid rgba(15,14,12,0.14);color:#0F0E0C;cursor:pointer;transition:background .15s,border-color .15s;padding:0;margin-left:auto}
.menu-toggle:hover{border-color:#7a1c1c}
.menu-toggle .bar{display:block;width:18px;height:2px;background:currentColor;border-radius:1px;transition:transform .25s,opacity .2s}
.menu-toggle .bar+.bar{margin-top:4px}
body.nav-open .menu-toggle .bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
body.nav-open .menu-toggle .bar:nth-child(2){opacity:0}
body.nav-open .menu-toggle .bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.nav-scrim{position:fixed;inset:0;background:rgba(0,0,0,0.42);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:1190}
body.nav-open .nav-scrim{opacity:1;visibility:visible}
.nav-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86vw,360px);background:#FAF7EF;box-shadow:-20px 0 50px rgba(0,0,0,0.18);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:1200;display:flex;flex-direction:column;overflow-y:auto;color:#0F0E0C}
body.nav-open .nav-drawer{transform:translateX(0)}
.nav-drawer .nd-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid rgba(15,14,12,0.14);color:#0F0E0C}
.nav-drawer .nd-close{width:38px;height:38px;border-radius:8px;background:transparent;border:1px solid rgba(15,14,12,0.14);color:#0F0E0C;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;padding:0}
.nav-drawer .nd-close:hover{border-color:#7a1c1c;color:#7a1c1c}
.nav-drawer .nd-links{display:flex;flex-direction:column;padding:14px 22px;gap:0}
.nav-drawer .nd-links a{display:block;padding:14px 4px;font-size:17px;font-weight:600;color:#0F0E0C;border-bottom:1px solid rgba(15,14,12,0.14);text-decoration:none}
.nav-drawer .nd-links a:last-child{border-bottom:none}
.nav-drawer .nd-links a:hover{color:#7a1c1c}
.nav-drawer .nd-foot{margin-top:auto;padding:22px;border-top:1px solid rgba(15,14,12,0.14)}
.nav-drawer .nd-foot .cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#7a1c1c;color:#fff;border-radius:10px;font-size:14.5px;font-weight:600;width:100%;text-decoration:none;text-align:center}
@media (max-width:880px){.menu-toggle{display:inline-flex}}
body.nav-open{overflow:hidden}
</style>
</head>
<body>

<div class="notice">
  <span>Complimentary shipping in Colombia · over $300.000 COP</span>
  <span>Worldwide express delivery</span>
  <span>Sample with every order</span>
</div>

<header class="header">
  <div class="header-inner">
    <nav class="nav nav-left">
      <button class="menu-toggle" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="navDrawer"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button>
      <div class="navlinks">
        <a href="#shop">Shop</a>
        <a href="#collection">Collection</a>
        <a href="#story">Story</a>
        <a href="#discovery">Discovery</a>
      </div>
    </nav>
    <a href="#" class="wordmark">DAGA<span class="dot"></span>PARFUM</a>
    <nav class="nav nav-right">
      <div class="navlinks">
        <a href="#">Search</a>
        <a href="#">Account</a>
        <a href="#" data-currency>USD</a>
      </div>
      <button class="bag-btn" id="openCart">Bag <span class="bag-count" id="bagCount">0</span></button>
    </nav>
  </div>
</header>

<div class="nav-scrim" id="navScrim" aria-hidden="true"></div>
<aside class="nav-drawer" id="navDrawer" role="dialog" aria-label="Navigation" aria-modal="true" aria-hidden="true">
  <div class="nd-head">
    <a href="#" class="logo" aria-label="Daga Parfum"><span class="word">Daga</span></a>
    <button class="nd-close" id="navClose" aria-label="Close menu">&times;</button>
  </div>
  <div class="nd-links">
    <a href="#collection" data-nav-close>Colección</a>
    <a href="#story" data-nav-close>Historia</a>
    <a href="#concierge" data-nav-close>Concierge</a>
    <a href="#contact" data-nav-close>Contacto</a>
  </div>
  <div class="nd-foot">
    <a href="#bag" class="cta" data-nav-close>Bolsa</a>
  </div>
</aside>


<!-- ─── Hero ─── -->
<section class="hero">
  <div class="hero-grid">
    <div class="hero-copy">
      <span class="eyebrow">Maison de Parfum · Medellín · Est. 2024</span>
      <h1>Quiet<br><em>confidence,</em><br>rendered <span class="amp">&</span> bottled.</h1>
      <p class="lede">A Latin American fragrance house composing layered parfums of rare botanicals, warm resins and deep woods, for those who value identity, presence, and subtle distinction.</p>
      <div class="hero-cta-row">
        <a href="#collection" class="btn">Explore the Collection <span class="arrow">→</span></a>
        <a href="#discovery" class="btn outline">Discovery Set · $30</a>
      </div>
    </div>
    <div class="hero-image">
      <img src="https://images.pexels.com/photos/9980247/pexels-photo-9980247.jpeg?auto=compress&cs=tinysrgb&h=1100&w=900" alt="Daga Parfum bottle, matte glass with gold accent">
      <span class="hero-tag"><span class="line"></span>Parfum 100ml · Eau de Parfum</span>
    </div>
  </div>
</section>

<!-- ─── Marquee ─── -->
<div class="marquee" aria-hidden="true">
  <div class="marquee-track">
    <span>Composed in Medellín<i class="dot"></i>Bottled by hand<i class="dot"></i>Cruelty free<i class="dot"></i>IFRA certified<i class="dot"></i>Refillable<i class="dot"></i>Composed in Medellín<i class="dot"></i>Bottled by hand<i class="dot"></i>Cruelty free<i class="dot"></i>IFRA certified<i class="dot"></i>Refillable<i class="dot"></i></span>
    <span>Composed in Medellín<i class="dot"></i>Bottled by hand<i class="dot"></i>Cruelty free<i class="dot"></i>IFRA certified<i class="dot"></i>Refillable<i class="dot"></i>Composed in Medellín<i class="dot"></i>Bottled by hand<i class="dot"></i>Cruelty free<i class="dot"></i>IFRA certified<i class="dot"></i>Refillable<i class="dot"></i></span>
  </div>
</div>

<!-- ─── Collection ─── -->
<section class="collection" id="collection">
  <div class="container">
    <div class="section-head">
      <div>
        <span class="eyebrow brass">The Collection</span>
        <h2>Four <em>signatures.</em><br>One philosophy.</h2>
      </div>
      <p>Each parfum is a layered composition, top, heart, and base, designed to evolve over hours. Cast in matte glass, restrained in design, and intentional in every accord.</p>
    </div>

    <div class="col-grid">
      <article class="fragrance" data-name="Bruma" data-price="180">
        <div class="photo">
          <img src="https://images.pexels.com/photos/3640668/pexels-photo-3640668.jpeg?auto=compress&cs=tinysrgb&h=900&w=700" alt="Bruma, fresh floral parfum">
          <span class="quick">Quick add →</span>
        </div>
        <div class="meta">
          <h3 class="name">Bruma</h3>
          <span class="price">$180</span>
        </div>
        <span class="desc">Eau de Parfum · 100ml</span>
        <p class="notes">bergamot · white tea · jasmine · cedar</p>
      </article>

      <article class="fragrance" data-name="Selva" data-price="220">
        <div class="photo">
          <img src="https://images.pexels.com/photos/7005940/pexels-photo-7005940.jpeg?auto=compress&cs=tinysrgb&h=900&w=700" alt="Selva, woody spicy parfum">
          <span class="quick">Quick add →</span>
        </div>
        <div class="meta">
          <h3 class="name">Selva</h3>
          <span class="price">$220</span>
        </div>
        <span class="desc">Extrait de Parfum · 100ml</span>
        <p class="notes">pink pepper · cardamom · vetiver · oud</p>
      </article>

      <article class="fragrance" data-name="Cordillera" data-price="195">
        <div class="photo">
          <img src="https://images.pexels.com/photos/11027941/pexels-photo-11027941.jpeg?auto=compress&cs=tinysrgb&h=900&w=700" alt="Cordillera, green earthy parfum">
          <span class="quick">Quick add →</span>
        </div>
        <div class="meta">
          <h3 class="name">Cordillera</h3>
          <span class="price">$195</span>
        </div>
        <span class="desc">Eau de Parfum · 100ml</span>
        <p class="notes">juniper · rosemary · cedar · amber</p>
      </article>

      <article class="fragrance" data-name="Ópalo" data-price="210">
        <div class="photo">
          <img src="https://images.pexels.com/photos/21067593/pexels-photo-21067593.jpeg?auto=compress&cs=tinysrgb&h=900&w=700" alt="Ópalo, soft warm parfum">
          <span class="quick">Quick add →</span>
        </div>
        <div class="meta">
          <h3 class="name">Ópalo</h3>
          <span class="price">$210</span>
        </div>
        <span class="desc">Extrait de Parfum · 100ml</span>
        <p class="notes">pear · iris · sandalwood · vanilla</p>
      </article>
    </div>
  </div>
</section>

<!-- ─── Featured ─── -->
<section class="feature" id="shop">
  <div class="feature-grid">
    <div class="feature-image">
      <img src="https://images.pexels.com/photos/34660877/pexels-photo-34660877.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900" alt="Selva, featured parfum">
    </div>
    <div class="feature-copy">
      <span class="eyebrow">Featured · Extrait de Parfum</span>
      <h3>Selva.<br><em>The forest, after rain.</em></h3>
      <p class="story">A meditation on the cordillera at dusk, wet earth, smoked resin, and a single thread of black pepper. Composed at 22% concentration for a slow, deliberate evolution from skin to memory.</p>

      <dl class="note-pyramid">
        <dt>Top</dt>
        <dd>Pink pepper, bergamot, cardamom</dd>
        <dt>Heart</dt>
        <dd>Vetiver, smoked iris, leather</dd>
        <dt>Base</dt>
        <dd>Oud, amber, Atlas cedar</dd>
      </dl>

      <div class="feature-buy">
        <div class="size-row">
          <button class="size-chip">30ml · $120</button>
          <button class="size-chip active">100ml · $220</button>
        </div>
        <button class="btn ink" data-add="Selva" data-price="220">Add to Bag <span class="arrow">→</span></button>
      </div>
    </div>
  </div>
</section>

<!-- ─── Composition ─── -->
<section class="composition">
  <div class="container">
    <div class="section-head">
      <div>
        <span class="eyebrow">Method</span>
        <h2>A parfum, <em>in three movements.</em></h2>
      </div>
      <p>Every Daga composition is built in layers, each accord designed to surface, settle, and resolve into the next. The result is a fragrance that lives a full day on the skin.</p>
    </div>

    <div class="comp-grid">
      <div class="comp-cell">
        <span class="num">01</span>
        <h4>The <em>Opening.</em></h4>
        <p>Bright, lifted, immediate. Citrus accords and rare aromatics that reveal themselves in the first ten minutes, the fragrance announcing itself to the room.</p>
        <span class="tag">Top notes · 0–15 min</span>
      </div>
      <div class="comp-cell">
        <span class="num">02</span>
        <h4>The <em>Heart.</em></h4>
        <p>Florals, spices, and resins compose the body of the parfum. This is what people remember, the accord that lingers in conversation, on a coat, in a room after you've left.</p>
        <span class="tag">Mid notes · 30 min – 4 hr</span>
      </div>
      <div class="comp-cell">
        <span class="num">03</span>
        <h4>The <em>Drydown.</em></h4>
        <p>Woods, musks, and warm resins settle into the skin. The most intimate phase, what only those close to you will know. Lasting ten to twelve hours on most skin.</p>
        <span class="tag">Base notes · 4 hr +</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── Heritage ─── -->
<section class="heritage" id="story">
  <div class="container">
    <div class="her-grid">
      <div class="her-image">
        <img src="https://images.pexels.com/photos/13157127/pexels-photo-13157127.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900" alt="Mountains around Medellín">
        <span class="label">Aburrá Valley · Antioquia</span>
      </div>
      <div class="her-copy">
        <span class="eyebrow brass">Composed in Medellín</span>
        <h2>Where the city <em>meets</em> the cordillera.</h2>
        <div class="body">
          <p>Daga was founded on a simple contrast, the precision of a modern city set against the weight of the mountains around it. We compose every parfum to hold both: the lift of urban energy and the depth of the forest.</p>
          <p>Our atelier sits in El Poblado. Every bottle is filled, sealed, and packaged within thirty meters of where the formula was composed. Nothing is outsourced. Nothing is hurried.</p>
        </div>
        <span class="signature">, Gabriel Montes, Founder & Master Perfumer</span>

        <div class="her-stats">
          <div class="her-stat"><div class="num">22%</div><div class="lab">Avg. concentration</div></div>
          <div class="her-stat"><div class="num">120+</div><div class="lab">Raw materials</div></div>
          <div class="her-stat"><div class="num">100%</div><div class="lab">Made in Colombia</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Discovery ─── -->
<section class="discovery" id="discovery">
  <div class="discovery-inner">
    <span class="eyebrow">Discovery Set</span>
    <h2>Try the entire collection<br>before <em>you commit.</em></h2>
    <p>Four 2ml decants of every signature, Bruma, Selva, Cordillera, and Ópalo, presented in a linen-bound case. Credit applied toward your first full bottle.</p>
    <div class="price"><s>$45</s>$30 USD · $120.000 COP</div>
    <div class="btn-row">
      <button class="btn ink" data-add="Discovery Set" data-price="30">Add Discovery Set <span class="arrow">→</span></button>
      <a href="#collection" class="btn" style="background:transparent;color:var(--ink);border-color:var(--ink)">Browse the Collection</a>
    </div>
  </div>
</section>

<!-- ─── Press ─── -->
<div class="press">
  <div class="press-inner">
    <span class="press-tag">As featured in</span>
    <div class="press-logos">
      <span>Vogue</span>
      <span>Wallpaper*</span>
      <span>Cereal</span>
      <span>Monocle</span>
      <span>Kinfolk</span>
    </div>
  </div>
</div>

<!-- ─── Quote ─── -->
<section class="quote">
  <div class="quote-inner">
    <span class="mark">"</span>
    <blockquote>Daga has done something rare, built a fragrance house that feels neither European nor performative, but completely itself. The compositions are quiet, but they stay with you for hours.</blockquote>
    <cite>, Vogue España, Octubre 2025</cite>
  </div>
</section>

<!-- ─── Newsletter ─── -->
<section class="news">
  <div class="news-inner">
    <span class="eyebrow">Studio Notes</span>
    <h3>Composition notes,<br><em>delivered quarterly.</em></h3>
    <p>New releases, atelier dispatches, and the occasional unreleased sample, sent only when there's something worth saying. No noise.</p>
    <form onsubmit="event.preventDefault();this.querySelector('input').value='';this.querySelector('button').textContent='Subscribed ✓';">
      <input type="email" placeholder="your email" required>
      <button type="submit">Subscribe →</button>
    </form>
    <p class="fine">By subscribing you accept our privacy policy. Unsubscribe at any time.</p>
  </div>
</section>

<!-- ─── Footer ─── -->
<footer>
  <div class="foot-grid">
    <div class="foot-brand">
      <div class="word">DAGA<span class="dot"></span>PARFUM</div>
      <p>A modern Latin American fragrance house. Composed, bottled, and shipped from Medellín, Colombia, to a global clientele who value subtle distinction.</p>
      <div class="addr">
        Atelier · Cra 33 #7 sur, 151<br>
        El Poblado · Medellín · Antioquia<br>
        hola@dagaparfum.com · +57 604 444 0102
      </div>
    </div>
    <div class="foot-col">
      <h5>Shop</h5>
      <ul>
        <li><a href="#">All Fragrances</a></li>
        <li><a href="#">Discovery Set</a></li>
        <li><a href="#">Refills</a></li>
        <li><a href="#">Gift Cards</a></li>
        <li><a href="#">Limited Editions</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Maison</h5>
      <ul>
        <li><a href="#">Our Story</a></li>
        <li><a href="#">The Atelier</a></li>
        <li><a href="#">Sustainability</a></li>
        <li><a href="#">Press</a></li>
        <li><a href="#">Journal</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Care</h5>
      <ul>
        <li><a href="#">Shipping & Delivery</a></li>
        <li><a href="#">Returns</a></li>
        <li><a href="#">Fragrance Guide</a></li>
        <li><a href="#">Contact</a></li>
        <li><a href="#">FAQ</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bot">
    <div>© 2026 Daga Parfum S.A.S. · NIT 901.998.444-2 · All rights reserved.</div>
    <div class="pay">
      <span>Visa</span><span>Mastercard</span><span>Amex</span><span>PSE</span><span>Wompi</span>
    </div>
  </div>
  <div style="max-width:var(--max);margin:18px auto 0;padding:0 var(--gutter);text-align:center;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(244,239,231,0.35);font-weight:300">
    Built by <a href="https://pymewebpro.com" rel="noopener" style="color:var(--brass);text-decoration:none">PymeWebPro</a>  ·  <a href="https://pymewebpro.com" rel="noopener" style="color:rgba(168,139,91,0.7);text-decoration:none">Want a site like this for your business? pymewebpro.com →</a>
  </div>
</footer>

<!-- ─── Cart drawer ─── -->
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Shopping bag">
  <div class="drawer-head">
    <h4>Your Bag</h4>
    <button class="close" id="closeCart" aria-label="Close">×</button>
  </div>
  <div class="drawer-body" id="cartBody">
    <div class="empty">Your bag is empty.</div>
  </div>
  <div class="drawer-foot">
    <div class="totals"><span>Subtotal</span><strong id="subtotal">$0</strong></div>
    <button class="btn ink" style="width:100%">Checkout · Wompi <span class="arrow">→</span></button>
    <p style="margin-top:12px;font-size:11px;color:var(--ash);text-align:center;letter-spacing:0.04em">Secure payment · 30-day returns · Worldwide shipping</p>
  </div>
</aside>

<script>
(function(){
  const cart = [];
  const bagCount = document.getElementById('bagCount');
  const cartBody = document.getElementById('cartBody');
  const subtotal = document.getElementById('subtotal');
  const drawer = document.getElementById('drawer');
  const scrim = document.getElementById('scrim');

  const productImages = {
    'Bruma': 'https://images.pexels.com/photos/3640668/pexels-photo-3640668.jpeg?auto=compress&cs=tinysrgb&h=300&w=240',
    'Selva': 'https://images.pexels.com/photos/7005940/pexels-photo-7005940.jpeg?auto=compress&cs=tinysrgb&h=300&w=240',
    'Cordillera': 'https://images.pexels.com/photos/11027941/pexels-photo-11027941.jpeg?auto=compress&cs=tinysrgb&h=300&w=240',
    'Ópalo': 'https://images.pexels.com/photos/21067593/pexels-photo-21067593.jpeg?auto=compress&cs=tinysrgb&h=300&w=240',
    'Discovery Set': 'https://images.pexels.com/photos/9980247/pexels-photo-9980247.jpeg?auto=compress&cs=tinysrgb&h=300&w=240'
  };

  function render(){
    bagCount.textContent = cart.length;
    if(cart.length === 0){
      cartBody.innerHTML = '<div class="empty">Your bag is empty.</div>';
      subtotal.textContent = '$0';
      return;
    }
    cartBody.innerHTML = cart.map((item,i) => (
      '<div class="cart-line">' +
        '<div class="thumb"><img src="'+(productImages[item.name]||'')+'" alt=""></div>' +
        '<div class="info">' +
          '<div class="nm">'+item.name+'</div>' +
          '<div class="sz">'+(item.name === 'Discovery Set' ? '4 × 2ml decants' : 'Eau de Parfum · 100ml')+'</div>' +
          '<div class="pr">$'+item.price+' USD</div>' +
        '</div>' +
        '<button class="rm" data-rm="'+i+'">Remove</button>' +
      '</div>'
    )).join('');
    const sum = cart.reduce((t,x)=>t+x.price,0);
    subtotal.textContent = '$'+sum+' USD';
  }

  function open(){scrim.classList.add('open');drawer.classList.add('open');document.body.style.overflow='hidden'}
  function close(){scrim.classList.remove('open');drawer.classList.remove('open');document.body.style.overflow=''}

  document.getElementById('openCart').addEventListener('click', open);
  document.getElementById('closeCart').addEventListener('click', close);
  scrim.addEventListener('click', close);

  // Add-to-bag handlers, both .fragrance card clicks and explicit .btn[data-add]
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      cart.push({name: btn.dataset.add, price: parseInt(btn.dataset.price,10)});
      render(); open();
    });
  });
  document.querySelectorAll('.fragrance').forEach(card => {
    card.addEventListener('click', () => {
      cart.push({name: card.dataset.name, price: parseInt(card.dataset.price,10)});
      render(); open();
    });
  });

  cartBody.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]');
    if(!b) return;
    cart.splice(parseInt(b.dataset.rm,10), 1);
    render();
  });

  // Size chip toggle
  document.querySelectorAll('.size-row').forEach(row => {
    row.addEventListener('click', e => {
      const chip = e.target.closest('.size-chip');
      if(!chip) return;
      row.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
})();
</script>

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
