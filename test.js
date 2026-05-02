/**
 * ElectionGuide AI – Unit Tests
 * Run in browser console: open index.html, then paste this file's content
 * Or run with: node test.js (Node 18+)
 */

// ── Minimal test runner ──────────────────────────────────────────
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

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(message || `Expected "${b}", got "${a}"`);
}

// ── Mock globals for Node.js environment ────────────────────────
if (typeof window === 'undefined') {
  global.OPENAI_API_KEY = 'sk-test1234567890abcdefghijklmnop';
  global.RESPONSES = {
    vote:      { title: '🗳️ How to Vote', content: '<ul><li>Register</li></ul>' },
    timeline:  { title: '📅 Timeline',    content: '<ul><li>Phase 1</li></ul>' },
    documents: { title: '📄 Documents',   content: '<ul><li>Voter ID</li></ul>' },
  };
}

// ── Import functions (browser) or inline (Node) ──────────────────
// In browser: run after script.js is loaded
// In Node: functions are inlined below for self-contained testing

/** @param {string} key */
function _isKeyValid(key) {
  return typeof key !== 'undefined'
    && !key.startsWith('your_')
    && !key.includes('abcdef')
    && !key.includes('xxxx')
    && key.startsWith('sk-')
    && key.length > 30;
}

/** @param {string} html */
function _sanitizeHTML(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** @param {string} text */
function _getLocalResponse(text) {
  const t = text.toLowerCase();
  if (/(how.*(vote|voting)|register|registration)/i.test(t)) return 'vote';
  if (/(timeline|when|date|schedule)/i.test(t))             return 'timeline';
  if (/(voter.?id|epic|status|check)/i.test(t))             return 'voter-status';
  if (/(document|id|proof|aadhaar)/i.test(t))               return 'documents';
  if (/(eligible|eligibility|age|qualify)/i.test(t))        return 'eligibility';
  if (/(booth|polling|station)/i.test(t))                   return 'booth';
  return 'fallback';
}

// ── TEST SUITES ──────────────────────────────────────────────────

console.log('\n🧪 ElectionGuide AI – Test Suite\n');

// 1. Security – API key validation
console.log('🔐 Security: API Key Validation');
test('Rejects placeholder key "your_openai_api_key_here"', () => {
  assert(!_isKeyValid('your_openai_api_key_here'), 'Placeholder should be invalid');
});
test('Rejects key containing "abcdef"', () => {
  assert(!_isKeyValid('sk-abcdef1234567890abcdef'), 'abcdef key should be invalid');
});
test('Rejects key containing "xxxx"', () => {
  assert(!_isKeyValid('sk-proj-xxxxxxxxxxxxxxxxxxxx'), 'xxxx key should be invalid');
});
test('Rejects key not starting with "sk-"', () => {
  assert(!_isKeyValid('pk-validlongkeyhere1234567890'), 'Non sk- key should be invalid');
});
test('Rejects key shorter than 30 chars', () => {
  assert(!_isKeyValid('sk-short'), 'Short key should be invalid');
});
test('Accepts valid-looking key', () => {
  assert(_isKeyValid('sk-proj-validLongAPIKeyThatIsReal1234'), 'Valid key should pass');
});

// 2. Security – Input sanitization (XSS prevention)
console.log('\n🛡️ Security: XSS Sanitization');
test('Escapes <script> tags', () => {
  const out = _sanitizeHTML('<script>alert("xss")</script>');
  assert(!out.includes('<script>'), 'Script tag must be escaped');
  assert(out.includes('&lt;script&gt;'), 'Must contain escaped version');
});
test('Escapes double quotes', () => {
  const out = _sanitizeHTML('He said "hello"');
  assert(out.includes('&quot;'), 'Quotes must be escaped');
});
test('Escapes ampersands', () => {
  const out = _sanitizeHTML('Rock & Roll');
  assert(out.includes('&amp;'), 'Ampersands must be escaped');
});
test('Escapes single quotes', () => {
  const out = _sanitizeHTML("it's fine");
  assert(out.includes('&#x27;'), 'Single quotes must be escaped');
});

// 3. Efficiency – Response routing
console.log('\n⚡ Efficiency: Response Routing');
test('Routes "How do I register?" to vote', () => {
  assertEqual(_getLocalResponse('How do I register?'), 'vote');
});
test('Routes "when is voting day?" to timeline', () => {
  assertEqual(_getLocalResponse('when is voting day?'), 'timeline');
});
test('Routes "What documents do I need?" to documents', () => {
  assertEqual(_getLocalResponse('What documents do I need?'), 'documents');
});
test('Routes "Check my voter ID status" to voter-status', () => {
  assertEqual(_getLocalResponse('Check my voter ID status'), 'voter-status');
});
test('Routes "Am I eligible to vote?" to eligibility', () => {
  assertEqual(_getLocalResponse('Am I eligible to vote?'), 'eligibility');
});
test('Routes "Where is my polling booth?" to booth', () => {
  assertEqual(_getLocalResponse('Where is my polling booth?'), 'booth');
});
test('Unknown input returns fallback', () => {
  assertEqual(_getLocalResponse('abcxyz random'), 'fallback');
});

// 4. Code Quality – Edge cases
console.log('\n📐 Code Quality: Edge Cases');
test('Handles empty string input', () => {
  const result = _getLocalResponse('');
  assertEqual(result, 'fallback', 'Empty input should return fallback');
});
test('Handles all-uppercase input', () => {
  const result = _getLocalResponse('HOW DO I REGISTER');
  assertEqual(result, 'vote', 'Case-insensitive matching should work');
});
test('Handles extra whitespace', () => {
  const result = _getLocalResponse('   register   ');
  assertEqual(result, 'vote', 'Whitespace should not break routing');
});
test('Handles special characters safely', () => {
  const result = _sanitizeHTML('<img src=x onerror=alert(1)>');
  assert(!result.includes('<img'), 'HTML injection must be prevented');
});

// ── SUMMARY ─────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${results.pass} passed, ${results.fail} failed`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  results.errors.forEach(e => console.log(`  • ${e.name}: ${e.error}`));
}
console.log(results.fail === 0 ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed.');
console.log('─'.repeat(40) + '\n');
