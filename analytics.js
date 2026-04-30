// PymeWebPro · GA4 (consent-gated)
//
// We never load gtag.js or send a pageview until the user has explicitly
// accepted cookies via the banner (window.__pwpConsent === 'accepted').
//
// Boot path:
//   1. On script load, check stored consent. If already 'accepted' → fire.
//   2. Otherwise listen for the 'pwp:consent-granted' DOM event that
//      main.js dispatches when the user clicks Accept on the banner. Fire
//      the moment that event arrives (no page reload required).
//
// CSP requires script-src 'self' + googletagmanager.com, connect-src for
// google-analytics.com + googletagmanager.com, and img-src for the
// occasional GA pixel — see _headers.

(function () {
  'use strict';

  const GA_ID = 'G-TEWNM2CXYZ';
  let booted = false;

  function bootGA() {
    if (booted) return;
    booted = true;

    // Load the gtag.js library
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    // Init dataLayer + gtag shim
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };

    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      anonymize_ip: true,
      send_page_view: true,
    });
  }

  // Already consented in a prior session
  if (window.__pwpConsent === 'accepted') {
    bootGA();
    return;
  }

  // First-visit acceptance fires this event from main.js's bindCookieBanner()
  document.addEventListener('pwp:consent-granted', bootGA);
})();
