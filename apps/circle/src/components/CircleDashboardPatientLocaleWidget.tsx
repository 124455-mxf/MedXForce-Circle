import { useEffect, useState } from 'react';
import { CloudSun, Loader2 } from 'lucide-react';
import type { CirclePatientProfileSnapshot } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { usePatientLocaleWeather } from '../hooks/usePatientLocaleWeather';
import { cn } from '../lib/utils';

export function CircleDashboardPatientLocaleWidget({
  snapshot,
}: {
  snapshot: CirclePatientProfileSnapshot | null;
}) {
  const t = useCircleT();
  const city = snapshot?.identity.city?.trim() ?? '';
  const country = snapshot?.identity.country?.trim() ?? '';
  const locale = usePatientLocaleWeather(city, country);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!locale.timezoneId) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [locale.timezoneId]);

  if (!city) return null;

  const liveTime =
    locale.timezoneId && !locale.error
      ? new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: locale.timezoneId,
        }).format(new Date())
      : locale.localTime;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
        {t('dashboard.sectionPatientLocale')}
      </h3>
      <div
        className={cn(
          'grid grid-cols-2 gap-3 p-3 sm:p-4 rounded-2xl border border-slate-100 bg-white',
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('dashboard.localeLocalTime')}
          </p>
          {locale.loading ? (
            <Loader2 size={18} className="animate-spin text-slate-400 mt-3" aria-hidden />
          ) : locale.error ? (
            <p className="text-sm text-slate-500 mt-2 leading-snug">{locale.cityLabel}</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{liveTime}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {locale.cityLabel}
                {locale.timezone ? ` · ${locale.timezone}` : ''}
              </p>
            </>
          )}
        </div>
        <div className="min-w-0 text-right">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <CloudSun size={14} aria-hidden />
            {t('dashboard.localeWeather')}
          </div>
          {locale.loading ? (
            <Loader2 size={18} className="animate-spin text-slate-400 mt-3 ml-auto" aria-hidden />
          ) : locale.error ? (
            <p className="text-xs text-slate-400 mt-2">{t('dashboard.localeUnavailable')}</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">
                {locale.temperatureF != null ? `${locale.temperatureF}°F` : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{locale.weatherLabel}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
