import type { RemoteAppMode } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';

const PROXY_SECTION_KEYS: Record<string, string> = {
  alerts: 'remoteSettings.sections.alerts',
  communication: 'remoteSettings.sections.communication',
  messaging: 'remoteSettings.sections.messaging',
};

const APP_MODE_KEYS: Record<RemoteAppMode, string> = {
  intensive_care: 'remoteSettings.modes.intensiveCare',
  hospital: 'remoteSettings.modes.hospital',
  user: 'remoteSettings.modes.user',
};

const APP_MODE_DESC_KEYS: Record<RemoteAppMode, string> = {
  intensive_care: 'remoteSettings.modes.intensiveCareDesc',
  hospital: 'remoteSettings.modes.hospitalDesc',
  user: 'remoteSettings.modes.userDesc',
};

const TOGGLE_LABEL_KEYS: Record<string, string> = {
  showAlertButton: 'remoteSettings.toggles.showAlertButton',
  showAttentionButton: 'remoteSettings.toggles.showAttentionButton',
  detectEngagementNeed: 'remoteSettings.toggles.detectEngagementNeed',
  showSaveButton: 'remoteSettings.toggles.showSaveButton',
  useAiAssistant: 'remoteSettings.toggles.useAiAssistant',
  aiConversation: 'remoteSettings.toggles.aiConversation',
  allowSendMessages: 'remoteSettings.toggles.allowSendMessages',
  showUserInSidebar: 'remoteSettings.toggles.showUserInSidebar',
  'featuresVisibility.dashboard': 'remoteSettings.toggles.dashboard',
  'featuresVisibility.communication': 'remoteSettings.toggles.communicationTab',
  'featuresVisibility.messaging': 'remoteSettings.toggles.messagingTab',
  'featuresVisibility.aiCompanion': 'remoteSettings.toggles.aiCompanion',
  'featuresVisibility.activity.enabled': 'remoteSettings.toggles.vitality',
  'featuresVisibility.journeyDiary': 'remoteSettings.toggles.journal',
  'journeyDiary.allowViewSharedEntries': 'remoteSettings.toggles.sharedJournal',
  'featuresVisibility.healthAssessments': 'remoteSettings.toggles.assessments',
  'featuresVisibility.analytics': 'remoteSettings.toggles.analytics',
  showQuickSettings: 'remoteSettings.toggles.quickSettingsGear',
  showSettingsInSidebar: 'remoteSettings.toggles.settingsTab',
  betterVisibleCursor: 'remoteSettings.toggles.highVisibilityCursor',
  showAiSuggestions: 'remoteSettings.toggles.aiSuggestions',
  speakOnSelection: 'remoteSettings.toggles.speakOnSelection',
  showFrequentlyUsed: 'remoteSettings.toggles.frequentlyUsed',
  hideRightSidebar: 'remoteSettings.toggles.showRightSidebar',
};

const TOGGLE_DESC_KEYS: Record<string, string> = {
  showAlertButton: 'remoteSettings.toggleDesc.showAlertButton',
  showAttentionButton: 'remoteSettings.toggleDesc.showAttentionButton',
  detectEngagementNeed: 'remoteSettings.toggleDesc.detectEngagementNeed',
  showSaveButton: 'remoteSettings.toggleDesc.showSaveButton',
  useAiAssistant: 'remoteSettings.toggleDesc.useAiAssistant',
  aiConversation: 'remoteSettings.toggleDesc.aiConversation',
  allowSendMessages: 'remoteSettings.toggleDesc.allowSendMessages',
  showUserInSidebar: 'remoteSettings.toggleDesc.showUserInSidebar',
  'featuresVisibility.dashboard': 'remoteSettings.toggleDesc.dashboard',
  'featuresVisibility.communication': 'remoteSettings.toggleDesc.communicationTab',
  'featuresVisibility.messaging': 'remoteSettings.toggleDesc.messagingTab',
  'featuresVisibility.aiCompanion': 'remoteSettings.toggleDesc.aiCompanion',
  'featuresVisibility.activity.enabled': 'remoteSettings.toggleDesc.vitality',
  'featuresVisibility.journeyDiary': 'remoteSettings.toggleDesc.journal',
  'journeyDiary.allowViewSharedEntries': 'remoteSettings.toggleDesc.sharedJournal',
  'featuresVisibility.healthAssessments': 'remoteSettings.toggleDesc.assessments',
  'featuresVisibility.analytics': 'remoteSettings.toggleDesc.analytics',
  showQuickSettings: 'remoteSettings.toggleDesc.quickSettingsGear',
  showSettingsInSidebar: 'remoteSettings.toggleDesc.settingsTab',
  betterVisibleCursor: 'remoteSettings.toggleDesc.highVisibilityCursor',
  showAiSuggestions: 'remoteSettings.toggleDesc.aiSuggestions',
  speakOnSelection: 'remoteSettings.toggleDesc.speakOnSelection',
  showFrequentlyUsed: 'remoteSettings.toggleDesc.frequentlyUsed',
  hideRightSidebar: 'remoteSettings.toggleDesc.showRightSidebar',
};

const VISIBLE_AREA_KEYS: Record<string, string> = {
  phrases: 'remoteSettings.visibleAreas.sentences',
  categories: 'remoteSettings.visibleAreas.words',
  emojis: 'remoteSettings.visibleAreas.pictures',
  unicode: 'remoteSettings.visibleAreas.unicode',
};

export function remoteSettingsProxySectionTitle(
  t: CircleTranslator,
  sectionId: string,
  fallback: string,
): string {
  const key = PROXY_SECTION_KEYS[sectionId];
  return key ? t(key) : fallback;
}

export function remoteSettingsAppModeLabel(t: CircleTranslator, mode: RemoteAppMode): string {
  return t(APP_MODE_KEYS[mode]);
}

export function remoteSettingsAppModeDescription(t: CircleTranslator, mode: RemoteAppMode): string {
  return t(APP_MODE_DESC_KEYS[mode]);
}

export function remoteSettingsToggleLabel(
  t: CircleTranslator,
  path: string,
  fallback: string,
): string {
  const key = TOGGLE_LABEL_KEYS[path];
  return key ? t(key) : fallback;
}

export function remoteSettingsToggleDescription(
  t: CircleTranslator,
  path: string,
  fallback?: string,
): string | undefined {
  const key = TOGGLE_DESC_KEYS[path];
  return key ? t(key) : fallback;
}

export function remoteSettingsVisibleAreaLabel(
  t: CircleTranslator,
  key: string,
  fallback: string,
): string {
  const translationKey = VISIBLE_AREA_KEYS[key];
  return translationKey ? t(translationKey) : fallback;
}

export function remoteSettingsFontSizeLabel(
  t: CircleTranslator,
  size: 'small' | 'medium' | 'large',
): string {
  if (size === 'small') return t('remoteSettings.fontSizeSmall');
  if (size === 'large') return t('remoteSettings.fontSizeLarge');
  return t('remoteSettings.fontSizeMedium');
}
