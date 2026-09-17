/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { useCircleLiveTranslatedText } from '../hooks/useCircleLiveTranslatedText';
import {
  CircleLiveTranslatingLabel,
  CircleLiveTranslationToggle,
} from './CircleTranslatedUserText';
import { cn } from '../lib/utils';

export const CIRCLE_TEXT_PREVIEW_CHARS = 100;

type CircleExpandableTextPreviewProps = {
  text: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  label?: string;
  labelClassName?: string;
  previewChars?: number;
  className?: string;
  rootClassName?: string;
};

export function CircleExpandableTextPreview({
  text,
  t,
  label,
  labelClassName,
  previewChars = CIRCLE_TEXT_PREVIEW_CHARS,
  className,
  rootClassName,
}: CircleExpandableTextPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    originalText,
    displayText: translatedText,
    hasTranslation,
    isTranslating,
    showOriginal,
    toggleOriginal,
  } = useCircleLiveTranslatedText(text);
  if (!originalText) return null;

  const needsTruncate = translatedText.length > previewChars;
  const displayText =
    expanded || !needsTruncate
      ? translatedText
      : `${translatedText.slice(0, previewChars).trimEnd()}…`;

  return (
    <div className={cn('space-y-1', rootClassName)}>
      {label ? (
        <p
          className={cn(
            'font-bold text-slate-700 uppercase tracking-wider text-[10px]',
            labelClassName,
          )}
        >
          {label}
        </p>
      ) : null}
      {isTranslating && !showOriginal ? <CircleLiveTranslatingLabel /> : null}
      <p className={cn('text-sm text-slate-600 whitespace-pre-wrap', className)}>
        {displayText}
        {needsTruncate ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
            className="text-blue-600 font-bold ml-1 whitespace-nowrap hover:underline text-xs"
          >
            {expanded ? t('messages.bodyShowLess') : t('messages.bodyShowMore')}
          </button>
        ) : null}
      </p>
      {hasTranslation ? (
        <CircleLiveTranslationToggle showOriginal={showOriginal} onToggle={toggleOriginal} />
      ) : null}
    </div>
  );
}
