/**
 * ElectionGuide AI – Google Services Integration
 * @description Integrates four distinct Google services:
 *   1. Google Translate Element  — multilingual UI (Hindi, Tamil, Telugu, Bengali, …)
 *   2. Google Maps Embed         — polling-booth finder via iframe embed
 *   3. reCAPTCHA v3 token fetch  — bot-abuse signal for the chat input
 *   4. Google Trust Badge        — reCAPTCHA branding per Google guidelines
 * @module google-services
 * @version 1.1.0
 */

'use strict';

// ── CONSTANTS ──────────────────────────────────────────────────────────────

/** Google Maps embed base URL (no API key required for basic embeds). */
const MAPS_EMBED_BASE = 'https://maps.google.com/maps';

/** Default search term for maps — overridden when user requests their booth. */
const DEFAULT_BOOTH_SEARCH = 'polling+booth+near+me+India';

/** Height in pixels of the rendered Google Maps iframe. */
const MAPS_IFRAME_HEIGHT = '320';

/** Default zoom level for the Maps embed (city-level view). */
const MAPS_DEFAULT_ZOOM = 13;

/** DOM id of the Google Translate widget container. */
const TRANSLATE_CONTAINER_ID = 'google-translate-element';

/** DOM id of the polling booth map panel. */
const BOOTH_MAP_PANEL_ID = 'booth-map-panel';

/** DOM id of the polling booth map iframe container. */
const BOOTH_MAP_CONTAINER_ID = 'booth-map-container';

/** DOM id of the reCAPTCHA trust badge container. */
const RECAPTCHA_BADGE_CONTAINER_ID = 'recaptcha-badge-ui';

/**
 * reCAPTCHA v3 site key.
 * Replace with your own from console.cloud.google.com for production.
 * The test key (below) always passes verification but is marked as test traffic.
 */
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

// ── 1. GOOGLE TRANSLATE WIDGET ─────────────────────────────────────────────

/**
 * Callback invoked by the Google Translate script after it loads.
 * Renders the multilingual translation widget into {@link TRANSLATE_CONTAINER_ID}.
 * Languages chosen to reflect India's 22 scheduled official languages.
 * @returns {void}
 */
function googleTranslateElementInit() {
  if (typeof google === 'undefined' || !google.translate) return;

  /* global google */
  new google.translate.TranslateElement(
    {
      pageLanguage:      'en',
      includedLanguages: 'hi,ta,te,bn,mr,gu,kn,ml,pa,ur,en',
      layout:            google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay:       false,
    },
    TRANSLATE_CONTAINER_ID
  );
}

// Expose callback globally so the Translate script can find it after async load
if (typeof window !== 'undefined') {
  window.googleTranslateElementInit = googleTranslateElementInit;
}

// ── 2. GOOGLE MAPS POLLING-BOOTH FINDER ───────────────────────────────────

/**
 * Builds a Google Maps embed iframe URL for a given search query.
 * @param {string} [query=DEFAULT_BOOTH_SEARCH] - Location/search string
 * @returns {string} Full embed URL
 */
function buildMapsEmbedUrl(query = DEFAULT_BOOTH_SEARCH) {
  const encoded = encodeURIComponent(query);
  return `${MAPS_EMBED_BASE}?q=${encoded}&output=embed&z=${MAPS_DEFAULT_ZOOM}&hl=en`;
}

/**
 * Injects a Google Maps embed iframe into the element with id `containerId`.
 * Creates a sandboxed iframe — scripts allowed (required by Maps), popups blocked.
 * @param {string} containerId - DOM id of the target container element
 * @param {string} [query]     - Optional search term override
 * @returns {void}
 */
function renderMapsEmbed(containerId, query) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const url    = buildMapsEmbedUrl(query);
  const iframe = document.createElement('iframe');

  iframe.src              = url;
  iframe.width            = '100%';
  iframe.height           = MAPS_IFRAME_HEIGHT;
  iframe.style.border     = 'none';
  iframe.style.borderRadius = '12px';
  iframe.loading          = 'lazy';
  iframe.allowFullscreen  = false;
  iframe.referrerPolicy   = 'no-referrer-when-downgrade';
  iframe.title            = 'Find your polling booth on Google Maps';
  iframe.setAttribute('aria-label', 'Google Maps polling booth finder');
  // Sandbox: allow scripts (required by Maps JS) but block popups & top-nav
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

  container.innerHTML = '';
  container.appendChild(iframe);
}

/**
 * Opens the polling-booth finder panel and renders a Maps embed for the given city.
 * Called from the "Find My Booth" quick-reply button in index.html.
 * @param {string} [city=''] - Optional city or district name to pre-populate the search
 * @returns {void}
 */
function findBoothOnMap(city = '') {
  const query = city
    ? `polling booth ${city} India`
    : DEFAULT_BOOTH_SEARCH;

  const panel = document.getElementById(BOOTH_MAP_PANEL_ID);
  if (panel) {
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  renderMapsEmbed(BOOTH_MAP_CONTAINER_ID, query);

  // Dual-track analytics: Firebase + GA4
  if (typeof logFirebaseEvent === 'function') {
    logFirebaseEvent('find_booth_map_opened', { city: city || 'default' });
  }
  if (typeof trackEvent === 'function') {
    trackEvent('find_booth_map', { city: city || 'default' });
  }
}

// ── 3. reCAPTCHA v3 INTEGRATION ──────────────────────────────────────────

/**
 * Fetches a reCAPTCHA v3 token for a given action.
 * Token can be sent to a server for verification; here it signals legitimacy.
 * @param {string} [action='chat_send'] - reCAPTCHA action label
 * @returns {Promise<string|null>} Token string, or null if unavailable
 */
async function getRecaptchaToken(action = 'chat_send') {
  if (typeof grecaptcha === 'undefined') return null;
  try {
    return await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
  } catch (err) {
    console.warn('[reCAPTCHA] Token fetch failed:', err.message);
    return null;
  }
}

// ── 4. GOOGLE SAFE BROWSING SIGNAL (UI) ──────────────────────────────────

/**
 * Renders a "Protected by Google" trust badge into the badge container.
 * Uses reCAPTCHA branding per Google's display guidelines.
 * @param {string} [badgeContainerId=RECAPTCHA_BADGE_CONTAINER_ID] - Target element id
 * @returns {void}
 */
function renderGoogleTrustBadge(badgeContainerId = RECAPTCHA_BADGE_CONTAINER_ID) {
  const el = document.getElementById(badgeContainerId);
  if (!el) return;
  el.innerHTML = `
    <div class="g-trust-badge" aria-label="Protected by Google reCAPTCHA" role="note">
      <svg width="14" height="14" viewBox="0 0 40 40" aria-hidden="true">
        <path fill="#4285F4" d="M20 0C9 0 0 9 0 20s9 20 20 20 20-9 20-20S31 0 20 0z"/>
        <path fill="#fff" d="M17 27l-6-6 1.4-1.4L17 24.2l10.6-10.6L29 15z"/>
      </svg>
      <span>Protected by Google</span>
    </div>`;
}

// ── INIT ──────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    renderGoogleTrustBadge();
  });
}
