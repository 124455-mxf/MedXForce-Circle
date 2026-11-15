import { useEffect, useState } from 'react';
import {
  CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_CHANGED,
  getCircleScheduleShowAppointmentDetails,
} from '../lib/circleSchedulePreferences';

export function useCircleScheduleShowAppointmentDetails(): boolean {
  const [show, setShow] = useState(getCircleScheduleShowAppointmentDetails);

  useEffect(() => {
    const sync = () => setShow(getCircleScheduleShowAppointmentDetails());
    window.addEventListener(CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return show;
}
