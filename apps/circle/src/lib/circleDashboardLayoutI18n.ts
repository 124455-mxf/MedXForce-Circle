import type { CircleDashboardLayoutSection, CircleDashboardWidgetKey } from '@medxforce/shared';

export const DASHBOARD_WIDGET_TITLE_KEYS: Record<CircleDashboardWidgetKey, string> = {
  'alert-attention': 'dashboard.alertsAttention',
  'daily-check-in': 'dashboard.customizeCheckInCompact',
  messages: 'dashboard.messages',
  communication: 'dashboard.communication',
  companion: 'dashboard.companionTitle',
  vitality: 'dashboard.vitality',
  assessments: 'dashboard.assessments',
  'assessments-compact': 'dashboard.customizeAssessmentsCompact',
  'patient-activity': 'dashboard.customizePatientActivityExpanded',
  'patient-activity-compact': 'dashboard.customizePatientActivityCompact',
  'last-7-days-overview': 'dashboard.last7DaysOverview',
  'last-30-days-overview': 'dashboard.last30DaysOverview',
  diary: 'dashboard.diary',
  circle: 'dashboard.circleMessages',
  'circle-map': 'dashboard.circleMap.tileTitle',
  'circle-compact': 'dashboard.circleMap.compactTitle',
  'check-in-wellness-ring': 'dashboard.checkInWellnessRing.title',
  'assessment-schedule-calendar': 'dashboard.assessmentScheduleCalendar.title',
  'gallery-engagement': 'dashboard.yourPhotos',
  'media-gallery': 'dashboard.mediaGallery',
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
  stayConnected: 'dashboard.sectionStayConnected',
};
