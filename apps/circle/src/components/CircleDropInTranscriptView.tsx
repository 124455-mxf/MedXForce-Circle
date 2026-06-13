import { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { parseDropInTranscriptText, type DropInTranscriptParsed } from '../lib/dropInTranscriptDisplay';
import {
  buildDropInPostPreviewText,
  CIRCLE_POST_BODY_PREVIEW_CHARS,
  trimCirclePostBodyPreview,
} from '../lib/circlePostBodyPreview';
import { CircleExpandablePostToggle } from './CircleExpandablePostToggle';
import { CircleMessageBodyPreview } from './CircleMessageBodyPreview';

export function CircleDropInTranscriptView({
  text,
  parsed: parsedProp,
  className,
  disableTruncate = false,
}: {
  text?: string;
  parsed?: DropInTranscriptParsed | null;
  className?: string;
  disableTruncate?: boolean;
}) {
  const parsed = parsedProp ?? (text ? parseDropInTranscriptText(text) : null);

  if (!parsed) {
    if (!text?.trim()) return null;
    return (
      <CircleMessageBodyPreview
        text={text}
        className={className}
        boldFirstLine
        disableTruncate={disableTruncate}
      />
    );
  }

  return (
    <CircleDropInTranscriptStructuredView
      parsed={parsed}
      className={className}
      disableTruncate={disableTruncate}
    />
  );
}

function DropInMetadataBlock({ metadata }: { metadata: DropInTranscriptParsed['metadata'] }) {
  if (metadata.length === 0) return null;
  return (
    <dl className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 space-y-1.5">
      {metadata.map((row, index) => (
        <div key={`${row.label}-${index}`} className="flex flex-wrap gap-x-1.5 text-xs leading-snug">
          {row.label ? (
            <dt className="font-bold text-slate-500 shrink-0">{row.label}</dt>
          ) : null}
          <dd className="text-slate-700 font-medium min-w-0">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DropInUtteranceCard({
  speaker,
  text,
}: {
  speaker: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1">{speaker}</p>
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function dropInNeedsCollapse(parsed: DropInTranscriptParsed, disableTruncate: boolean): boolean {
  if (disableTruncate) return false;
  if (parsed.utterances.length > 1) return true;
  if (parsed.footer?.trim()) return true;
  return buildDropInPostPreviewText(parsed).length > CIRCLE_POST_BODY_PREVIEW_CHARS;
}

function CircleDropInTranscriptStructuredView({
  parsed,
  className,
  disableTruncate = false,
}: {
  parsed: DropInTranscriptParsed;
  className?: string;
  disableTruncate?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = useMemo(
    () => dropInNeedsCollapse(parsed, disableTruncate),
    [parsed, disableTruncate],
  );
  const previewUtterance = parsed.utterances[0];
  const previewUtteranceText = previewUtterance
    ? trimCirclePostBodyPreview(
        previewUtterance.text,
        parsed.utterances.length > 1 ? 160 : CIRCLE_POST_BODY_PREVIEW_CHARS,
      )
    : '';

  useEffect(() => {
    setExpanded(false);
  }, [parsed, disableTruncate]);

  if (needsTruncate && !expanded) {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-sm font-bold text-slate-900 leading-snug">{parsed.titleLine}</p>
        <DropInMetadataBlock metadata={parsed.metadata} />
        {previewUtterance ? (
          <DropInUtteranceCard speaker={previewUtterance.speaker} text={previewUtteranceText} />
        ) : null}
        <CircleExpandablePostToggle expanded={expanded} onToggle={() => setExpanded(true)} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-bold text-slate-900 leading-snug">{parsed.titleLine}</p>
      <DropInMetadataBlock metadata={parsed.metadata} />

      {parsed.utterances.length > 0 ? (
        <div className="space-y-2">
          {parsed.utterances.map((line, index) => (
            <DropInUtteranceCard key={`${line.speaker}-${index}`} speaker={line.speaker} text={line.text} />
          ))}
        </div>
      ) : null}

      {parsed.footer ? (
        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">{parsed.footer}</p>
      ) : null}

      {needsTruncate ? (
        <CircleExpandablePostToggle expanded={expanded} onToggle={() => setExpanded(false)} />
      ) : null}
    </div>
  );
}
