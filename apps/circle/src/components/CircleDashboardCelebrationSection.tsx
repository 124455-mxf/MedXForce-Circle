import { useMemo } from 'react';
import { Cake, Flag, PartyPopper } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  isPatientInsightsPreviewRemindersEnabled,
  type CirclePatientProfileSnapshot,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import {
  localizeBirthdayReminder,
  localizeOnsetMilestone,
  localizePreviewBirthdayReminder,
  localizePreviewOnsetMilestoneFiveYear,
  localizePreviewOnsetMilestoneOneYear,
  patientFriendlyDisplayName,
} from '../lib/dashboardI18n';
import { cn } from '../lib/utils';

type CelebrationTile = {
  key: string;
  tone: 'birthday' | 'milestone';
  icon: LucideIcon;
  headline: string;
  body: string;
  isPreview?: boolean;
};

function CelebrationCard({
  tone,
  icon: Icon,
  headline,
  body,
  isPreview = false,
  t,
}: CelebrationTile & { t: ReturnType<typeof useCircleT> }) {
  return (
    <div
      className={cn(
        'w-full h-full text-left p-3 sm:p-4 rounded-2xl border shadow-sm transition-colors relative',
        tone === 'birthday'
          ? 'bg-gradient-to-r from-violet-50 via-pink-50 to-amber-50 border-violet-200'
          : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200',
      )}
    >
      {isPreview ? (
        <span className="absolute top-3 right-3 inline-flex rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {t('dashboard.preview')}
        </span>
      ) : null}
      <div className="flex h-full flex-col gap-2.5">
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            tone === 'birthday' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
          )}
        >
          <Icon size={18} />
        </div>
        <div className={cn('min-w-0 flex-1 flex flex-col gap-1.5', isPreview && 'pr-14')}>
          <p className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2">
            {headline}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-3">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CircleDashboardCelebrationSection({
  patient,
  snapshot,
}: {
  patient: CirclePatientSummary;
  snapshot: CirclePatientProfileSnapshot | null;
}) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);

  const friendlyName = patientFriendlyDisplayName(snapshot, patient.displayName);
  const birthday = localizeBirthdayReminder(t, language, snapshot, patient.displayName);
  const onsetMilestone = localizeOnsetMilestone(t, snapshot);
  const previewBirthday = previewReminders ? localizePreviewBirthdayReminder(t, friendlyName) : null;
  const previewOnsetFiveYear = previewReminders ? localizePreviewOnsetMilestoneFiveYear(t) : null;
  const previewOnsetOneYear = previewReminders ? localizePreviewOnsetMilestoneOneYear(t) : null;

  const tiles: CelebrationTile[] = [];
  if (birthday) {
    tiles.push({
      key: 'birthday',
      tone: 'birthday',
      icon: birthday.daysUntil >= 0 && birthday.daysUntil <= 1 ? PartyPopper : Cake,
      headline: birthday.headline,
      body: birthday.body,
    });
  } else if (previewBirthday) {
    tiles.push({
      key: 'preview-birthday',
      tone: 'birthday',
      icon: Cake,
      headline: previewBirthday.headline,
      body: previewBirthday.body,
      isPreview: true,
    });
  }

  if (onsetMilestone) {
    tiles.push({
      key: 'onset',
      tone: 'milestone',
      icon: Flag,
      headline: onsetMilestone.headline,
      body: onsetMilestone.body,
    });
  } else {
    if (previewOnsetFiveYear) {
      tiles.push({
        key: 'preview-onset-5',
        tone: 'milestone',
        icon: Flag,
        headline: previewOnsetFiveYear.headline,
        body: previewOnsetFiveYear.body,
        isPreview: true,
      });
    }
    if (previewOnsetOneYear) {
      tiles.push({
        key: 'preview-onset-1',
        tone: 'milestone',
        icon: Flag,
        headline: previewOnsetOneYear.headline,
        body: previewOnsetOneYear.body,
        isPreview: true,
      });
    }
  }

  if (tiles.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
        {t('dashboard.sectionReminders')}
      </h3>
      {previewReminders ? (
        <p className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 leading-relaxed">
          {t('dashboard.previewRemindersHint')}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ key: tileKey, ...tile }) => (
          <div key={tileKey} className="h-[10rem] sm:h-[10.5rem]">
            <CelebrationCard {...tile} t={t} />
          </div>
        ))}
      </div>
    </section>
  );
}
