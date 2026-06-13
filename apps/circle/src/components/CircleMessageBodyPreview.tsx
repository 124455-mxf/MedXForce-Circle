import { useState } from 'react';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

const MESSAGE_BODY_PREVIEW_CHARS = 200;

type CircleMessageBodyPreviewProps = {
  text: string;
  className?: string;
  /** Bold the first line (visit capture / drop-in titles in any language). */
  boldFirstLine?: boolean;
  /** When true, show the full body (e.g. expanded message overlay). */
  disableTruncate?: boolean;
};

export function CircleMessageBodyPreview({
  text,
  className,
  boldFirstLine = false,
  disableTruncate = false,
}: CircleMessageBodyPreviewProps) {
  const t = useCircleT();
  const [expanded, setExpanded] = useState(false);
  const body = text.trim();
  if (!body) return null;

  const newlineIdx = body.indexOf('\n');
  const titleLine =
    boldFirstLine && newlineIdx >= 0
      ? body.slice(0, newlineIdx)
      : boldFirstLine
        ? body
        : null;
  const restBody =
    boldFirstLine && newlineIdx >= 0 ? body.slice(newlineIdx + 1) : boldFirstLine ? '' : body;

  const needsTruncate = !disableTruncate && restBody.length > MESSAGE_BODY_PREVIEW_CHARS;
  const displayRest =
    disableTruncate || !needsTruncate || expanded
      ? restBody
      : `${restBody.slice(0, MESSAGE_BODY_PREVIEW_CHARS).trimEnd()}…`;

  if (titleLine !== null) {
    return (
      <div className={cn('text-slate-800 leading-relaxed text-sm whitespace-pre-wrap', className)}>
        <p className="font-bold text-slate-900">{titleLine}</p>
        {restBody ? (
          <p className={cn(restBody && 'mt-1.5')}>
            {displayRest}
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
        ) : null}
      </div>
    );
  }

  const needsTruncateAll = !disableTruncate && body.length > MESSAGE_BODY_PREVIEW_CHARS;
  const displayText =
    disableTruncate || expanded || !needsTruncateAll
      ? body
      : `${body.slice(0, MESSAGE_BODY_PREVIEW_CHARS).trimEnd()}…`;

  return (
    <p className={cn('text-slate-800 leading-relaxed text-sm whitespace-pre-wrap', className)}>
      {displayText}
      {needsTruncateAll ? (
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
