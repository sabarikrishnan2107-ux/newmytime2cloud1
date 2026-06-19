import { faqEntries, faqFallback } from "@/config/supportFaq";

// Common words that carry no matching signal — ignored when scoring.
const STOP_WORDS = new Set([
  "the", "a", "an", "how", "do", "does", "i", "to", "my", "is", "are", "can",
  "of", "in", "on", "for", "what", "where", "me", "you", "page", "it", "and",
  "with", "get", "see", "view", "find", "show", "want", "need", "please",
  // Conversational filler that otherwise produces noisy, unrelated suggestions.
  "know", "one", "thing", "like", "this", "that", "they", "we", "will", "would",
  "should", "could", "have", "has", "had", "be", "been", "am", "was", "were",
  "software", "system", "app", "application", "tell", "help", "about", "use",
  "using", "from", "into", "any", "all", "your", "our", "their", "there", "here",
  "hey", "hi", "hello", "thanks", "thank", "ok", "okay", "yes", "no",
]);

// Scores at or above this are treated as a confident, direct answer.
const CONFIDENT_SCORE = 12;
// Minimum score for an entry to even be offered as a "did you mean" suggestion.
// Below this the overlap is incidental (a single common word) → show fallback.
const SUGGEST_FLOOR = 3;

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Per-entry derived data (token sets + multi-word keyword phrases), cached so
// it's computed once per entry rather than on every keystroke.
const entryIndex = new Map();
function indexOf(entry) {
  let idx = entryIndex.get(entry.id);
  if (idx) return idx;
  const keywordText = (entry.keywords || []).join(" ");
  idx = {
    keywordTokens: new Set(tokenize(keywordText)),
    questionTokens: new Set(tokenize(entry.question || "")),
    phrases: (entry.keywords || [])
      .map((k) => k.toLowerCase().trim())
      .filter((k) => k.includes(" ")),
    questionNorm: (entry.question || "").toLowerCase().replace(/[?]/g, "").trim(),
  };
  entryIndex.set(entry.id, idx);
  return idx;
}

// Relevance score for one entry against the normalized query `q` / its tokens.
// Weighting (high → low): exact question, multi-word keyword phrase present in
// the query, keyword-token overlap, question-word overlap. A single incidental
// word overlap stays low so it can't masquerade as a real answer.
function scoreEntry(entry, q, queryTokens) {
  const idx = indexOf(entry);
  let score = 0;

  if (idx.questionNorm) {
    if (q === idx.questionNorm) score += 100;
    else if (q.includes(idx.questionNorm)) score += 60;
  }

  // Multi-word keyword phrase appearing verbatim in the query is a strong,
  // specific signal — weighted by how many words it pins down.
  for (const phrase of idx.phrases) {
    if (q.includes(phrase)) {
      score += 8 + 4 * phrase.split(/\s+/).length;
    }
  }

  // Distinct query words that land in the entry's keywords / question.
  for (const t of queryTokens) {
    if (idx.keywordTokens.has(t)) score += 3;
    else if (idx.questionTokens.has(t)) score += 1.5;
  }

  return score;
}

// Primary matcher used by the chat. Returns one of:
//   { type: "answer",  entry }            — a confident single answer
//   { type: "suggest", entries: [...] }   — 2-3 likely topics ("did you mean")
//   { type: "none",    text }             — nothing relevant; show fallback
export function matchFaq(text) {
  const q = (text || "").toLowerCase().trim();
  if (!q) return { type: "none", text: faqFallback };

  const queryTokens = [...new Set(tokenize(q))];

  const ranked = faqEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, q, queryTokens) }))
    .filter((r) => r.score >= SUGGEST_FLOOR)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return { type: "none", text: faqFallback };
  }

  const best = ranked[0];
  const second = ranked[1]?.score ?? 0;

  // Confident when the top entry is both strong and clearly ahead of the rest
  // (or the only relevant entry) — otherwise offer choices instead of guessing.
  const confident =
    best.score >= CONFIDENT_SCORE &&
    (ranked.length === 1 || best.score - second >= 4);

  if (confident) {
    return { type: "answer", entry: best.entry };
  }

  // Only suggest entries that are genuinely in contention with the best one,
  // so we never pad the list with barely-related topics.
  const suggestions = ranked
    .filter((r) => r.score >= Math.max(SUGGEST_FLOOR, best.score * 0.5))
    .slice(0, 3)
    .map((r) => r.entry);

  return { type: "suggest", entries: suggestions };
}

// Back-compat string helper (kept for any caller that just wants text).
export function matchFaqAnswer(text) {
  const result = matchFaq(text);
  if (result.type === "answer") return result.entry.answer;
  return result.text || faqFallback;
}
