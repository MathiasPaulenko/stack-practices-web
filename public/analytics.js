(function () {
  'use strict';
  // Google Consent Mode v2 — Default Denied
  // Even when analytics_storage is 'denied', GA4 still receives cookieless,
  // non-identifiable pings (no _ga/_gid cookies, no client IDs) so we can
  // measure anonymous traffic without requiring cookie consent.
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
    ads_data_redaction: true,
    url_passthrough: false,
    wait_for_update: 500
  });

  // Google Tag Manager
  (function (w, d, s, l, i) {
    w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true; j.crossOrigin = 'anonymous';
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', 'GTM-M66C9FWN');

  // Load gtag.js library
  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.crossOrigin = 'anonymous';
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-RBE12WJ5KZ';
  document.head.appendChild(gaScript);

  // gtag config — signals off by default; consent update will enable them
  // if the user grants analytics cookies, while cookieless hits keep flowing.
  gtag('js', new Date());
  gtag('config', 'G-RBE12WJ5KZ', { allow_google_signals: false, send_page_view: true });
})();
