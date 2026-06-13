import { Languages } from 'lucide-react';
import { normalizeCircleUiLanguage, type CircleUiLanguage } from '../lib/circleLanguages';

const SHORT_LABELS: Record<CircleUiLanguage, string> = {
  English: 'EN',
  German: 'DE',
  Spanish: 'ES',
  Polish: 'PL',
};

/** Patient tablet primary language — Circle app only. */
export function CirclePatientLanguagePill({
  language,
  title,
}: {
  language: string | undefined | null;
  title?: string;
}) {
  const normalized = normalizeCircleUiLanguage(language);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0"
      title={title}
    >
      <Languages size={10} aria-hidden />
      {SHORT_LABELS[normalized]}
    </span>
  );
}
