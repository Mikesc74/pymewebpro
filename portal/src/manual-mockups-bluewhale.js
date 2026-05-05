// manual-mockups-bluewhale.js — auto-rebuilt by scripts/rebuild-mockups.mjs
// Source: manual-mockups/blue-whale-international/index.html
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["blue-whale-international"].

export const blueWhaleHtml = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>BWI Talent, Carrera en Blue Whale International · 5 posiciones abiertas en 4 países</title>
<meta name="description" content="Únete al equipo de Blue Whale International. 5 posiciones abiertas en Bogotá, Lima, Panamá y CDMX. Carry asignado desde el día uno, presupuesto anual de aprendizaje, movilidad entre las cuatro mesas. Construyamos la próxima generación de inversión latinoamericana.">
<meta name="theme-color" content="#0A1F3A">
<meta property="og:title" content="BWI Talent, Carrera en Blue Whale International">
<meta property="og:description" content="5 posiciones abiertas en Colombia, Perú, Panamá y México. Estamos contratando en finanzas, real estate y tecnología.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://images.pexels.com/photos/33126027/pexels-photo-33126027.jpeg?auto=compress&cs=tinysrgb&h=650&w=940">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;max-width:100%}
:root{
  --abyss:#040D1C;
  --navy:#0A1F3A;
  --navy-2:#0E2742;
  --steel:#243A57;
  --slate:#5A7390;
  --mist:#8FA3BD;
  --line:#1B3556;
  --line-light:#E5E9EE;
  --bone:#FAFAF7;
  --paper:#F2F1EC;
  --ink:#0A0F1A;
  --accent:#D4A24C;
  --accent-2:#B5863A;
  --accent-soft:rgba(212,162,76,0.12);
  --display:'Inter Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --max:1340px;
  --gutter:clamp(20px,4vw,56px);
  --r:2px;
}
body{
  font-family:var(--sans);
  background:var(--bone);
  color:var(--ink);
  font-size:15px;
  line-height:1.6;
  font-weight:400;
  overflow-x:hidden;
  font-feature-settings:"ss01","cv01";
}
a{color:inherit;text-decoration:none}
img,svg{max-width:100%;display:block}
button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit}
.container{max-width:var(--max);margin:0 auto;padding-left:var(--gutter);padding-right:var(--gutter)}
.eyebrow{
  font-family:var(--mono);
  font-size:11px;font-weight:400;letter-spacing:0.16em;text-transform:uppercase;color:var(--mist);
  display:inline-flex;align-items:center;gap:10px;
}
.eyebrow::before{content:"";width:18px;height:1px;background:var(--accent)}
.eyebrow.dark{color:var(--steel)}
.eyebrow.dark::before{background:var(--accent-2)}

/* ─── Notice bar ─────────────────────────────────────────── */
.notice{
  background:var(--abyss);
  color:rgba(250,250,247,0.7);
  padding:10px 20px;
  font-family:var(--mono);
  font-size:11px;letter-spacing:0.1em;text-transform:uppercase;
  text-align:center;font-weight:400;
}
.notice strong{color:var(--bone);font-weight:500}
.notice .sep{color:var(--accent);margin:0 14px;opacity:0.7}
.notice .live{
  display:inline-flex;align-items:center;gap:8px;
  color:var(--accent);font-weight:500;
}
.notice .live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

/* ─── Header ─────────────────────────────────────────────── */
.header{
  position:sticky;top:0;z-index:50;
  background:rgba(10,31,58,0.94);
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border-bottom:1px solid rgba(212,162,76,0.14);
  color:var(--bone);
}
.header-inner{
  max-width:var(--max);margin:0 auto;
  padding:16px var(--gutter);
  display:flex;align-items:center;gap:32px;
}
.logo{display:flex;align-items:center;gap:12px;flex-shrink:0}
.logo .mark{
  width:36px;height:36px;border-radius:var(--r);
  background:transparent;border:1px solid var(--accent);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-weight:700;font-size:14px;color:var(--accent);
  letter-spacing:0.04em;
}
.logo .name{display:flex;flex-direction:column;line-height:1.05}
.logo .name .l1{font-family:var(--display);font-size:13px;font-weight:600;letter-spacing:0.16em;color:var(--bone)}
.logo .name .l2{font-family:var(--mono);font-size:9.5px;color:rgba(250,250,247,0.55);font-weight:400;margin-top:3px;letter-spacing:0.06em;text-transform:uppercase}
.nav{display:flex;align-items:center;gap:34px;margin-left:auto}
.nav a{
  font-size:13px;letter-spacing:-0.005em;font-weight:500;
  color:rgba(250,250,247,0.72);transition:color .2s;
}
.nav a:hover{color:var(--bone)}
.cta-pill{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 20px;border-radius:var(--r);
  background:var(--accent);color:var(--navy);
  font-size:12.5px;font-weight:600;letter-spacing:-0.005em;
  transition:all .2s;
}
.cta-pill:hover{background:var(--bone);color:var(--navy)}
.cta-pill .arrow{font-family:var(--mono);font-size:13px;line-height:1}
.nav .navlinks{display:flex;gap:30px;align-items:center}
.menu-toggle{display:none;font-size:13px;font-weight:500;color:var(--bone)}
@media (max-width:980px){
  .nav .navlinks{display:none}
  .menu-toggle{display:inline-block;margin-left:auto}
  .nav .cta-pill{display:none}
}

/* ─── Hero ───────────────────────────────────────────────── */
.hero{
  position:relative;
  background:var(--navy);
  color:var(--bone);
  overflow:hidden;
  padding:clamp(80px,11vw,140px) 0 clamp(60px,8vw,100px);
  border-bottom:1px solid var(--line);
}
.hero-bg{
  position:absolute;inset:0;
  background:url('https://images.pexels.com/photos/33126027/pexels-photo-33126027.jpeg?auto=compress&cs=tinysrgb&h=1400&w=1900') right center/cover no-repeat;
  opacity:0.32;mix-blend-mode:luminosity;
  filter:contrast(1.1);
}
.hero-bg::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(95deg, var(--navy) 35%, rgba(10,31,58,0.7) 65%, rgba(10,31,58,0.4) 100%);
}
.hero-grid{
  position:relative;z-index:2;
  max-width:var(--max);margin:0 auto;width:100%;
  padding:0 var(--gutter);
  display:grid;grid-template-columns:1.5fr 1fr;gap:80px;align-items:end;
}
.hero-copy .eyebrow{color:var(--accent);margin-bottom:32px}
.hero-copy .eyebrow::before{background:var(--accent)}
.hero-copy h1{
  font-family:var(--display);
  font-weight:500;
  font-size:clamp(40px,5.6vw,76px);
  line-height:1.02;letter-spacing:-0.025em;
  color:var(--bone);
}
.hero-copy h1 .accent{color:var(--accent);font-weight:500}
.hero-copy h1 .light{font-weight:400;color:rgba(250,250,247,0.72)}
.hero-copy p.lede{
  margin-top:32px;max-width:560px;
  font-size:16px;line-height:1.65;
  color:rgba(250,250,247,0.72);
  font-weight:400;
}
.hero-cta{margin-top:42px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:14px 26px;
  font-family:var(--sans);font-size:13px;font-weight:600;
  letter-spacing:-0.005em;cursor:pointer;border-radius:var(--r);
  transition:all .2s;white-space:nowrap;border:1px solid transparent;
}
.btn .arrow{font-family:var(--mono);font-size:14px;line-height:1;font-weight:400}
.btn-accent{background:var(--accent);color:var(--navy);border-color:var(--accent)}
.btn-accent:hover{background:var(--bone);border-color:var(--bone)}
.btn-ghost{background:transparent;color:var(--bone);border-color:rgba(250,250,247,0.25)}
.btn-ghost:hover{background:rgba(250,250,247,0.08);border-color:rgba(250,250,247,0.5)}
.btn-ink{background:var(--ink);color:var(--bone);border-color:var(--ink)}
.btn-ink:hover{background:transparent;color:var(--ink)}
.btn-outline-ink{background:transparent;color:var(--navy);border-color:var(--navy)}
.btn-outline-ink:hover{background:var(--navy);color:var(--bone)}

