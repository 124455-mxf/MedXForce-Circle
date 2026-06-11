import { useState } from 'react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleDiaryEntryBodyPreviewProps = {
  text: string;
};

export function CircleDiaryEntryBodyPreview({ text }: CircleDiaryEntryBodyPreviewProps) {
  const t = useCircleT();
  const [expanded, setExpanded] = useState(false);
  const body = text.trim();
  if (!body) return null;

  const DIARY_BODY_PREVIEW_CHARS = 160;
  const needsTruncate = body.length > DIARY_BODY_PREVIEW_CHARS;
  const displayText =
    expanded || !needsTruncate
      ? body
      : `${body.slice(0, DIARY_BODY_PREVIEW_CHARS).trimEnd()}…`;

  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {needsTruncate ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          {expanded ? t('diary.showLess') : t('diary.showMore')}
        </button>
      ) : null}
    </>
  );
}
