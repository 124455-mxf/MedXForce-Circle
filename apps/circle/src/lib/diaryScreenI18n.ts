import type { CircleTranslator } from './circleI18nContext';

const MOOD_KEYS: Record<string, string> = {
  grateful: 'diary.moodGrateful',
  hopeful: 'diary.moodHopeful',
  joyful: 'diary.moodJoyful',
  celebratory: 'diary.moodCelebratory',
  peaceful: 'diary.moodPeaceful',
  reflective: 'diary.moodReflective',
  worried: 'diary.moodWorried',
  sad: 'diary.moodSad',
  overwhelmed: 'diary.moodOverwhelmed',
};

export function diaryMoodLabelI18n(
  t: CircleTranslator,
  mood: string | undefined | null,
): string | undefined {
  if (!mood) return undefined;
  const key = MOOD_KEYS[mood];
  return key ? t(key) : undefined;
}
