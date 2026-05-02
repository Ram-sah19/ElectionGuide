/**
 * ElectionGuide AI – Main Script
 * @description Handles navigation, chat logic, OpenAI API integration,
 *   sidebar state, and UI rendering. Pure utility functions are
 *   delegated entirely to utils.js — no duplication.
 * @version 1.4.0
 * @license MIT
 */

'use strict';

// =====================================================================
// CONSTANTS
// =====================================================================

/** OpenAI chat completions endpoint. */
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/** OpenAI model identifier. */
const OPENAI_MODEL = 'gpt-4o-mini';

/** Maximum tokens per OpenAI response. */
const OPENAI_MAX_TOKENS = 600;

/** OpenAI sampling temperature — lower = more deterministic. */
const OPENAI_TEMPERATURE = 0.4;

/** Delay (ms) before resolving a cached response — simulates thinking. */
const CACHE_RESPONSE_DELAY_MS = 300;

/** Delay (ms) before showing a local fallback response. */
const FALLBACK_RESPONSE_DELAY_MS = 700;

/** Fetch timeout in milliseconds — aborts hung requests after 15 s. */
const FETCH_TIMEOUT_MS = 15_000;

/** Maximum conversation turns kept in memory (prevents oversized API payloads). */
const MAX_HISTORY_TURNS = 10;

/** Local-file protocol sentinel — disables live API calls when served from disk. */
const FILE_PROTOCOL = 'file:';

/** Rate-limit exceeded message shown in the chat bubble. */
const RATE_LIMIT_MESSAGE =
  '<strong>⏳ Slow down!</strong><br>You are sending messages too quickly. Please wait a moment.';

/** System prompt sent to OpenAI as the authoritative persona definition. */
const SYSTEM_PROMPT = `You are ElectionGuide AI, an assistant that helps users understand the election process in a simple and interactive way.

Your responsibilities:
- Explain election steps clearly for first-time voters
- Provide timelines in chronological order
- List required documents when asked
- Guide users step-by-step

Rules:
- Keep answers short and easy to understand
- Use bullet points
- Avoid political opinions
- Stay neutral and factual
- If user input is unclear, ask a follow-up question

Context:
- Country: India
- User Type: First-time voter

Response Format:
1. Title
2. Steps / Info (bullet points)
3. Key Tips (if relevant)`;

// =====================================================================
// PREDEFINED CONTENT RESPONSES
// =====================================================================

/**
 * Structured HTML responses for the three core content flows.
 * Each entry has a `title` (string) and `content` (HTML string).
 * @type {Object.<string, {title: string, content: string}>}
 */
