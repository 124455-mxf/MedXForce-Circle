import { ArrowRight, ClipboardList, Megaphone } from 'lucide-react';
import {
  getCareTransitionPack,
  type CareTransitionPackId,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { extractCareTransitionAnnouncementNote } from '../lib/careTransitionAnnouncementDisplay';
import { careTransitionPackIdFromAnnouncementPost } from '../lib/careTransitionAnnouncementUnread';
import { localizeCareTransitionPack } from '../lib/localizeCareTransition';
import { resolveStoredMessageText } from '../lib/messageTranslationDisplay';
import { CircleStoredTranslationMessage } from './CircleStoredTranslationMessage';
import { CircleFormattedBody } from './CircleFormattedBody';

function splitAnnouncementBody(text: string): { title: string; rest: string } {
  const body = text.replace(/\r\n/g, '\n').trim();
  const newlineIdx = body.indexOf('\n');
  if (newlineIdx < 0) return { title: body, rest: '' };
  return {
    title: body.slice(0, newlineIdx).trim(),
    rest: body.slice(newlineIdx + 1).trim(),
  };
}

export function CircleAnnouncementPost({
  post,
  isOwn = false,
  viewerLanguage,
  t,
  packId: packIdProp,
}: {
  post: CircleMemberThreadPost;
  isOwn?: boolean;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  packId?: CareTransitionPackId | null;
}) {
  const packId = packIdProp ?? careTransitionPackIdFromAnnouncementPost(post);
  const pack = packId ? getCareTransitionPack(packId) : null;
  const localizedPack = pack ? localizeCareTransitionPack(t, pack) : null;
  const resolved = resolveStoredMessageText(
    { text: post.text, translations: post.translations },
    viewerLanguage,
  );
  const displayText = resolved.displayText.trim() || post.text.trim();
  const { title, rest } = splitAnnouncementBody(displayText);
  const packNote = packId ? extractCareTransitionAnnouncementNote(displayText, packId) : '';

  if (localizedPack) {
    const hint = t('careTransitionContent.announcementOpenHint');
    const hintText = hint === 'careTransitionContent.announcementOpenHint' ? '' : hint;
    return (
      <div className="space-y-3">
        <section className="rounded-2xl border border-teal-200 bg-teal-50/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl border border-teal-100 bg-white text-teal-700 inline-flex items-center justify-center shrink-0">
              <ClipboardList size={16} aria-hidden />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800">
              {t('circle.careTransitionAnnouncementKicker')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-teal-950">
            <span>{localizedPack.fromLabel}</span>
            <ArrowRight size={14} className="text-teal-600 shrink-0" aria-hidden />
            <span>{localizedPack.toLabel}</span>
          </div>
        </section>

        {localizedPack.subtitle ? (
          <section className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1.5">
              {t('circle.announcementStageHeading')}
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed">{localizedPack.subtitle}</p>
          </section>
        ) : null}

        {packNote ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-3 shadow-sm">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-amber-800 mb-1.5">
              {t('circle.announcementNoteHeading')}
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{packNote}</p>
          </section>
        ) : null}

        {hintText ? (
          <p className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-xs text-slate-600 leading-relaxed">
            {hintText}
          </p>
        ) : null}
      </div>
    );
  }

  const showTitleInCard = !rest;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-xl border border-amber-100 bg-white text-amber-700 inline-flex items-center justify-center shrink-0">
          <Megaphone size={16} aria-hidden />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
          {t('circle.announcementKicker')}
        </p>
      </div>
      {showTitleInCard && title ? (
        <p className="text-base font-bold text-amber-950 leading-snug">{title}</p>
      ) : rest ? (
        isOwn ? (
          <CircleFormattedBody text={rest} className="text-sm text-slate-800 font-medium" />
        ) : (
          <CircleStoredTranslationMessage
            text={rest}
            translations={post.translations?.map((entry) => ({
              ...entry,
              text: splitAnnouncementBody(entry.text).rest || entry.text,
            }))}
            viewerLanguage={viewerLanguage}
            className="text-slate-800 text-sm font-medium"
            t={t}
            translateIfMissing
            disableTruncate
          />
        )
      ) : null}
    </section>
  );
}