.hero-stat{
  position:relative;
  padding:32px 0 12px;
  border-top:1px solid rgba(212,162,76,0.4);
}
.hero-stat .label{font-family:var(--mono);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);font-weight:400;margin-bottom:18px;display:flex;align-items:center;gap:10px}
.hero-stat .label::before{content:"";width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse 2.4s ease-in-out infinite}
.hero-stat .value{
  font-family:var(--display);font-weight:500;
  font-size:clamp(56px,7.5vw,96px);line-height:0.95;
  color:var(--bone);letter-spacing:-0.04em;
  display:flex;align-items:baseline;gap:6px;
}
.hero-stat .sub{margin-top:14px;font-size:14px;color:rgba(250,250,247,0.65);letter-spacing:-0.005em;font-weight:400;line-height:1.5;max-width:340px}
.hero-stat .countries{
  margin-top:26px;display:flex;gap:8px;flex-wrap:wrap;
}
.hero-stat .country-pill{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(250,250,247,0.7);font-weight:500;
  padding:6px 12px;border:1px solid rgba(212,162,76,0.3);border-radius:var(--r);
  background:rgba(4,13,28,0.4);
}
.hero-stat .country-pill::before{content:"";width:5px;height:5px;background:var(--accent);border-radius:50%}

@media (max-width:980px){
  .hero-grid{grid-template-columns:1fr;gap:50px;align-items:start}
}

/* ─── Trust strip ────────────────────────────────────────── */
.trust{background:var(--abyss);color:var(--bone);border-bottom:1px solid var(--line)}
.trust-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:repeat(4,1fr);gap:1px;
  background:rgba(212,162,76,0.1);
}
.trust-item{
  display:flex;flex-direction:column;gap:6px;
  background:var(--abyss);
  padding:30px 28px;
}
.trust-item .v{font-family:var(--display);font-size:32px;font-weight:600;letter-spacing:-0.025em;color:var(--bone);line-height:1}
.trust-item .v .accent{color:var(--accent)}
.trust-item .l{font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(250,250,247,0.5);font-weight:400}
.trust-item .d{font-size:12.5px;color:rgba(250,250,247,0.6);line-height:1.55;font-weight:400;margin-top:2px}
@media (max-width:880px){.trust-grid{grid-template-columns:repeat(2,1fr)}}

/* ─── Section base ───────────────────────────────────────── */
section{padding:clamp(80px,10vw,130px) 0}
.section-head{
  display:grid;grid-template-columns:auto 1fr;gap:60px 80px;align-items:end;margin-bottom:72px;
}
.section-head h2{
  font-family:var(--display);font-weight:500;
  font-size:clamp(36px,4.4vw,58px);
  line-height:1.05;letter-spacing:-0.028em;color:var(--ink);
  max-width:680px;
}
.section-head h2 .accent{color:var(--accent-2)}
.section-head p{font-size:15px;line-height:1.65;color:var(--steel);max-width:440px;font-weight:400;justify-self:end}
.section-head .eyebrow{margin-bottom:22px;display:inline-flex;grid-column:1 / -1}
.section-head h2{grid-column:1}
.section-head p{grid-column:2}
@media (max-width:880px){
  .section-head{grid-template-columns:1fr;gap:24px;margin-bottom:50px}
  .section-head h2,.section-head p{grid-column:1;justify-self:start}
}

/* ─── Posiciones abiertas ────────────────────────────────── */
.positions{background:var(--bone)}
.pos-filters{
  display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;align-items:center;
}
.pos-filters .label{font-family:var(--mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--steel);font-weight:500;margin-right:8px}
.pos-chip{
  font-family:var(--mono);font-size:11.5px;letter-spacing:0.04em;color:var(--steel);font-weight:500;
  padding:7px 14px;border:1px solid var(--line-light);border-radius:var(--r);background:#fff;
  cursor:pointer;transition:all .15s;
}
.pos-chip:hover{border-color:var(--steel);color:var(--ink)}
.pos-chip.active{background:var(--navy);color:var(--accent);border-color:var(--navy)}
.pos-table{
  border:1px solid var(--line-light);border-radius:var(--r);overflow:hidden;
}
.pos-row{
  display:grid;grid-template-columns:80px 1fr 130px 180px 60px;gap:20px;align-items:center;
  padding:24px 28px;border-top:1px solid var(--line-light);
  cursor:pointer;transition:background .2s;
  position:relative;
}
.pos-row:first-child{border-top:none}
.pos-row.head{
  background:var(--paper);
  font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--steel);font-weight:500;
  cursor:default;padding:14px 28px;
}
.pos-row.head:hover{background:var(--paper)}
.pos-row:not(.head):hover{background:var(--paper)}
.pos-row .ref{font-family:var(--mono);color:var(--accent-2);font-size:13px;font-weight:500}
.pos-row .info h4{font-family:var(--display);font-weight:600;font-size:18px;color:var(--ink);letter-spacing:-0.012em;line-height:1.25}
.pos-row .info .sec{margin-top:5px;font-family:var(--mono);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--steel);font-weight:400}
.pos-row .info .salary{margin-top:4px;font-size:12.5px;color:var(--steel);font-weight:500}
.pos-row .info .salary strong{color:var(--accent-2);font-weight:600}
.pos-row .pill{
  font-family:var(--mono);font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;font-weight:500;
  padding:5px 12px;border-radius:var(--r);background:var(--navy);color:var(--accent);
  display:inline-block;width:fit-content;
}
.pos-row .country{
  font-family:var(--mono);font-size:11.5px;color:var(--steel);font-weight:400;letter-spacing:0.06em;text-transform:uppercase;
  display:flex;align-items:center;gap:8px;
}
.pos-row .country::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}
.pos-row .arrow{
  width:32px;height:32px;border-radius:50%;border:1px solid var(--line-light);
  display:flex;align-items:center;justify-content:center;color:var(--steel);
  font-family:var(--mono);font-size:13px;transition:all .2s;justify-self:end;
}
.pos-row:not(.head):hover .arrow{background:var(--navy);color:var(--accent);border-color:var(--navy);transform:translateX(4px)}
.pos-foot{margin-top:36px;text-align:center;color:var(--steel);font-size:14px}
.pos-foot a{color:var(--ink);font-weight:600;border-bottom:1px solid var(--accent);padding-bottom:2px}
@media (max-width:780px){
  .pos-row{grid-template-columns:1fr;gap:8px;padding:20px}
  .pos-row.head{display:none}
  .pos-row .arrow{display:none}
}

/* ─── Por qué BWI ─────────────────────────────────────── */
.why{
  position:relative;color:var(--bone);
  background:var(--abyss);
  overflow:hidden;
}
.why::before{
  content:"";position:absolute;inset:0;
  background:url('https://images.pexels.com/photos/36713442/pexels-photo-36713442.jpeg?auto=compress&cs=tinysrgb&h=1100&w=1700') center/cover no-repeat;
  opacity:0.12;
}
.why::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(180deg, rgba(4,13,28,0.95) 0%, rgba(10,31,58,0.93) 100%);
}
.why .container{position:relative;z-index:2}
.why .section-head h2{color:var(--bone)}
.why .section-head h2 .accent{color:var(--accent)}
.why .section-head p{color:rgba(250,250,247,0.65)}
.why-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:rgba(212,162,76,0.18);border:1px solid rgba(212,162,76,0.18)}
.why-cell{background:rgba(4,13,28,0.7);padding:42px 36px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);min-height:230px}
.why-cell .num{font-family:var(--mono);color:var(--accent);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;font-weight:400;margin-bottom:18px}
.why-cell h4{font-family:var(--display);font-weight:600;font-size:22px;color:var(--bone);margin-bottom:12px;line-height:1.2;letter-spacing:-0.018em}
.why-cell h4 .accent{color:var(--accent)}
.why-cell p{font-size:14.5px;line-height:1.65;color:rgba(250,250,247,0.72);font-weight:400}
@media (max-width:780px){.why-grid{grid-template-columns:1fr}}

/* ─── Beneficios ───────────────────────────────────────── */
.benefits{background:var(--bone)}
.ben-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line-light);border:1px solid var(--line-light)}
.ben-item{
  background:#fff;padding:32px 28px 30px;
}
.ben-item .ico{
  width:42px;height:42px;border-radius:var(--r);
  background:var(--accent-soft);color:var(--accent-2);
  display:flex;align-items:center;justify-content:center;
  margin-bottom:20px;
}
.ben-item h4{font-family:var(--display);font-weight:600;font-size:16px;letter-spacing:-0.014em;color:var(--ink);margin-bottom:8px}
.ben-item p{font-size:13.5px;line-height:1.6;color:var(--steel);font-weight:400}
.ben-item .stat{
  margin-top:14px;font-family:var(--mono);font-size:11px;color:var(--accent-2);font-weight:500;letter-spacing:0.04em;
}
@media (max-width:880px){.ben-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.ben-grid{grid-template-columns:1fr}}

