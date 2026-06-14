import { useEffect, useState } from 'react';
import {
  CIRCLE_LOCALE_TIME_FORMAT_CHANGED,
  CIRCLE_LOCALE_TIME_FORMAT_KEY,
  getCircleLocaleTimeFormat,
  type CircleLocaleTimeFormat,
} from '../lib/circleLocaleDisplayPreferences';

export function useCircleLocaleTimeFormat(): CircleLocaleTimeFormat {
  const [format, setFormat] = useState<CircleLocaleTimeFormat>(getCircleLocaleTimeFormat);

  useEffect(() => {
    const sync = () => setFormat(getCircleLocaleTimeFormat());
    window.addEventListener(CIRCLE_LOCALE_TIME_FORMAT_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_LOCALE_TIME_FORMAT_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return format;
}

export { CIRCLE_LOCALE_TIME_FORMAT_KEY };
