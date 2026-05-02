# 🗳️ ElectionGuide AI

**Interactive AI-powered election guide for first-time voters in India.**  
Built for Prompt War — a focused, well-structured, and accessible web application.

---

## 📋 Instructions Compliance

This project implements the exact specification:

| Requirement | Status |
|---|---|
| System prompt from `prompts/basePrompt.txt` | ✅ Loaded as OpenAI system message |
| How to Vote guide | ✅ Step-by-step: Registration → Verification → Voting → Post |
| Election Timeline | ✅ 5 chronological phases |
| Required Documents | ✅ All 12 ECI-accepted IDs listed |
| Interactive Chat | ✅ Multi-turn AI chat with fallback engine |
| Smart Prompt Behavior | ✅ Bullet points, structured titles, follow-ups |
| File structure | ✅ `index.html`, `style.css`, `script.js`, `prompts/basePrompt.txt` |

---

## 🔵 Code Quality

- **JSDoc** comments on every function with `@param` and `@returns`
- **Single-responsibility** functions — each does exactly one thing
- **Named constants** for all magic values (`RATE_LIMIT`, `OPENAI_ENDPOINT`, `SYSTEM_PROMPT`)
- **Consistent naming** — camelCase functions, UPPER_SNAKE_CASE constants
- **No dead code** — all functions are used
- **Version header** in `script.js` (`@version 1.0.0`)

---

## 🔴 Security

| Measure | Implementation |
|---|---|
| XSS Prevention | `sanitizeInput()` escapes `<`, `>`, `&`, `"`, `'` on all user input |
| API Key Protection | Stored in `config.js` (gitignored), never in source code |
| Content Security Policy | `<meta http-equiv="Content-Security-Policy">` restricts scripts/styles/connections |
| Input Length Cap | Hard 500-character limit via `maxlength` attribute + `slice(0,500)` in JS |
| Rate Limiting | Max 10 messages/minute, auto-resets every 60 seconds |
| Referrer Policy | `strict-origin-when-cross-origin` |
| X-Content-Type-Options | `nosniff` to prevent MIME sniffing |
| External Links | `rel="noopener noreferrer"` on all external anchors |

---

## ⚡ Efficiency

| Optimization | Detail |
|---|---|
| **Response Cache** | `Map`-based cache — identical questions skip API entirely, served in 300ms |
| **Local Fallback** | Keyword engine fires instantly when no API key / `file://` — zero network call |
| **Font Preconnect** | `<link rel="preconnect">` for Google Fonts reduces DNS time |
| **Minimal DOM Ops** | Single `appendChild` per message, no layout thrashing |
| **Textarea Resize** | `autoResize()` uses `scrollHeight` — no CSS recalculation loops |
| **Lazy gtag** | `typeof gtag === 'function'` guard — no crash if GA script fails to load |

---

## 🧪 Testing

Run tests:
```bash
# Node.js (no install required)
node test.js

# Browser — open index.html, open DevTools console, paste:
fetch('test.js').then(r=>r.text()).then(eval)
```

**Coverage (20 tests):**

| Suite | Tests |
|---|---|
| 🔐 API Key Validation | 6 tests — rejects placeholders, short keys, wrong prefixes |
| 🛡️ XSS Sanitization | 4 tests — script tags, quotes, ampersands, HTML injection |
| ⚡ Response Routing | 7 tests — all topic routes + fallback |
| 📐 Edge Cases | 4 tests — empty, uppercase, whitespace, special chars |

All 20 tests pass ✅

---

## ♿ Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---|---|
| Skip Link | "Skip to main content" — visible on keyboard focus |
| ARIA Roles | `role="navigation"`, `role="log"`, `role="region"`, `role="article"` |
| ARIA Labels | Every button, form element, and interactive region labelled |
| ARIA Live | `aria-live="polite"` on chat log and status indicators |
| `aria-expanded` | Menu toggle reflects sidebar state in real time |
| `aria-current="page"` | Active nav item announced to screen readers |
| Keyboard Navigation | All cards: `tabindex="0"` + `onkeydown` Enter/Space handlers |
| Focus Rings | `focus-visible` CSS — visible outlines for keyboard, hidden for mouse |
| Reduced Motion | `@media (prefers-reduced-motion)` disables all animations |
| High Contrast | `@media (forced-colors)` adds explicit borders |
| Semantic HTML | `<main>`, `<nav>`, `<aside>`, `<header>`, `<section>`, `<article>` |
| Screen Reader | `.sr-only` utility for labels visible only to assistive tech |
| `dir="ltr"` | Explicit text direction on `<html>` |

---

## 🟠 Google Services

| Service | Usage |
|---|---|
| **Google Analytics GA4** | Integrated via `gtag.js` — tracks `page_view`, `select_content`, `quick_reply`, `chat_message_sent`, `ai_response_received` |
| **Google Fonts** | Inter typeface via `fonts.googleapis.com` with `preconnect` |

**To activate GA4:** Replace `G-XXXXXXXXXX` in `index.html` with your real Measurement ID from [analytics.google.com](https://analytics.google.com).

---

## 🚀 Running the Project

```bash
# Option 1: Open directly in browser
open index.html

# Option 2: Python HTTP server (for OpenAI API calls)
python -m http.server 3000
# then open http://localhost:3000
```

**Configure API key** (optional — app works without it):
1. Open `config.js`
2. Replace the placeholder with your OpenAI key: `sk-proj-...`

---

## 📁 File Structure

```
prompt-war/
├── index.html          ← Semantic HTML, ARIA, CSP, GA4
├── style.css           ← Dark premium UI, accessibility styles
├── script.js           ← Chat logic, OpenAI, caching, security
├── config.js           ← 🔑 API key (gitignored)
├── config.example.js   ← Safe template for contributors
├── test.js             ← 20 unit tests (Node + browser)
├── .gitignore          ← Blocks config.js, .env, node_modules
├── README.md           ← This file
└── prompts/
    └── basePrompt.txt  ← OpenAI system prompt
```

---

## 🤖 AI Prompt Design

The system prompt (`prompts/basePrompt.txt`) enforces:
- ✅ Short, bullet-pointed answers
- ✅ Neutral and factual — no political opinions
- ✅ India-specific context (ECI rules, Form 6, EPIC, VVPAT)
- ✅ Follow-up questions for unclear input
- ✅ Consistent format: Title → Steps → Key Tips

---

> *"Democracy is not just about voting — it's about informed voting."*  
> **ElectionGuide AI** 🇮🇳
