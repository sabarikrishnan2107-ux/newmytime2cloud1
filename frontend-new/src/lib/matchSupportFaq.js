import { faqEntries, faqFallback } from "@/config/supportFaq";

// Common words that carry no matching signal — ignored when fuzzy-matching.
const STOP_WORDS = new Set([
  "the", "a", "an", "how", "do", "does", "i", "to", "my", "is", "are", "can",
  "of", "in", "on", "for", "what", "where", "me", "you", "page", "it", "and",
  "with", "get", "see", "view", "find", "show", "want", "need", "please",
]);

// A matched keyword this long (or an exact question match) is treated as a
// confident, direct answer. Shorter incidental overlaps fall through to the
// "did you mean" suggestion path instead.
const STRONG_KEYWORD_LEN = 4;

function tokenize(text) {
  return text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Primary matcher used by the chat. Returns one of:
//   { type: "answer",  entry }            — a confident single answer
//   { type: "suggest", entries: [...] }   — 2-3 likely topics ("did you mean")
//   { type: "none",    text }             — nothing matched; show fallback
export function matchFaq(text) {
  const q = (text || "").toLowerCase().trim();
  if (!q) return { type: "none", text: faqFallback };

  // 1) Strong match — exact question text or a substantial keyword substring.
  let best = null;
  let bestScore = 0;
  for (const entry of faqEntries) {
    let score = 0;

    const qn = entry.question?.toLowerCase().replace(/[?]/g, "").trim();
    if (qn && (q === qn || q.includes(qn))) score = 1000;

    for (const kw of entry.keywords || []) {
      if (q.includes(kw.toLowerCase())) score = Math.max(score, kw.length);
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (best && bestScore >= STRONG_KEYWORD_LEN) {
    return { type: "answer", entry: best };
  }

  // 2) Fuzzy match — count shared words against each entry's question + keywords.
  const tokens = tokenize(q);
  if (tokens.length) {
    const ranked = faqEntries
      .map((entry) => {
        const haystack = `${entry.question} ${(entry.keywords || []).join(" ")}`.toLowerCase();
        let hits = 0;
        for (const t of tokens) if (haystack.includes(t)) hits += 1;
        return { entry, hits };
      })
      .filter((r) => r.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    if (ranked.length === 1 || (ranked.length > 1 && ranked[0].hits > ranked[1].hits + 1)) {
      // A clear front-runner — answer it directly.
      return { type: "answer", entry: ranked[0].entry };
    }
    if (ranked.length) {
      return { type: "suggest", entries: ranked.slice(0, 3).map((r) => r.entry) };
    }
  }

  // 3) Nothing matched.
  return { type: "none", text: faqFallback };
}

// Back-compat string helper (kept for any caller that just wants text).
export function matchFaqAnswer(text) {
  const result = matchFaq(text);
  if (result.type === "answer") return result.entry.answer;
  return result.text || faqFallback;
}