const RESPONSES = {
  vote: {
    title: '🗳️ How to Vote – Step-by-Step Guide',
    content: `<p>Here's everything you need to do as a first-time voter:</p>
<div class="response-section">
  <h4>Step 1 – Register as a Voter</h4>
  <ul>
    <li>Visit <strong>voters.eci.gov.in</strong> or your nearest BLO office</li>
    <li>Fill Form 6 (New Voter Registration)</li>
    <li>Submit with age proof &amp; address proof</li>
    <li>You must be <strong>18+ years old</strong> on the qualifying date</li>
  </ul>
</div>
<div class="response-section">
  <h4>Step 2 – Verify Your Registration</h4>
  <ul>
    <li>Check your name on the Electoral Roll online</li>
    <li>Download your Voter ID (EPIC) from the portal</li>
    <li>Note your <strong>Booth number &amp; Serial number</strong></li>
  </ul>
</div>
<div class="response-section">
  <h4>Step 3 – On Voting Day</h4>
  <ul>
    <li>Carry a valid photo ID (Voter ID / Aadhaar / Passport etc.)</li>
    <li>Go to your designated polling booth</li>
    <li>Show your ID, get your finger inked, collect ballot slip</li>
    <li>Use the EVM (Electronic Voting Machine) to cast your vote</li>
    <li>Collect your <strong>VVPAT slip</strong> as confirmation</li>
  </ul>
</div>
<div class="tip-box">💡 <strong>Tip:</strong> Voting usually takes only 5–10 minutes. Booths are open from 7 AM to 6 PM. Arrive early to avoid queues!</div>`,
  },

  timeline: {
    title: '📅 Indian Election Timeline',
    content: `<p>Here's a typical Lok Sabha / State election timeline:</p>
<div class="response-section">
  <h4>Phase 1 – Registration Window</h4>
  <ul>
    <li>📋 New voter registration opens (6–8 months before election)</li>
    <li>Electoral roll revision &amp; corrections accepted</li>
    <li>BLO house visits for verification</li>
  </ul>
</div>
<div class="response-section">
  <h4>Phase 2 – Announcement &amp; Model Code</h4>
  <ul>
    <li>📢 Election Commission announces election schedule</li>
    <li><strong>Model Code of Conduct (MCC)</strong> comes into effect</li>
    <li>Candidate nominations open &amp; close</li>
    <li>Scrutiny + withdrawal period</li>
  </ul>
</div>
<div class="response-section">
  <h4>Phase 3 – Campaign Period</h4>
  <ul>
    <li>🎙️ Party campaigns, rallies, manifestos released</li>
    <li>Campaign ends 48 hours before voting (Silent Period)</li>
  </ul>
</div>
<div class="response-section">
  <h4>Phase 4 – Voting Day</h4>
  <ul>
    <li>🗳️ Polling day – booths open 7 AM to 6 PM</li>
    <li>Central forces deployed for security</li>
  </ul>
</div>
<div class="response-section">
  <h4>Phase 5 – Results</h4>
  <ul>
    <li>📊 Counting day (usually 1–3 days after last phase)</li>
    <li>Results declared, government formed</li>
  </ul>
</div>
<div class="tip-box">💡 <strong>Tip:</strong> The next Lok Sabha election is due by <strong>May 2029</strong>. State elections happen on rolling schedules – check ECI's website for your state!</div>`,
  },

  documents: {
    title: '📄 Documents Required for Voting',
    content: `<p>You need <strong>any ONE</strong> of the following valid photo IDs:</p>
<div class="response-section">
  <h4>Primary ID (Preferred)</h4>
  <ul>
    <li>🪪 <strong>Voter ID Card (EPIC)</strong> – Most preferred</li>
    <li>📱 <strong>e-EPIC</strong> – Digital Voter ID on your phone (valid!)</li>
  </ul>
</div>
<div class="response-section">
  <h4>Alternative Valid IDs (ECI Accepted)</h4>
  <ul>
    <li>🪪 Aadhaar Card</li>
    <li>🛂 Passport</li>
    <li>🚗 Driving Licence</li>
    <li>🏦 MNREGA Job Card</li>
    <li>📘 PAN Card (with photo)</li>
    <li>🎓 Smart Card issued by Central/State Govt.</li>
    <li>📋 Service ID Card (Central/State/PSU employees)</li>
    <li>🧾 Pensioner's Photo ID Card</li>
    <li>🏥 Health Insurance Smart Card (RSBY)</li>
  </ul>
</div>
<div class="response-section">
  <h4>For Registration (Form 6)</h4>
  <ul>
    <li>Age Proof: Birth certificate / School certificate / Aadhaar</li>
    <li>Address Proof: Aadhaar / Ration Card / Bank Passbook / Utility Bill</li>
    <li>Passport-size photograph</li>
  </ul>
</div>
<div class="tip-box">💡 <strong>Tip:</strong> You can download your <strong>e-EPIC</strong> from voters.eci.gov.in and show it from your phone at the booth!</div>`,
  },
};

// =====================================================================
// APPLICATION STATE
// =====================================================================

/** @type {boolean} True while an AI response is in-flight; blocks re-sends. */
let isWaiting = false;

/**
 * Rate-limiter state object — created once via utils.createRateLimiter().
 * @type {{ count: number, resetAt: number }}
 */
const RATE_LIMIT_STATE = createRateLimiter();

/**
 * In-memory response cache — keyed by normalised input (via utils.toCacheKey).
 * Prevents redundant API calls for repeated questions.
 * @type {Map<string, string>}
 */
const responseCache = new Map();

/**
 * Multi-turn conversation history sent to OpenAI on every request.
 * Trimmed to MAX_HISTORY_TURNS pairs to prevent oversized payloads.
 * @type {Array<{role: string, content: string}>}
 */
const conversationHistory = [];

/**
 * Cached reference to the send button — avoids repeated DOM lookups.
 * @type {HTMLButtonElement|null}
 */
let sendBtnEl = null;

// =====================================================================
// SECTION NAVIGATION
// =====================================================================

/**
 * Section title map — maps section identifiers to human-readable labels.
 * @type {Object.<string, string>}
 */
const SECTION_TITLES = {
  home:     'Home',
  chat:     'Ask Assistant',
  vote:     'How to Vote',
  timeline: 'Election Timeline',
  docs:     'Documents',
};

