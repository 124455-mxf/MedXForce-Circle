import { useEffect, useState } from 'react';
import {
  CIRCLE_LOCALE_TEMPERATURE_UNIT_CHANGED,
  CIRCLE_LOCALE_TEMPERATURE_UNIT_KEY,
  getCircleLocaleTemperatureUnit,
  type CircleLocaleTemperatureUnit,
} from '../lib/circleLocaleDisplayPreferences';

export function useCircleLocaleTemperatureUnit(): CircleLocaleTemperatureUnit {
  const [unit, setUnit] = useState<CircleLocaleTemperatureUnit>(getCircleLocaleTemperatureUnit);

  useEffect(() => {
    const sync = () => setUnit(getCircleLocaleTemperatureUnit());
    window.addEventListener(CIRCLE_LOCALE_TEMPERATURE_UNIT_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_LOCALE_TEMPERATURE_UNIT_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return unit;
}

export { CIRCLE_LOCALE_TEMPERATURE_UNIT_KEY };
