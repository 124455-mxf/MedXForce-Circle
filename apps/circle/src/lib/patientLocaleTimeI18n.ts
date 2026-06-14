import type { CircleTranslator } from './circleI18nContext';
import { dashboardPlural } from './dashboardI18n';
import {
  getPatientViewerTimeDifferenceMinutes,
  splitTimeDifferenceMinutes,
} from './patientLocaleTime';

function formatTimeDifferenceAmount(t: CircleTranslator, diffMinutes: number): string {
  const { hours, minutes } = splitTimeDifferenceMinutes(diffMinutes);
  if (hours > 0 && minutes > 0) {
    return t('dashboard.localeTimeDifferenceHoursMinutes', { hours, minutes });
  }
  if (hours > 0) {
    return dashboardPlural(t, 'localeTimeDifferenceHours', hours);
  }
  return dashboardPlural(t, 'localeTimeDifferenceMinutes', minutes || 0);
}

export function formatPatientViewerTimeDifferenceT(
  t: CircleTranslator,
  patientTimeZone: string,
  viewerTimeZone: string,
  date = new Date(),
): string | null {
  if (!patientTimeZone || !viewerTimeZone) return null;

  const diffMinutes = getPatientViewerTimeDifferenceMinutes(
    patientTimeZone,
    viewerTimeZone,
    date,
  );
  if (diffMinutes === 0) return null;

  const amount = formatTimeDifferenceAmount(t, diffMinutes);
  if (diffMinutes > 0) return t('dashboard.localeTimeAheadOfYou', { amount });
  return t('dashboard.localeTimeBehindYou', { amount });
}