/**
 * Activates a named section, deactivates all others, updates the nav bar,
 * fires analytics events, and closes the sidebar.
 * @param {string} name - Section identifier (e.g. 'home', 'chat')
 * @returns {void}
 */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });

  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.add('active');

  const btn = document.getElementById(`btn-${name}`);
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-current', 'page');
  }

  const title = SECTION_TITLES[name] || 'ElectionGuide AI';
  document.getElementById('pageTitle').textContent = title;

  // Dual-track analytics: GA4 + Firebase
  trackEvent('page_view', { page_title: title, page_location: `#${name}` });
  logFirebaseEvent('page_view', { page_title: title });
  logPageViewToFirestore(title);

  closeSidebar();
}

// =====================================================================
// FLOW TRIGGERS
// =====================================================================

/**
 * Flow title map — maps content-flow types to readable page titles.
 * @type {Object.<string, string>}
 */
const FLOW_TITLES = {
  vote:      'How to Vote',
  timeline:  'Election Timeline',
  documents: 'Required Documents',
};

/**
 * Navigates to the chat section and injects a predefined content response.
 * Also fires GA4, Firebase Analytics, and Firestore events.
 * @param {'vote'|'timeline'|'documents'} type - Content flow identifier
 * @returns {void}
 */
function triggerFlow(type) {
  showSection('chat');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-chat');
  if (btn) btn.classList.add('active');

  document.getElementById('pageTitle').textContent = FLOW_TITLES[type] || 'Ask Assistant';

  trackEvent('select_content', { content_type: 'guide', item_id: type });
  logFirebaseEvent('select_content', { content_type: 'guide', item_id: type });
  logQuestionToFirestore(type);

  setTimeout(() => addBotResponse(type), CACHE_RESPONSE_DELAY_MS);
}

// =====================================================================
// SIDEBAR
// =====================================================================

/**
 * Toggles the sidebar open/closed and syncs the aria-expanded attribute.
 * @returns {void}
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn     = document.getElementById('menuToggle');
  const isOpen  = sidebar.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

/**
 * Closes the sidebar unconditionally and resets aria-expanded.
 * @returns {void}
 */
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
}

// Close sidebar when clicking outside it
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('menuToggle');
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
    closeSidebar();
  }
});

// =====================================================================
// CHAT — MESSAGE RENDERING
// =====================================================================

/**
 * Injects a predefined HTML response for a known content key.
 * @param {'vote'|'timeline'|'documents'} key - Response key from RESPONSES map
 * @returns {void}
 */
function addBotResponse(key) {
  if (RESPONSES[key]) {
    const r = RESPONSES[key];
    appendMessage('bot', `<strong>${r.title}</strong>${r.content}`);
  }
}

/**
 * Creates and appends a message bubble (user or bot) to the chat log.
 * @param {'user'|'bot'} role - Message sender role
 * @param {string} html - Trusted HTML string to render inside the bubble
 * @returns {void}
 */
function appendMessage(role, html) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;
  div.setAttribute('role', 'article');
  div.setAttribute('aria-label', role === 'user' ? 'Your message' : 'Assistant message');
  div.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="msg-bubble">${html}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/**
 * Appends an animated typing indicator bubble to the chat log.
 * Remove it with {@link removeTyping} before appending the real reply.
 * @returns {void}
 */
function showTyping() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message bot-message';
  div.id = 'typingIndicator';
  div.setAttribute('aria-label', 'Assistant is typing');
  div.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">🤖</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/**
 * Removes the typing indicator bubble from the chat log, if present.
 * @returns {void}
 */
function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// =====================================================================
// CHAT — INPUT HANDLING
// =====================================================================

/**
 * Dispatches a quick-reply preset question as if the user typed it.
 * Sanitises via utils.sanitizeInput and detects topic via utils.detectTopic.
 * @param {string} text - Preset question text
 * @returns {void}
 */
function sendQuick(text) {
  const safe  = sanitizeInput(text);
  const topic = detectTopic(safe);
  appendMessage('user', safe);
  trackEvent('quick_reply', { topic });
  logFirebaseEvent('quick_reply', { topic });
  logQuestionToFirestore(topic);
  handleUserMessage(safe);
}

/**
 * Reads, validates, and dispatches the user's typed message.
 * Enforces rate limiting via utils.checkRateLimit before dispatching.
 * @returns {void}
 */
