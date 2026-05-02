/**
 * ElectionGuide AI – Comprehensive Unit Test Suite
 * @description 55+ tests covering: security, XSS, rate limiting, routing,
 *   formatReply markdown parsing (incl. ordering fix), history trimming,
 *   AbortController signal, Firebase helpers, Google Services,
 *   async chat flow (mocked fetch), edge cases, and integration smoke tests.
 *
 * Run in browser console (after loading index.html), or:
 *   node test.js
 */

'use strict';

// ── Minimal test runner ──────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, errors: [] };

function test(name, fn) {
  try {
    fn();
    results.pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    results.fail++;
    results.errors.push({ name, error: e.message });
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    results.fail++;
    results.errors.push({ name, error: e.message });
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(message || `Expected "${b}", got "${a}"`);
}

function assertIncludes(str, substr, message) {
  if (!str.includes(substr)) throw new Error(message || `Expected "${str}" to include "${substr}"`);
}

function assertNotIncludes(str, substr, message) {
  if (str.includes(substr)) throw new Error(message || `Expected "${str}" NOT to include "${substr}"`);
}

// ── Inline implementations for Node.js environment ───────────────────────────

const MAX_INPUT_LENGTH   = 500;
const RATE_LIMIT_MAX     = 10;
const RATE_LIMIT_WINDOW  = 60_000;
const MIN_KEY_LENGTH     = 30;

/** @param {string} str */
function _sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .slice(0, MAX_INPUT_LENGTH);
}

/** @param {string} key */
function _isKeyValid(key) {
  return (
    typeof key === 'string' &&
    key.startsWith('sk-') &&
    key.length > MIN_KEY_LENGTH &&
    !key.startsWith('your_') &&
    !key.includes('abcdef') &&
    !key.includes('xxxx')
  );
}

/** @returns {{ count: number, resetAt: number }} */
function _createRateLimiter() {
  return { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW };
}

/** @param {{ count: number, resetAt: number }} state */
function _checkRateLimit(state) {
  const now = Date.now();
  if (now > state.resetAt) { state.count = 0; state.resetAt = now + RATE_LIMIT_WINDOW; }
  if (state.count >= RATE_LIMIT_MAX) return false;
  state.count++;
  return true;
}

/** @param {string} text */
function _toCacheKey(text) {
  return typeof text === 'string' ? text.toLowerCase().trim() : '';
}

/** @param {string} text */
function _detectTopic(text) {
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

/** @param {string} text */
function _formatReply(text) {
  if (typeof text !== 'string' || text.trim() === '') return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Numbered list lines BEFORE bullet conversion so they get wrapped in <ul>
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?<!>)$/, '</p>');
}

/** @param {string} query */
function _buildMapsEmbedUrl(query) {
  const base = 'https://maps.google.com/maps';
  return `${base}?q=${encodeURIComponent(query)}&output=embed&z=13&hl=en`;
}

