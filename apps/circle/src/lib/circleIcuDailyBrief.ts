/** @license SPDX-License-Identifier: Apache-2.0 */
import type {
  AlertAttentionTimelinePoint,
  CareTransitionReadinessState,
  DailyCheckInTimelinePoint,
  PatientRemoteSettingsDoc,
} from '@medxforce/shared';
import {
  careTransitionProgress,
  filterChecklistForViewer,
  getCareTransitionPack,
  isCareTransitionPackLive,
  normalizeMemberRole,
} from '@medxforce/shared';
import { summaryDateKeyFromMessage, type CircleInboxMessage } from './circleCommunicationLog';
import { DASHBOARD_STATS_DAYS } from './circleDashboardStats';

export const ICU_DAILY_PRESENCE_COLLECTION = 'icu_daily_presence';

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type IcuDailyPresenceRecord = {
  dateKey: string;
  firstLoginAt?: number;
  totalOnlineMs?: number;
};

export type IcuDailyBriefFeatureFlags = {
  dailyCheckIn: boolean;
  alertButton: boolean;
  attentionButton: boolean;
  communication: boolean;
  boardPhrases: boolean;
  boardCategories: boolean;
  boardEmojis: boolean;
  boardUnicode: boolean;
  soulMusic: boolean;
  soulMedia: boolean;
};

export function rollingLast7DateKeys(now = new Date()): string[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: DASHBOARD_STATS_DAYS }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (DASHBOARD_STATS_DAYS - 1 - index));
    return localDateKey(day);
  });
}

export function defaultIcuBriefDateKey(now = new Date()): string {
  const keys = rollingLast7DateKeys(now);
  return keys[keys.length - 2] ?? keys[keys.length - 1] ?? keys[0] ?? '';
}

export function remoteFlagsForIcuBrief(
  settings: PatientRemoteSettingsDoc | null | undefined,
): IcuDailyBriefFeatureFlags {
  const vis = settings?.featuresVisibility;
  const areas = settings?.visibleAreas;
  return {
    dailyCheckIn: settings?.dailyCheckIn?.enabled === true,
    alertButton: settings?.showAlertButton !== false,
    attentionButton: settings?.showAttentionButton !== false,
    communication: vis?.communication !== false,
    boardPhrases: areas?.phrases !== false,
    boardCategories: areas?.categories !== false,
    boardEmojis: areas?.emojis !== false,
    boardUnicode: areas?.unicode !== false,
    soulMusic: vis?.intensiveCareSoulMusic === true,
    soulMedia: vis?.intensiveCareSoulMediaLibrary === true,
  };
}

function timelinePointForDate<T extends { date: string }>(
  timeline: T[] | undefined,
  dateKey: string,
  indexFromOldest: number,
): T | undefined {
  const exact = (timeline ?? []).find((p) => p.date === dateKey);
  if (exact) return exact;
  const last7 = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  const offset = DASHBOARD_STATS_DAYS - last7.length;
  const i = indexFromOldest - offset;
  if (i < 0 || i >= last7.length) return undefined;
  return last7[i];
}

export type IcuDailyBriefDayModel = {
  dateKey: string;
  isToday: boolean;
  isYesterday: boolean;
  firstLoginAt: number | null;
  totalOnlineMs: number;
  alerts: number;
  attentions: number;
  canceledAlerts: number;
  canceledAttentions: number;
  checkInCompleted: number;
  checkInSkipped: number;
  checkInMissed: number;
  commLogCount: number;
  commLogMessageId: string | null;
  packLive: boolean;
  packDone: number;
  packTotal: number;
};

export function buildIcuDailyBriefDay(args: {
  dateKey: string;
  indexFromOldest: number;
  todayKey: string;
  yesterdayKey: string;
  presence: IcuDailyPresenceRecord | undefined;
  alertTimeline: AlertAttentionTimelinePoint[] | undefined;
  checkInTimeline: DailyCheckInTimelinePoint[] | undefined;
  communicationLog: CircleInboxMessage[];
  careTransitionState: CareTransitionReadinessState | null | undefined;
  memberRole: string;
}): IcuDailyBriefDayModel {
  const alert = timelinePointForDate(args.alertTimeline, args.dateKey, args.indexFromOldest);
  const checkIn = timelinePointForDate(args.checkInTimeline, args.dateKey, args.indexFromOldest);
  const logMsg =
    args.communicationLog.find((msg) => summaryDateKeyFromMessage(msg) === args.dateKey) ?? null;
  const entries = logMsg?.summaryEntries;
  const commLogCount = Array.isArray(entries) ? entries.length : logMsg ? 1 : 0;

  let packLive = false;
  let packDone = 0;
  let packTotal = 0;
  const state = args.careTransitionState;
  if (state && isCareTransitionPackLive(state) && state.activePackId === 'crisis-icu') {
    const pack = getCareTransitionPack('crisis-icu');
    if (pack) {
      packLive = true;
      const items = filterChecklistForViewer(
        pack,
        state.region,
        normalizeMemberRole(args.memberRole),
        state.customTasks,
        new Set(state.dismissedIds),
      );
      const progress = careTransitionProgress(items, new Set(state.doneIds));
      packDone = progress.done;
      packTotal = progress.total;
    }
  }

  return {
    dateKey: args.dateKey,
    isToday: args.dateKey === args.todayKey,
    isYesterday: args.dateKey === args.yesterdayKey,
    firstLoginAt:
      typeof args.presence?.firstLoginAt === 'number' && args.presence.firstLoginAt > 0
        ? args.presence.firstLoginAt
        : null,
    totalOnlineMs:
      typeof args.presence?.totalOnlineMs === 'number' && args.presence.totalOnlineMs > 0
        ? args.presence.totalOnlineMs
        : 0,
    alerts: alert?.alert ?? 0,
    attentions: alert?.attention ?? 0,
    canceledAlerts: alert?.canceledAlert ?? 0,
    canceledAttentions: alert?.canceledAttention ?? 0,
    checkInCompleted: checkIn?.completed ?? 0,
    checkInSkipped: checkIn?.skipped ?? 0,
    checkInMissed: checkIn?.notTaken ?? 0,
    commLogCount,
    commLogMessageId: logMsg?.id ?? null,
    packLive,
    packDone,
    packTotal,
  };
}
