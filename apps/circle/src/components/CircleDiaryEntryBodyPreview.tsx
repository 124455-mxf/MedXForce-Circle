import { useState } from 'react';

/** Shorter preview for Circle mobile layout. */
const DIARY_BODY_PREVIEW_CHARS = 160;

type CircleDiaryEntryBodyPreviewProps = {
  text: string;
};

export function CircleDiaryEntryBodyPreview({ text }: CircleDiaryEntryBodyPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const body = text.trim();
  if (!body) return null;

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
          {expanded ? 'Less' : 'More'}
        </button>
      ) : null}
    </>
  );
}
