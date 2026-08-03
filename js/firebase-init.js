import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, runTransaction,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Firebase web config is not a secret — the API key only identifies the
// project. Access control lives in firestore.rules, not in hiding this.
const firebaseConfig = {
  apiKey: "AIzaSyDA6vPJVFDWrDT0vYnmEnSJ0Kb7LQgPhCQ",
  authDomain: "carles-portfolio-analytics.firebaseapp.com",
  projectId: "carles-portfolio-analytics",
  storageBucket: "carles-portfolio-analytics.firebasestorage.app",
  messagingSenderId: "739315666677",
  appId: "1:739315666677:web:cc530b6f8d5a1689adffbc",
};

const KNOWN_KEYS = ["pati", "nova", "repx", "pilates", "contact"];
const LANGS = ["es", "ca", "en"];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// The admin panel's real gate: reading /analytics requires being signed
// in as this specific account (enforced in firestore.rules), not a
// client-side password check anyone could read out of this file.
let currentUser = null;
let resolveAuthReady;
window.fbAuthReady = new Promise((resolve) => { resolveAuthReady = resolve; });
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (resolveAuthReady) { resolveAuthReady(user); resolveAuthReady = null; }
});

window.fbIsSignedIn = function () {
  return !!currentUser;
};

window.fbSignIn = function (email, password) {
  return signInWithEmailAndPassword(auth, email, password);
};

function emptyEntry() {
  return { total: 0, es: 0, ca: 0, en: 0 };
}

// Reads-then-writes the full {total, es, ca, en} document inside a
// transaction so two simultaneous clicks can't clobber each other's count,
// and so every write matches firestore.rules' "all four fields present"
// validation (a bare increment() merge on a brand-new doc wouldn't).
window.fbRecordEvent = async function (key, lang) {
  if (!KNOWN_KEYS.includes(key)) return;
  const langField = LANGS.includes(lang) ? lang : "es";
  const ref = doc(db, "analytics", key);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? snap.data() : emptyEntry();
      const next = {
        total: (Number(current.total) || 0) + 1,
        es: Number(current.es) || 0,
        ca: Number(current.ca) || 0,
        en: Number(current.en) || 0,
      };
      next[langField] += 1;
      tx.set(ref, next);
    });
  } catch (e) {
    console.error("Firestore write failed", e);
  }
};

window.fbGetAnalytics = async function () {
  const result = {};
  await Promise.all(KNOWN_KEYS.map(async (key) => {
    try {
      const snap = await getDoc(doc(db, "analytics", key));
      result[key] = snap.exists() ? snap.data() : emptyEntry();
    } catch (e) {
      console.error("Firestore read failed for", key, e);
      result[key] = null;
    }
  }));
  return result;
};
