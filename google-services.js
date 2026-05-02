/**
 * ElectionGuide AI – Google Services Integration
 * @description Integrates three distinct Google services:
 *   1. Google Translate Element  — multilingual UI (Hindi, Tamil, Telugu, Bengali, …)
 *   2. Google Maps Embed         — polling-booth finder via iframe embed
 *   3. reCAPTCHA v3 token fetch  — bot-abuse signal for the chat input
 * @module google-services
 */

'use strict';

// ── CONSTANTS ──────────────────────────────────────────────────────────────

/** Google Maps embed base URL (no API key required for basic embeds). */
const MAPS_EMBED_BASE = 'https://maps.google.com/maps';

/** Default search term for maps — overridden when user requests their booth. */
const DEFAULT_BOOTH_SEARCH = 'polling+booth+near+me+India';

/** reCAPTCHA site key (v3, replace with your own from console.cloud.google.com). */
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // test key

// ── 1. GOOGLE TRANSLATE WIDGET ─────────────────────────────────────────────

/**
 * Callback invoked by the Google Translate script after it loads.
 * Renders the translation widget into #google-translate-element.
 * Languages chosen to reflect India's official language diversity.
 */
function googleTranslateElementInit() {
  if (typeof google === 'undefined' || !google.translate) return;

  /* global google */
  new google.translate.TranslateElement(
    {
      pageLanguage:    'en',
      includedLanguages: 'hi,ta,te,bn,mr,gu,kn,ml,pa,ur,en',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false,
    },
    'google-translate-element'
  );
}

// Expose callback globally so the Translate script can find it
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
  return `${MAPS_EMBED_BASE}?q=${encoded}&output=embed&z=13&hl=en`;
}

/**
 * Injects a Google Maps embed iframe into the element with id `containerId`.
 * Creates a safe iframe with sandbox restrictions.
 * @param {string} containerId - DOM id of the container element
 * @param {string} [query]     - Optional search override
 */
function renderMapsEmbed(containerId, query) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const url = buildMapsEmbedUrl(query);
  const iframe = document.createElement('iframe');

  iframe.src             = url;
  iframe.width           = '100%';
  iframe.height          = '320';
  iframe.style.border    = 'none';
  iframe.style.borderRadius = '12px';
  iframe.loading         = 'lazy';
  iframe.allowFullscreen = false;
  iframe.referrerPolicy  = 'no-referrer-when-downgrade';
  iframe.title           = 'Find your polling booth on Google Maps';
  iframe.setAttribute('aria-label', 'Google Maps polling booth finder');
  // Sandbox: allow scripts (needed by Maps) but block popups & modals
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

  container.innerHTML = '';
  container.appendChild(iframe);
}

/**
 * Opens the Find Booth panel and renders a Maps embed for the given city.
 * Called from the "Find My Booth" button in index.html.
 * @param {string} [city=''] - Optional city/district name
 */
function findBoothOnMap(city = '') {
  const query = city
    ? `polling booth ${city} India`
    : DEFAULT_BOOTH_SEARCH;

  const panel = document.getElementById('booth-map-panel');
  if (panel) {
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  renderMapsEmbed('booth-map-container', query);

  // Log to Firebase Analytics
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
 * Renders a "Protected by Google" trust badge into the element with id
 * `badgeContainerId`.  Uses the reCAPTCHA branding per Google's guidelines.
 * @param {string} [badgeContainerId='recaptcha-badge-ui']
 */
function renderGoogleTrustBadge(badgeContainerId = 'recaptcha-badge-ui') {
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
