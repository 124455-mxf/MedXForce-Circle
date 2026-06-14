import { Radio, WifiOff } from 'lucide-react';
import { DASHBOARD_RECENCY_TINT_CLASSES } from '../lib/circleDashboardStats';
import { patientOfflineAlertRecencyTint } from '../lib/patientPresenceAlert';
import { formatPatientLastSeenT } from '../lib/dashboardI18n';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';

type CircleDashboardPatientOfflineTileProps = {
  daysAway: number;
  lastSeen: number;
  isPreview?: boolean;
};

export function CircleDashboardPatientOfflineTile({
  daysAway,
  lastSeen,
  isPreview = false,
}: CircleDashboardPatientOfflineTileProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const recencyTint = patientOfflineAlertRecencyTint(daysAway);
  const lastSeenLabel = formatPatientLastSeenT(t, language, lastSeen);

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
        {t('dashboard.sectionPatientReachability')}
      </h3>
      {isPreview ? (
        <p className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 leading-relaxed">
          {t('dashboard.previewOfflineAlertHint')}
        </p>
      ) : null}
      <div
        className={cn(
          'w-full rounded-2xl border p-4 sm:p-5 text-left transition-colors',
          DASHBOARD_RECENCY_TINT_CLASSES[recencyTint],
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-2 shrink-0 pt-0.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 border border-slate-200/80">
              <WifiOff size={20} className="text-amber-700" aria-hidden />
              <Radio
                size={12}
                className="absolute -bottom-1 -right-1 text-slate-300 opacity-50"
                aria-hidden
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.attentionPatientOffline')}
            </p>
            <p className="font-bold tabular-nums leading-none text-4xl text-slate-800">
              {formatCircleBadgeCount(daysAway)}
            </p>
            <p className="text-sm font-medium text-slate-700">
              {t(`dashboard.attentionPatientOfflineDays_${daysAway === 1 ? 'one' : 'other'}`, {
                count: daysAway,
              })}
            </p>
            <p className="text-[11px] text-slate-500 leading-snug">
              {t('dashboard.attentionPatientOfflineLastSeen', { when: lastSeenLabel })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
