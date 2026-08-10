import { useMemo, useState } from 'react';
import { Loader2, LayoutDashboard, Shield, SlidersHorizontal, FileText } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  REMOTE_APP_MODES,
  REMOTE_DASHBOARD_PRESETS,
  REMOTE_ASSESSMENT_VISIBILITY_TOGGLES,
  REMOTE_DAILY_CHECKIN_QUIET_HOURS,
  REMOTE_FEATURE_TOGGLES,
  REMOTE_HOSPITAL_OPTIONAL_FEATURES_DEFAULTS,
  REMOTE_ICU_OPTIONAL_FEATURES_DEFAULTS,
  REMOTE_PRIMARY_LANGUAGE_OPTIONS,
  REMOTE_PROXY_SECTIONS,
  REMOTE_QUICK_SETTING_TOGGLES,
  REMOTE_VISIBLE_AREA_TOGGLES,
  applyRemoteHospitalOptionalFeatures,
  applyRemoteIntensiveCareOptionalFeatures,
  getRemoteFeatureToggleEnabled,
  getRemoteSettingValue,
  isRemoteFeatureToggleDisabled,
  isRemoteSettingsCustomized,
  readRemoteHospitalOptionalFeatures,
  readRemoteIntensiveCareOptionalFeatures,
  resolveEffectiveRemoteDashboardPreset,
  resolveRemoteIntensiveCareExperience,
  setRemoteAppMode,
  setRemoteDashboardPreset,
  setRemoteContentFontSize,
  setRemoteDailyCheckIn,
  setRemoteIntensiveCareExperience,
  setRemotePrimaryLanguage,
  setRemoteSettingValue,
  setRemoteVisibleArea,
  type CirclePatientSummary,
  type PatientRemoteSettingsDoc,
  type RemoteAppMode,
  type RemoteDashboardPreset,
  type RemoteFeatureToggleDef,
  type RemoteHospitalOptionalFeatures,
  type RemoteIntensiveCareExperience,
  type RemoteIntensiveCareOptionalFeatures,
  type RemotePrimaryLanguage,
  recordCareDiaryMilestones,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  remoteAppModeCardClass,
  remoteAppModeCurrentBadgeClass,
  remoteAppModeIconClass,
} from '../lib/appModeUi';
import {
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionHeaderStackClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { useCircleRemoteSettingsFromShell } from '../context/CircleSelectedPatientContext';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { useCircleT } from '../lib/circleI18nContext';
import {
  remoteSettingsAppModeDescription,
  remoteSettingsAppModeLabel,
  remoteSettingsDashboardPresetDescription,
  remoteSettingsDashboardPresetLabel,
  remoteSettingsFontSizeLabel,
  remoteSettingsProxySectionTitle,
  remoteSettingsToggleDescription,
  remoteSettingsToggleLabel,
  remoteSettingsVisibleAreaLabel,
} from '../lib/remoteSettingsScreenI18n';
import { CircleCollapsibleSection } from './CircleCollapsibleSection';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { CircleAssessmentSchedulePanel } from './CircleAssessmentSchedulePanel';
import { CircleDailyCheckInQuestionsPanel } from './CircleDailyCheckInQuestionsPanel';
import { CircleApplicationOverviewModal } from './CircleApplicationOverviewModal';
import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';
import { useCircleApplicationOverview } from '../hooks/useCircleApplicationOverview';

function ToggleRow({
  label,
  description,
  enabled,
  disabled = false,
  onToggle,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-white',
        disabled && 'opacity-50',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-normal text-slate-800">{label}</p>
        {description ? (
          <p className="text-xs text-slate-400 leading-snug mt-0.5">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'w-12 h-7 rounded-full transition-all duration-300 relative shrink-0',
          enabled ? 'bg-blue-600' : 'bg-slate-300',
          disabled && 'cursor-not-allowed',
        )}
        aria-pressed={enabled}
        aria-disabled={disabled}
      >
        <span
          className={cn(
            'absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300',
            enabled ? 'translate-x-[22px]' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

function readQuickToggle(doc: PatientRemoteSettingsDoc, path: string): boolean {
  if (path === 'hideRightSidebar') return !doc.hideRightSidebar;
  return getRemoteSettingValue(doc, path) ?? false;
}

function OptionalChipButton({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2.5 rounded-2xl text-sm font-bold transition-all border-2 text-center',
        active
          ? 'border-blue-600 bg-white text-blue-900 shadow-sm'
          : 'border-slate-200 bg-white/80 text-slate-700 hover:border-blue-300',
        className,
      )}
    >
      {label}
    </button>
  );
}

function writeQuickToggle(
  doc: PatientRemoteSettingsDoc,
  path: string,
  enabled: boolean,
): PatientRemoteSettingsDoc {
  if (path === 'hideRightSidebar') {
    return { ...doc, hideRightSidebar: !enabled };
  }
  return setRemoteSettingValue(doc, path, enabled);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
      {children}
    </h4>
  );
}

function ProxyToggleList({
  settings,
  paths,
  patch,
  t,
}: {
  settings: PatientRemoteSettingsDoc;
  paths: RemoteFeatureToggleDef[];
  patch: (next: PatientRemoteSettingsDoc) => void;
  t: ReturnType<typeof useCircleT>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {paths.map((item) => {
        const disabled = isRemoteFeatureToggleDisabled(settings, item);
        const enabled = getRemoteFeatureToggleEnabled(settings, item.path);
        return (
          <ToggleRow
            key={item.path}
            label={remoteSettingsToggleLabel(t, item.path, item.label)}
            description={remoteSettingsToggleDescription(t, item.path, item.description)}
            enabled={enabled}
            disabled={disabled}
            onToggle={() => {
              if (disabled) return;
              patch(
                setRemoteSettingValue(settings, item.path, !enabled),
              );
            }}
          />
        );
      })}
    </div>
  );
}

export function CircleRemoteSettingsScreen({
  db,
  user,
  patient,
}: {
  db: Firestore;
  user: User;
  patient: CirclePatientSummary;
}) {
  const { settings, loading, saving, error, savedAt, persist } = useCircleRemoteSettingsFromShell();
  const compactChrome = useCircleCompactChrome();
  const t = useCircleT();
  const [pendingMode, setPendingMode] = useState<RemoteAppMode | null>(null);
  const [pendingIcuExperience, setPendingIcuExperience] =
    useState<RemoteIntensiveCareExperience>('standard');
  const [pendingIcuFeatures, setPendingIcuFeatures] = useState<RemoteIntensiveCareOptionalFeatures>(
    REMOTE_ICU_OPTIONAL_FEATURES_DEFAULTS,
  );
  const [pendingHospitalFeatures, setPendingHospitalFeatures] =
    useState<RemoteHospitalOptionalFeatures>(REMOTE_HOSPITAL_OPTIONAL_FEATURES_DEFAULTS);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const { snapshot: profileSnapshot } = useCirclePatientProfileSnapshot(db, patient.patientId);
  const { overview, loading: overviewLoading } = useCircleApplicationOverview(db, patient.patientId);
  const treatmentPhase = profileSnapshot?.clinical?.treatmentPhase;

  const patch = (next: PatientRemoteSettingsDoc) => {
    persist({ ...next, patientId: patient.patientId });
  };

  const openPendingMode = (mode: RemoteAppMode) => {
    if (mode === 'intensive_care') {
      setPendingIcuExperience('standard');
      setPendingIcuFeatures({ ...REMOTE_ICU_OPTIONAL_FEATURES_DEFAULTS });
    } else if (mode === 'hospital') {
      setPendingHospitalFeatures({ ...REMOTE_HOSPITAL_OPTIONAL_FEATURES_DEFAULTS });
    }
    setPendingMode(mode);
  };

  const applyModeChange = (mode: RemoteAppMode) => {
    if (!settings) return;
    const previousMode = settings.appMode || '';
    let next = setRemoteAppMode(settings, mode);
    if (mode === 'intensive_care') {
      next = setRemoteIntensiveCareExperience(next, pendingIcuExperience);
      next = applyRemoteIntensiveCareOptionalFeatures(next, {
        ...pendingIcuFeatures,
        painAssessment:
          pendingIcuExperience === 'minimal_focus' ? false : pendingIcuFeatures.painAssessment,
      });
    } else if (mode === 'hospital') {
      next = applyRemoteHospitalOptionalFeatures(next, pendingHospitalFeatures);
    }
    patch(next);
    void recordCareDiaryMilestones(db, {
      patientId: patient.patientId,
      authorUid: user.uid,
      language: settings.primaryLanguage,
      appMode: { from: previousMode, to: mode },
    }).catch((err) => console.warn('[careDiaryMilestone]', err));
    setPendingMode(null);
  };

  const resetModePresets = () => {
    if (!settings?.appMode) return;
    patch(setRemoteAppMode(settings, settings.appMode));
  };

  const icuExperience = resolveRemoteIntensiveCareExperience(settings);
  const icuOptionalFeatures = useMemo(
    () => readRemoteIntensiveCareOptionalFeatures(settings),
    [settings],
  );
  const hospitalOptionalFeatures = useMemo(
    () => readRemoteHospitalOptionalFeatures(settings),
    [settings],
  );

  const applyIcuExperience = (variant: RemoteIntensiveCareExperience) => {
    if (!settings) return;
    patch(setRemoteIntensiveCareExperience(settings, variant));
  };

  const toggleIcuOptionalFeature = (key: keyof RemoteIntensiveCareOptionalFeatures) => {
    if (!settings) return;
    patch(
      applyRemoteIntensiveCareOptionalFeatures(settings, {
        ...icuOptionalFeatures,
        [key]: !icuOptionalFeatures[key],
      }),
    );
  };

  const toggleHospitalOptionalFeature = (key: keyof RemoteHospitalOptionalFeatures) => {
    if (!settings) return;
    patch(
      applyRemoteHospitalOptionalFeatures(settings, {
        ...hospitalOptionalFeatures,
        [key]: !hospitalOptionalFeatures[key],
      }),
    );
  };

  const customized = settings ? isRemoteSettingsCustomized(settings) : false;
  const dashboardTabEnabled = settings?.featuresVisibility?.dashboard === true;
  const effectiveDashboardPreset = resolveEffectiveRemoteDashboardPreset(settings);
  const storedDashboardPreset =
    dashboardTabEnabled && effectiveDashboardPreset !== 'custom' ? effectiveDashboardPreset : null;
  const patientSetDashboardLayout = settings?.source === 'patient';

  const handleCopyOverview = async () => {
    const text = overview?.text ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.alert(t('remoteSettings.applicationOverviewCopyFailed'));
    }
  };

  const handleDownloadOverview = () => {
    const text = overview?.text ?? '';
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `medxforce-application-overview-${patient.patientId.slice(0, 8)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintOverview = () => {
    const text = overview?.text ?? '';
    if (!text) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute(
      'style',
      'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none;',
    );
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      window.alert(t('remoteSettings.applicationOverviewPrintFailed'));
      return;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Application Overview</title><style>body{margin:0;padding:24px;font-family:ui-monospace,monospace}pre{white-space:pre-wrap}</style></head><body><pre>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre></body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 800);
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400 py-16">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass)}>
          <CircleWorkTabSectionIntro
            icon={SlidersHorizontal}
            iconClassName="text-slate-600"
            title={t('nav.remoteSettings')}
            subtitle={t('remoteSettings.subtitle', { name: patient.displayName })}
            trailing={
              saving || savedAt ? (
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pt-1">
                  {saving ? t('remoteSettings.saving') : t('remoteSettings.saved')}
                </p>
              ) : undefined
            }
          />
        </div>

        <div className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass, 'space-y-5 pb-6')}>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <SectionLabel>{t('remoteSettings.applicationMode')}</SectionLabel>
              {customized && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  {t('remoteSettings.customToggles')}
                </span>
              )}
            </div>
            {customized && settings.appMode && (
              <button
                type="button"
                onClick={resetModePresets}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-0.5"
              >
                {t('remoteSettings.resetTogglesTo', {
                  mode: settings.appMode
                    ? remoteSettingsAppModeLabel(t, settings.appMode)
                    : t('remoteSettings.preset'),
                })}
              </button>
            )}
            <div className="space-y-2">
              {REMOTE_APP_MODES.map((mode) => {
                const active = settings.appMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      if (active) return;
                      openPendingMode(mode.key);
                    }}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-colors',
                      remoteAppModeCardClass(mode.key, active),
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={remoteAppModeIconClass(mode.key, active)} />
                      <p className="text-sm font-bold text-slate-800">
                        {remoteSettingsAppModeLabel(t, mode.key)}
                      </p>
                      {active && (
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                            remoteAppModeCurrentBadgeClass(mode.key),
                          )}
                        >
                          {t('remoteSettings.current')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {remoteSettingsAppModeDescription(t, mode.key)}
                    </p>
                    {mode.key === 'intensive_care' ? (
                      <p className="text-[11px] font-semibold text-red-700/80 mt-1.5 leading-relaxed">
                        {t('remoteSettings.modes.intensiveCareDashboardHint')}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {settings.appMode === 'intensive_care' ? (
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('remoteSettings.icuExperienceHeading')}
                  </p>
                  <p className="text-xs text-slate-600 leading-snug">
                    {t('remoteSettings.icuExperienceDesc')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <OptionalChipButton
                      label={t('remoteSettings.icuVariantMinimal')}
                      active={icuExperience === 'minimal_focus'}
                      onClick={() => applyIcuExperience('minimal_focus')}
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuVariantStandard')}
                      active={icuExperience !== 'minimal_focus'}
                      onClick={() => applyIcuExperience('standard')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('remoteSettings.icuOptionalHeading')}
                  </p>
                  <p className="text-xs text-slate-600 leading-snug">
                    {t('remoteSettings.icuOptionalDesc')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptPain')}
                      active={icuOptionalFeatures.painAssessment}
                      onClick={() => toggleIcuOptionalFeature('painAssessment')}
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptDoctor')}
                      active={icuOptionalFeatures.doctorQuickAnswers}
                      onClick={() => toggleIcuOptionalFeature('doctorQuickAnswers')}
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptSoulMusic')}
                      active={icuOptionalFeatures.soulMusic}
                      onClick={() => toggleIcuOptionalFeature('soulMusic')}
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptSoulMedia')}
                      active={icuOptionalFeatures.soulMediaLibrary}
                      onClick={() => toggleIcuOptionalFeature('soulMediaLibrary')}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {settings.appMode === 'hospital' ? (
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {t('remoteSettings.hospitalOptionalHeading')}
                </p>
                <p className="text-xs text-slate-600 leading-snug">
                  {t('remoteSettings.hospitalOptionalDesc')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <OptionalChipButton
                    label={t('remoteSettings.hospitalOptDashboard')}
                    active={hospitalOptionalFeatures.dashboard}
                    onClick={() => toggleHospitalOptionalFeature('dashboard')}
                    className="col-span-2"
                  />
                  <OptionalChipButton
                    label={t('remoteSettings.hospitalOptMessaging')}
                    active={hospitalOptionalFeatures.messaging}
                    onClick={() => toggleHospitalOptionalFeature('messaging')}
                  />
                  <OptionalChipButton
                    label={t('remoteSettings.hospitalOptCompanion')}
                    active={hospitalOptionalFeatures.aiCompanion}
                    onClick={() => toggleHospitalOptionalFeature('aiCompanion')}
                  />
                  <OptionalChipButton
                    label={t('remoteSettings.hospitalOptVitality')}
                    active={hospitalOptionalFeatures.vitality}
                    onClick={() => toggleHospitalOptionalFeature('vitality')}
                  />
                  <OptionalChipButton
                    label={t('remoteSettings.hospitalOptAssessments')}
                    active={hospitalOptionalFeatures.healthAssessments}
                    onClick={() => toggleHospitalOptionalFeature('healthAssessments')}
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <SectionLabel>{t('remoteSettings.dashboardView')}</SectionLabel>
              {patientSetDashboardLayout && storedDashboardPreset ? (
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  {t('remoteSettings.dashboardSetOnTablet')}
                </span>
              ) : null}
            </div>
            {!dashboardTabEnabled ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={16} className="text-slate-500" />
                  <p className="text-sm font-bold text-slate-800">
                    {t('remoteSettings.dashboardPresets.none')}
                  </p>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {t('remoteSettings.current')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('remoteSettings.dashboardPresets.noneDesc')}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              {REMOTE_DASHBOARD_PRESETS.map((preset) => {
                const active = storedDashboardPreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      patch(setRemoteDashboardPreset(settings, preset.key as RemoteDashboardPreset));
                    }}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-colors',
                      active
                        ? 'border-violet-300 bg-violet-50/70'
                        : 'border-slate-100 bg-white hover:border-slate-200',
                      !dashboardTabEnabled && 'opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutDashboard
                        size={16}
                        className={active ? 'text-violet-600' : 'text-slate-400'}
                      />
                      <p className="text-sm font-normal text-slate-800">
                        {remoteSettingsDashboardPresetLabel(t, preset.key)}
                      </p>
                      {active && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                          {t('remoteSettings.current')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {remoteSettingsDashboardPresetDescription(t, preset.key)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-3">
            <CircleCollapsibleSection title={t('remoteSettings.sections.language')}>
              <div className="p-4 space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-0.5">
                  {t('remoteSettings.primaryLanguageLabel')}
                </label>
                <select
                  value={settings.primaryLanguage ?? 'English'}
                  onChange={(e) =>
                    patch(setRemotePrimaryLanguage(settings, e.target.value as RemotePrimaryLanguage))
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-400 transition-all font-semibold text-slate-700 text-sm"
                >
                  {REMOTE_PRIMARY_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('remoteSettings.primaryLanguageHint')}
                </p>
              </div>
            </CircleCollapsibleSection>

            {REMOTE_PROXY_SECTIONS.map((section) => (
              <CircleCollapsibleSection
                key={section.id}
                title={remoteSettingsProxySectionTitle(t, section.id, section.title)}
              >
                <div className="p-4">
                  <ProxyToggleList
                    settings={settings}
                    paths={section.toggles}
                    patch={patch}
                    t={t}
                  />
                </div>
              </CircleCollapsibleSection>
            ))}

            <CircleCollapsibleSection title={t('remoteSettings.sections.featuresVisibility')}>
              <div className="p-4 space-y-4">
                <ProxyToggleList
                  settings={settings}
                  paths={REMOTE_FEATURE_TOGGLES}
                  patch={patch}
                  t={t}
                />
                <SectionLabel>{t('remoteSettings.sections.individualAssessments')}</SectionLabel>
                <ProxyToggleList
                  settings={settings}
                  paths={REMOTE_ASSESSMENT_VISIBILITY_TOGGLES}
                  patch={patch}
                  t={t}
                />
              </div>
            </CircleCollapsibleSection>

            <CircleCollapsibleSection title={t('remoteSettings.sections.engagement')}>
              <div className="p-4 space-y-2">
                <ToggleRow
                  label={t('remoteSettings.dailyCheckInOnStartup')}
                  description={t('remoteSettings.dailyCheckInOnStartupDesc')}
                  enabled={settings.dailyCheckIn?.enabled ?? false}
                  onToggle={() =>
                    patch(
                      setRemoteDailyCheckIn(settings, {
                        enabled: !(settings.dailyCheckIn?.enabled ?? false),
                      }),
                    )
                  }
                />
                <ToggleRow
                  label={t('remoteSettings.quietHours')}
                  description={t('remoteSettings.quietHoursDesc')}
                  enabled={
                    settings.dailyCheckIn?.quietHours?.enabled ??
                    REMOTE_DAILY_CHECKIN_QUIET_HOURS.enabled
                  }
                  onToggle={() =>
                    patch(
                      setRemoteDailyCheckIn(settings, {
                        quietHours: {
                          enabled: !(
                            settings.dailyCheckIn?.quietHours?.enabled ??
                            REMOTE_DAILY_CHECKIN_QUIET_HOURS.enabled
                          ),
                          start:
                            settings.dailyCheckIn?.quietHours?.start ??
                            REMOTE_DAILY_CHECKIN_QUIET_HOURS.start,
                          end:
                            settings.dailyCheckIn?.quietHours?.end ??
                            REMOTE_DAILY_CHECKIN_QUIET_HOURS.end,
                        },
                      }),
                    )
                  }
                />
                {(settings.dailyCheckIn?.quietHours?.enabled ??
                  REMOTE_DAILY_CHECKIN_QUIET_HOURS.enabled) && (
                  <div className="grid grid-cols-2 gap-2 px-1">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {t('remoteSettings.from')}
                      </span>
                      <input
                        type="time"
                        value={
                          settings.dailyCheckIn?.quietHours?.start ??
                          REMOTE_DAILY_CHECKIN_QUIET_HOURS.start
                        }
                        onChange={(e) =>
                          patch(
                            setRemoteDailyCheckIn(settings, {
                              quietHours: {
                                enabled:
                                  settings.dailyCheckIn?.quietHours?.enabled ??
                                  REMOTE_DAILY_CHECKIN_QUIET_HOURS.enabled,
                                start: e.target.value,
                                end:
                                  settings.dailyCheckIn?.quietHours?.end ??
                                  REMOTE_DAILY_CHECKIN_QUIET_HOURS.end,
                              },
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {t('remoteSettings.to')}
                      </span>
                      <input
                        type="time"
                        value={
                          settings.dailyCheckIn?.quietHours?.end ??
                          REMOTE_DAILY_CHECKIN_QUIET_HOURS.end
                        }
                        onChange={(e) =>
                          patch(
                            setRemoteDailyCheckIn(settings, {
                              quietHours: {
                                enabled:
                                  settings.dailyCheckIn?.quietHours?.enabled ??
                                  REMOTE_DAILY_CHECKIN_QUIET_HOURS.enabled,
                                start:
                                  settings.dailyCheckIn?.quietHours?.start ??
                                  REMOTE_DAILY_CHECKIN_QUIET_HOURS.start,
                                end: e.target.value,
                              },
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                )}
                <CircleDailyCheckInQuestionsPanel settings={settings} patch={patch} t={t} />
              </div>
            </CircleCollapsibleSection>

            <CircleCollapsibleSection title={t('remoteSettings.sections.assessmentSchedule')}>
              <div className="p-4">
                <CircleAssessmentSchedulePanel
                  settings={settings}
                  treatmentPhase={treatmentPhase}
                  patch={patch}
                  t={t}
                />
              </div>
            </CircleCollapsibleSection>

            <CircleCollapsibleSection title={t('remoteSettings.sections.quickSettings')}>
              <div className="p-4 space-y-2">
                <div className="p-3 rounded-2xl border border-slate-100 bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-blue-600" />
                    <p className="text-sm font-normal text-slate-800">{t('remoteSettings.fontSize')}</p>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => patch(setRemoteContentFontSize(settings, size))}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-bold transition-all',
                          settings.contentFontSize === size
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-white',
                        )}
                      >
                        {remoteSettingsFontSizeLabel(t, size)}
                      </button>
                    ))}
                  </div>
                </div>

                {REMOTE_QUICK_SETTING_TOGGLES.map((item) => (
                  <ToggleRow
                    key={item.path}
                    label={remoteSettingsToggleLabel(t, item.path, item.label)}
                    description={remoteSettingsToggleDescription(t, item.path, item.description)}
                    enabled={readQuickToggle(settings, item.path)}
                    onToggle={() =>
                      patch(
                        writeQuickToggle(settings, item.path, !readQuickToggle(settings, item.path)),
                      )
                    }
                  />
                ))}

                <div className="p-3 rounded-2xl border border-slate-100 bg-white space-y-2">
                  <p className="text-sm font-normal text-slate-800">
                    {t('remoteSettings.communicationShortcuts')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {REMOTE_VISIBLE_AREA_TOGGLES.map((item) => (
                      <ToggleRow
                        key={item.key}
                        label={remoteSettingsVisibleAreaLabel(t, item.key, item.label)}
                        enabled={settings.visibleAreas?.[item.key] ?? true}
                        onToggle={() =>
                          patch(
                            setRemoteVisibleArea(
                              settings,
                              item.key,
                              !(settings.visibleAreas?.[item.key] ?? true),
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CircleCollapsibleSection>
          </div>

          <section className="space-y-2">
            <SectionLabel>{t('remoteSettings.applicationOverviewTitle')}</SectionLabel>
            <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-normal text-slate-800">
                    {t('remoteSettings.applicationOverviewDesc')}
                  </p>
                  <p className="text-xs text-slate-400 leading-snug mt-1">
                    {t('remoteSettings.applicationOverviewHint')}
                  </p>
                  {overview?.updatedAt ? (
                    <p className="text-[10px] text-slate-400 mt-2">
                      {t('remoteSettings.applicationOverviewSyncedAt', {
                        date: new Date(overview.updatedAt).toLocaleString(),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
              {overviewLoading ? (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  …
                </p>
              ) : overview?.text ? (
                <button
                  type="button"
                  onClick={() => setOverviewOpen(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                >
                  {t('remoteSettings.applicationOverviewOpen')}
                </button>
              ) : (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  {t('remoteSettings.applicationOverviewEmpty')}
                </p>
              )}
            </div>
          </section>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2 pb-2">
            {t('remoteSettings.footerHint')}
          </p>
        </div>
      </div>

      {pendingMode && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md max-h-[min(92dvh,100%)] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">{t('remoteSettings.changeModeTitle')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('remoteSettings.changeModeBody', {
                  mode: remoteSettingsAppModeLabel(t, pendingMode),
                })}
              </p>

              {pendingMode === 'intensive_care' ? (
                <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('remoteSettings.icuExperienceHeading')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <OptionalChipButton
                      label={t('remoteSettings.icuVariantMinimal')}
                      active={pendingIcuExperience === 'minimal_focus'}
                      onClick={() => {
                        setPendingIcuExperience('minimal_focus');
                        setPendingIcuFeatures((prev) => ({ ...prev, painAssessment: false }));
                      }}
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuVariantStandard')}
                      active={pendingIcuExperience !== 'minimal_focus'}
                      onClick={() => {
                        setPendingIcuExperience('standard');
                        setPendingIcuFeatures((prev) => ({ ...prev, painAssessment: true }));
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-1">
                    {t('remoteSettings.icuOptionalHeading')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptPain')}
                      active={pendingIcuFeatures.painAssessment}
                      onClick={() =>
                        setPendingIcuFeatures((prev) => ({
                          ...prev,
                          painAssessment: !prev.painAssessment,
                        }))
                      }
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptDoctor')}
                      active={pendingIcuFeatures.doctorQuickAnswers}
                      onClick={() =>
                        setPendingIcuFeatures((prev) => ({
                          ...prev,
                          doctorQuickAnswers: !prev.doctorQuickAnswers,
                        }))
                      }
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptSoulMusic')}
                      active={pendingIcuFeatures.soulMusic}
                      onClick={() =>
                        setPendingIcuFeatures((prev) => ({
                          ...prev,
                          soulMusic: !prev.soulMusic,
                        }))
                      }
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.icuOptSoulMedia')}
                      active={pendingIcuFeatures.soulMediaLibrary}
                      onClick={() =>
                        setPendingIcuFeatures((prev) => ({
                          ...prev,
                          soulMediaLibrary: !prev.soulMediaLibrary,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {pendingMode === 'hospital' ? (
                <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('remoteSettings.hospitalOptionalHeading')}
                  </p>
                  <p className="text-xs text-slate-600 leading-snug">
                    {t('remoteSettings.hospitalOptionalDesc')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <OptionalChipButton
                      label={t('remoteSettings.hospitalOptDashboard')}
                      active={pendingHospitalFeatures.dashboard}
                      onClick={() =>
                        setPendingHospitalFeatures((prev) => ({
                          ...prev,
                          dashboard: !prev.dashboard,
                        }))
                      }
                      className="col-span-2"
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.hospitalOptMessaging')}
                      active={pendingHospitalFeatures.messaging}
                      onClick={() =>
                        setPendingHospitalFeatures((prev) => ({
                          ...prev,
                          messaging: !prev.messaging,
                        }))
                      }
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.hospitalOptCompanion')}
                      active={pendingHospitalFeatures.aiCompanion}
                      onClick={() =>
                        setPendingHospitalFeatures((prev) => ({
                          ...prev,
                          aiCompanion: !prev.aiCompanion,
                        }))
                      }
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.hospitalOptVitality')}
                      active={pendingHospitalFeatures.vitality}
                      onClick={() =>
                        setPendingHospitalFeatures((prev) => ({
                          ...prev,
                          vitality: !prev.vitality,
                        }))
                      }
                    />
                    <OptionalChipButton
                      label={t('remoteSettings.hospitalOptAssessments')}
                      active={pendingHospitalFeatures.healthAssessments}
                      onClick={() =>
                        setPendingHospitalFeatures((prev) => ({
                          ...prev,
                          healthAssessments: !prev.healthAssessments,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 flex gap-3 p-6 pt-3 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold"
              >
                {t('remoteSettings.cancel')}
              </button>
              <button
                type="button"
                onClick={() => applyModeChange(pendingMode)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold"
              >
                {t('remoteSettings.applyMode')}
              </button>
            </div>
          </div>
        </div>
      )}

      <CircleApplicationOverviewModal
        isOpen={overviewOpen}
        overviewText={overview?.text ?? ''}
        syncedAt={overview?.updatedAt}
        t={t}
        onClose={() => setOverviewOpen(false)}
        onCopy={handleCopyOverview}
        onDownload={handleDownloadOverview}
        onPrint={handlePrintOverview}
      />
    </div>
  );
}
