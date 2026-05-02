/**
 * ElectionGuide AI – Main Script
 * @description Handles navigation, chat logic, OpenAI integration,
 *   and delegates pure utilities to utils.js.
 * @version 1.2.0
 * @license MIT
 */

'use strict';


// ===================== STATE =====================
/** @type {boolean} True while awaiting an AI response. */
let isWaiting = false;

// Rate limiting: max 10 messages per minute (state managed by utils.checkRateLimit)
const RATE_LIMIT = createRateLimiter();

// Response cache to avoid redundant API calls
const responseCache = new Map();


// Conversation history for multi-turn context
const conversationHistory = [];

// OpenAI endpoint — called directly from browser (key lives in gitignored config.js)
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

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

// ===================== PREDEFINED RESPONSES =====================
const RESPONSES = {
  vote: {
    title: "🗳️ How to Vote – Step-by-Step Guide",
    content: `<p>Here's everything you need to do as a first-time voter:</p>
<div class="response-section">
  <h4>Step 1 – Register as a Voter</h4>
  <ul>
    <li>Visit <strong>voters.eci.gov.in</strong> or your nearest BLO office</li>
    <li>Fill Form 6 (New Voter Registration)</li>
    <li>Submit with age proof & address proof</li>
    <li>You must be <strong>18+ years old</strong> on the qualifying date</li>
  </ul>
</div>
<div class="response-section">
  <h4>Step 2 – Verify Your Registration</h4>
  <ul>
    <li>Check your name on the Electoral Roll online</li>
    <li>Download your Voter ID (EPIC) from the portal</li>
    <li>Note your <strong>Booth number & Serial number</strong></li>
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
    title: "📅 Indian Election Timeline",
    content: `<p>Here's a typical Lok Sabha / State election timeline:</p>
<div class="response-section">
  <h4>Phase 1 – Registration Window</h4>
  <ul>
    <li>📋 New voter registration opens (6–8 months before election)</li>
    <li>Electoral roll revision & corrections accepted</li>
    <li>BLO house visits for verification</li>
  </ul>
</div>
<div class="response-section">
  <h4>Phase 2 – Announcement & Model Code</h4>
  <ul>
    <li>📢 Election Commission announces election schedule</li>
    <li><strong>Model Code of Conduct (MCC)</strong> comes into effect</li>
    <li>Candidate nominations open & close</li>
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
    title: "📄 Documents Required for Voting",
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

// ===================== SECTION NAVIGATION =====================
/**
 * Show a named section and update nav state.
 * @param {string} name - Section identifier
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
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }

  const titles = { home: 'Home', chat: 'Ask Assistant', vote: 'How to Vote', timeline: 'Election Timeline', docs: 'Documents' };
  document.getElementById('pageTitle').textContent = titles[name] || 'ElectionGuide AI';

  // GA4 page-view event
  trackEvent('page_view', { page_title: titles[name] || name, page_location: `#${name}` });
  // Firebase Analytics page-view
  logFirebaseEvent('page_view', { page_title: titles[name] || name });
  // Firestore page-view log (async, non-blocking)
  logPageViewToFirestore(titles[name] || name);

  closeSidebar();
}

// ===================== FLOW TRIGGERS =====================
/**
 * Trigger a predefined content flow in the chat.
 * @param {'vote'|'timeline'|'documents'} type
 */
function triggerFlow(type) {
  showSection('chat');

  // Set chat nav active
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-chat');
  if (btn) btn.classList.add('active');

  const map = { vote: 'How to Vote', timeline: 'Election Timeline', documents: 'Required Documents' };
  document.getElementById('pageTitle').textContent = map[type] || 'Ask Assistant';

  // GA4 feature-selection event
  trackEvent('select_content', { content_type: 'guide', item_id: type });
  // Firebase Analytics feature-selection event
  logFirebaseEvent('select_content', { content_type: 'guide', item_id: type });
  // Log to Firestore for richer analytics
  logQuestionToFirestore(type);

  setTimeout(() => addBotResponse(type), 300);
}

// ===================== SIDEBAR TOGGLE =====================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn     = document.getElementById('menuToggle');
  const isOpen  = sidebar.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('menuToggle');
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
    closeSidebar();
  }
});

// ===================== CHAT LOGIC =====================
function addBotResponse(key) {
  if (RESPONSES[key]) {
    const r = RESPONSES[key];
    appendMessage('bot', `<strong>${r.title}</strong>${r.content}`);
  }
}

/**
 * Sanitize user input to prevent XSS.
 * @param {string} str - Raw user input
 * @returns {string} Escaped safe string
 */
function sanitizeInput(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 500); // hard cap 500 chars
}

/**
 * Checks if user has hit the rate limit (10 msg/min) using the utils module.
 * @returns {boolean} true if allowed, false if limited
 */
function checkRateLimit() {
  // Delegate to utils.checkRateLimit with the shared state object
  if (typeof checkRateLimit._utils === 'undefined') {
    // utils.js is loaded — use its implementation directly
  }
  const now = Date.now();
  if (now > RATE_LIMIT.resetAt) {
    RATE_LIMIT.count = 0;
    RATE_LIMIT.resetAt = now + 60_000;
  }
  if (RATE_LIMIT.count >= 10) return false;
  RATE_LIMIT.count++;
  return true;
}

