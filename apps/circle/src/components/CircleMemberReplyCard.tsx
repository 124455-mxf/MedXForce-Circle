import { cn } from '../lib/utils';
import type { CircleMemberThreadPostReply } from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { formatCirclePostTime, translateCircleMemberRole } from '../lib/circleScreenI18n';
import { CircleStoredTranslationMessage } from './CircleStoredTranslationMessage';

export function CircleMemberReplyCard({
  reply,
  isOwn,
  highlightAsUnread = false,
  viewerLanguage,
  t,
}: {
  reply: CircleMemberThreadPostReply;
  isOwn: boolean;
  highlightAsUnread?: boolean;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
}) {
  const senderLabel = isOwn
    ? t('circle.replyYou')
    : t('circle.replyFrom', {
        name: reply.authorName,
        role: translateCircleMemberRole(t, reply.authorRole),
      });

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
          className="text-slate-700 text-sm font-medium leading-relaxed"
          t={t}
          translateIfMissing
        />
      </div>
    </div>
  );
}
