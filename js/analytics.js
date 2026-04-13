/* =============================================================================
   BackMellow — analytics.js
   Umami analytics integration:
     - UTM parameter capture + sessionStorage persistence
     - bmTrack() safe wrapper with automatic UTM context
     - Session duration timer (fires on pagehide / beforeunload)
     - Delegated click tracking for links (shipping, returns, support, shop CTAs)
   Loaded before main.js via a plain <script> tag near </body>.
   Umami's own script must be loaded with defer in <head> so it resolves first.
   All calls fail silently if Umami is unavailable or blocked.
   ============================================================================= */

'use strict';

// ---------------------------------------------------------------------------
// UTM CAPTURE
// Reads ?utm_* params once per page load and writes them to sessionStorage
// so they survive soft navigations and can be attached to later events.
// ---------------------------------------------------------------------------
(function captureUTM() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keys   = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const found  = {};

    keys.forEach(k => { const v = params.get(k); if (v) found[k] = v; });

    if (Object.keys(found).length) {
      sessionStorage.setItem('bm_utm', JSON.stringify(found));
    }
  } catch { /* storage blocked — ignore */ }
}());

// ---------------------------------------------------------------------------
// getUTM() — read persisted UTM object (or empty object)
// ---------------------------------------------------------------------------
function getUTM() {
  try {
    const raw = sessionStorage.getItem('bm_utm');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ---------------------------------------------------------------------------
// bmTrack(eventName, data)
// Safe wrapper around window.umami.track().
// - Merges current page path and UTM context into every payload.
// - Never throws. Bails silently if Umami isn't loaded or is blocked.
// ---------------------------------------------------------------------------
function bmTrack(eventName, data) {
  try {
    if (typeof window.umami === 'undefined' || typeof window.umami.track !== 'function') return;

    const utm = getUTM();
    const payload = {
      page_path: window.location.pathname,
      ...data,
    };

    if (Object.keys(utm).length) {
      payload.campaign = utm;
    }

    window.umami.track(eventName, payload);
  } catch { /* never propagate analytics errors to the page */ }
}

// ---------------------------------------------------------------------------
// SESSION DURATION TIMER
// Records how many seconds the visitor actually spent on the page and sends
// a final event on exit. We filter < 3 s as likely accidental page loads.
// ---------------------------------------------------------------------------
(function initSessionTimer() {
  const start = Date.now();
  let sent    = false;

  function sendDuration() {
    if (sent) return;
    sent = true;
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds < 3) return;
    bmTrack('time_on_site', { seconds_on_site: seconds });
  }

  // pagehide covers back/forward cache navigation; beforeunload is the fallback
  window.addEventListener('pagehide',       sendDuration, { once: true });
  window.addEventListener('beforeunload',   sendDuration, { once: true });
}());

// ---------------------------------------------------------------------------
// DOMContentLoaded — page context event + delegated link tracking
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {

  // -- Page-type context event (supplements Umami's automatic pageview) --------
  const path     = window.location.pathname;
  const pageType =
    (path === '/' || path.endsWith('index.html') || path === '') ? 'storefront' :
    path.includes('shipping') ? 'shipping_info' :
    path.includes('returns')  ? 'returns_policy' :
    path.includes('privacy')  ? 'privacy_policy' :
    path.includes('terms')    ? 'terms_of_service' : 'other';

  bmTrack('view_page', {
    page_type: pageType,
    referrer:  document.referrer || 'direct',
  });

  // -- Delegated click tracking ------------------------------------------------
  // Catches clicks on policy links, support email, and shop CTAs wherever they
  // appear across the page. Uses closest() so nested SVGs still match.
  document.addEventListener('click', function (e) {
    const target = e.target;

    // Shipping info
    if (target.closest('a[href="shipping.html"]')) {
      bmTrack('click_shipping_info', { source: _clickSource(target) });
    }

    // Return policy
    if (target.closest('a[href="returns.html"]')) {
      bmTrack('click_return_policy', { source: _clickSource(target) });
    }

    // Support / contact email
    if (target.closest('a[href^="mailto:"]')) {
      const href = target.closest('a').getAttribute('href') || '';
      bmTrack('click_support_email', { mailto: href.replace('mailto:', '') });
    }

    // "Shop Now" / "Shop $34.99" hero + header CTAs
    const shopLink = target.closest('a[href="#shop"]');
    if (shopLink) {
      bmTrack('click_shop_now', {
        label:  (shopLink.textContent || '').trim().slice(0, 80),
        source: _clickSource(target),
      });
    }

    // Privacy / Terms in footer
    if (target.closest('a[href="privacy.html"]')) {
      bmTrack('click_privacy_policy', {});
    }
    if (target.closest('a[href="terms.html"]')) {
      bmTrack('click_terms', {});
    }

    // Social links (TikTok, Instagram, Facebook)
    const socialLink = target.closest('a[href*="tiktok.com"], a[href*="instagram.com"], a[href*="facebook.com"]');
    if (socialLink) {
      const href    = socialLink.getAttribute('href') || '';
      const network = href.includes('tiktok') ? 'tiktok' :
                      href.includes('instagram') ? 'instagram' : 'facebook';
      bmTrack('click_social', { network });
    }
  });

});

// ---------------------------------------------------------------------------
// _clickSource(el) — helper: identify which section of the page the click
// originated from so you can compare "hero CTA" vs "footer link" in Umami.
// ---------------------------------------------------------------------------
function _clickSource(el) {
  if (el.closest('.hero-ctas, .hero-copy'))          return 'hero';
  if (el.closest('.announcement-bar'))               return 'announcement_bar';
  if (el.closest('.site-header, .header-actions'))   return 'header';
  if (el.closest('.shop-trust-row, .shop-shipping-block, .shop-reassurances')) return 'shop_trust';
  if (el.closest('.desc-full-card, .desc-row'))      return 'product_story';
  if (el.closest('.trust-strip'))                    return 'hero_trust_strip';
  if (el.closest('.site-footer'))                    return 'footer';
  if (el.closest('.cart-drawer'))                    return 'cart_drawer';
  return 'page';
}

// Expose globals so main.js can call bmTrack() without an import system
window.bmTrack = bmTrack;
window.getUTM  = getUTM;
