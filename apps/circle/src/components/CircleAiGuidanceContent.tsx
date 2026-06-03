import type { ReactNode } from 'react';

/** Renders AI guidance as readable UI (not raw markdown asterisks). */
export function CircleAiGuidanceContent({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

        const bullet = trimmed.match(/^[*\-•]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2.5 pl-0.5">
              <span className="text-violet-500 font-bold shrink-0 mt-0.5" aria-hidden>
                •
              </span>
              <p className="min-w-0 flex-1">{formatInlineText(bullet[1])}</p>
            </div>
          );
        }

        const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
        if (numbered) {
          return (
            <div key={index} className="flex gap-2.5 pl-0.5">
              <span className="text-violet-600 font-bold shrink-0 tabular-nums text-xs mt-0.5">
                {trimmed.match(/^(\d+)/)?.[1]}.
              </span>
              <p className="min-w-0 flex-1">{formatInlineText(numbered[1])}</p>
            </div>
          );
        }

        return (
          <p key={index} className="min-w-0">
            {formatInlineText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineText(line: string): ReactNode[] {
  const cleaned = line.replace(/\*\*/g, '').replace(/(?<!\*)\*(?!\*)/g, '');
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);

  if (parts.length === 1 && !line.includes('**')) {
    return [cleaned];
  }

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-800">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part.replace(/\*/g, '')}</span>;
  });
}