function sendMessage() {
  const input = document.getElementById('userInput');
  const raw   = input.value.trim();
  if (!raw || isWaiting) return;

  if (!checkRateLimit(RATE_LIMIT_STATE)) {
    appendMessage('bot', RATE_LIMIT_MESSAGE);
    return;
  }

  const safe  = sanitizeInput(raw);
  const topic = detectTopic(safe);
  appendMessage('user', safe);
  input.value        = '';
  input.style.height = 'auto';
  trackEvent('chat_message_sent', { length: safe.length, topic });
  logFirebaseEvent('chat_message_sent', { topic });
  handleUserMessage(safe);
}

/**
 * Submits the chat form when Enter is pressed without Shift.
 * @param {KeyboardEvent} e - Keyboard event from the textarea
 * @returns {void}
 */
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/**
 * Dynamically resizes the textarea to fit its content, capped at 120 px.
 * @param {HTMLTextAreaElement} el - The textarea element to resize
 * @returns {void}
 */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
}

// =====================================================================
// CHAT — API KEY VALIDATION
// =====================================================================

/**
 * Returns true if a usable OpenAI API key is available in the environment.
 * Delegates format validation to utils.isKeyValid.
 * @returns {boolean}
 */
function hasValidApiKey() {
  return typeof OPENAI_API_KEY !== 'undefined' && isKeyValid(OPENAI_API_KEY);
}

// =====================================================================
// CHAT — GA4 ANALYTICS HELPER
// =====================================================================

/**
 * Fires a GA4 event via gtag, guarding against the script being absent.
 * @param {string} eventName - GA4 event name
 * @param {Object} [params={}] - Optional event parameters
 * @returns {void}
 */
function trackEvent(eventName, params = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, params);
  }
}

// =====================================================================
// CHAT — CORE MESSAGE HANDLER
// =====================================================================

/**
 * Trims the conversation history to at most MAX_HISTORY_TURNS message pairs
 * (user + assistant) to avoid sending oversized payloads to the OpenAI API.
 * Mutates the shared {@link conversationHistory} array in place.
 * @returns {void}
 */
function trimConversationHistory() {
  const maxMessages = MAX_HISTORY_TURNS * 2;
  if (conversationHistory.length > maxMessages) {
    conversationHistory.splice(0, conversationHistory.length - maxMessages);
  }
}

/**
 * Central message handler — checks the cache first, falls back to a local
 * keyword response when no API key is present, or calls OpenAI directly.
 * Uses AbortController to enforce a fetch timeout of {@link FETCH_TIMEOUT_MS}.
 * On API failure, recovers gracefully with a local fallback response.
 * @param {string} text - Sanitized user input
 * @returns {Promise<void>}
 * @throws Will not propagate — all errors are caught and handled internally.
 */
async function handleUserMessage(text) {
  // Resolve and cache the send button reference
  if (!sendBtnEl) sendBtnEl = document.getElementById('sendBtn');

  isWaiting = true;
  sendBtnEl.disabled = true;
  showTyping();

  const cacheKey = toCacheKey(text);

  // 1. Serve from cache if available
  if (responseCache.has(cacheKey)) {
    setTimeout(() => {
      removeTyping();
      appendMessage('bot', responseCache.get(cacheKey));
      isWaiting = false;
      sendBtnEl.disabled = false;
    }, CACHE_RESPONSE_DELAY_MS);
    return;
  }

  // 2. Use local fallback when no API key or running from file://
  if (!hasValidApiKey() || location.protocol === FILE_PROTOCOL) {
    setTimeout(() => {
      removeTyping();
      const reply = getLocalResponse(text);
      responseCache.set(cacheKey, reply);
      appendMessage('bot', reply);
      isWaiting = false;
      sendBtnEl.disabled = false;
    }, FALLBACK_RESPONSE_DELAY_MS);
    return;
  }

  conversationHistory.push({ role: 'user', content: text });
  trimConversationHistory();

  // 3. AbortController enforces the fetch timeout
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:       OPENAI_MODEL,
        messages:    [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationHistory],
        max_tokens:  OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE,
      }),
    });

    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`);

    const raw    = data.choices[0].message.content;
    const styled = formatReply(raw);

    conversationHistory.push({ role: 'assistant', content: raw });
    trimConversationHistory();
    responseCache.set(cacheKey, styled);
    removeTyping();
    appendMessage('bot', styled);
    trackEvent('ai_response_received', { model: OPENAI_MODEL });
    logFirebaseEvent('ai_response_received', { model: OPENAI_MODEL });

  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[ElectionGuide AI] handleUserMessage error:', err.message);
    removeTyping();
    appendMessage('bot', getLocalResponse(text));
    conversationHistory.pop();
  }

  isWaiting = false;
  sendBtnEl.disabled = false;
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

// =====================================================================
// LOCAL FALLBACK RESPONSES
// =====================================================================

/**
 * Returns a pre-written HTML response matched by keyword patterns.
 * Used when no OpenAI key is configured or as an error fallback.
 * @param {string} text - Raw (already sanitized) user message
 * @returns {string} HTML string ready to inject into a message bubble
 */
function getLocalResponse(text) {
  const t = text.toLowerCase();

  if (/(how.*(vote|voting)|register|registration|sign.?up|enroll)/i.test(t))
    return `<strong>${RESPONSES.vote.title}</strong>${RESPONSES.vote.content}`;

  if (/(timeline|when|date|schedule|phase|campaign|result|count)/i.test(t))
    return `<strong>${RESPONSES.timeline.title}</strong>${RESPONSES.timeline.content}`;

  if (/(voter.?id|status|check.*voter|voter.*check)/i.test(t))
    return `<strong>🪪 Check Your Voter ID Status</strong>
