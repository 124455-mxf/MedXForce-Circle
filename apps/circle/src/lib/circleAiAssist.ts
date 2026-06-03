import type { CircleMemberRole } from '@medxforce/shared';
import {
  buildCircleAiSystemInstruction,
  CIRCLE_AI_CLINICAL_DECISION_RESPONSE,
  CIRCLE_AI_CRISIS_RESPONSE,
  CIRCLE_AI_MEDICAL_REMINDER,
  detectCircleAiClinicalDecisionRequest,
  detectCircleAiCrisisLanguage,
  shouldAppendMedicalReminder,
} from './circleAiGuardrails';

export type CircleAiAssistParams = {
  question: string;
  threadLabel: string;
  memberRole: CircleMemberRole;
  /** Only sent when the user explicitly opts in. */
  recentContext?: string;
};

export function isCircleAiAssistAvailable(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}

function buildUserPrompt(params: CircleAiAssistParams): string {
  const parts = [
    `Thread context: ${params.threadLabel}`,
    params.recentContext
      ? `Recent circle messages (user opted in; background only):\n${params.recentContext}`
      : '',
    `Question:\n${params.question.trim()}`,
  ];
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Private AI guidance — questions are never logged by this module.
 * Crisis language returns a fixed safety message without calling the API.
 */
/** Gemini model for Circle private guidance (must exist on Generative Language API). */
const CIRCLE_AI_MODEL = 'gemini-2.5-flash';

async function readGeminiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message?.trim() || '';
  } catch {
    return '';
  }
}

export async function askCircleAiGuidance(params: CircleAiAssistParams): Promise<string> {
  const question = params.question.trim();
  if (!question) throw new Error('Please enter a question.');

  if (detectCircleAiCrisisLanguage(question)) {
    return CIRCLE_AI_CRISIS_RESPONSE;
  }

  if (detectCircleAiClinicalDecisionRequest(question)) {
    return CIRCLE_AI_CLINICAL_DECISION_RESPONSE;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('AI guidance is not configured. Add VITE_GEMINI_API_KEY to enable it.');
  }

  const systemInstruction = buildCircleAiSystemInstruction(params.memberRole);
  const userPrompt = buildUserPrompt(params);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CIRCLE_AI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 768,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await readGeminiErrorMessage(response);
    if (import.meta.env.DEV && detail) {
      throw new Error(`AI guidance failed: ${detail}`);
    }
    throw new Error('Could not reach AI guidance right now. Try again later.');
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('AI returned an empty response. Try rephrasing your question.');

  if (shouldAppendMedicalReminder(question)) {
    text = `${text}\n\n---\n${CIRCLE_AI_MEDICAL_REMINDER}`;
  }

  return text;
}
