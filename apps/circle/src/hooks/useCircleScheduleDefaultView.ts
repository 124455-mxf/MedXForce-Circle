import { useEffect, useState } from 'react';
import {
  CIRCLE_SCHEDULE_DEFAULT_VIEW_CHANGED,
  getCircleScheduleDefaultView,
  type CircleScheduleDefaultView,
} from '../lib/circleSchedulePreferences';

export function useCircleScheduleDefaultView(): CircleScheduleDefaultView {
  const [view, setView] = useState(getCircleScheduleDefaultView);

  useEffect(() => {
    const sync = () => setView(getCircleScheduleDefaultView());
    window.addEventListener(CIRCLE_SCHEDULE_DEFAULT_VIEW_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_SCHEDULE_DEFAULT_VIEW_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return view;
}
