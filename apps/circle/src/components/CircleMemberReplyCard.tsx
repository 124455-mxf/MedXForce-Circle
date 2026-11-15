import { BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseCirclePollResultsReply, type CircleMemberThreadPostReply } from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { formatCirclePostTime, translateCircleMemberRole } from '../lib/circleScreenI18n';
import { resolveStoredMessageText } from '../lib/messageTranslationDisplay';
import { CircleStoredTranslationMessage } from './CircleStoredTranslationMessage';

export function CircleMemberReplyCard({
  reply,
  isOwn,
  highlightAsUnread = false,
  viewerLanguage,
  t,
  pollThread = false,
}: {
  reply: CircleMemberThreadPostReply;
  isOwn: boolean;
  highlightAsUnread?: boolean;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  pollThread?: boolean;
}) {
  const senderLabel = isOwn
    ? t('circle.replyYou')
    : t('circle.replyFrom', {
        name: reply.authorName,
        role: translateCircleMemberRole(t, reply.authorRole),
      });
  const displayText = isOwn
    ? reply.text
    : resolveStoredMessageText(
        { text: reply.text, translations: reply.translations },
        viewerLanguage,
      ).displayText;
  const pollResults = pollThread
    ? parseCirclePollResultsReply(displayText) ?? parseCirclePollResultsReply(reply.text)
    : null;

  if (pollResults) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" aria-hidden />
        <div className="flex items-start justify-between gap-2 mb-3 pl-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl border border-sky-100 bg-white text-sky-700 inline-flex items-center justify-center shrink-0">
              <BarChart3 size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-800">
                {t('circle.pollResultsReplyKicker')}
              </p>
              <p className="text-[11px] font-bold text-slate-600 leading-snug">{senderLabel}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
            {formatCirclePostTime(t, reply.createdAt)}
          </span>
        </div>
        {pollResults.none ? (
          <p className="pl-1 text-sm font-medium text-slate-700">{t('circle.pollResultsEmpty')}</p>
        ) : (
          <ul className="pl-1 space-y-1.5">
            {pollResults.parts.map((part, index) => (
              <li
                key={`${part.label}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/80 border border-sky-100 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-800 min-w-0 truncate">{part.label}</span>
                <span className="tabular-nums text-sm font-bold text-sky-800 shrink-0">{part.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border rounded-2xl p-4 relative overflow-hidden',
        highlightAsUnread
          ? 'bg-red-50/40 border-red-200'
          : isOwn
            ? 'bg-blue-50/50 border-blue-100'
            : 'bg-violet-50/50 border-violet-100',
      )}
    >
      <div
        className={cn(
          'absolute top-0 left-0 w-1 h-full',
          highlightAsUnread
            ? 'bg-red-500'
            : isOwn
              ? 'bg-blue-400'
              : 'bg-violet-400',
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 mb-2 pl-1">
        <p className="text-[11px] font-bold text-slate-600 leading-snug">{senderLabel}</p>
        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
          {formatCirclePostTime(t, reply.createdAt)}
        </span>
      </div>
      <div className="pl-1">
        <CircleStoredTranslationMessage
          text={reply.text}
          translations={reply.translations}
          viewerLanguage={viewerLanguage}
          className="text-slate-700 text-base font-medium leading-relaxed"
          t={t}
          translateIfMissing
        />
      </div>
    </div>
  );
}
