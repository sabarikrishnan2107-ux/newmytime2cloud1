import { NAVIGATION_COMMANDS, DATA_QUERY_COMMANDS, GREETING_COMMANDS } from "./commands";

/**
 * Smart intent matcher.
 * Uses keyword importance scoring - doesn't need exact phrases.
 * "can you show me who is absent today" → matches "absent_list"
 * "I want to see the attendance page" → matches navigation to /attendance
 */

// Keywords that strongly indicate a data query vs navigation
const QUERY_KEYWORDS = ["how many", "show me", "tell me", "list", "count", "who", "what", "today", "report", "summary", "pending", "total", "number"];
const NAV_KEYWORDS = ["open", "go to", "navigate", "take me", "show page", "page"];

// Core keyword → intent mapping (most important)
const KEYWORD_INTENTS = [
  { keywords: ["absent", "not present", "didn't come", "did not come", "not come"], intent: "absent_list", type: "query" },
  { keywords: ["present", "came", "come today", "who came"], intent: "present_count", type: "query" },
  { keywords: ["late", "late comer", "came late"], intent: "late_list", type: "query" },
  { keywords: ["summary", "overview", "today report", "daily report", "attendance report"], intent: "attendance_summary", type: "query" },
  { keywords: ["leave request", "leave application", "leave pending", "applied leave"], intent: "leave_requests", type: "query" },
  { keywords: ["on leave", "leave today", "who leave"], intent: "on_leave_today", type: "query" },
  { keywords: ["change request", "change pending"], intent: "change_requests", type: "query" },
  { keywords: ["how many employee", "total employee", "employee count", "staff count", "how many staff", "number of employee"], intent: "employee_count", type: "query" },
  { keywords: ["upcoming holiday", "next holiday", "holiday coming", "when holiday"], intent: "upcoming_holidays", type: "query" },
];

export function matchIntent(text) {
  if (!text || text.trim().length < 2) return null;

  const lower = text.toLowerCase().trim();

  // 1. Try smart keyword matching first
  const keywordMatch = matchByKeywords(lower);
  if (keywordMatch && keywordMatch.score > 0.5) return keywordMatch;

  // 2. Try phrase matching against all commands
  const phraseMatch = matchByPhrases(lower);
  if (phraseMatch && phraseMatch.score > 0.4) return phraseMatch;

  // 3. Try fuzzy single-word matching for navigation
  const navMatch = matchNavigation(lower);
  if (navMatch) return navMatch;

  return null;
}

function matchByKeywords(spoken) {
  let bestMatch = null;
  let bestScore = 0;

  for (const mapping of KEYWORD_INTENTS) {
    for (const keyword of mapping.keywords) {
      if (spoken.includes(keyword)) {
        const score = keyword.length / spoken.length + 0.5; // Bonus for keyword match
        if (score > bestScore) {
          bestScore = Math.min(score, 1.0);

          // Find the full command definition
          const cmd = DATA_QUERY_COMMANDS.find((c) => c.intent === mapping.intent);
          if (cmd) {
            bestMatch = { type: "query", command: cmd, score: bestScore };
          }
        }
      }
    }
  }

  return bestMatch;
}

function matchByPhrases(spoken) {
  let bestMatch = null;
  let bestScore = 0;

  // Data queries
  for (const cmd of DATA_QUERY_COMMANDS) {
    const score = getMatchScore(spoken, cmd.triggers);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { type: "query", command: cmd, score };
    }
  }

  // Navigation
  for (const cmd of NAVIGATION_COMMANDS) {
    const score = getMatchScore(spoken, cmd.triggers);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { type: "navigate", command: cmd, score };
    }
  }

  // Greetings
  for (const cmd of GREETING_COMMANDS) {
    const score = getMatchScore(spoken, cmd.triggers);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { type: "greeting", command: cmd, score };
    }
  }

  return bestMatch;
}

function matchNavigation(spoken) {
  // Single word or simple navigation - "attendance", "employees", "dashboard"
  const words = spoken.split(/\s+/);
  const coreWord = words[words.length - 1]; // Last word is usually the target

  for (const cmd of NAVIGATION_COMMANDS) {
    const label = cmd.label.toLowerCase();
    if (coreWord === label || spoken.includes(label)) {
      return { type: "navigate", command: cmd, score: 0.6 };
    }
  }

  return null;
}

function getMatchScore(spoken, triggers) {
  let maxScore = 0;

  for (const trigger of triggers) {
    if (spoken === trigger) return 1.0;
    if (spoken.includes(trigger)) {
      maxScore = Math.max(maxScore, 0.85);
      continue;
    }

    // Word overlap
    const triggerWords = trigger.split(/\s+/);
    const spokenWords = spoken.split(/\s+/);
    let matchedWords = 0;

    for (const tw of triggerWords) {
      if (spokenWords.some((sw) => sw === tw || sw.includes(tw) || tw.includes(sw))) {
        matchedWords++;
      }
    }

    const score = (matchedWords / triggerWords.length) * 0.8;
    maxScore = Math.max(maxScore, score);
  }

  return maxScore;
}
