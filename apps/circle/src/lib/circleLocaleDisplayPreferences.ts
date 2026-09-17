export type CircleLocaleTimeFormat = '12h' | '24h';

export type CircleLocaleTemperatureUnit = 'fahrenheit' | 'celsius';

export const CIRCLE_LOCALE_TIME_FORMAT_KEY = 'circleLocaleTimeFormat';

export const CIRCLE_LOCALE_TIME_FORMAT_CHANGED = 'circle-locale-time-format-changed';

export const CIRCLE_LOCALE_TEMPERATURE_UNIT_KEY = 'circleLocaleTemperatureUnit';

export const CIRCLE_LOCALE_TEMPERATURE_UNIT_CHANGED = 'circle-locale-temperature-unit-changed';

export function normalizeCircleLocaleTimeFormat(value: unknown): CircleLocaleTimeFormat {
  return value === '24h' ? '24h' : '12h';
}

export function normalizeCircleLocaleTemperatureUnit(
  value: unknown,
): CircleLocaleTemperatureUnit {
  return value === 'celsius' ? 'celsius' : 'fahrenheit';
}

export function getCircleLocaleTimeFormat(): CircleLocaleTimeFormat {
  try {
    return normalizeCircleLocaleTimeFormat(localStorage.getItem(CIRCLE_LOCALE_TIME_FORMAT_KEY));
  } catch {
    return '12h';
  }
}

export function setCircleLocaleTimeFormat(format: CircleLocaleTimeFormat): void {
  try {
    localStorage.setItem(CIRCLE_LOCALE_TIME_FORMAT_KEY, format);
    window.dispatchEvent(new Event(CIRCLE_LOCALE_TIME_FORMAT_CHANGED));
  } catch {
    /* ignore */
  }
}

export function getCircleLocaleTemperatureUnit(): CircleLocaleTemperatureUnit {
  try {
    return normalizeCircleLocaleTemperatureUnit(
      localStorage.getItem(CIRCLE_LOCALE_TEMPERATURE_UNIT_KEY),
    );
  } catch {
    return 'fahrenheit';
  }
}

export function setCircleLocaleTemperatureUnit(unit: CircleLocaleTemperatureUnit): void {
  try {
    localStorage.setItem(CIRCLE_LOCALE_TEMPERATURE_UNIT_KEY, unit);
    window.dispatchEvent(new Event(CIRCLE_LOCALE_TEMPERATURE_UNIT_CHANGED));
  } catch {
    /* ignore */
  }
}

/** Shared 12/24-hour options so English UI does not keep AM/PM in 24-hour mode. */
export function circleClockTimeFormatOptions(
  timeFormat: CircleLocaleTimeFormat = getCircleLocaleTimeFormat(),
): Pick<Intl.DateTimeFormatOptions, 'hour' | 'minute' | 'hour12' | 'hourCycle'> {
  const use12h = timeFormat === '12h';
  return {
    hour: 'numeric',
    minute: '2-digit',
    hour12: use12h,
    hourCycle: use12h ? 'h12' : 'h23',
  };
}

export function formatCircleClockTime(
  date: Date,
  options?: {
    locale?: string;
    timeZone?: string;
    timeFormat?: CircleLocaleTimeFormat;
  },
): string {
  return new Intl.DateTimeFormat(options?.locale, {
    ...circleClockTimeFormatOptions(options?.timeFormat ?? getCircleLocaleTimeFormat()),
    timeZone: options?.timeZone,
  }).format(date);
}

export function formatPatientLocaleTime(
  timezoneId: string,
  timeFormat: CircleLocaleTimeFormat,
  date = new Date(),
): string {
  return formatCircleClockTime(date, { timeZone: timezoneId, timeFormat });
}

export function formatPatientLocaleTemperature(
  temperatureF: number | null,
  unit: CircleLocaleTemperatureUnit,
): string {
  if (temperatureF == null) return '—';
  if (unit === 'celsius') {
    return `${Math.round(((temperatureF - 32) * 5) / 9)}°C`;
  }
  return `${temperatureF}°F`;
}
