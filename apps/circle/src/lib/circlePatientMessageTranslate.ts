import type { CircleUiLanguage } from './circleLanguages';
import { normalizeCircleUiLanguage } from './circleLanguages';

const CIRCLE_TRANSLATE_MODEL = 'gemini-2.5-flash';
const liveTranslationCache = new Map<string, string>();
const detectLanguageCache = new Map<string, CircleUiLanguage | null>();

function cacheKey(text: string, language: CircleUiLanguage): string {
  return `${language}::${text.trim()}`;
}

export function isCirclePatientMessageTranslateAvailable(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}

async function callGeminiTextPrompt(prompt: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CIRCLE_TRANSLATE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) {
      console.warn('[circlePatientMessageTranslate] API error', response.status);
      return null;
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.warn('[circlePatientMessageTranslate]', err);
    return null;
  }
}

/** Detect whether typed text is English, German, Spanish, or Polish. */
export async function detectTypedTextLanguage(text: string): Promise<CircleUiLanguage | null> {
  const trimmed = text.trim();
  if (trimmed.length < 4) return null;

  const cached = detectLanguageCache.get(trimmed);
  if (cached !== undefined) return cached;

  const raw = await callGeminiTextPrompt(
    `Detect the language of this message.
Return ONLY one word: English, German, Spanish, or Polish.
If uncertain, return Unknown.

MESSAGE:
"${trimmed}"`,
  );

  if (!raw || raw === 'Unknown') {
    detectLanguageCache.set(trimmed, null);
    return null;
  }

  const word = raw.split(/\s+/)[0];
  const detected =
    word === 'German' || word === 'Spanish' || word === 'Polish' || word === 'English'
      ? word
      : normalizeCircleUiLanguage(word);

  detectLanguageCache.set(trimmed, detected);
  return detected;
}

/**
 * Live translation for patient-authored text when Firestore has no stored entry
 * for the viewer language — mirrors patient-app autoTranslateReply on read.
 */
export async function translatePatientMessageForViewer(
  text: string,
  viewerLanguage: CircleUiLanguage,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const key = cacheKey(trimmed, viewerLanguage);
  const cached = liveTranslationCache.get(key);
  if (cached) return cached;

  const detected = await detectTypedTextLanguage(trimmed);
  if (detected === viewerLanguage) return trimmed;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) return trimmed;

  try {
    const translated = await callGeminiTextPrompt(
      `You are a professional medical translator.
Translate the following message into ${viewerLanguage}.

MESSAGE:
"${trimmed}"

RULES:
1. Return ONLY the translated text.
2. No preamble or quotes.
3. If already in ${viewerLanguage}, return unchanged.`,
    );
    if (!translated) return trimmed;

    let result = translated;
    if (result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    if (result && result !== trimmed) {
      liveTranslationCache.set(key, result);
      return result;
    }
    return trimmed;
  } catch (err) {
    console.warn('[circlePatientMessageTranslate]', err);
    return trimmed;
  }
}
