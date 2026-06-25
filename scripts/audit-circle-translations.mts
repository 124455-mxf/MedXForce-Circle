import { CIRCLE_TRANSLATIONS } from '../apps/circle/src/translations.ts';

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

const en = flatten(CIRCLE_TRANSLATIONS.English as Record<string, unknown>);
let totalMissing = 0;
let totalUntranslated = 0;

for (const lang of ['German', 'Spanish', 'Polish'] as const) {
  const loc = flatten(CIRCLE_TRANSLATIONS[lang] as Record<string, unknown>);
  const missing = Object.keys(en).filter((k) => !(k in loc)).sort();
  const untranslated = Object.keys(en).filter(
    (k) => loc[k] === en[k] && /[a-zA-Z]{4,}/.test(en[k]),
  ).sort();
  totalMissing += missing.length;
  totalUntranslated += untranslated.length;
  console.log(`\n=== Circle ${lang} ===`);
  console.log(`Missing: ${missing.length}`);
  missing.slice(0, 20).forEach((k) => console.log('  MISSING', k));
  console.log(`Same as English (sample): ${untranslated.length}`);
  untranslated.slice(0, 25).forEach((k) => console.log('  UNTRANSLATED', k));
}

console.log(`\nTotal missing: ${totalMissing}, likely untranslated: ${totalUntranslated}`);
process.exit(totalMissing > 0 ? 1 : 0);
