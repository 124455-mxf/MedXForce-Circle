import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ClipboardList, Maximize2, X } from 'lucide-react';
import {
  CARE_TRANSITION_PACK_NOTE_MAX,
  type CareTransitionPack,
  type CareTransitionPackId,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';
import { CircleCareTransitionDraftBadge } from './CircleCareTransitionDraftBadge';

export function CircleCareTransitionPackNoteFields({
  note,
  onNoteChange,
  alsoDiary,
  onAlsoDiaryChange,
  disabled = false,
  required = false,
}: {
  note: string;
  onNoteChange: (value: string) => void;
  alsoDiary: boolean;
  onAlsoDiaryChange: (value: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const t = useCircleT();
  return (
    <div className="space-y-2">
      <label className="space-y-1.5 block">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {required ? t('careTransition.packAddNote') : t('careTransition.packNoteLabel')}
        </span>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value.slice(0, CARE_TRANSITION_PACK_NOTE_MAX))}
          placeholder={t('careTransition.packNotePlaceholder')}
          disabled={disabled}
          rows={required ? 6 : 5}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500 min-h-[6rem]"
        />
      </label>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        {required ? t('careTransition.packFollowUpHint') : t('careTransition.packNoteHint')}
      </p>
      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={alsoDiary}
          onChange={(e) => onAlsoDiaryChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 rounded border-slate-300"
        />
        <span>{t('careTransition.packNoteInDiary')}</span>
      </label>
    </div>
  );
}

type CircleCareTransitionPackComposerProps = {
  open: boolean;
  sending?: boolean;
  packs: CareTransitionPack[];
  /** Open directly on review when a draft pack is already in progress. */
  resumeReview?: boolean;
  currentPackId?: CareTransitionPackId | null;
  reviewTitle?: string;
  packNote?: string;
  onPackNoteChange?: (note: string) => void;
  alsoDiary?: boolean;
  onAlsoDiaryChange?: (value: boolean) => void;
  onClose: () => void;
  onStart: (packId: CareTransitionPackId) => void | Promise<void>;
  onShare: (note: string, alsoDiary: boolean) => void | Promise<void>;
  /** Same discard-confirm path as the Circle tasks draft card. */
  onDiscard: () => void;
  children?: ReactNode;
};

export function CircleCareTransitionPackComposer({
  open,
  sending = false,
  packs,
  resumeReview = false,
  currentPackId = null,
  reviewTitle,
  packNote = '',
  onPackNoteChange,
  alsoDiary = false,
  onAlsoDiaryChange,
  onClose,
  onStart,
  onShare,
  onDiscard,
  children,
}: CircleCareTransitionPackComposerProps) {
  const t = useCircleT();
  const [packId, setPackId] = useState<CareTransitionPackId | ''>('');
  const [step, setStep] = useState<'select' | 'review'>('select');
  const [expanded, setExpanded] = useState(false);

  const reset = useCallback(() => {
    setPackId('');
    setStep('select');
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setPackId(currentPackId ?? '');
    setStep(resumeReview ? 'review' : 'select');
    // Hydrate only when the modal opens so in-progress review is not reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only hydrate
  }, [open, reset]);

  if (!open) return null;

  const reviewing = step === 'review';
  const canStart = Boolean(packId) && !sending;
  const canShare = reviewing && !sending;

  const handleStart = async () => {
    if (!packId || !canStart) return;
    await onStart(packId);
    setStep('review');
  };

  const handleShare = async () => {
    if (!canShare) return;
    await onShare(packNote, alsoDiary);
  };

  const heading = reviewing
    ? t('careTransition.reviewingPack')
    : t('circle.composeNewCareTransitionPack');
  const subtitle = reviewing
    ? reviewTitle || t('careTransition.reviewHint')
    : t('circle.composePackSubtitle');

  const selectFields = (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {t('circle.packComposerLabel')}
      </p>
      <div className="space-y-2" role="radiogroup" aria-label={t('circle.packComposerLabel')}>
        {packs.map((pack) => {
          const selected = packId === pack.id;
          const route =
            pack.kind === 'crisis' ? pack.title : `${pack.fromLabel} → ${pack.toLabel}`;
          return (
            <button
              key={pack.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={sending}
              onClick={() => setPackId(pack.id)}
              className={cn(
                'w-full text-left rounded-2xl border px-4 py-3 space-y-1 disabled:opacity-60',
                selected
                  ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/15'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <p className="text-sm font-semibold text-slate-800">{pack.title}</p>
              {route !== pack.title ? (
                <p className="text-xs font-medium text-slate-500">{route}</p>
              ) : null}
              <p className="text-xs text-slate-500 leading-relaxed">{pack.subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const reviewFields = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 space-y-1.5">
        <CircleCareTransitionDraftBadge />
        <p className="text-xs text-amber-950 leading-relaxed">{t('careTransition.reviewHint')}</p>
        <p className="text-xs font-semibold text-amber-950">{t('careTransition.shareMakesLive')}</p>
      </div>
      <CircleCareTransitionPackNoteFields
        note={packNote}
        onNoteChange={onPackNoteChange ?? (() => undefined)}
        alsoDiary={alsoDiary}
        onAlsoDiaryChange={onAlsoDiaryChange ?? (() => undefined)}
        disabled={sending}
      />
      {children}
    </div>
  );

  const fields = reviewing ? reviewFields : selectFields;

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {reviewing ? (
        <>
          <button
            type="button"
            onClick={onDiscard}
            className="font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            disabled={sending}
          >
            {t('careTransition.discardDraft')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            disabled={sending}
          >
            {t('circle.packSave')}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          disabled={sending}
        >
          {t('circle.clear')}
        </button>
      )}
      <button
        type="button"
        onClick={() => void (reviewing ? handleShare() : handleStart())}
        disabled={reviewing ? !canShare : !canStart}
        className={cn(
          'bg-blue-600 text-white rounded-2xl font-bold px-5 py-2 text-sm disabled:opacity-50',
        )}
      >
        {sending
          ? reviewing
            ? t('careTransition.sharingPack')
            : t('admin.contact.saving')
          : reviewing
            ? t('careTransition.shareWithCircle')
            : t('circle.packNext')}
      </button>
    </div>
  );

  return expanded ? (
    <CircleMessageExpandOverlay
      open
      title={heading}
      subtitle={subtitle}
      onClose={() => setExpanded(false)}
      footer={footer}
      t={t}
    >
      {fields}
    </CircleMessageExpandOverlay>
  ) : (
    <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <button type="button" aria-label={t('common.close')} className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[94vh] min-h-[65vh] sm:min-h-[480px] flex flex-col',
          reviewing ? 'border-2 border-amber-300' : 'border border-slate-100',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-pack-composer-title"
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-4 sm:pt-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
            <div className="min-w-0">
              <h3
                id="circle-pack-composer-title"
                className="font-bold text-slate-800 text-base truncate"
              >
                {heading}
              </h3>
              {reviewing ? <CircleCareTransitionDraftBadge className="mt-1" /> : null}
              <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              aria-label={t('circle.packExpand')}
              title={t('circle.packExpand')}
            >
              <Maximize2 size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-5 overflow-y-auto">{fields}</div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0">{footer}</div>
      </div>
    </div>
  );
}