/* ─── Cultura ─────────────────────────────────────── */
.culture{background:var(--paper)}
.cult-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.cult-image{aspect-ratio:5/6;overflow:hidden;border-radius:var(--r);position:relative;background:var(--paper)}
.cult-image img{width:100%;height:100%;object-fit:cover;filter:saturate(0.9) contrast(1.05)}
.cult-image .badge{
  position:absolute;left:0;top:0;
  padding:14px 18px;
  background:var(--navy);color:var(--bone);
  font-family:var(--mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:400;
  border-bottom-right-radius:var(--r);
  display:flex;align-items:center;gap:10px;
}
.cult-image .badge .dot{width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse 2.4s ease-in-out infinite}
.cult-copy h2{font-family:var(--display);font-weight:500;font-size:clamp(34px,4vw,54px);line-height:1.05;letter-spacing:-0.028em;color:var(--ink)}
.cult-copy h2 .accent{color:var(--accent-2)}
.cult-copy .body{margin-top:28px;display:flex;flex-direction:column;gap:18px;color:var(--steel);font-size:15.5px;line-height:1.7;font-weight:400;max-width:540px}
.cult-copy .body p strong{color:var(--ink);font-weight:600}
.cult-values{margin-top:46px;display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.cult-values .v{padding:20px 0 0;border-top:1px solid var(--line-light)}
.cult-values .v .num{font-family:var(--mono);color:var(--accent-2);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:500}
.cult-values .v .h{font-size:14.5px;font-weight:600;color:var(--ink);margin-top:10px;letter-spacing:-0.005em}
.cult-values .v .d{font-size:13px;color:var(--steel);margin-top:6px;line-height:1.55}
@media (max-width:880px){.cult-grid{grid-template-columns:1fr;gap:40px}.cult-image{aspect-ratio:4/3}}

/* ─── Equipo ─────────────────────────────────────── */
.team{background:var(--bone)}
.team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.team-card{
  background:#fff;border:1px solid var(--line-light);border-radius:var(--r);
  padding:28px 24px 26px;
  transition:all .25s;
}
.team-card:hover{transform:translateY(-3px);box-shadow:0 16px 48px -16px rgba(10,15,26,0.15);border-color:var(--steel)}
.team-card .ph{
  width:78px;height:78px;border-radius:50%;
  background:linear-gradient(135deg, var(--navy), var(--steel));
  color:var(--accent);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-weight:600;font-size:24px;letter-spacing:0;
  margin-bottom:18px;
}
.team-card h4{font-family:var(--display);font-weight:600;font-size:16px;color:var(--ink);letter-spacing:-0.014em;line-height:1.2}
.team-card .role{margin-top:4px;font-size:13px;color:var(--accent-2);font-weight:500}
.team-card .home{margin-top:8px;font-family:var(--mono);font-size:10.5px;color:var(--steel);font-weight:500;letter-spacing:0.06em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
.team-card .home::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--accent)}
.team-card .from{margin-top:14px;font-size:12.5px;color:var(--steel);line-height:1.55;padding-top:14px;border-top:1px solid var(--line-light)}
.team-card .from strong{color:var(--ink);font-weight:600}
@media (max-width:980px){.team-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.team-grid{grid-template-columns:1fr}}

/* ─── Proceso ─────────────────────────────────────── */
.process{background:var(--navy);color:var(--bone)}
.process .section-head h2{color:var(--bone)}
.process .section-head h2 .accent{color:var(--accent)}
.process .section-head p{color:rgba(250,250,247,0.65)}
.proc-list{
  display:grid;grid-template-columns:repeat(4,1fr);gap:24px;position:relative;
}
.proc-list::before{
  content:"";position:absolute;top:24px;left:48px;right:48px;height:1px;
  background:rgba(212,162,76,0.3);z-index:0;
}
.proc-step{position:relative;z-index:2}
.proc-step .num{
  width:48px;height:48px;border-radius:50%;
  background:var(--navy);border:1.5px solid var(--accent);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-weight:600;font-size:16px;color:var(--accent);
  margin-bottom:22px;letter-spacing:-0.01em;
}
.proc-step .num.done{background:var(--accent);color:var(--navy)}
.proc-step h4{font-family:var(--display);font-weight:600;font-size:18px;letter-spacing:-0.018em;color:var(--bone);margin-bottom:8px}
.proc-step .time{font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:500;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px}
.proc-step p{font-size:14px;line-height:1.6;color:rgba(250,250,247,0.7)}
@media (max-width:780px){.proc-list{grid-template-columns:1fr;gap:32px}.proc-list::before{display:none}}

/* ─── Stability strip ──────────────────────────── */
.stability{background:var(--bone);padding:50px 0;border-top:1px solid var(--line-light);border-bottom:1px solid var(--line-light)}
.stab-inner{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:1fr 2fr;gap:60px;align-items:center;
}
.stab-tag{font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--steel);font-weight:500;line-height:1.6}
.stab-tag strong{display:block;font-size:14px;color:var(--ink);margin-bottom:4px;letter-spacing:-0.005em;text-transform:none;font-family:var(--display);font-weight:600}
.stab-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:30px}
.stab-stat .v{font-family:var(--display);font-weight:500;font-size:32px;line-height:1;color:var(--ink);letter-spacing:-0.025em}
.stab-stat .v .ccy{font-family:var(--mono);font-size:0.32em;color:var(--accent-2);font-weight:500;letter-spacing:0.04em;margin-right:2px}
.stab-stat .v .accent{color:var(--accent-2)}
.stab-stat .l{margin-top:8px;font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--steel);font-weight:500}
@media (max-width:880px){
  .stab-inner{grid-template-columns:1fr;gap:30px}
  .stab-stats{grid-template-columns:repeat(2,1fr)}
}

/* ─── Application form ───────────────────────────────────── */
.apply{
  background:var(--abyss);color:var(--bone);
  position:relative;overflow:hidden;
}
.apply::before{
  content:"";position:absolute;top:-200px;right:-200px;width:640px;height:640px;
  background:radial-gradient(circle,rgba(212,162,76,0.16) 0%,transparent 65%);
  pointer-events:none;
}
.apply .container{position:relative}
.apply-grid{display:grid;grid-template-columns:0.9fr 1.4fr;gap:80px;align-items:start}
.apply-intro h2{font-family:var(--display);font-weight:500;font-size:clamp(34px,4vw,54px);line-height:1.05;letter-spacing:-0.028em;color:var(--bone)}
.apply-intro h2 .accent{color:var(--accent)}
.apply-intro .eyebrow{color:var(--accent);display:inline-flex;margin-bottom:20px}
.apply-intro .eyebrow::before{background:var(--accent)}
.apply-intro p{margin-top:26px;font-size:15px;line-height:1.7;color:rgba(250,250,247,0.7);max-width:380px;font-weight:400}
.apply-intro .commitments{margin-top:38px;display:flex;flex-direction:column;gap:14px}
.apply-intro .commit{display:flex;align-items:flex-start;gap:14px;font-size:13.5px;color:rgba(250,250,247,0.78);line-height:1.55}
.apply-intro .commit .check{color:var(--accent);font-weight:400;flex-shrink:0;font-family:var(--mono);font-size:14px;margin-top:1px}

.form-card{
  background:rgba(4,13,28,0.5);
  border:1px solid rgba(212,162,76,0.22);
  padding:42px 42px 36px;
  border-radius:var(--r);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:22px}
