/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import { Bell, ClipboardList, Clock, MessageSquare } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import type {
  AlertAttentionTimelinePoint,
  CareTransitionReadinessState,
  DailyCheckInTimelinePoint,
  PatientRemoteSettingsDoc,
} from '@medxforce/shared';
import { useCircleI18nContext, useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import {
  dashboardSectionTitleClass,
  dashboardTileTitleClass,
} from '../lib/circleSectionStyles';
import { circleUiLanguageToLocale } from '../lib/circleLanguages';
import { dashboardPlural, formatDashboardTimestamp } from '../lib/dashboardI18n';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { useIcuDailyPresence } from '../hooks/useIcuDailyPresence';
import type { CircleInboxMessage } from '../lib/circleCommunicationLog';
import {
  buildIcuDailyBriefDay,
  defaultIcuBriefDateKey,
  remoteFlagsForIcuBrief,
  rollingLast7DateKeys,
} from '../lib/circleIcuDailyBrief';

function formatOnlineDuration(t: CircleTranslator, ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1 && ms > 0) return t('dashboard.icuBriefLessThanMinute');
  if (minutes < 60) return dashboardPlural(t, 'onlineMinutes', minutes);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}:${String(remainder).padStart(2, '0')}`;
}

function FeatureChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        on ? 'bg-white text-slate-700 border border-slate-200' : 'bg-slate-100/80 text-slate-400',
      )}
    >
      {label}
    </span>
  );
}

type CircleIcuDailyBriefSectionProps = {
  db: Firestore;
  patientId: string;
  memberRole: string;
  remoteSettings: PatientRemoteSettingsDoc | null | undefined;
  alertTimeline: AlertAttentionTimelinePoint[] | undefined;
  checkInTimeline: DailyCheckInTimelinePoint[] | undefined;
  communicationLog: CircleInboxMessage[];
  careTransitionState: CareTransitionReadinessState | null | undefined;
  onOpenCommunicationLog: () => void;
  onOpenAlerts: () => void;
  onOpenCheckIn: () => void;
  onOpenTasks: () => void;
};

export function CircleIcuDailyBriefSection({
  db,
  patientId,
  memberRole,
  remoteSettings,
  alertTimeline,
  checkInTimeline,
  communicationLog,
  careTransitionState,
  onOpenCommunicationLog,
  onOpenAlerts,
  onOpenCheckIn,
  onOpenTasks,
}: CircleIcuDailyBriefSectionProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const flags = useMemo(() => remoteFlagsForIcuBrief(remoteSettings), [remoteSettings]);
  const dateKeys = useMemo(() => rollingLast7DateKeys(), []);
  const todayKey = dateKeys[dateKeys.length - 1] ?? '';
  const yesterdayKey = dateKeys[dateKeys.length - 2] ?? todayKey;
  const [selectedKey, setSelectedKey] = useState(() => defaultIcuBriefDateKey());
  const { byDateKey } = useIcuDailyPresence(db, patientId, true);

  useEffect(() => {
    if (!dateKeys.includes(selectedKey)) setSelectedKey(defaultIcuBriefDateKey());
  }, [dateKeys, selectedKey]);

  const selectedIndex = Math.max(0, dateKeys.indexOf(selectedKey));
  const day = useMemo(
    () =>
      buildIcuDailyBriefDay({
        dateKey: selectedKey,
        indexFromOldest: selectedIndex,
        todayKey,
        yesterdayKey,
        presence: byDateKey.get(selectedKey),
        alertTimeline,
        checkInTimeline,
        communicationLog,
        careTransitionState,
        memberRole,
      }),
    [
      alertTimeline,
      byDateKey,
      careTransitionState,
      checkInTimeline,
      communicationLog,
      memberRole,
      selectedIndex,
      selectedKey,
      todayKey,
      yesterdayKey,
    ],
  );

  const locale = circleUiLanguageToLocale(language);

  return (
    <section className="space-y-2">
      <h3 className={dashboardSectionTitleClass}>{t('dashboard.icuBriefTitle')}</h3>
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-3 sm:p-4 space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">{t('dashboard.icuBriefSubtitle')}</p>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {dateKeys.map((key) => {
            const d = new Date(`${key}T12:00:00`);
            const label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
            const selected = key === selectedKey;
            const isY = key === yesterdayKey;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedKey(key)}
                className={cn(
                  'shrink-0 min-w-[3.5rem] px-2 py-1.5 rounded-xl text-xs font-bold border transition-colors',
                  selected
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50',
                )}
              >
                {isY ? t('dashboard.icuBriefYesterday') : isToday ? t('common.today') : label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock size={14} aria-hidden />
              <span className={dashboardTileTitleClass}>{t('dashboard.icuBriefFirstLogin')}</span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {day.firstLoginAt
                ? formatDashboardTimestamp(t, language, day.firstLoginAt)
                : t('dashboard.icuBriefNoLogin')}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock size={14} aria-hidden />
              <span className={dashboardTileTitleClass}>{t('dashboard.icuBriefOnlineTime')}</span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {day.totalOnlineMs > 0
                ? formatOnlineDuration(t, day.totalOnlineMs)
                : t('dashboard.icuBriefNoLogin')}
            </p>
          </div>
        </div>

        {(flags.alertButton || flags.attentionButton) && (
          <button
            type="button"
            onClick={onOpenAlerts}
            className="w-full bg-white rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Bell size={14} aria-hidden />
              <span className={dashboardTileTitleClass}>{t('dashboard.alertsAttention')}</span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {[
                flags.alertButton
                  ? `${formatCircleBadgeCount(day.alerts)} ${t('dashboard.icuBriefAlerts')}`
                  : null,
                flags.attentionButton
                  ? `${formatCircleBadgeCount(day.attentions)} ${t('dashboard.icuBriefAttentions')}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {((flags.alertButton && day.canceledAlerts > 0) ||
              (flags.attentionButton && day.canceledAttentions > 0)) && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('dashboard.icuBriefCanceled', {
                  count:
                    (flags.alertButton ? day.canceledAlerts : 0) +
                    (flags.attentionButton ? day.canceledAttentions : 0),
                })}
              </p>
            )}
          </button>
        )}

        {flags.dailyCheckIn && (
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="w-full bg-white rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
          >
            <span className={dashboardTileTitleClass}>{t('dashboard.dailyCheckIn')}</span>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {day.checkInCompleted > 0
                ? t('dashboard.icuBriefCheckInCompleted')
                : day.checkInSkipped > 0
                  ? t('dashboard.icuBriefCheckInSkipped')
                  : t('dashboard.icuBriefCheckInMissed')}
            </p>
          </button>
        )}

        {flags.communication && (
          <button
            type="button"
            onClick={onOpenCommunicationLog}
            className="w-full bg-white rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <MessageSquare size={14} aria-hidden />
              <span className={dashboardTileTitleClass}>{t('dashboard.icuBriefCommLog')}</span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {day.commLogCount > 0
                ? t('dashboard.icuBriefCommLogCount', { count: day.commLogCount })
                : t('dashboard.icuBriefCommLogEmpty')}
            </p>
          </button>
        )}

        {day.packLive && (
          <button
            type="button"
            onClick={onOpenTasks}
            className="w-full bg-white rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <ClipboardList size={14} aria-hidden />
              <span className={dashboardTileTitleClass}>{t('dashboard.icuBriefTasks')}</span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {t('dashboard.icuBriefTasksProgress', {
                done: day.packDone,
                total: day.packTotal,
              })}
            </p>
          </button>
        )}

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('dashboard.icuBriefWhatsOn')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FeatureChip on={flags.dailyCheckIn} label={t('dashboard.dailyCheckIn')} />
            <FeatureChip on={flags.alertButton} label={t('dashboard.icuBriefAlertButton')} />
            <FeatureChip on={flags.attentionButton} label={t('dashboard.icuBriefAttentionButton')} />
            <FeatureChip on={flags.communication} label={t('dashboard.communication')} />
            {flags.communication && (
              <>
                <FeatureChip on={flags.boardPhrases} label={t('dashboard.icuBriefBoardSentences')} />
                <FeatureChip on={flags.boardCategories} label={t('dashboard.icuBriefBoardWords')} />
                <FeatureChip on={flags.boardEmojis} label={t('dashboard.icuBriefBoardPictures')} />
                <FeatureChip on={flags.boardUnicode} label={t('dashboard.icuBriefBoardEmoji')} />
              </>
            )}
            <FeatureChip on={flags.soulMusic} label={t('dashboard.icuBriefSoulMusic')} />
            <FeatureChip on={flags.soulMedia} label={t('dashboard.icuBriefSoulMedia')} />
          </div>
        </div>
      </div>
    </section>
  );
}
