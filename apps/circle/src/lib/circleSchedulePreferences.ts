export const CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_KEY =
  'circleScheduleShowAppointmentDetails';

export const CIRCLE_SCHEDULE_SHOW_APPOINTMENT_DETAILS_CHANGED =
  'circle-schedule-show-appointment-details-changed';

export const CIRCLE_SCHEDULE_DEFAULT_VIEW_KEY = 'circleScheduleDefaultView';

export const CIRCLE_SCHEDULE_DEFAULT_VIEW_CHANGED =
  'circle-schedule-default-view-changed';

export type CircleScheduleDefaultView = 'today' | 'week' | 'month';

export const CIRCLE_SCHEDULE_DEFAULT_VIEW_OPTIONS: CircleScheduleDefaultView[] = [
  'today',
  'week',
  'month',
];

const DEFAULT_SCHEDULE_VIEW: CircleScheduleDefaultView = 'week';

function parseCircleScheduleDefaultView(raw: string | null): CircleScheduleDefaultView {
  if (raw === 'today' || raw === 'week' || raw === 'month') return raw;
  return DEFAULT_SCHEDULE_VIEW;
}

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

export function getCircleScheduleDefaultView(): CircleScheduleDefaultView {
  try {
    return parseCircleScheduleDefaultView(
      localStorage.getItem(CIRCLE_SCHEDULE_DEFAULT_VIEW_KEY),
    );
  } catch {
    return DEFAULT_SCHEDULE_VIEW;
  }
}

export function setCircleScheduleDefaultView(view: CircleScheduleDefaultView): void {
  try {
    localStorage.setItem(CIRCLE_SCHEDULE_DEFAULT_VIEW_KEY, view);
    window.dispatchEvent(new Event(CIRCLE_SCHEDULE_DEFAULT_VIEW_CHANGED));
  } catch {
    /* ignore */
  }
}
