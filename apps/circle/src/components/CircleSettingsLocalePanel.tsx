import { Globe } from 'lucide-react';
import {
  setCircleLocaleTemperatureUnit,
  setCircleLocaleTimeFormat,
  type CircleLocaleTemperatureUnit,
  type CircleLocaleTimeFormat,
} from '../lib/circleLocaleDisplayPreferences';
import { useCircleLocaleTemperatureUnit } from '../hooks/useCircleLocaleTemperatureUnit';
import { useCircleLocaleTimeFormat } from '../hooks/useCircleLocaleTimeFormat';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

const TIME_FORMAT_OPTIONS: CircleLocaleTimeFormat[] = ['12h', '24h'];

const TIME_FORMAT_LABEL_KEYS: Record<CircleLocaleTimeFormat, string> = {
  '12h': 'settings.localeTimeFormat12h',
  '24h': 'settings.localeTimeFormat24h',
};

const TEMPERATURE_UNIT_OPTIONS: CircleLocaleTemperatureUnit[] = ['fahrenheit', 'celsius'];

const TEMPERATURE_UNIT_LABEL_KEYS: Record<CircleLocaleTemperatureUnit, string> = {
  fahrenheit: 'settings.localeTemperatureFahrenheit',
  celsius: 'settings.localeTemperatureCelsius',
};

export function CircleSettingsLocalePanel() {
  const t = useCircleT();
  const timeFormat = useCircleLocaleTimeFormat();
  const temperatureUnit = useCircleLocaleTemperatureUnit();

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
          <Globe size={22} />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-800">{t('settings.localeSettingsTitle')}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('settings.localeSettingsSubtitle')}
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">{t('settings.localeTimeFormatTitle')}</p>
          <p className="text-sm text-slate-400">{t('settings.localeTimeFormatDesc')}</p>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5 flex-wrap"
          role="group"
          aria-label={t('settings.localeTimeFormatTitle')}
        >
          {TIME_FORMAT_OPTIONS.map((id) => {
            const active = timeFormat === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCircleLocaleTimeFormat(id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t(TIME_FORMAT_LABEL_KEYS[id])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">{t('settings.localeTemperatureTitle')}</p>
          <p className="text-sm text-slate-400">{t('settings.localeTemperatureDesc')}</p>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5 flex-wrap"
          role="group"
          aria-label={t('settings.localeTemperatureTitle')}
        >
          {TEMPERATURE_UNIT_OPTIONS.map((id) => {
            const active = temperatureUnit === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCircleLocaleTemperatureUnit(id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t(TEMPERATURE_UNIT_LABEL_KEYS[id])}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
