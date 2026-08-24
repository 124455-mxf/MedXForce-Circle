import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Globe, Languages, Type } from 'lucide-react';
import {
  setCircleLocaleTemperatureUnit,
  setCircleLocaleTimeFormat,
  type CircleLocaleTemperatureUnit,
  type CircleLocaleTimeFormat,
} from '../lib/circleLocaleDisplayPreferences';
import {
  CIRCLE_TEXT_SIZE_OPTIONS,
  type CircleTextSize,
} from '../lib/circleTextSizePreferences';
import { CIRCLE_UI_LANGUAGES, circleUiLanguageLabel, type CircleUiLanguage } from '../lib/circleLanguages';
import { persistCircleApplicationLanguage } from '../lib/circleUiLanguageHydration';
import { useCircleLocaleTemperatureUnit } from '../hooks/useCircleLocaleTemperatureUnit';
import { useCircleLocaleTimeFormat } from '../hooks/useCircleLocaleTimeFormat';
import { useCircleTextSizeFromContext } from '../lib/circleTextSizeContext';
import { cn } from '../lib/utils';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';

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

const TEXT_SIZE_LABEL_KEYS: Record<CircleTextSize, string> = {
  small: 'settings.textSizeSmall',
  medium: 'settings.textSizeMedium',
  large: 'settings.textSizeLarge',
};

type CircleSettingsLocalePanelProps = {
  user: User;
  db: Firestore;
  patientId?: string | null;
};

export function CircleSettingsLocalePanel({
  user,
  db,
  patientId,
}: CircleSettingsLocalePanelProps) {
  const t = useCircleT();
  const { language, setLanguage } = useCircleI18nContext();
  const timeFormat = useCircleLocaleTimeFormat();
  const temperatureUnit = useCircleLocaleTemperatureUnit();
  const { textSize, setTextSize } = useCircleTextSizeFromContext();
  const [savingLanguage, setSavingLanguage] = useState(false);

  const handleLanguageChange = async (next: CircleUiLanguage) => {
    if (next === language || savingLanguage) return;
    setSavingLanguage(true);
    try {
      await persistCircleApplicationLanguage({
        db,
        user,
        language: next,
        patientId,
        setLanguage,
      });
    } catch (err) {
      console.warn('[CircleSettingsLocalePanel] language', err);
    } finally {
      setSavingLanguage(false);
    }
  };

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
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Languages size={18} />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-slate-800">{t('settings.applicationLanguageTitle')}</p>
            <p className="text-sm text-slate-400">{t('settings.applicationLanguageDesc')}</p>
          </div>
        </div>
        <select
          value={language}
          disabled={savingLanguage}
          onChange={(event) => {
            void handleLanguageChange(event.target.value as CircleUiLanguage);
          }}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
          aria-label={t('settings.applicationLanguageTitle')}
        >
          {CIRCLE_UI_LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {circleUiLanguageLabel(t, option.value)}
            </option>
          ))}
        </select>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Type size={18} />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-slate-800">{t('settings.textSizeTitle')}</p>
            <p className="text-sm text-slate-400">{t('settings.textSizeDesc')}</p>
          </div>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5 flex-wrap"
          role="group"
          aria-label={t('settings.textSizeTitle')}
        >
          {CIRCLE_TEXT_SIZE_OPTIONS.map((id) => {
            const active = textSize === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTextSize(id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t(TEXT_SIZE_LABEL_KEYS[id])}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed pt-1">
          {t('settings.textSizePreview')}
        </p>
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