.form-field{display:flex;flex-direction:column;gap:8px}
.form-field.full{grid-column:1/-1}
.form-field label{font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(250,250,247,0.7);font-weight:500}
.form-field label .req{color:var(--accent);margin-left:4px}
.form-field input,
.form-field select,
.form-field textarea{
  background:rgba(4,13,28,0.4);
  border:1px solid rgba(250,250,247,0.12);
  border-radius:var(--r);
  color:var(--bone);
  padding:12px 14px;
  font-size:14.5px;font-family:inherit;font-weight:400;
  outline:none;transition:border-color .2s,background .2s;
  width:100%;
}
.form-field textarea{min-height:84px;resize:vertical;line-height:1.55}
.form-field select{cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23D4A24C' d='M5 6L0 0h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
.form-field select option{background:var(--navy);color:var(--bone)}
.form-field input::placeholder,
.form-field textarea::placeholder{color:rgba(250,250,247,0.35);font-weight:400}
.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus{border-color:var(--accent);background:rgba(4,13,28,0.7)}

.dropzone{
  border:1.5px dashed rgba(212,162,76,0.4);
  border-radius:var(--r);
  padding:30px 24px;
  text-align:center;
  cursor:pointer;
  transition:all .25s;
  background:rgba(4,13,28,0.4);
  position:relative;
}
.dropzone:hover,
.dropzone.drag{border-color:var(--accent);background:rgba(212,162,76,0.06)}
.dropzone .ico{
  width:44px;height:44px;border-radius:var(--r);
  background:rgba(212,162,76,0.12);color:var(--accent);
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 12px;
}
.dropzone .head{font-family:var(--display);color:var(--bone);font-size:16px;font-weight:600;margin-bottom:4px;letter-spacing:-0.012em}
.dropzone .sub{font-family:var(--mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(250,250,247,0.5);font-weight:400}
.dropzone .file{
  margin-top:14px;padding:10px 14px;
  background:rgba(212,162,76,0.12);border:1px solid var(--accent);border-radius:var(--r);
  font-family:var(--mono);font-size:12px;color:var(--accent);
  display:none;align-items:center;justify-content:center;gap:8px;
}
.dropzone.has-file .file{display:flex}
.dropzone.has-file .head, .dropzone.has-file .sub, .dropzone.has-file .ico{opacity:0.4}
.dropzone input[type="file"]{position:absolute;inset:0;opacity:0;cursor:pointer}

.form-consent{
  margin-top:8px;display:flex;align-items:flex-start;gap:12px;
  font-size:12px;color:rgba(250,250,247,0.6);line-height:1.55;font-weight:400;
}
.form-consent input{margin-top:3px;accent-color:var(--accent);flex-shrink:0;width:14px;height:14px}
.form-consent a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}
.form-submit{
  margin-top:28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;
  padding-top:24px;border-top:1px solid rgba(250,250,247,0.08);
}
.form-submit .meta{font-family:var(--mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(250,250,247,0.5);font-weight:400}
.form-success{
  display:none;
  margin-top:20px;padding:18px 22px;
  background:rgba(212,162,76,0.12);border:1px solid var(--accent);border-radius:var(--r);
  color:var(--bone);font-size:14px;font-weight:400;line-height:1.55;
}
.form-success.show{display:block}
@media (max-width:980px){
  .apply-grid{grid-template-columns:1fr;gap:50px}
  .form-row{grid-template-columns:1fr;gap:20px}
  .form-card{padding:32px 26px 28px}
}

/* ─── FAQ ───────────────────────────────────────── */
.faq{background:var(--bone)}
.faq-list{max-width:840px;margin:0 auto;display:flex;flex-direction:column;border-top:1px solid var(--line-light)}
.faq-item{border-bottom:1px solid var(--line-light)}
.faq-item summary{
  list-style:none;cursor:pointer;
  padding:22px 0;
  display:flex;justify-content:space-between;align-items:center;gap:20px;
  font-family:var(--display);font-weight:600;font-size:17px;color:var(--ink);letter-spacing:-0.014em;
  transition:color .15s;
}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary:hover{color:var(--accent-2)}
.faq-item summary .ico{
  width:28px;height:28px;border-radius:50%;border:1px solid var(--line-light);
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;color:var(--ink);transition:all .2s;
  font-family:var(--mono);font-size:14px;
}
.faq-item[open] summary .ico{background:var(--navy);color:var(--accent);border-color:var(--navy);transform:rotate(45deg)}
.faq-item .ans{padding:0 0 22px;font-size:14.5px;line-height:1.7;color:var(--steel)}

/* ─── Quote ──────────────────────────────────────── */
.quote{background:var(--paper);padding:clamp(80px,9vw,120px) var(--gutter);text-align:center;border-top:1px solid var(--line-light);border-bottom:1px solid var(--line-light)}
.quote-inner{max-width:920px;margin:0 auto}
.quote .eyebrow{margin-bottom:32px;display:inline-flex}
.quote blockquote{
  font-family:var(--display);font-weight:500;
  font-size:clamp(24px,2.8vw,38px);line-height:1.3;letter-spacing:-0.022em;color:var(--ink);
}
.quote blockquote .accent{color:var(--accent-2)}
.quote cite{display:block;margin-top:28px;font-style:normal;font-size:13px;color:var(--ink);font-weight:600;letter-spacing:-0.005em}
.quote cite span{display:block;font-family:var(--mono);font-size:11px;color:var(--steel);font-weight:400;letter-spacing:0.06em;margin-top:4px;text-transform:uppercase}

/* ─── Footer ─────────────────────────────────────── */
footer{background:var(--abyss);color:rgba(250,250,247,0.6);padding:80px 0 28px;border-top:1px solid var(--line)}
.foot-grid{
  max-width:var(--max);margin:0 auto;padding:0 var(--gutter);
  display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:50px;
}
.foot-brand .logo .mark{background:transparent}
.foot-brand p{margin-top:24px;font-size:13.5px;line-height:1.65;color:rgba(250,250,247,0.55);max-width:360px;font-weight:400}
.foot-brand .addr{margin-top:18px;font-family:var(--mono);font-size:11.5px;line-height:1.7;color:rgba(250,250,247,0.45);font-weight:400;letter-spacing:0.02em}
.foot-col h5{font-family:var(--mono);font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--accent);font-weight:500;margin-bottom:22px}
.foot-col ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.foot-col a{font-size:13.5px;color:rgba(250,250,247,0.6);transition:color .2s;font-weight:400}
.foot-col a:hover{color:var(--bone)}
.foot-disclaimer{
  max-width:var(--max);margin:60px auto 0;padding:30px var(--gutter) 0;
  border-top:1px solid rgba(250,250,247,0.08);
  font-family:var(--mono);font-size:11px;color:rgba(250,250,247,0.4);line-height:1.7;font-weight:400;letter-spacing:0.01em;
}
.foot-bot{
  max-width:var(--max);margin:24px auto 0;padding:14px var(--gutter) 0;
  display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;
  font-family:var(--mono);font-size:11px;color:rgba(250,250,247,0.4);letter-spacing:0.04em;font-weight:400;
}
.foot-bot .countries{display:flex;gap:18px}
.foot-bot .countries span{font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;opacity:0.7}
.foot-credit{
  max-width:var(--max);margin:18px auto 0;padding:0 var(--gutter);text-align:center;
  font-family:var(--mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(250,250,247,0.35);font-weight:400;
}
.foot-credit a{color:var(--accent);text-decoration:none}
@media (max-width:880px){.foot-grid{grid-template-columns:1fr 1fr;gap:40px 32px}}
@media (max-width:520px){.foot-grid{grid-template-columns:1fr}}

/* ─── Mobile nav drawer ─── */
.menu-toggle{display:none;align-items:center;justify-content:center;width:42px;height:42px;border-radius:8px;background:transparent;border:1px solid rgba(11,27,44,0.14);color:#0B1B2C;cursor:pointer;transition:background .15s,border-color .15s;padding:0;margin-left:auto}
.menu-toggle:hover{border-color:#1B3556}
.menu-toggle .bar{display:block;width:18px;height:2px;background:currentColor;border-radius:1px;transition:transform .25s,opacity .2s}
.menu-toggle .bar+.bar{margin-top:4px}
body.nav-open .menu-toggle .bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
body.nav-open .menu-toggle .bar:nth-child(2){opacity:0}
body.nav-open .menu-toggle .bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.nav-scrim{position:fixed;inset:0;background:rgba(0,0,0,0.42);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:1190}
body.nav-open .nav-scrim{opacity:1;visibility:visible}
.nav-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86vw,360px);background:#fff;box-shadow:-20px 0 50px rgba(0,0,0,0.18);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:1200;display:flex;flex-direction:column;overflow-y:auto;color:#0B1B2C}
body.nav-open .nav-drawer{transform:translateX(0)}
.nav-drawer .nd-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid rgba(11,27,44,0.14);color:#0B1B2C}
.nav-drawer .nd-close{width:38px;height:38px;border-radius:8px;background:transparent;border:1px solid rgba(11,27,44,0.14);color:#0B1B2C;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;padding:0}
.nav-drawer .nd-close:hover{border-color:#1B3556;color:#1B3556}
.nav-drawer .nd-links{display:flex;flex-direction:column;padding:14px 22px;gap:0}
.nav-drawer .nd-links a{display:block;padding:14px 4px;font-size:17px;font-weight:600;color:#0B1B2C;border-bottom:1px solid rgba(11,27,44,0.14);text-decoration:none}
.nav-drawer .nd-links a:last-child{border-bottom:none}
.nav-drawer .nd-links a:hover{color:#1B3556}
.nav-drawer .nd-foot{margin-top:auto;padding:22px;border-top:1px solid rgba(11,27,44,0.14)}
.nav-drawer .nd-foot .cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#1B3556;color:#fff;border-radius:10px;font-size:14.5px;font-weight:600;width:100%;text-decoration:none;text-align:center}
@media (max-width:920px){.menu-toggle{display:inline-flex}}
body.nav-open{overflow:hidden}
</style>
</head>
<body>

<div class="notice">
  <span class="live">Hiring · Q2 2026</span><span class="sep">·</span><strong>5 posiciones</strong> abiertas en Bogotá · Lima · Panamá · CDMX<span class="sep">·</span>Aplicación abierta, perfiles senior siempre considerados
</div>

<header class="header">
  <div class="header-inner">
    <a href="#" class="logo">
      <div class="mark">BWI</div>
      <div class="name">
        <span class="l1">BWI TALENT</span>
        <span class="l2">Carrera en Blue Whale International</span>
      </div>
    </a>
    <button class="menu-toggle" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="navDrawer"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button>
    <nav class="nav">
      <div class="navlinks">
        <a href="#positions">Posiciones</a>
        <a href="#why">Por qué BWI</a>
        <a href="#benefits">Beneficios</a>
        <a href="#culture">Cultura</a>
        <a href="#process">Proceso</a>
      </div>
      <a href="#apply" class="cta-pill">Aplicar Ahora <span class="arrow">→</span></a>
    </nav>
  </div>
</header>

<div class="nav-scrim" id="navScrim" aria-hidden="true"></div>
<aside class="nav-drawer" id="navDrawer" role="dialog" aria-label="Navigation" aria-modal="true" aria-hidden="true">
  <div class="nd-head">
    <a href="#" class="logo" aria-label="BWI"><span class="word">BWI</span></a>
    <button class="nd-close" id="navClose" aria-label="Close menu">&times;</button>
  </div>
  <div class="nd-links">
    <a href="#services" data-nav-close>Services</a>
    <a href="#sectors" data-nav-close>Sectors</a>
    <a href="#approach" data-nav-close>Approach</a>
    <a href="#jobs" data-nav-close>Open roles</a>
    <a href="#contact" data-nav-close>Contact</a>
  </div>
  <div class="nd-foot">
    <a href="#cta" class="cta" data-nav-close>Submit a brief</a>
  </div>
</aside>


<!-- ─── Hero ─── -->
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="hero-grid">
    <div class="hero-copy">
      <span class="eyebrow">BWI Talent · Q2 2026 Recruiting</span>
      <h1>Un universo de oportunidades, empezando por <span class="accent">la tuya.</span></h1>
      <p class="lede">Cinco posiciones abiertas en <strong style="color:var(--bone);font-weight:500">finanzas y tecnología</strong>. Cuatro países. Carry asignado desde el día uno. Estamos contratando analistas, asociados y directores que quieran construir la próxima generación de inversión latinoamericana, con nosotros, no para nosotros.</p>
      <div class="hero-cta">
        <a href="#positions" class="btn btn-accent">Ver Posiciones Abiertas <span class="arrow">→</span></a>
        <a href="#why" class="btn btn-ghost">Por Qué BWI</a>
      </div>
    </div>
    <div class="hero-stat">
      <div class="label">Posiciones abiertas</div>
      <div class="value">05<span style="color:var(--accent)">.</span></div>
      <div class="sub">Senior, mid-senior, y director-level. <strong style="color:var(--accent);font-weight:500">Finanzas y tecnología.</strong></div>
      <div class="countries">
        <span class="country-pill">Bogotá · CO</span>
        <span class="country-pill">Lima · PE</span>
        <span class="country-pill">Panamá · PA</span>
        <span class="country-pill">CDMX · MX</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── Trust strip, recruiting-focused ─── -->
<div class="trust">
  <div class="trust-grid">
    <div class="trust-item">
      <div class="v">100<span class="accent">%</span></div>
      <div class="l">Carry · Día Uno</div>
      <div class="d">Asignado por mandato a todo asociado senior y arriba.</div>
    </div>
    <div class="trust-item">
      <div class="v"><span class="accent">$</span>8K<span class="accent">/yr</span></div>
      <div class="l">Presupuesto · Aprendizaje</div>
      <div class="d">CFA, certificaciones, conferencias, programas ejecutivos.</div>
    </div>
    <div class="trust-item">
      <div class="v">04<span class="accent">+</span></div>
      <div class="l">Mesas · Movilidad</div>
      <div class="d">Rotación voluntaria entre Bogotá, Lima, Panamá y CDMX.</div>
    </div>
    <div class="trust-item">
      <div class="v">6.4 <span style="font-size:0.6em;color:var(--accent)">yr</span></div>
      <div class="l">Tenencia · Promedio</div>
      <div class="d">El equipo se queda. Eso cuenta, y cuenta para algo.</div>
    </div>
  </div>
</div>

<!-- ─── Positions ─── -->
<section class="positions" id="positions">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow dark">Posiciones Abiertas · Q2 2026</span>
      <h2>Mandatos con <span class="accent">silla disponible.</span></h2>
      <p>Cinco roles activos a la fecha. Cada uno tiene mandato real, comité visible, y carry desde el primer día. Si ninguno calza con tu perfil pero quieres ser considerado, puedes enviar una aplicación abierta.</p>
    </div>

    <div class="pos-filters">
      <span class="label">Filtrar:</span>
      <button class="pos-chip active">Todos (5)</button>
      <button class="pos-chip">Financiero (3)</button>
      <button class="pos-chip">Tecnológico (2)</button>
    </div>

    <div class="pos-table">
      <div class="pos-row head">
        <div>Ref.</div>
        <div>Posición / Sector</div>
        <div>Nivel</div>
        <div>Ubicación</div>
        <div></div>
      </div>
      <div class="pos-row" onclick="document.getElementById('pos').value='Vice President · Private Credit (Bogotá)';document.getElementById('apply').scrollIntoView({behavior:'smooth'})">
        <div class="ref">BWI-01</div>
        <div class="info">
          <h4>Vice President · Private Credit</h4>
          <div class="sec">Sector Financiero · 8+ años exp.</div>
          <div class="salary">USD <strong>$120K–$165K</strong> base · + carry · + bono</div>
        </div>
        <div><span class="pill">Senior</span></div>
        <div class="country">Bogotá, CO</div>
        <div class="arrow">→</div>
      </div>
      <div class="pos-row" onclick="document.getElementById('pos').value='Investment Associate · FinTech &amp; SaaS (Lima)';document.getElementById('apply').scrollIntoView({behavior:'smooth'})">
        <div class="ref">BWI-02</div>
        <div class="info">
          <h4>Investment Associate · FinTech &amp; SaaS</h4>
          <div class="sec">Sector Tecnológico · 4+ años exp.</div>
          <div class="salary">USD <strong>$75K–$100K</strong> base · + carry · + bono</div>
        </div>
        <div><span class="pill">Mid-Senior</span></div>
        <div class="country">Lima, PE</div>
        <div class="arrow">→</div>
      </div>
      <div class="pos-row" onclick="document.getElementById('pos').value='Director of Tech Investments (Panamá)';document.getElementById('apply').scrollIntoView({behavior:'smooth'})">
        <div class="ref">BWI-03</div>
        <div class="info">
          <h4>Director · Tech Investments</h4>
          <div class="sec">Sector Tecnológico · 10+ años exp.</div>
          <div class="salary">USD <strong>$160K–$220K</strong> base · + carry · + equity</div>
        </div>
        <div><span class="pill">Director</span></div>
        <div class="country">Ciudad de Panamá, PA</div>
        <div class="arrow">→</div>
      </div>
      <div class="pos-row" onclick="document.getElementById('pos').value='Wealth Manager · Family Office Desk (CDMX)';document.getElementById('apply').scrollIntoView({behavior:'smooth'})">
        <div class="ref">BWI-04</div>
        <div class="info">
          <h4>Wealth Manager · Family Office Desk</h4>
          <div class="sec">Sector Financiero · 6+ años exp.</div>
          <div class="salary">USD <strong>$95K–$135K</strong> base · + carry · + bono</div>
        </div>
        <div><span class="pill">Senior</span></div>
        <div class="country">Ciudad de México, MX</div>
        <div class="arrow">→</div>
      </div>
      <div class="pos-row" onclick="document.getElementById('pos').value='Senior Financial Analyst (Bogotá)';document.getElementById('apply').scrollIntoView({behavior:'smooth'})">
        <div class="ref">BWI-05</div>
        <div class="info">
          <h4>Senior Financial Analyst</h4>
          <div class="sec">Sector Financiero · 3+ años exp.</div>
          <div class="salary">USD <strong>$55K–$75K</strong> base · + carry tras año 2</div>
        </div>
        <div><span class="pill">Mid</span></div>
        <div class="country">Bogotá, CO</div>
        <div class="arrow">→</div>
      </div>
    </div>

    <div class="pos-foot">
      ¿No ves la posición ideal? <a href="#apply" onclick="document.getElementById('pos').value='Aplicación abierta · Otro'">Envía una aplicación abierta</a>, el equipo de talento la revisa para futuros mandatos.
    </div>
  </div>
</section>

<!-- ─── Por qué BWI ─── -->
<section class="why" id="why">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Por qué BWI</span>
      <h2>Lo que <span class="accent">ofrecemos</span> al talento que se suma.</h2>
      <p>No tenemos un programa de "talento", tenemos una cultura. Si el track record y la tesis te parecen bien, lo demás se diseña entre tú y la firma.</p>
    </div>

    <div class="why-grid">
      <div class="why-cell">
        <div class="num">i / Equity</div>
        <h4>Carry asignado desde el <span class="accent">día uno.</span></h4>
        <p>Todo asociado senior y arriba recibe carry asignado por mandato. Alineamos retornos de la firma con los tuyos, sin excepciones, sin cláusulas oscuras, sin vesting castigador.</p>
      </div>
      <div class="why-cell">
        <div class="num">ii / Mandato</div>
        <h4>Operación real, <span class="accent">no PowerPoint.</span></h4>
        <p>Lideras estructuración, due diligence, y comité desde el primer trimestre. Nuestros analistas senior firman term sheets propios al cierre del segundo año. Aquí firmas, no fotocopias.</p>
      </div>
      <div class="why-cell">
        <div class="num">iii / Movilidad</div>
        <h4>Cuatro países, <span class="accent">una sola firma.</span></h4>
        <p>Rotación voluntaria entre las mesas de Bogotá, Lima, Panamá y CDMX. Te formas en una región, no en una sola jurisdicción. Cubrimos relocación cuando el país cambia.</p>
      </div>
      <div class="why-cell">
        <div class="num">iv / Tesis</div>
        <h4>Sin techo de <span class="accent">tesis.</span></h4>
        <p>Si traes una operación que respeta el mandato, la firma evalúa. No importa si vienes de banca, hedge funds, VC, o un equipo de ingeniería en una scaleup, la tesis se evalúa por mérito. Tu mejor idea no espera tu siguiente promoción.</p>
      </div>
    </div>
  </div>
</section>

<!-- ─── Beneficios ─── -->
<section class="benefits" id="benefits">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow dark">Beneficios</span>
      <h2>Compensación que <span class="accent">no se queda</span> en el sueldo.</h2>
      <p>Lo que recibes además del salario base. Todo se discute por escrito antes de firmar, sin sorpresas, sin "se aclara después".</p>
    </div>

    <div class="ben-grid">
      <div class="ben-item">
        <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <h4>Carry asignado por mandato</h4>
        <p>Participación directa en el upside de cada operación cerrada. Asignación se acuerda por escrito al firmar.</p>
        <div class="stat">100% senior+ · sin vesting cliff</div>
      </div>
      <div class="ben-item">
        <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg></div>
        <h4>Presupuesto de aprendizaje</h4>
        <p>USD $8.000 anuales para CFA, CAIA, certificaciones, programas ejecutivos en Wharton, Kellogg, INSEAD.</p>
        <div class="stat">Reembolso pre-pagado · sin trámite</div>
      </div>
      <div class="ben-item">
        <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z"/></svg></div>
        <h4>Movilidad entre mesas</h4>
        <p>Rotación voluntaria entre Bogotá, Lima, Panamá y CDMX. Relocación cubierta cuando aplica el cambio.</p>
        <div class="stat">12 a 24 meses · proceso interno abierto</div>
      </div>
      <div class="ben-item">
        <div class="ben-item">
        <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
        <h4>Co-inversión privada</h4>
        <p>Vehículo interno donde el equipo invierte alongside la firma en mandatos selectos. Mismas condiciones que LPs externos.</p>
        <div class="stat">Acceso · año 2+</div>
      </div>
      <div class="ben-item">
        <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
        <h4>25 días de vacaciones</h4>
        <p>Más festivos del país. No "ilimitado", un número claro, real, que la gente sí toma. Cierre completo entre 24 dic y 2 ene.</p>
        <div class="stat">+ festivos locales · año 1</div>
      </div>
      <div class="ben-item">
        <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg></div>
        <h4>Salud + dental + vida</h4>
        <p>Cobertura premium para ti, pareja, e hijos. Plan dental + visión incluidos. Seguro de vida 3x sueldo anual.</p>
        <div class="stat">100% prima · sin co-pago para titular</div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Cultura ─── -->
<section class="culture" id="culture">
  <div class="container">
    <div class="cult-grid">
      <div class="cult-image">
        <img src="https://images.pexels.com/photos/7710050/pexels-photo-7710050.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900" alt="Equipo Blue Whale International en sesión de comité">
        <span class="badge"><span class="dot"></span>Sesión de Comité · CDMX</span>
      </div>
      <div class="cult-copy">
        <span class="eyebrow dark">La Cultura</span>
        <h2 style="margin-top:22px">Equipo <span class="accent">pequeño</span> por diseño. Cuatro mesas, una cultura.</h2>
        <div class="body">
          <p>BWI tiene <strong>22 personas</strong> distribuidas en cuatro países. No vamos a ser una boutique con 200 personas, vamos a quedarnos pequeños, pagar bien, y operar mandatos donde cada miembro del equipo importa.</p>
          <p>Aquí no hay analistas que pasan dos años haciendo plantillas. Aquí los analistas senior firman term sheets. Los asociados sientan en comités. Los directores no son intermediarios, son los que cierran.</p>
        </div>

        <div class="cult-values">
          <div class="v">
            <div class="num">i / Cómo trabajamos</div>
            <div class="h">Hibrido por defecto</div>
            <div class="d">3 días en oficina, 2 remotos. Excepciones se conversan.</div>
          </div>
          <div class="v">
            <div class="num">ii / Cómo decidimos</div>
            <div class="h">Comité abierto</div>
            <div class="d">Cualquier miembro del equipo puede asistir y observar.</div>
          </div>
          <div class="v">
            <div class="num">iii / Cómo crecemos</div>
            <div class="h">Promociones cada 18 meses</div>
            <div class="d">Si el caso está, la firma sube. No hay calendario rígido.</div>
          </div>
          <div class="v">
            <div class="num">iv / Cómo nos quedamos</div>
            <div class="h">Salida limpia, vuelta abierta</div>
            <div class="d">Si te vas, te vas bien. Y si quieres volver, conversamos.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Equipo ─── -->
<section class="team">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow dark">El Equipo</span>
      <h2>22 personas. <span class="accent">Cuatro mesas.</span></h2>
      <p>Algunos de los nombres detrás de la firma. Rotamos a quién destacamos cada trimestre, todos los miembros del equipo aparecen en el directorio interno completo.</p>
    </div>

    <div class="team-grid">
      <div class="team-card">
        <div class="ph">JR</div>
        <h4>Jorge Restrepo</h4>
        <div class="role">Managing Partner</div>
        <div class="home">Bogotá, CO</div>
        <p class="from">Antes en <strong>Bain Capital</strong> · MBA Wharton · CFA. Lidera mesa de private credit y comité de inversión.</p>
      </div>
      <div class="team-card">
        <div class="ph">CV</div>
        <h4>Carolina Velez</h4>
        <div class="role">Partner · FinTech &amp; SaaS</div>
        <div class="home">Lima, PE</div>
        <p class="from">Antes en <strong>QED Investors</strong> y <strong>Mercado Libre</strong> · MSc Cornell. Lideró 9 inversiones Serie A en fintech regionales.</p>
      </div>
      <div class="team-card">
        <div class="ph">DM</div>
        <h4>Diego Mendoza</h4>
        <div class="role">Partner · Tech Investments</div>
        <div class="home">Panamá, PA</div>
        <p class="from">Antes en <strong>Kaszek Ventures</strong> y <strong>Endeavor</strong>. Lideró Serie A de 11 fintech latinoamericanas en 6 años.</p>
      </div>
      <div class="team-card">
        <div class="ph">AS</div>
        <h4>Ana Silva</h4>
        <div class="role">Director · Family Office</div>
        <div class="home">CDMX, MX</div>
        <p class="from">Antes en <strong>Goldman Sachs PWM</strong> · CFA · CFP. Gestiona portafolios de 14 family offices en LATAM.</p>
      </div>
    </div>
  </div>
</section>

<!-- ─── Proceso ─── -->
<section class="process" id="process">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">El Proceso</span>
      <h2>Cuatro pasos, <span class="accent">tres semanas.</span></h2>
      <p>Sin "rondas misteriosas". Cada etapa tiene un propósito claro y plazo definido, recibes feedback al final de cada una, ganes o no ganes.</p>
    </div>

    <div class="proc-list">
      <div class="proc-step">
        <div class="num done">1</div>
        <div class="time">Semana 1 · 30 min</div>
        <h4>Aplicación + screen call</h4>
        <p>Envías CV. Si avanzas, una llamada de 30 minutos con el equipo de talento para entender contexto y motivación. Sin trampas técnicas.</p>
      </div>
      <div class="proc-step">
        <div class="num">2</div>
        <div class="time">Semana 2 · 90 min</div>
        <h4>Entrevista técnica con mesa</h4>
        <p>Sesión técnica con dos miembros senior de la mesa donde aplicaste. Modelaje, lectura de term sheet, o caso de inversión.</p>
      </div>
      <div class="proc-step">
        <div class="num">3</div>
        <div class="time">Semana 3 · 60 min</div>
        <h4>Caso ante comité</h4>
        <p>Presentación de un caso real (con NDA), seguido de Q&amp;A con el comité. Es la sesión más exigente, y la más reveladora.</p>
      </div>
      <div class="proc-step">
        <div class="num">4</div>
        <div class="time">Semana 3 · 1–3 días</div>
        <h4>Oferta + negociación</h4>
        <p>Si avanzaste, recibes la oferta por escrito en menos de 72 horas. Negociación abierta, base, carry, fecha de inicio.</p>
      </div>
    </div>
  </div>
</section>

<!-- ─── Stability strip, slim firm credibility ─── -->
<div class="stability">
  <div class="stab-inner">
    <div class="stab-tag">
      <strong>La firma detrás de la oferta</strong>
      Métricas auditadas por KPMG · FY 2025
    </div>
    <div class="stab-stats">
      <div class="stab-stat">
        <div class="v"><span class="ccy">USD</span>$1.000M<span class="accent">+</span></div>
        <div class="l">AUM</div>
      </div>
      <div class="stab-stat">
        <div class="v">18.4%</div>
        <div class="l">IRR Promedio</div>
      </div>
      <div class="stab-stat">
        <div class="v">$0</div>
        <div class="l">Pérdidas Realizadas</div>
      </div>
      <div class="stab-stat">
        <div class="v">7+ <span style="font-size:0.6em;color:var(--accent-2)">yr</span></div>
        <div class="l">Trayectoria</div>
      </div>
    </div>
  </div>
</div>

<!-- ─── Application form ─── -->
<section class="apply" id="apply">
  <div class="container">
    <div class="apply-grid">
      <div class="apply-intro">
        <span class="eyebrow">Aplicación</span>
        <h2 style="margin-top:20px">Envía tu <span class="accent">hoja de vida.</span></h2>
        <p>Todas las aplicaciones son revisadas por el equipo de talento dentro de los primeros 10 días hábiles. Si tu perfil avanza, recibirás una invitación a entrevista por correo.</p>
        <div class="commitments">
          <div class="commit"><span class="check">→</span> Confidencialidad absoluta de tu información.</div>
          <div class="commit"><span class="check">→</span> Respuesta a toda aplicación, positiva o no.</div>
          <div class="commit"><span class="check">→</span> Cumplimos con la Ley 1581 de Habeas Data (CO).</div>
          <div class="commit"><span class="check">→</span> Proceso de selección sin comisiones para el aplicante.</div>
          <div class="commit"><span class="check">→</span> Feedback al final de cada etapa, ganes o no ganes.</div>
        </div>
      </div>

      <form class="form-card" onsubmit="event.preventDefault();this.querySelector('.form-success').classList.add('show');this.querySelector('button[type=submit]').textContent='Enviado ✓';this.querySelector('button[type=submit]').disabled=true;">
        <div class="form-row">
          <div class="form-field">
            <label>Nombre completo<span class="req">*</span></label>
            <input type="text" required placeholder="Sofía Restrepo Henao">
          </div>
          <div class="form-field">
            <label>Correo electrónico<span class="req">*</span></label>
            <input type="email" required placeholder="sofia@email.com">
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Teléfono / WhatsApp<span class="req">*</span></label>
            <input type="tel" required placeholder="+57 300 000 0000">
          </div>
          <div class="form-field">
            <label>País de residencia<span class="req">*</span></label>
            <select required>
              <option value="">Seleccionar país</option>
              <option>Colombia</option>
              <option>Perú</option>
              <option>Panamá</option>
              <option>México</option>
              <option>Otro</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field full">
            <label>Posición de interés<span class="req">*</span></label>
            <select required id="pos">
              <option value="">Seleccionar posición</option>
              <option>Vice President · Private Credit (Bogotá)</option>
              <option>Investment Associate · FinTech &amp; SaaS (Lima)</option>
              <option>Director of Tech Investments (Panamá)</option>
              <option>Wealth Manager · Family Office Desk (CDMX)</option>
              <option>Senior Financial Analyst (Bogotá)</option>
              <option>Aplicación abierta · Otro</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>LinkedIn (opcional)</label>
            <input type="url" placeholder="linkedin.com/in/...">
          </div>
          <div class="form-field">
            <label>Años de experiencia<span class="req">*</span></label>
            <select required>
              <option value="">Seleccionar</option>
              <option>0–2 años</option>
              <option>3–5 años</option>
              <option>6–9 años</option>
              <option>10–15 años</option>
              <option>15+ años</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field full">
            <label>Hoja de vida, PDF, DOC o DOCX · máx 5MB<span class="req">*</span></label>
            <div class="dropzone" id="dz">
              <input type="file" id="cv" accept=".pdf,.doc,.docx" required>
              <div class="ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
              </div>
              <div class="head">Arrastra tu CV aquí</div>
              <div class="sub">o haz clic para seleccionar</div>
              <div class="file" id="fileName"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span id="fnText"> · </span></div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field full">
            <label>¿Por qué BWI? (opcional · máx 500 caracteres)</label>
            <textarea placeholder="Una o dos frases sobre por qué quieres unirte. No buscamos cover letter, solo motivación real."></textarea>
          </div>
        </div>

        <label class="form-consent">
          <input type="checkbox" required>
          <span>Acepto el tratamiento de mis datos personales conforme a la <a href="#">Política de Privacidad</a> y la <a href="#">Política de Habeas Data</a> de Blue Whale International (Ley 1581).</span>
        </label>

        <div class="form-submit">
          <span class="meta">Tiempo estimado · 3 minutos</span>
          <button type="submit" class="btn btn-accent">Enviar Aplicación <span class="arrow">→</span></button>
        </div>

        <div class="form-success">Recibimos tu aplicación. El equipo de talento la revisará en los próximos 10 días hábiles y te escribiremos al correo registrado, ganes o no ganes.</div>
      </form>
    </div>
  </div>
</section>

<!-- ─── FAQ ─── -->
<section class="faq" id="faq">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow dark">Preguntas Frecuentes</span>
      <h2>Lo que <span class="accent">preguntan</span> antes de aplicar.</h2>
      <p>Si tu pregunta no aparece aquí, escribe a <a href="mailto:talento@bluewhaleintl.com" style="color:var(--accent-2);font-weight:600">talento@bluewhaleintl.com</a>, responde el equipo, no un bot.</p>
    </div>

    <div class="faq-list">
      <details class="faq-item">
        <summary>¿Necesito experiencia en finanzas formales? <span class="ico">+</span></summary>
        <div class="ans">Para los roles senior y arriba, sí, esperamos experiencia previa en finanzas, banca de inversión, family office, real estate institucional o VC. Para el rol de Senior Financial Analyst (BWI-05) consideramos perfiles fuertes provenientes de consultoría estratégica (MBB) o áreas financieras de corporativos grandes.</div>
      </details>
      <details class="faq-item">
        <summary>¿Pueden aplicar candidatos sin nacionalidad latinoamericana? <span class="ico">+</span></summary>
        <div class="ans">Sí. La mayoría de nuestros mandatos son en LATAM, así que esperamos comodidad operando en español; y la firma cubre relocación + permisos cuando aplica. Si vienes de US o Europa con experiencia en mercados emergentes, te queremos hablar.</div>
      </details>
      <details class="faq-item">
        <summary>¿Cuánto tarda el proceso completo? <span class="ico">+</span></summary>
        <div class="ans">Tres semanas desde aplicación a oferta, en la mayoría de casos. Si tu calendario tiene restricciones (notice period, viajes), avísanos al inicio y ajustamos. No alargamos procesos innecesariamente.</div>
      </details>
      <details class="faq-item">
        <summary>¿Cómo funciona el carry asignado? <span class="ico">+</span></summary>
        <div class="ans">Cada mandato tiene un pool de carry definido al lanzamiento. La asignación a tu posición se establece por escrito al firmar tu oferta y se mantiene mientras estés en la firma. No hay vesting cliff (no perdes todo si te vas en año 1), pero sí hay vesting lineal sobre 5 años desde el cierre del mandato.</div>
      </details>
      <details class="faq-item">
        <summary>¿Hay rotación obligatoria entre países? <span class="ico">+</span></summary>
        <div class="ans">No. Es voluntaria. Pero la mayoría del equipo termina rotando al menos una vez en sus primeros 5 años, porque es una de las cosas que hacen a BWI distinta. Cubrimos el costo de relocación, ajustamos el paquete al país nuevo, y respetamos la decisión si prefieres quedarte donde estás.</div>
      </details>
      <details class="faq-item">
        <summary>¿Tienen política de diversidad? <span class="ico">+</span></summary>
        <div class="ans">No tenemos una política con número de cuotas. Lo que tenemos es un proceso ciego en la primera ronda (CV sin nombre, sin foto, sin universidad) y un compromiso público de paridad de género en las contrataciones senior+. Los datos del último año: 11 contrataciones, 6 mujeres, 5 hombres.</div>
      </details>
      <details class="faq-item">
        <summary>¿Qué pasa si no avanzo en el proceso? <span class="ico">+</span></summary>
        <div class="ans">Recibes feedback escrito específico al final de cada etapa, ganes o no ganes. Si avanzaste hasta caso ante comité y no recibiste oferta, te invitamos a re-aplicar después de 12 meses si tu perfil cambia (más experiencia, nueva certificación, etc.).</div>
      </details>
      <details class="faq-item">
        <summary>¿Aceptan aplicaciones para internships o programas de analista junior? <span class="ico">+</span></summary>
        <div class="ans">Tenemos un programa de analistas en práctica (último año de pregrado o recién egresados) que abre 2 veces al año en febrero y agosto. No está abierto en este momento, únete al newsletter desde el footer y te avisaremos cuando reabra.</div>
      </details>
    </div>
  </div>
</section>

<!-- ─── Quote, testimonial from current employee ─── -->
<section class="quote">
  <div class="quote-inner">
    <span class="eyebrow dark">Testimonio</span>
    <blockquote style="margin-top:32px">Llegué a BWI desde un fondo en Nueva York pensando que iba a perder ritmo. En realidad lo gané, aquí firmo term sheets, asisto a comité, y opero entre cuatro países. <span class="accent">No hay otra firma en LATAM</span> donde un asociado en su segundo año pueda decir lo mismo.</blockquote>
    <cite>Mariana Ospina<span>Associate · Sector Financiero · 2.5 años en BWI</span></cite>
  </div>
</section>

<!-- ─── Footer ─── -->
<footer>
  <div class="foot-grid">
    <div class="foot-brand">
      <a href="#" class="logo">
        <div class="mark" style="background:transparent">BWI</div>
        <div class="name">
          <span class="l1">BWI TALENT</span>
          <span class="l2">Carrera en Blue Whale International</span>
        </div>
      </a>
      <p>Plataforma de talento de Blue Whale International. Cinco posiciones abiertas en cuatro países. Estamos contratando a un ritmo deliberado, pequeño, pero con criterio.</p>
      <div class="addr">
        Talento · talento@bluewhaleintl.com<br>
        Sede · Cra 9 #115-30 piso 18 · Bogotá<br>
        +57 302 235 4239
      </div>
    </div>
    <div class="foot-col">
      <h5>Carrera</h5>
      <ul>
        <li><a href="#positions">Posiciones Abiertas</a></li>
        <li><a href="#why">Por Qué BWI</a></li>
        <li><a href="#benefits">Beneficios</a></li>
        <li><a href="#culture">Cultura</a></li>
        <li><a href="#process">Proceso</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Sobre BWI</h5>
      <ul>
        <li><a href="#">Track Record</a></li>
        <li><a href="#">Equipo Directivo</a></li>
        <li><a href="#">Programa de Analistas</a></li>
        <li><a href="#">Newsletter</a></li>
        <li><a href="#">Diversidad &amp; Inclusión</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Legal</h5>
      <ul>
        <li><a href="#">Política de Privacidad</a></li>
        <li><a href="#">Habeas Data (Ley 1581)</a></li>
        <li><a href="#">Términos de Aplicación</a></li>
        <li><a href="#">Compliance</a></li>
        <li><a href="#">Reportar Anomalía</a></li>
      </ul>
    </div>
  </div>

  <div class="foot-disclaimer">
    Blue Whale International S.A.S., NIT 901.444.998-3, Sociedad debidamente constituida en Colombia. La presente página tiene fines informativos sobre vacantes activas. La aplicación a una posición no constituye relación laboral hasta la firma del contrato escrito correspondiente. Información del equipo y métricas auditadas por KPMG, ejercicio fiscal 2025.
  </div>

  <div class="foot-bot">
    <div>© 2026 Blue Whale International S.A.S. · Todos los derechos reservados.</div>
    <div class="countries">
      <span>Colombia</span><span>Perú</span><span>Panamá</span><span>México</span>
    </div>
  </div>

  <div class="foot-credit">
    Sitio web por <a href="https://pymewebpro.com" rel="noopener">PymeWebPro</a>  ·  <a href="https://pymewebpro.com" rel="noopener" style="opacity:0.85">¿Quiere un sitio así para su negocio? pymewebpro.com →</a>
  </div>
</footer>

<script>
(function(){
  const dz = document.getElementById('dz');
  const cv = document.getElementById('cv');
  const fnText = document.getElementById('fnText');
  if(!dz || !cv) return;

  function showFile(file){
    if(!file) return;
    fnText.textContent = file.name + ' · ' + (file.size/1024).toFixed(0) + ' KB';
    dz.classList.add('has-file');
  }

  cv.addEventListener('change', e => showFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); dz.classList.add('drag');
  }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); dz.classList.remove('drag');
  }));
  dz.addEventListener('drop', e => {
    if(e.dataTransfer.files && e.dataTransfer.files[0]){
      cv.files = e.dataTransfer.files;
      showFile(e.dataTransfer.files[0]);
    }
  });

  // Filter chip toggle (visual only)
  document.querySelectorAll('.pos-chip').forEach(c => c.addEventListener('click', e => {
    document.querySelectorAll('.pos-chip').forEach(x => x.classList.remove('active'));
    e.target.classList.add('active');
  }));
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
