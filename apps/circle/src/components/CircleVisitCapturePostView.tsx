import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ParsedVisitCapturePost } from '@medxforce/shared';
import { cn } from '../lib/utils';
import type { CircleTranslator } from '../lib/circleI18nContext';
import {
  buildVisitCapturePostPreviewText,
  CIRCLE_POST_BODY_PREVIEW_CHARS,
  trimCirclePostBodyPreview,
} from '../lib/circlePostBodyPreview';
import { CircleExpandablePostToggle } from './CircleExpandablePostToggle';
import { CircleMessageBodyPreview } from './CircleMessageBodyPreview';

function VisitCaptureSection({
  title,
  children,
  variant = 'summary',
}: {
  title: string;
  children: ReactNode;
  variant?: 'summary' | 'actionItems' | 'followUp';
}) {
  const styles = {
    summary: {
      box: 'border-slate-100 bg-white',
      title: 'text-indigo-600',
    },
    actionItems: {
      box: 'border-amber-100 bg-amber-50/90',
      title: 'text-amber-800',
    },
    followUp: {
      box: 'border-violet-100 bg-violet-50/90',
      title: 'text-violet-700',
    },
  }[variant];

  return (
    <section className={cn('rounded-2xl border px-3 py-2.5 shadow-sm', styles.box)}>
      <h4 className={cn('text-[10px] font-bold uppercase tracking-wide mb-1.5', styles.title)}>
        {title}
      </h4>
      {children}
    </section>
  );
}

export function CircleVisitCapturePostView({
  parsed,
  className,
  t,
  disableTruncate = false,
}: {
  parsed: ParsedVisitCapturePost;
  className?: string;
  t: CircleTranslator;
  disableTruncate?: boolean;
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const previewText = useMemo(() => buildVisitCapturePostPreviewText(parsed), [parsed]);
  const needsTruncate =
    !disableTruncate && previewText.length > CIRCLE_POST_BODY_PREVIEW_CHARS;

  useEffect(() => {
    setExpanded(false);
    setTranscriptOpen(false);
  }, [parsed, disableTruncate]);

  if (needsTruncate && !expanded) {
    const summaryPreview = parsed.summary?.trim()
      ? trimCirclePostBodyPreview(parsed.summary.trim())
      : parsed.actionItems[0]
        ? trimCirclePostBodyPreview(parsed.actionItems[0])
        : parsed.followUpQuestions[0]
          ? trimCirclePostBodyPreview(parsed.followUpQuestions[0])
          : trimCirclePostBodyPreview(previewText);

    return (
      <div className={cn('space-y-3', className)}>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-snug">{parsed.heading}</p>
          {parsed.startedByLine ? (
            <p className="text-xs text-slate-500 font-medium mt-1">{parsed.startedByLine}</p>
          ) : null}
        </div>
        {parsed.summary?.trim() ? (
          <VisitCaptureSection title={t('visitCapture.summaryHeading')} variant="summary">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{summaryPreview}</p>
          </VisitCaptureSection>
        ) : parsed.actionItems[0] ? (
          <VisitCaptureSection title={t('visitCapture.actionItemsHeading')} variant="actionItems">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{summaryPreview}</p>
          </VisitCaptureSection>
        ) : (
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{summaryPreview}</p>
        )}
        <CircleExpandablePostToggle expanded={expanded} onToggle={() => setExpanded(true)} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-sm font-bold text-slate-900 leading-snug">{parsed.heading}</p>
        {parsed.startedByLine ? (
          <p className="text-xs text-slate-500 font-medium mt-1">{parsed.startedByLine}</p>
        ) : null}
      </div>

      {parsed.summary?.trim() ? (
        <VisitCaptureSection title={t('visitCapture.summaryHeading')} variant="summary">
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{parsed.summary.trim()}</p>
        </VisitCaptureSection>
      ) : null}

      {parsed.actionItems.length > 0 ? (
        <VisitCaptureSection title={t('visitCapture.actionItemsHeading')} variant="actionItems">
          <ul className="space-y-1.5 text-sm text-slate-800 leading-relaxed">
            {parsed.actionItems.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span className="text-amber-600 shrink-0" aria-hidden>
                  •
                </span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </VisitCaptureSection>
      ) : null}

      {parsed.followUpQuestions.length > 0 ? (
        <VisitCaptureSection title={t('visitCapture.followUpHeading')} variant="followUp">
          <ul className="space-y-1.5 text-sm text-slate-800 leading-relaxed">
            {parsed.followUpQuestions.map((question, index) => (
              <li key={`${question}-${index}`} className="flex gap-2">
                <span className="text-violet-500 shrink-0" aria-hidden>
                  •
                </span>
                <span className="min-w-0">{question}</span>
              </li>
            ))}
          </ul>
        </VisitCaptureSection>
      ) : null}

      {parsed.transcript?.trim() ? (
        <section className="rounded-2xl border border-slate-100 bg-slate-50/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setTranscriptOpen((value) => !value)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-100/80 transition-colors"
            aria-expanded={transcriptOpen}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
              {t('visitCapture.transcriptHeading')}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
              {transcriptOpen ? t('visitCapture.hideTranscript') : t('visitCapture.showTranscript')}
              {transcriptOpen ? (
                <ChevronUp size={14} aria-hidden className="shrink-0" />
              ) : (
                <ChevronDown size={14} aria-hidden className="shrink-0" />
              )}
            </span>
          </button>
          {transcriptOpen ? (
            <div className="border-t border-slate-100 px-3 py-2.5">
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{parsed.transcript.trim()}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {needsTruncate ? (
        <CircleExpandablePostToggle expanded={expanded} onToggle={() => setExpanded(false)} />
      ) : null}
    </div>
  );
}

export function CircleVisitCapturePostFallback({
  text,
  className,
  disableTruncate = false,
}: {
  text: string;
  className?: string;
  disableTruncate?: boolean;
}) {
  return (
    <CircleMessageBodyPreview
      text={text}
      className={className}
      boldFirstLine
      disableTruncate={disableTruncate}
    />
  );
}
