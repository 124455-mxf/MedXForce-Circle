export const CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_KEY =
  'circleScheduleShowAppointmentDetails';

export const CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_CHANGED =
  'circle-schedule-show-appointment-details-changed';

export function getCircleScheduleShowAppointmentDetails(): boolean {
  try {
    const raw = localStorage.getItem(CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_KEY);
    if (raw === 'true') return true;
    return false;
  } catch {
    return false;
  }
}

export function setCircleScheduleShowAppointmentDetails(show: boolean): void {
  try {
    localStorage.setItem(
      CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_KEY,
      show ? 'true' : 'false',
    );
    window.dispatchEvent(new Event(CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_CHANGED));
  } catch {
    /* ignore */
  }
}
