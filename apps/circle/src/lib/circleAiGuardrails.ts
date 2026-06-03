import type { CircleMemberRole } from '@medxforce/shared';

/** Shown when crisis language is detected — no API call, no logging of the question. */
export const CIRCLE_AI_CRISIS_RESPONSE = `If you or someone you care about may be in danger, please reach out for help right away.

• In the U.S., call or text 988 (Suicide & Crisis Lifeline), or call 911 in an emergency.
• Contact your doctor, care team, or a mental health professional you trust.

MedXForce Circle AI cannot provide crisis counseling or emergency care. You are not alone — trained helpers are available 24/7.`;

export const CIRCLE_AI_PRIVACY_DISCLOSURE =
  'Your question is sent to Google’s AI service for this one-time reply. It is not posted to the circle thread and not stored by MedXForce. If you turn on “Include recent messages,” those snippets are included too.';

export const CIRCLE_AI_MEDICAL_REMINDER =
  'For doses, new symptoms, or treatment changes, confirm with the patient’s doctor or care team — they have the full clinical picture.';

/** Compassionate redirect when the question asks for a clinical decision (e.g. change a dose). */
export const CIRCLE_AI_CLINICAL_DECISION_RESPONSE = `Questions about changing medications, doses, or treatment plans need your doctor or pharmacist — they know the full picture and your loved one’s history.

I can’t advise on specific doses (for example, whether to change aspirin strength), but you can:
• Write down what was prescribed and what confuses you
• Call the clinic nurse line or message the care team through their portal
• Ask at the next visit: “In plain language, what should we watch for?”

Many families ask here because clinical answers felt unclear — that’s valid. The care team is the right place for dose and treatment decisions.`;

const CRISIS_PATTERNS: RegExp[] = [
  /\b(suicid|kill\s+(my|him|her|them)self|end\s+(my|his|her|their)\s+life)\b/i,
  /\b(want|wants|wanted)\s+to\s+die\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+live\b/i,
  /\bself[- ]?harm\b/i,
  /\b(hurt|hurting)\s+(my|him|her|them)self\b/i,
  /\b(no\s+reason\s+to\s+live|better\s+off\s+dead)\b/i,
  /\b(can'?t|cannot)\s+go\s+on\b/i,
  /\b988\b.*\b(crisis|help)\b/i,
];

export function detectCircleAiCrisisLanguage(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Dosing changes, start/stop meds, or “is this a diagnosis” — do not answer clinically. */
const CLINICAL_DECISION_PATTERNS: RegExp[] = [
  /\b(should|can|could)\s+(we|i|he|she|they)\s+(take|start|stop|change|switch|increase|decrease|raise|lower|double|halve)\b/i,
  /\b(increase|decrease|change|raise|lower)\s+(the\s+)?(dose|dosage|medication|meds)\b/i,
  /\bfrom\s+\d+\s*(mg|mcg|g|ml)?\s+to\s+\d+/i,
  /\b\d+\s*(mg|mcg)\b.*\b(to|vs\.?|versus)\b.*\d+\s*(mg|mcg)\b/i,
  /\b(should|can)\s+.*\d+\s*(mg|mcg)\b/i,
  /\b(is\s+this|could\s+this\s+be|do\s+you\s+think\s+(it\s+is|this\s+is))\s+(a\s+)?(stroke|heart\s+attack|sepsis|infection|fracture|blood\s+clot)\b/i,
  /\b(what|which)\s+(medication|medicine|drug|dose)\s+should\b/i,
  /\b(prescribe|prescription)\s+(change|for)\b/i,
];

export function detectCircleAiClinicalDecisionRequest(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CLINICAL_DECISION_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Narrow footer — not for every health-related word (stroke, hospital, symptoms). */
export function shouldAppendMedicalReminder(text: string): boolean {
  return detectCircleAiClinicalDecisionRequest(text);
}

function roleGuidanceBlock(role: CircleMemberRole): string {
  switch (role) {
    case 'family':
    case 'friend':
      return [
        'The person asking is a family member or friend in the circle.',
        'Focus on emotional support, healthy communication, and respecting everyone’s boundaries.',
        'Do not give clinical care instructions or care-coordination directives meant for professionals.',
      ].join(' ');
    case 'proxy':
      return [
        'The person asking is a proxy (primary advocate) for this circle.',
        'You may suggest practical coordination and communication among circle members.',
        'Never recommend medication changes, diagnoses, or treatment plans — defer to the medical team.',
      ].join(' ');
    case 'caregiver':
    case 'professional_caregiver':
    case 'facility_staff':
      return [
        'The person asking is a caregiver involved in day-to-day support.',
        'Offer practical coordination and teamwork tips; stay out of clinical decision-making.',
        'Encourage involving the proxy or medical team when care decisions are needed.',
      ].join(' ');
    default:
      return 'The person asking is a circle member supporting someone they care for.';
  }
}

export function buildCircleAiSystemInstruction(role: CircleMemberRole): string {
  return [
    'You are a private guidance assistant for MedXForce Circle — not a therapist, doctor, or lawyer.',
    roleGuidanceBlock(role),
    '',
    'MEDICAL TOPICS — IMPORTANT:',
    'Circle members often ask health questions because doctors gave unclear or very technical answers. That is valid.',
    'You MAY help with: plain-language explanations of general concepts; questions to ask at the next visit; how to advocate for the patient; emotional support around health events; understanding what a term might mean (always add: confirm with the care team).',
    'You MUST NOT: recommend specific doses or dose changes; say to start, stop, or switch medications; diagnose (“this sounds like a stroke”); or create a treatment plan.',
    'If asked “should we change aspirin from X to Y mg” or similar: refuse the clinical decision and redirect to doctor/pharmacist, but stay warm and practical.',
    '',
    'STRICT RULES:',
    '1. Never provide medical diagnosis or prescribe/change treatment.',
    '2. Never provide legal advice.',
    '3. If the user expresses suicidal thoughts, self-harm, or immediate danger: urge 988 (U.S.) or local emergency services; do not attempt therapy.',
    '4. Do not pretend to be part of the circle thread; this is private guidance for one person.',
    '5. Be substantive on the first reply: lead with practical help, not filler. Do not open with long praise (e.g. "What a thoughtful question"). At most one brief warm sentence, then concrete suggestions.',
    '6. When they ask for recommendations or "what should we do", give 3–5 specific, actionable ideas (products/types/approaches in general terms — not medical prescriptions).',
    '7. Keep responses under 200 words, warm and practical — avoid unnecessary jargon.',
    '8. Format as plain text only: use numbered lines (1. 2. 3.) or lines starting with "- " for bullets. Never use asterisks, markdown, hashtags, or **bold** syntax.',
    '9. Do not ask for or repeat unnecessary personal health identifiers.',
  ].join('\n');
}
