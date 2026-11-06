/** @license SPDX-License-Identifier: Apache-2.0 */

import { Languages, Loader2 } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import { useCircleLiveTranslatedText } from '../hooks/useCircleLiveTranslatedText';
import { cn } from '../lib/utils';

export function CircleLiveTranslationToggle({
  showOriginal,
  onToggle,
}: {
  showOriginal: boolean;
  onToggle: () => void;
}) {
  const t = useCircleT();

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase transition-colors',
        'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      <Languages size={10} aria-hidden />
      {showOriginal ? t('messages.hideOriginal') : t('messages.showOriginal')}
    </button>
  );
}

export function CircleLiveTranslatingLabel() {
  const t = useCircleT();
  return (
    <p className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
      <Loader2 size={10} className="animate-spin shrink-0" aria-hidden />
      {t('messages.translating')}
    </p>
  );
}

type CircleTranslatedUserTextProps = {
  text: string | undefined | null;
  className?: string;
  as?: 'p' | 'h2' | 'h3' | 'span';
  showToggle?: boolean;
};

export function CircleTranslatedUserText({
  text,
  className,
  as: Tag = 'p',
  showToggle = true,
}: CircleTranslatedUserTextProps) {
  const {
    originalText,
    displayText,
    hasTranslation,
    isTranslating,
    showOriginal,
    toggleOriginal,
  } = useCircleLiveTranslatedText(text);

  if (!originalText) return null;

  return (
    <div className="min-w-0 space-y-1">
      {isTranslating && !showOriginal ? <CircleLiveTranslatingLabel /> : null}
      <Tag className={className}>{displayText}</Tag>
      {showToggle && hasTranslation ? (
        <CircleLiveTranslationToggle showOriginal={showOriginal} onToggle={toggleOriginal} />
      ) : null}
    </div>
  );
}
