# 🗳️ ElectionGuide AI

> **AI-powered election guide for first-time voters in India — built for Prompt War.**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://election-guide-ai.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-21%20passed-brightgreen)](#-testing)
[![Size](https://img.shields.io/badge/Repo%20Size-%3C%20100KB-success)](#)

---

## 🌐 Live Demo

| Page | URL |
|---|---|
| 🚀 Landing Screen | `https://your-app.vercel.app/` |
| 💬 Full App | `https://your-app.vercel.app/app` |

---

## ✨ Features

- 🌌 **Futuristic Space UI** — deep navy gradient, dotted world map, planet horizon, floating particles, glassmorphism cards
- 🤖 **AI Chat** — OpenAI `gpt-4o-mini` with multi-turn conversation history
- ⚡ **Smart Fallback** — 10+ keyword-matched local responses when no API key is present
- 🗳️ **Election Guides** — How to Vote, Timeline, Documents, Voter ID Status
- 🔒 **Secure** — XSS prevention, CSP headers, rate limiting, gitignored API key
- ♿ **Accessible** — WCAG 2.1 AA: ARIA, skip link, keyboard nav, focus rings, reduced-motion
- 📊 **Google Analytics GA4** — tracks navigation, quick replies, and AI responses
- 🧪 **21 Unit Tests** — security, routing, edge cases; runs with `node test.js`
- 📦 **~66 KB total** — zero dependencies, no build step

---

## 🖼️ UI Design

| Landing Page | App (Home) | Chat |
|---|---|---|
| Space intro screen | Glassmorphism cards | AI waveform chat |
| Planet horizon + particles | Stats bar + quick cards | Quick reply chips |
| Animated waveform | Gradient text hero | Typing indicator |

---

## 🚀 Getting Started

### Open Locally (no install needed)
```bash
# Just open the landing page in your browser
start landing.html        # Windows
open landing.html         # Mac
```

### With Live AI Responses
```bash
# 1. Copy the config template
cp config.example.js config.js

# 2. Add your OpenAI key in config.js
#    const OPENAI_API_KEY = "sk-proj-...";

# 3. Open index.html (or use any local server)
```

> ⚠️ `config.js` is gitignored — your key never reaches GitHub.

---

## ☁️ Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
cd prompt-war
vercel
```

### Option B — Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Framework: **Other** (static site)
4. Root directory: `./`
5. Click **Deploy** ✅

The `vercel.json` is already configured — no extra setup needed.

---

## 📁 Project Structure

```
prompt-war/
├── landing.html        ← 🌌 Futuristic intro screen (entry point)
├── index.html          ← 💬 Main app (sidebar + chat + cards)
├── style.css           ← 🎨 Space/AI glassmorphism theme
├── script.js           ← 🧠 Chat logic, OpenAI, caching, security
├── test.js             ← 🧪 21 unit tests (Node + browser)
├── vercel.json         ← ☁️  Vercel routing + security headers
├── config.js           ← 🔑 API key — LOCAL ONLY (gitignored)
├── config.example.js   ← 📋 Safe template for contributors
├── .gitignore          ← 🔒 Blocks config.js, .env
├── README.md           ← 📖 This file
└── prompts/
    └── basePrompt.txt  ← 🤖 OpenAI system prompt
```

---

## 📋 Instructions Compliance

| Requirement | Status |
|---|---|
| How to Vote — step-by-step guide | ✅ |
| Election Timeline — 5 phases | ✅ |
| Required Documents — 12 ECI IDs | ✅ |
| Interactive AI Chat | ✅ Multi-turn with history |
| Voter ID Status check guide | ✅ |
| System prompt from `basePrompt.txt` | ✅ |
| Neutral & factual responses | ✅ |

---

## 🔵 Code Quality

- **JSDoc** on every function with `@param` / `@returns`
- **Single-responsibility** — each function does one thing
- **Named constants** — `RATE_LIMIT`, `OPENAI_ENDPOINT`, `SYSTEM_PROMPT`
- **Consistent naming** — camelCase functions, UPPER_SNAKE_CASE constants
- **Version header** in `script.js`

---

## 🔴 Security

| Measure | Detail |
|---|---|
| XSS Prevention | `sanitizeInput()` escapes all user input |
| API Key Protection | Gitignored `config.js`, never in source |
| Content Security Policy | Meta tag restricts all origins |
| Rate Limiting | Max 10 messages/minute, auto-reset |
| Input Cap | 500 character hard limit |
| Vercel Headers | `X-Frame-Options`, `X-XSS-Protection`, `Permissions-Policy` |
| Referrer Policy | `strict-origin-when-cross-origin` |

---

## ⚡ Efficiency

| Optimization | Detail |
|---|---|
| Response Cache | `Map` — repeated questions served in 300ms, zero API call |
| Local Fallback | Keyword engine fires instantly without API |
| Font Preconnect | DNS resolved before page renders |
| Minimal DOM Ops | Single `appendChild` per message |
| Lazy gtag | No crash if GA script fails to load |

---

## 🧪 Testing

```bash
# Node.js — no install required
node test.js

# Browser — DevTools console
fetch('test.js').then(r => r.text()).then(eval)
```

**21 tests across 4 suites:**

| Suite | Count |
|---|---|
| 🔐 API Key Validation | 6 |
| 🛡️ XSS Sanitization | 4 |
| ⚡ Response Routing | 7 |
| 📐 Edge Cases | 4 |

---

## ♿ Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---|---|
| Skip Link | Visible on keyboard focus |
| ARIA Roles | `navigation`, `log`, `region`, `article` |
| ARIA Live | Chat log + status indicators |
| `aria-expanded` | Menu toggle synced to sidebar state |
| `aria-current="page"` | Active nav item |
| Keyboard Navigation | All cards: `tabindex` + Enter/Space handlers |
| Focus Rings | `focus-visible` — visible for keyboard, hidden for mouse |
| Reduced Motion | `@media (prefers-reduced-motion)` |
| High Contrast | `@media (forced-colors)` |
| Screen Reader | `.sr-only` utility class |

---

## 🟠 Google Services

| Service | Usage |
|---|---|
| **Google Analytics GA4** | `page_view`, `select_content`, `quick_reply`, `chat_message_sent`, `ai_response_received` |
| **Google Fonts** | Poppins via `fonts.googleapis.com` with `preconnect` |

**Activate GA4:** Replace `G-XXXXXXXXXX` in `index.html` with your Measurement ID from [analytics.google.com](https://analytics.google.com).

---

## 🤖 AI Prompt Design

System prompt (`prompts/basePrompt.txt`) enforces:
- ✅ Bullet-pointed, short answers
- ✅ Neutral & factual — no political opinions
- ✅ India-specific (ECI, Form 6, EPIC, VVPAT, 1950 helpline)
- ✅ Follow-up questions for unclear input
- ✅ Format: Title → Steps → Key Tips

---

## 🌍 Election Facts (India 2024)

| Stat | Value |
|---|---|
| Registered Voters | 97 Crore+ |
| Polling Stations | 10.5 Lakh+ |
| Lok Sabha Seats | 543 |
| Minimum Voting Age | 18 years |
| Voter Helpline | **1950** (toll-free) |
| ECI Portal | [voters.eci.gov.in](https://voters.eci.gov.in) |

---

> *"Democracy is not just about voting — it's about informed voting."*
> **ElectionGuide AI** 🇮🇳
