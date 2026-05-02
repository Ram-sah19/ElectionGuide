/**
 * ElectionGuide AI – Firebase Configuration
 * @description Initialises Firebase App, Analytics, and Firestore.
 *   Replace the firebaseConfig object with values from your own Firebase project:
 *   console.firebase.google.com → Project Settings → Your apps → SDK setup
 * @module firebase-config
 */

// ── Firebase SDK (v10 compat CDN) is loaded in index.html before this file ──

'use strict';

/**
 * Firebase project credentials.
 * @type {Object}
 */
const firebaseConfig = {
  apiKey:            "AIzaSyDZ-7fbHHF9sMOsKaW_QjZdxHV5ZQg5cyg",
  authDomain:        "prompt-war-cadd0.firebaseapp.com",
  projectId:         "prompt-war-cadd0",
  storageBucket:     "prompt-war-cadd0.firebasestorage.app",
  messagingSenderId: "802971856243",
  appId:             "1:802971856243:web:f65656c417abfc57202906",
  measurementId:     "G-3HRJP16974",
};

// ── Initialise Firebase ────────────────────────────────────────────────────
/** @type {firebase.app.App|null} */
let firebaseApp      = null;
/** @type {firebase.analytics.Analytics|null} */
let firebaseAnalytics = null;
/** @type {firebase.firestore.Firestore|null} */
let firestoreDB      = null;

/**
 * Checks whether the Firebase SDK is available (loaded via CDN script tag).
 * @returns {boolean}
 */
function isFirebaseAvailable() {
  return typeof firebase !== 'undefined';
}

/**
 * Initialises Firebase services.  Safe to call multiple times — subsequent
 * calls are no-ops.  Falls back silently if the SDK is unavailable.
 */
function initFirebase() {
  if (!isFirebaseAvailable()) {
    console.info('[Firebase] SDK not loaded — skipping initialisation.');
    return;
  }
  if (firebaseApp) return; // already initialised

  try {
    firebaseApp       = firebase.initializeApp(firebaseConfig);
    firebaseAnalytics = firebase.analytics();
    firestoreDB       = firebase.firestore();
    console.info('[Firebase] Initialised successfully.');
  } catch (err) {
    console.warn('[Firebase] Init error:', err.message);
  }
}

// ── Analytics helpers ──────────────────────────────────────────────────────

/**
 * Logs a named event to Firebase Analytics.
 * @param {string} eventName - Firebase Analytics event name
 * @param {Object} [params={}] - Optional key-value parameters
 */
function logFirebaseEvent(eventName, params = {}) {
  if (!firebaseAnalytics) return;
  try {
    firebaseAnalytics.logEvent(eventName, params);
  } catch (err) {
    console.warn('[Firebase Analytics] logEvent error:', err.message);
  }
}

// ── Firestore helpers ──────────────────────────────────────────────────────

/** Maximum Firestore writes per session to avoid quota exhaustion. */
const MAX_FIRESTORE_WRITES = 20;
let firestoreWriteCount = 0;

/**
 * Logs an anonymised question topic to Firestore for usage analytics.
 * No personally identifiable information is stored.
 * @param {string} topic - Detected topic key (e.g. 'vote', 'timeline', 'documents')
 * @param {string} [lang='en'] - Detected UI language code
 * @returns {Promise<void>}
 */
async function logQuestionToFirestore(topic, lang = 'en') {
  if (!firestoreDB) return;
  if (firestoreWriteCount >= MAX_FIRESTORE_WRITES) return;

  try {
    firestoreWriteCount++;
    await firestoreDB.collection('question_logs').add({
      topic,
      lang,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] Write error:', err.message);
  }
}

/**
 * Records a page-view event in Firestore for richer analytics beyond GA4.
 * @param {string} pageName - Human-readable page name (e.g. 'Home', 'Chat')
 * @returns {Promise<void>}
 */
async function logPageViewToFirestore(pageName) {
  if (!firestoreDB) return;
  if (firestoreWriteCount >= MAX_FIRESTORE_WRITES) return;

  try {
    firestoreWriteCount++;
    await firestoreDB.collection('page_views').add({
      page: pageName,
      ts:   firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] Page-view write error:', err.message);
  }
}

// ── Auto-init on load ──────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initFirebase);
}