<ul>
  <li>Visit <strong>voters.eci.gov.in</strong> → "Search in Electoral Roll"</li>
  <li>Enter your name, date of birth &amp; state</li>
  <li>Or search by <strong>EPIC number</strong> directly</li>
  <li>Call <strong>1950</strong> (toll-free) for assistance</li>
</ul>
<div class="tip-box">💡 Download your <strong>e-EPIC</strong> anytime from the ECI portal.</div>`;

  if (/(document|proof|passport|licence|license|what.*need|bring)/i.test(t))
    return `<strong>${RESPONSES.documents.title}</strong>${RESPONSES.documents.content}`;

  if (/(eligible|eligibility|age|qualify)/i.test(t))
    return `<strong>✅ Voter Eligibility in India</strong>
<ul>
  <li>Must be a <strong>citizen of India</strong></li>
  <li>Must be <strong>18 years or older</strong> on the qualifying date</li>
  <li>Must be a <strong>resident</strong> of the constituency</li>
</ul>
<div class="tip-box">💡 NRIs can also register at their Indian address constituency!</div>`;

  if (/(booth|polling|station|where.*vote)/i.test(t))
    return `<strong>📍 Finding Your Polling Booth</strong>
<ul>
  <li>Visit <strong>voters.eci.gov.in</strong> → "Find Polling Station"</li>
  <li>Enter your EPIC number or name to find your booth</li>
  <li>Call the ECI helpline: <strong>1950</strong> (toll-free)</li>
</ul>`;

  if (/(evm|electronic|voting machine|vvpat)/i.test(t))
    return `<strong>🖥️ How to Use an EVM</strong>
<ul>
  <li>Press the <strong>blue button</strong> next to your chosen candidate</li>
  <li>A <strong>beep</strong> confirms your vote is cast</li>
  <li><strong>VVPAT slip</strong> shows for 7 seconds to confirm</li>
</ul>
<div class="tip-box">💡 Your vote is completely <strong>secret</strong>.</div>`;

  if (/(helpline|contact|1950|phone|call)/i.test(t))
    return `<strong>📞 ECI Helpline &amp; Support</strong>
<ul>
  <li>🆓 <strong>Voter Helpline: 1950</strong> (toll-free)</li>
  <li>🌐 voters.eci.gov.in</li>
  <li>📱 Voter Helpline App (iOS &amp; Android)</li>
</ul>`;

  if (/(hi|hello|hey|namaste)/i.test(t))
    return `👋 <strong>Namaste!</strong> I am ElectionGuide AI.<br><br>Ask me about:<br>
<ul>
  <li>🗳️ How to register and vote</li>
  <li>📅 Election timelines</li>
  <li>📄 Required documents</li>
  <li>📍 Finding your booth</li>
</ul>`;

  return `🤔 <strong>Could you rephrase that?</strong><br><br>Try asking:<br>
<ul>
  <li>🗳️ "How do I register to vote?"</li>
  <li>📅 "What is the election timeline?"</li>
  <li>📄 "What documents do I need?"</li>
  <li>🪪 "How do I check my voter ID status?"</li>
</ul>
<div class="tip-box">💡 Use the quick buttons below for instant answers!</div>`;
}

// =====================================================================
// INITIALISATION
// =====================================================================

/**
 * Bootstraps the application once the DOM is fully parsed.
 * Caches the send button reference and navigates to the Home section.
 * @returns {void}
 */
document.addEventListener('DOMContentLoaded', () => {
  sendBtnEl = document.getElementById('sendBtn');
  showSection('home');
});
