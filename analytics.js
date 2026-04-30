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
    'security_storage': 'granted', // CSRF tokens, fraud prevention — always allowed
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
})();
