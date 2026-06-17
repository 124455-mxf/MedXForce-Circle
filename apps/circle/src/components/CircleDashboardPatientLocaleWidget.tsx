import { useEffect, useMemo, useState } from 'react';
import { CloudSun, Loader2, Tablet } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import { isPatientInsightsPreviewRemindersEnabled, type CirclePatientProfileSnapshot } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { dashboardPlural } from '../lib/dashboardI18n';
import { usePatientCircleLocation } from '../hooks/usePatientCircleLocation';
import { usePatientLocaleWeather } from '../hooks/usePatientLocaleWeather';
import { useCircleLocaleTimeFormat } from '../hooks/useCircleLocaleTimeFormat';
import { useCircleLocaleTemperatureUnit } from '../hooks/useCircleLocaleTemperatureUnit';
import { formatPatientLocaleTime, formatPatientLocaleTemperature } from '../lib/circleLocaleDisplayPreferences';
import { formatPatientViewerTimeDifferenceT } from '../lib/patientLocaleTimeI18n';
import { getBrowserTimeZone } from '../lib/patientLocaleTime';
import { cn } from '../lib/utils';

export function CircleDashboardPatientLocaleWidget({
  db,
  patientId,
  snapshot,
}: {
  db: Firestore;
  patientId: string;
  snapshot: CirclePatientProfileSnapshot | null;
}) {
  const t = useCircleT();
  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);
  const profileCity = snapshot?.identity.city?.trim() ?? '';
  const profileCountry = snapshot?.identity.country?.trim() ?? '';
  const { location, deviceLocale } = usePatientCircleLocation(db, patientId);

  const deviceWeatherSource = useMemo(() => {
    if (!deviceLocale || previewReminders) return null;
    const latitude = location?.latitude;
    const longitude = location?.longitude;
    if (latitude == null || longitude == null) return null;
    return {
      city: deviceLocale.city,
      country: deviceLocale.country,
      timezoneId: deviceLocale.timezoneId,
      timezoneShort: deviceLocale.timezoneShort,
      latitude,
      longitude,
    };
  }, [deviceLocale, location?.latitude, location?.longitude, previewReminders]);

  const city = deviceLocale?.city || profileCity;
  const country = deviceLocale?.country || profileCountry;
  const locale = usePatientLocaleWeather(city, country, deviceWeatherSource);
  const timeFormat = useCircleLocaleTimeFormat();
  const temperatureUnit = useCircleLocaleTemperatureUnit();
  const viewerTimeZone = getBrowserTimeZone();
  const [, setTick] = useState(0);

  const hasLocationSource = !!(city || previewReminders);

  useEffect(() => {
    if (!locale.timezoneId) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [locale.timezoneId]);

  const liveTime =
    locale.timezoneId && !locale.error
      ? formatPatientLocaleTime(locale.timezoneId, timeFormat)
      : locale.localTime;

  const timeDifferenceLabel = previewReminders
    ? t('dashboard.localeTimeBehindYou', {
        amount: dashboardPlural(t, 'localeTimeDifferenceHours', 3),
      })
    : locale.timezoneId && !locale.error
      ? formatPatientViewerTimeDifferenceT(t, locale.timezoneId, viewerTimeZone)
      : null;

  const showLocaleContent = hasLocationSource && !locale.loading && !locale.error;
  const showEmptyState = !hasLocationSource;
  const displayCityLabel = showEmptyState
    ? t('dashboard.localeLocationUnknown')
    : locale.cityLabel || (previewReminders ? 'San Diego, USA' : '');
  const displayTimezone = showEmptyState ? '' : locale.timezone || (previewReminders ? 'PDT' : '');
  const displayLiveTime = showEmptyState
    ? '—'
    : liveTime || (previewReminders ? formatPatientLocaleTime('America/Los_Angeles', timeFormat) : '—');
  const previewTempF = 73;
  const displayTemperature = showEmptyState
    ? '—'
    : previewReminders
      ? formatPatientLocaleTemperature(previewTempF, temperatureUnit)
      : formatPatientLocaleTemperature(locale.temperatureF, temperatureUnit);
  const displayWeather = showEmptyState
    ? t('dashboard.localeUnavailable')
    : locale.weatherLabel || (previewReminders ? 'Mainly clear' : t('dashboard.localeUnavailable'));
  const isDeviceSynced = !!deviceLocale || previewReminders;
  const deviceSyncHint = isDeviceSynced
    ? t('dashboard.localeDeviceSyncedHint')
    : t('dashboard.localeDeviceNotSyncedHint');

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
        {t('dashboard.sectionPatientLocale')}
      </h3>
      {previewReminders ? (
        <p className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 leading-relaxed">
          {t('dashboard.previewLocaleTimeHint')}
        </p>
      ) : null}
      <div className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-x-3 gap-y-1.5 p-3 sm:p-4 rounded-2xl border border-slate-100 bg-white">
        <p className="col-start-1 row-start-1 flex h-5 items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
          {t('dashboard.localeLocalTime')}
        </p>
        <div className="col-start-2 row-start-1 flex h-5 items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
          <CloudSun size={14} className="shrink-0" aria-hidden />
          {t('dashboard.localeWeather')}
        </div>

        {locale.loading && hasLocationSource && !previewReminders ? (
          <>
            <Loader2
              size={18}
              className="col-start-1 row-start-2 animate-spin text-slate-400 self-center"
              aria-hidden
            />
            <Loader2
              size={18}
              className="col-start-2 row-start-2 animate-spin text-slate-400 justify-self-end self-center"
              aria-hidden
            />
          </>
        ) : locale.error && hasLocationSource && !previewReminders ? (
          <>
            <p className="col-start-1 row-start-2 col-span-2 text-sm text-slate-500 leading-snug">
              {locale.cityLabel}
            </p>
          </>
        ) : showLocaleContent || showEmptyState || previewReminders ? (
          <>
            <div className="col-start-1 row-start-2 flex min-w-0 flex-nowrap items-end gap-x-2 self-end">
              <span className="text-2xl font-bold text-slate-800 tabular-nums leading-none shrink-0">
                {displayLiveTime}
              </span>
              {timeDifferenceLabel ? (
                <span className="pb-0.5 text-[11px] font-medium text-blue-700 leading-none shrink-0 whitespace-nowrap">
                  {timeDifferenceLabel}
                </span>
              ) : null}
            </div>
            <p className="col-start-2 row-start-2 text-2xl font-bold text-slate-800 tabular-nums leading-none text-right self-end">
              {displayTemperature}
            </p>

            <p className="col-start-1 row-start-3 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 leading-none">
              <span
                className="inline-flex shrink-0 items-center"
                title={deviceSyncHint}
                aria-label={deviceSyncHint}
              >
                <Tablet
                  size={13}
                  strokeWidth={2}
                  className={cn(isDeviceSynced ? 'text-emerald-600' : 'text-slate-400')}
                  aria-hidden
                />
              </span>
              <span className="truncate">
                {displayCityLabel}
                {displayTimezone ? ` · ${displayTimezone}` : ''}
              </span>
            </p>
            <p className="col-start-2 row-start-3 text-xs text-slate-500 leading-none text-right self-center">
              {displayWeather}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
