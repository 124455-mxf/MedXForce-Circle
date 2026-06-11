import { useState } from 'react';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

const MESSAGE_BODY_PREVIEW_CHARS = 200;

type CircleMessageBodyPreviewProps = {
  text: string;
  className?: string;
};

export function CircleMessageBodyPreview({ text, className }: CircleMessageBodyPreviewProps) {
  const t = useCircleT();
  const [expanded, setExpanded] = useState(false);
  const body = text.trim();
  if (!body) return null;

  const needsTruncate = body.length > MESSAGE_BODY_PREVIEW_CHARS;
  const displayText =
    expanded || !needsTruncate
      ? body
      : `${body.slice(0, MESSAGE_BODY_PREVIEW_CHARS).trimEnd()}…`;

  return (
    <p className={cn('text-slate-800 leading-relaxed text-sm whitespace-pre-wrap', className)}>
      {displayText}
      {needsTruncate ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-blue-600 font-bold ml-1 whitespace-nowrap hover:underline"
        >
          {expanded ? t('messages.bodyShowLess') : t('messages.bodyShowMore')}
        </button>
      ) : null}
    </p>
  );
}