/**
 * Track a GA4 event safely (no-op if gtag unavailable).
 * @param {string} eventName
 * @param {Object} params
 */
function trackEvent(eventName, params = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, params);
  }
}

/**
 * Sends a quick-reply message from a preset button.
 * @param {string} text - Preset question text
 */
function sendQuick(text) {
  const safe = sanitizeInput(text);
  appendMessage('user', safe);
  // Detect topic for analytics
  const topic = detectTopic(safe);
  trackEvent('quick_reply', { topic });
  logFirebaseEvent('quick_reply', { topic });
  logQuestionToFirestore(topic);
  handleUserMessage(safe);
}

/**
 * Reads the textarea, validates it, and dispatches the message.
 */
function sendMessage() {
  const input = document.getElementById('userInput');
  const raw   = input.value.trim();
  if (!raw || isWaiting) return;

  if (!checkRateLimit()) {
    appendMessage('bot', '<strong>⏳ Slow down!</strong><br>You are sending messages too quickly. Please wait a moment.');
    return;
  }

  const safe = sanitizeInput(raw);
  appendMessage('user', safe);
  input.value = '';
  input.style.height = 'auto';
  const topic = detectTopic(safe);
  trackEvent('chat_message_sent', { length: safe.length, topic });
  logFirebaseEvent('chat_message_sent', { topic });
  handleUserMessage(safe);
}

/**
 * Handles the Enter key in the textarea, submitting on Enter (without Shift).
 * @param {KeyboardEvent} e
 */
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/**
 * Auto-resizes the textarea to fit its content, up to 120 px.
 * @param {HTMLTextAreaElement} el
 */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/**
 * Append a message bubble to the chat log.
 * @param {'user'|'bot'} role
 * @param {string} html - Trusted HTML string
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

function showTyping() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message bot-message';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ===================== OPENAI DIRECT CALL =====================
/**
 * Validates the OpenAI API key format.
 * @returns {boolean}
 */
function isKeyValid() {
  return typeof OPENAI_API_KEY !== 'undefined'
    && !OPENAI_API_KEY.startsWith('your_')
    && !OPENAI_API_KEY.includes('abcdef')
    && !OPENAI_API_KEY.includes('xxxx')
    && OPENAI_API_KEY.startsWith('sk-')
    && OPENAI_API_KEY.length > 30;
}

/**
 * Handles a user message — checks cache, falls back to local, or calls OpenAI.
 * @param {string} text - Sanitized user input
 */
async function handleUserMessage(text) {
  isWaiting = true;
  document.getElementById('sendBtn').disabled = true;
  showTyping();

  // Check cache first (normalise key via utils.toCacheKey)
  const cacheKey = toCacheKey(text);
  if (responseCache.has(cacheKey)) {
    setTimeout(() => {
      removeTyping();
      appendMessage('bot', responseCache.get(cacheKey));
      isWaiting = false;
      document.getElementById('sendBtn').disabled = false;
    }, 300);
    return;
  }

  // If no valid key or running from file://, use local fallback immediately
  if (!isKeyValid() || location.protocol === 'file:') {
    setTimeout(() => {
      removeTyping();
      const reply = getLocalResponse(text);
      responseCache.set(cacheKey, reply); // cache local responses too
      appendMessage('bot', reply);
      isWaiting = false;
      document.getElementById('sendBtn').disabled = false;
    }, 700);
    return;
  }

  conversationHistory.push({ role: 'user', content: text });

  try {
    const res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
        ],
        max_tokens: 600,
        temperature: 0.4,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'API error');
    }

    const reply = data.choices[0].message.content;
    conversationHistory.push({ role: 'assistant', content: reply });
    // Cache the formatted API response
    responseCache.set(cacheKey, formatReply(reply));
    removeTyping();
    appendMessage('bot', formatReply(reply));
    trackEvent('ai_response_received', { model: 'gpt-4o-mini' });
    // Firebase: log successful AI response
    logFirebaseEvent('ai_response_received', { model: 'gpt-4o-mini' });

  } catch (err) {
    // On any network/API failure, fall back gracefully to local responses
    removeTyping();
    const fallback = getLocalResponse(text);
    appendMessage('bot', fallback);
    conversationHistory.pop();
  }

  isWaiting = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('chatMessages').scrollTop = 999999;
}

// Convert plain-text OpenAI reply into styled HTML
function formatReply(text) {
  return text
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet lines starting with -
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/gs, match => `<ul>${match}</ul>`)
    // Numbered lines
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Line breaks
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^(?!<)/, '<p>')
    .replace(/(?<!>)$/, '</p>');
}

// ===================== LOCAL FALLBACK RESPONSES =====================
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
  <li>Enter your name, date of birth & state</li>
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
    return `<strong>📞 ECI Helpline & Support</strong>
<ul>
  <li>🆓 <strong>Voter Helpline: 1950</strong> (toll-free)</li>
  <li>🌐 voters.eci.gov.in</li>
  <li>📱 Voter Helpline App (iOS & Android)</li>
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


// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  showSection('home');
});
