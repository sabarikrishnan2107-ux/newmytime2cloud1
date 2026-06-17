import { api } from "@/lib/api-client";

/**
 * Ask the backend (Grok / Claude) to interpret a free-form spoken command
 * or question in any language. The AI key stays server-side.
 *
 * @param {string} text      what the user said
 * @param {string} language  BCP-47 language hint (e.g. "ta-IN")
 * @param {Array}  history   recent turns [{role:"user"|"assistant", content}]
 * @param {string} mode      "voice" (concise, spoken) | "chat" (professional, full steps)
 *
 * Returns: { kind: "query"|"navigate"|"answer"|"greeting"|"none", intent, route, label, speech, language }
 * or null on failure (caller should fall back gracefully).
 */
export async function aiInterpret(text, language = "en-US", history = [], mode = "voice") {
  try {
    const { data } = await api.post("/voice/interpret", { text, language, history, mode });
    if (!data || typeof data !== "object" || !data.kind) return null;
    return data;
  } catch (e) {
    console.warn("[Voice] AI interpret failed:", e?.response?.data?.detail || e?.message);
    return null;
  }
}