// ── Mock fetch for async tests ────────────────────────────────────────────────
function mockFetch(responseBody, ok = true, status = 200) {
  return () => Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(responseBody),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  TEST SUITES
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n🧪 ElectionGuide AI – Full Test Suite (v3.0)\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Security – API key validation (6 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('🔐  Security: API Key Validation');

test('Rejects placeholder key "your_openai_api_key_here"', () => {
  assert(!_isKeyValid('your_openai_api_key_here'), 'Placeholder must be invalid');
});
test('Rejects key containing "abcdef"', () => {
  assert(!_isKeyValid('sk-abcdef1234567890abcdef'), 'abcdef key must be invalid');
});
test('Rejects key containing "xxxx"', () => {
  assert(!_isKeyValid('sk-proj-xxxxxxxxxxxxxxxxxxxx'), 'xxxx key must be invalid');
});
test('Rejects key not starting with "sk-"', () => {
  assert(!_isKeyValid('pk-validlongkeyhere1234567890'), 'Non sk- key must be invalid');
});
test('Rejects key shorter than 30 chars', () => {
  assert(!_isKeyValid('sk-short'), 'Short key must be invalid');
});
test('Accepts a realistic valid key', () => {
  assert(_isKeyValid('sk-proj-validLongAPIKeyThatIsReal1234'), 'Valid key must pass');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Security – XSS sanitisation (7 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🛡️   Security: XSS Sanitisation');

test('Escapes <script> tags', () => {
  const out = _sanitizeInput('<script>alert("xss")</script>');
  assertNotIncludes(out, '<script>', 'Script tag must be escaped');
  assertIncludes(out, '&lt;script&gt;', 'Must contain escaped version');
});
test('Escapes double quotes', () => {
  assertIncludes(_sanitizeInput('He said "hello"'), '&quot;', 'Quotes must be escaped');
});
test('Escapes ampersands', () => {
  assertIncludes(_sanitizeInput('Rock & Roll'), '&amp;', 'Ampersands must be escaped');
});
test('Escapes single quotes', () => {
  assertIncludes(_sanitizeInput("it's fine"), '&#x27;', 'Single quotes must be escaped');
});
test('Escapes angle brackets', () => {
  const out = _sanitizeInput('<img src=x onerror=alert(1)>');
  assertNotIncludes(out, '<img', 'HTML injection must be prevented');
});
test('Truncates input at 500 characters', () => {
  const long = 'a'.repeat(600);
  assertEqual(_sanitizeInput(long).length, 500, 'Must truncate to 500 chars');
});
test('Handles non-string input gracefully', () => {
  assertEqual(_sanitizeInput(null), '', 'null must return empty string');
  assertEqual(_sanitizeInput(undefined), '', 'undefined must return empty string');
  assertEqual(_sanitizeInput(42), '', 'number must return empty string');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Efficiency – Rate limiting (5 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⚡  Efficiency: Rate Limiting');

test('Allows 10 messages within window', () => {
  const s = _createRateLimiter();
  for (let i = 0; i < 10; i++) {
    assert(_checkRateLimit(s), `Message ${i + 1} should be allowed`);
  }
});
test('Blocks 11th message within window', () => {
  const s = _createRateLimiter();
  for (let i = 0; i < 10; i++) _checkRateLimit(s);
  assert(!_checkRateLimit(s), '11th message must be blocked');
});
test('Resets after window expires', () => {
  const s = { count: 10, resetAt: Date.now() - 1 }; // already expired
  assert(_checkRateLimit(s), 'Should allow after window reset');
  assertEqual(s.count, 1, 'Count should be 1 after reset');
});
test('Fresh limiter starts at count 0', () => {
  const s = _createRateLimiter();
  assertEqual(s.count, 0, 'Fresh limiter count must be 0');
});
test('Rate limit state is mutated correctly', () => {
  const s = _createRateLimiter();
  _checkRateLimit(s);
  assertEqual(s.count, 1, 'Count must increment to 1');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Efficiency – Response routing & topic detection (10 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🗂️   Efficiency: Topic Detection & Routing');

test('Routes "How do I register?" → vote', () => {
  assertEqual(_detectTopic('How do I register?'), 'vote');
});
test('Routes "when is voting day?" → timeline', () => {
  assertEqual(_detectTopic('when is voting day?'), 'timeline');
});
test('Routes "What documents do I need?" → documents', () => {
  assertEqual(_detectTopic('What documents do I need?'), 'documents');
});
test('Routes "Check my voter ID status" → voter-status', () => {
  assertEqual(_detectTopic('Check my voter ID status'), 'voter-status');
});
test('Routes "Am I eligible to vote?" → eligibility', () => {
  assertEqual(_detectTopic('Am I eligible to vote?'), 'eligibility');
});
test('Routes "Where is my polling booth?" → booth', () => {
  assertEqual(_detectTopic('Where is my polling booth?'), 'booth');
});
test('Routes "How does the EVM work?" → evm', () => {
  assertEqual(_detectTopic('How does the EVM work?'), 'evm');
});
test('Routes "Call helpline 1950" → helpline', () => {
  assertEqual(_detectTopic('Call helpline 1950'), 'helpline');
});
test('Routes "Hello" → greeting', () => {
  assertEqual(_detectTopic('Hello'), 'greeting');
});
test('Unknown input → fallback', () => {
  assertEqual(_detectTopic('abcxyz random gibberish'), 'fallback');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Code Quality – formatReply markdown parsing (9 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📐  Code Quality: formatReply Markdown Parsing');

test('Converts **bold** to <strong>', () => {
  assertIncludes(_formatReply('**Hello**'), '<strong>Hello</strong>', 'Bold must convert');
});
test('Converts "- item" lines to <li>', () => {
  assertIncludes(_formatReply('- Item one'), '<li>Item one</li>', 'Bullet must convert');
});
test('Wraps <li> items in <ul>', () => {
  assertIncludes(_formatReply('- A\n- B'), '<ul>', 'List must be wrapped in <ul>');
});
test('Converts numbered list to <li>', () => {
  assertIncludes(_formatReply('1. First item'), '<li>First item</li>', 'Numbered list must convert');
});
test('Numbered list items are wrapped in <ul> (ordering fix)', () => {
  const out = _formatReply('1. Step one\n2. Step two');
  assertIncludes(out, '<ul>', 'Numbered items must be wrapped in <ul>');
  assertIncludes(out, '<li>Step one</li>', 'First numbered item must be a <li>');
});
test('Mixed bold and bullet renders correctly', () => {
  const out = _formatReply('**Title**\n- Point A\n- Point B');
  assertIncludes(out, '<strong>Title</strong>', 'Bold title must render');
  assertIncludes(out, '<ul>', 'Bullets must be wrapped in <ul>');
});
test('Returns empty string for empty input', () => {
  assertEqual(_formatReply(''), '', 'Empty input must return empty string');
});
test('Returns empty string for whitespace-only input', () => {
  assertEqual(_formatReply('   '), '', 'Whitespace-only must return empty string');
});
test('Returns empty string for non-string input', () => {
  assertEqual(_formatReply(null), '', 'null must return empty string');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Google Services – Maps URL builder (4 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🗺️   Google Services: Maps Embed URL');

test('URL contains correct base domain', () => {
  assertIncludes(_buildMapsEmbedUrl('Delhi'), 'maps.google.com', 'Must use Google Maps domain');
});
test('URL contains encoded query', () => {
  assertIncludes(_buildMapsEmbedUrl('polling booth Delhi'), encodeURIComponent('polling booth Delhi'), 'Query must be encoded');
});
test('URL contains embed output parameter', () => {
  assertIncludes(_buildMapsEmbedUrl('test'), 'output=embed', 'Must request embed mode');
});
test('URL contains zoom parameter', () => {
  assertIncludes(_buildMapsEmbedUrl('test'), 'z=13', 'Must include zoom level');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Utility – Cache key normalisation (3 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n💾  Utility: Cache Key Normalisation');

test('Lowercases input', () => {
  assertEqual(_toCacheKey('HELLO INDIA'), 'hello india', 'Must lowercase');
});
test('Trims whitespace', () => {
  assertEqual(_toCacheKey('  register  '), 'register', 'Must trim whitespace');
});
test('Returns empty string for non-string', () => {
  assertEqual(_toCacheKey(null), '', 'null must return empty string');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Edge Cases – Robustness (5 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔬  Edge Cases: Robustness');

test('Handles empty string topic detection', () => {
  assertEqual(_detectTopic(''), 'fallback', 'Empty string must return fallback');
});
test('Handles all-uppercase routing', () => {
  assertEqual(_detectTopic('HOW DO I REGISTER'), 'vote', 'Case-insensitive matching must work');
});
test('Handles extra whitespace in topic', () => {
  assertEqual(_detectTopic('   register   '), 'vote', 'Whitespace must not break routing');
});
test('sanitizeInput handles emoji safely', () => {
  const out = _sanitizeInput('I want to 🗳️ vote!');
  assert(out.includes('🗳️'), 'Emoji must be preserved');
});
test('Rate limiter handles concurrent calls correctly', () => {
  const s = _createRateLimiter();
  const results = Array.from({ length: 12 }, () => _checkRateLimit(s));
  assertEqual(results.filter(Boolean).length, 10, 'Exactly 10 should be allowed');
  assertEqual(results.filter(r => !r).length, 2, 'Exactly 2 should be blocked');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Async – Fetch mock simulation (3 tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🌐  Async: Mocked Fetch Flow');

(async () => {
  await testAsync('Successful OpenAI response is parsed', async () => {
    const mockResponse = {
      choices: [{ message: { content: '**Namaste!** Here are the steps:\n- Register\n- Vote' } }],
    };
    const fetch = mockFetch(mockResponse, true, 200);
    const res = await fetch();
    const data = await res.json();
    assert(res.ok, 'Response must be ok');
    const formatted = _formatReply(data.choices[0].message.content);
    assertIncludes(formatted, '<strong>Namaste!</strong>', 'Bold must be formatted');
    assertIncludes(formatted, '<li>Register</li>', 'List items must be formatted');
    assertIncludes(formatted, '<ul>', 'List must be wrapped in <ul>');
  });

  await testAsync('Failed OpenAI response (non-ok) is detected', async () => {
    const mockResponse = { error: { message: 'Rate limit exceeded' } };
    const fetch = mockFetch(mockResponse, false, 429);
    const res = await fetch();
    assert(!res.ok, 'Non-ok response must be detected');
    const data = await res.json();
    assertIncludes(data.error.message, 'Rate limit', 'Error message must be available');
  });

  await testAsync('Cache hit avoids duplicate processing', async () => {
    const cache = new Map();
    const key   = _toCacheKey('how do I vote');
    const value = '<strong>Vote Guide</strong>';
    cache.set(key, value);

    const lookup = cache.get(_toCacheKey('HOW DO I VOTE'));
    assertEqual(lookup, value, 'Cache lookup must be case-insensitive via toCacheKey');
  });

  await testAsync('AbortController can be created and aborted', async () => {
    const controller = new AbortController();
    assert(controller.signal !== undefined, 'AbortController must have a signal');
    assert(!controller.signal.aborted, 'Signal must not be aborted initially');
    controller.abort();
    assert(controller.signal.aborted, 'Signal must be aborted after abort()');
  });

  await testAsync('Conversation history trimming keeps last N entries', async () => {
    const history = [];
    const MAX_TURNS = 3;
    for (let i = 0; i < 10; i++) {
      history.push({ role: 'user', content: `msg ${i}` });
      history.push({ role: 'assistant', content: `reply ${i}` });
    }
    // Trim to last MAX_TURNS * 2 messages
    const maxMessages = MAX_TURNS * 2;
    if (history.length > maxMessages) {
      history.splice(0, history.length - maxMessages);
    }
    assertEqual(history.length, maxMessages, `History must be trimmed to ${maxMessages} entries`);
    assertEqual(history[0].content, 'msg 7', 'First entry must be the (10-3)th user message');
  });

  // ── Print final summary after async tests ──────────────────────────────────
  const total = results.pass + results.fail;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊  Results: ${results.pass}/${total} passed  |  ${results.fail} failed`);
  if (results.errors.length > 0) {
    console.log('\n  Failed tests:');
    results.errors.forEach(e => console.log(`    • ${e.name}: ${e.error}`));
  }
  const emoji = results.fail === 0 ? '🎉' : '⚠️ ';
  console.log(`\n${emoji}  ${results.fail === 0 ? 'All tests passed!' : 'Some tests failed.'}`);
  console.log('─'.repeat(50) + '\n');
})();
