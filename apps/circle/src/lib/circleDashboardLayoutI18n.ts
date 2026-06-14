import type { CircleDashboardLayoutSection, CircleDashboardWidgetKey } from '@medxforce/shared';

export const DASHBOARD_WIDGET_TITLE_KEYS: Record<CircleDashboardWidgetKey, string> = {
  'alert-attention': 'dashboard.alertsAttention',
  'daily-check-in': 'dashboard.dailyCheckIn',
  messages: 'dashboard.messages',
  communication: 'dashboard.communication',
  vitality: 'dashboard.vitality',
  assessments: 'dashboard.assessments',
  diary: 'dashboard.diary',
  circle: 'dashboard.circleMessages',
  'gallery-engagement': 'dashboard.yourPhotos',
  'remote-settings': 'dashboard.remoteSettings',
  'user-profile': 'dashboard.userProfile',
  'patient-locale': 'dashboard.sectionPatientLocale',
  'patient-insights': 'dashboard.customizePatientInsights',
  'reminder-gallery-upload': 'dashboard.customizeReminderGalleryUpload',
  'reminder-diary-entry': 'dashboard.customizeReminderDiaryEntry',
};

export const DASHBOARD_LAYOUT_SECTION_TITLE_KEYS: Record<
  CircleDashboardLayoutSection,
  string
> = {
  patientOverview: 'dashboard.sectionPatientOverview',
  reminders: 'dashboard.sectionParticipationReminders',
  last7days: 'dashboard.sectionLast7Days',
  you: 'dashboard.sectionYou',
  patientApp: 'dashboard.sectionPatientApp',
};
