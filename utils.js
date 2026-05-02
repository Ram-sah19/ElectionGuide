/**
 * ElectionGuide AI – Utility Module
 * @description Pure, side-effect-free helper functions shared across the app.
 *   Each function is independently unit-testable (no DOM or API dependencies).
 * @module utils
 * @version 1.2.0
 */

'use strict';

// ── CONSTANTS ──────────────────────────────────────────────────────────────

/** Maximum allowed message length in characters. */
const MAX_INPUT_LENGTH = 500;

/** Maximum number of messages allowed per rate-limit window. */
const RATE_LIMIT_MAX = 10;

/** Duration of the rate-limit window in milliseconds. */
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Minimum valid OpenAI API key length. */
const MIN_KEY_LENGTH = 30;

// ── INPUT SANITISATION ─────────────────────────────────────────────────────

/**
 * Escapes HTML special characters to prevent XSS injection.
 * Truncates the result to MAX_INPUT_LENGTH characters.
 * @param {string} str - Raw user-supplied string
 * @returns {string} HTML-safe, length-capped string
 * @example
 * sanitizeInput('<script>alert(1)</script>');
 * // → '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .slice(0, MAX_INPUT_LENGTH);
}

// ── API KEY VALIDATION ─────────────────────────────────────────────────────

/**
 * Validates whether a string looks like a legitimate OpenAI API key.
 * Rejects placeholder / example values to avoid leaking quota errors.
 * @param {string} key - API key string to validate
 * @returns {boolean} `true` if the key appears valid
 * @example
 * isKeyValid('sk-proj-validLongAPIKeyThatIsReal1234'); // → true
 * isKeyValid('your_openai_api_key_here');              // → false
 */
function isKeyValid(key) {
  return (
    typeof key === 'string' &&
    key.startsWith('sk-') &&
    key.length > MIN_KEY_LENGTH &&
    !key.startsWith('your_') &&
    !key.includes('abcdef') &&
    !key.includes('xxxx')
  );
}

// ── RATE LIMITING ──────────────────────────────────────────────────────────

/**
 * Creates a new rate-limiter state object.
 * @returns {{ count: number, resetAt: number }}
 */
function createRateLimiter() {
  return { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS };
}

/**
 * Checks and updates the rate-limiter state.
 * Resets the window automatically when it expires.
 * @param {{ count: number, resetAt: number }} state - Mutable state object
 * @returns {boolean} `true` if the request is within the allowed rate, `false` if limited
 */
function checkRateLimit(state) {
  const now = Date.now();
  if (now > state.resetAt) {
    state.count   = 0;
    state.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  if (state.count >= RATE_LIMIT_MAX) return false;
  state.count++;
  return true;
}

// ── RESPONSE FORMATTER ─────────────────────────────────────────────────────

/**
 * Converts plain-text OpenAI reply (with markdown-like syntax) into
 * sanitised, accessible HTML.
 *
 * Processing order matters:
 *  1. Bold  2. Numbered list → <li>  3. Bullets → <li>  4. Wrap <li> in <ul>
 *  5. Paragraph / line-break normalisation
 *
 * @param {string} text - Raw assistant reply
 * @returns {string} Formatted HTML string safe to inject via innerHTML
 */
function formatReply(text) {
  if (typeof text !== 'string' || text.trim() === '') return '';

  return text
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Numbered list lines FIRST so they are included in the <ul> wrapping step
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Bullet lines starting with "- "
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    // Wrap all consecutive <li> elements in a single <ul>
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
    // Double newline → paragraph break
    .replace(/\n{2,}/g, '</p><p>')
    // Single newline → line break
    .replace(/\n/g, '<br>')
    // Wrap plain opening in <p>
    .replace(/^(?!<)/, '<p>')
    // Wrap plain closing in </p>
    .replace(/(?<!>)$/, '</p>');
}

// ── TOPIC DETECTION ────────────────────────────────────────────────────────

/**
 * Categorises a user message into a topic key used for routing and analytics.
 * Matching is case-insensitive; patterns are ordered by expected query frequency.
 * @param {string} text - Sanitized user message
 * @returns {'vote'|'timeline'|'documents'|'voter-status'|'eligibility'|'booth'|'evm'|'helpline'|'greeting'|'fallback'} Topic key
 * @example
 * detectTopic('How do I register to vote?'); // → 'vote'
 * detectTopic('xyz random text');            // → 'fallback'
 */
function detectTopic(text) {
  const t = text.toLowerCase().trim();

  if (/(how.*(vote|voting)|register|registration|sign.?up|enroll)/i.test(t)) return 'vote';
  if (/(timeline|when|date|schedule|phase|campaign|result|count)/i.test(t))   return 'timeline';
  if (/(voter.?id|status|check.*voter|voter.*check|epic)/i.test(t))           return 'voter-status';
  if (/(document|proof|passport|licence|license|what.*need|bring)/i.test(t)) return 'documents';
  if (/(eligible|eligibility|age|qualify)/i.test(t))                          return 'eligibility';
  if (/(booth|polling|station|where.*vote)/i.test(t))                         return 'booth';
  if (/(evm|electronic|voting machine|vvpat)/i.test(t))                       return 'evm';
  if (/(helpline|contact|1950|phone|call)/i.test(t))                          return 'helpline';
  if (/(hi|hello|hey|namaste)/i.test(t))                                       return 'greeting';
  return 'fallback';
}

// ── CACHE HELPERS ──────────────────────────────────────────────────────────

/**
 * Normalises a string into a stable, case-insensitive cache key.
 * @param {string} text - Raw text to normalise
 * @returns {string} Lowercase, trimmed cache key; empty string for non-strings
 * @example
 * toCacheKey('  How do I VOTE?  '); // → 'how do i vote?'
 * toCacheKey(null);                  // → ''
 */
function toCacheKey(text) {
  return typeof text === 'string' ? text.toLowerCase().trim() : '';
}
