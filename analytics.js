// PymeWebPro · GA4 with Google Consent Mode v2
//
// gtag.js loads on every page (so GA4's tag-installation auto-detector
// recognises the property as installed), but starts in 'denied' mode for
// all storage types — no cookies set, no PII sent — until the visitor
// explicitly clicks Aceptar on the cookie banner. main.js's bindCookieBanner
// dispatches the 'pwp:consent-granted' event which we use to flip
// analytics_storage to 'granted'. Reject or ignore = stays denied.
//
// CSP: requires https://www.googletagmanager.com in script-src and
// https://www.google-analytics.com / .googletagmanager.com in connect-src
// + img-src — see _headers.

(function () {
  'use strict';

  const GA_ID = 'G-TEWNM2CXYZ';

  // 0. Bot guard. Skip GA entirely for headless / crawler agents so the
  //    property reflects real human traffic. GA4 has a built-in known-bots
  //    filter, this catches the headless cases that slip through.
  function looksLikeBot() {
    try {
      if (navigator.webdriver === true) return true;
      var ua = (navigator.userAgent || '').toLowerCase();
      if (!ua) return true;
      var bots = ['headlesschrome', 'phantomjs', 'slimerjs', 'electron',
        'puppeteer', 'playwright', 'selenium', 'lighthouse', 'pagespeed',
        'gtmetrix', 'pingdom', 'uptimerobot', 'wpt.', 'webpagetest',
        'bot', 'spider', 'crawler', 'crawling', 'scraper'];
      for (var i = 0; i < bots.length; i++) {
        if (ua.indexOf(bots[i]) !== -1) return true;
      }
      if (!navigator.languages || navigator.languages.length === 0) return true;
    } catch (e) {}
    return false;
  }
  if (looksLikeBot()) return;

  // 1. Initialize dataLayer + gtag shim
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };

  // 2. Set Consent Mode defaults BEFORE gtag.js loads.
  //    All storage denied. Google still receives a privacy-safe
  //    'modeled' ping (no cookies, no client IDs).
  window.gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted', // CSRF tokens, fraud prevention, always allowed
    'wait_for_update': 500
  });

  // 3. Load the gtag.js library
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  // 4. Standard gtag init
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    send_page_view: true
  });

  // 5. Consent update path: flip analytics + ad storage to granted
  //    when the user clicks Aceptar in the cookie banner.
  function grantAnalytics() {
    window.gtag('consent', 'update', {
      'ad_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted',
      'analytics_storage': 'granted',
      'functionality_storage': 'granted',
      'personalization_storage': 'granted'
    });
  }

  // a) Already consented in a prior session
  if (window.__pwpConsent === 'accepted') {
    grantAnalytics();
  }
  // b) Or fire as soon as Accept is clicked this session
  document.addEventListener('pwp:consent-granted', grantAnalytics);

  // 6. Engagement events so we can verify real human traffic in GA4 reports.
  //    Scroll depth (25/50/75/100), dwell milestones (15/30/60/90s),
  //    outbound clicks. These fire even in denied-consent mode (they go
  //    out as part of GA4's modeled traffic ping until consent is granted).
  function wireEngagementEvents() {
    var seenScroll = {};
    var thresholds = [25, 50, 75, 100];
    function onScroll() {
      var d = document.documentElement;
      var b = document.body;
      var scrolled = (d.scrollTop || b.scrollTop) + (window.innerHeight || d.clientHeight);
      var total = Math.max(d.scrollHeight, b.scrollHeight, d.offsetHeight, b.offsetHeight);
      if (total <= 0) return;
      var pct = (scrolled / total) * 100;
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        if (pct >= t && !seenScroll[t]) {
          seenScroll[t] = true;
          window.gtag('event', 'scroll_depth', { percent: t });
        }
      }
    }
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () { scrollTimer = null; onScroll(); }, 250);
    }, { passive: true });

    var dwellSeen = {};
    var dwellMs = 0;
    var lastTick = Date.now();
    var visible = !document.hidden;
    function tick() {
      var now = Date.now();
      if (visible) dwellMs += (now - lastTick);
      lastTick = now;
      var secs = Math.floor(dwellMs / 1000);
      [15, 30, 60, 90].forEach(function (m) {
        if (secs >= m && !dwellSeen[m]) {
          dwellSeen[m] = true;
          window.gtag('event', 'dwell_time', { seconds: m });
        }
      });
    }
    document.addEventListener('visibilitychange', function () {
      tick();
      visible = !document.hidden;
      lastTick = Date.now();
    });
    setInterval(tick, 5000);

    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) return;
      try {
        var u = new URL(href);
        if (u.hostname && u.hostname !== location.hostname) {
          window.gtag('event', 'click_outbound', {
            outbound_url: href,
            outbound_host: u.hostname
          });
        }
      } catch (err) {}
    }, true);
  }
  wireEngagementEvents();
})();
