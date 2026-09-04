import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { parseFormattedInline, parseFormattedMessage } from '../lib/formattedMessage';

function formatInlineText(line: string): ReactNode[] {
  return parseFormattedInline(line).map((part, index) =>
    part.bold ? (
      <strong key={index} className="font-semibold text-slate-800">
        {part.text}
      </strong>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

/** Renders numbered lists, bullets, and **bold** the way AI guidance does. */
export function CircleFormattedBody({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseFormattedMessage(text);
  if (blocks.every((block) => block.type === 'blank')) return null;

  return (
    <div className={cn('space-y-2.5 leading-relaxed', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'blank') return <div key={index} className="h-1" />;
        if (block.type === 'bullet') {
          return (
            <div key={index} className="flex gap-2.5 pl-0.5">
              <span className="text-violet-500 font-bold shrink-0 mt-0.5" aria-hidden>
                •
              </span>
              <p className="min-w-0 flex-1">{formatInlineText(block.text)}</p>
            </div>
          );
        }
        if (block.type === 'numbered') {
          return (
            <div key={index} className="flex gap-2.5 pl-0.5">
              <span className="text-violet-600 font-bold shrink-0 tabular-nums text-xs mt-0.5">
                {block.n}.
              </span>
              <p className="min-w-0 flex-1">{formatInlineText(block.text)}</p>
            </div>
          );
        }
        return (
          <p key={index} className="min-w-0">
            {formatInlineText(block.text)}
          </p>
        );
      })}
    </div>
  );
}
