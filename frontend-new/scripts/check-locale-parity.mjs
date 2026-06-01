// frontend-new/scripts/check-locale-parity.mjs
// Verifies every key in en/common.json exists in ar, fr, hi (and vice-versa).
// Run: node scripts/check-locale-parity.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANGS = ["en", "ar", "fr", "hi"];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = true;
  }
  return out;
}

const data = {};
for (const lang of LANGS) {
  const path = join(__dirname, "..", "src", "locales", lang, "common.json");
  data[lang] = flatten(JSON.parse(readFileSync(path, "utf8")));
}

const base = Object.keys(data.en);
let failed = false;
for (const lang of LANGS.filter((l) => l !== "en")) {
  const missing = base.filter((k) => !data[lang][k]);
  const extra = Object.keys(data[lang]).filter((k) => !data.en[k]);
  if (missing.length) {
    failed = true;
    console.error(`\n[${lang}] MISSING ${missing.length} keys present in en:`);
    missing.forEach((k) => console.error(`  - ${k}`));
  }
  if (extra.length) {
    failed = true;
    console.error(`\n[${lang}] EXTRA ${extra.length} keys not in en:`);
    extra.forEach((k) => console.error(`  + ${k}`));
  }
}

if (failed) {
  console.error("\n❌ Locale parity check FAILED.");
  process.exit(1);
}
console.log(`✅ Locale parity OK — ${base.length} keys consistent across ${LANGS.join(", ")}.`);
