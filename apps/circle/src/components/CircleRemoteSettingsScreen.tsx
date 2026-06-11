import { useState } from 'react';
import { Loader2, Shield, SlidersHorizontal } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  REMOTE_APP_MODES,
  REMOTE_FEATURE_TOGGLES,
  REMOTE_PRIMARY_LANGUAGE_OPTIONS,
  REMOTE_PROXY_SECTIONS,
  REMOTE_QUICK_SETTING_TOGGLES,
  REMOTE_VISIBLE_AREA_TOGGLES,
  getRemoteSettingValue,
  isRemoteSettingsCustomized,
  setRemoteAppMode,
  setRemoteContentFontSize,
  setRemoteDailyCheckIn,
  setRemotePrimaryLanguage,
  setRemoteSettingValue,
  setRemoteVisibleArea,
  type CirclePatientSummary,
  type PatientRemoteSettingsDoc,
  type RemoteAppMode,
  type RemotePrimaryLanguage,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionHeaderStackClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { useCircleRemoteSettings } from '../hooks/useCircleRemoteSettings';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { CircleCollapsibleSection } from './CircleCollapsibleSection';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-normal text-slate-800">{label}</p>
        {description ? (
          <p className="text-xs text-slate-400 leading-snug mt-0.5">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-12 h-7 rounded-full transition-all duration-300 relative shrink-0',
          enabled ? 'bg-blue-600' : 'bg-slate-300',
        )}
        aria-pressed={enabled}
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
}: {
  settings: PatientRemoteSettingsDoc;
  paths: { path: string; label: string; description?: string }[];
  patch: (next: PatientRemoteSettingsDoc) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {paths.map((item) => (
        <ToggleRow
          key={item.path}
          label={item.label}
          description={item.description}
          enabled={getRemoteSettingValue(settings, item.path) ?? false}
          onToggle={() =>
            patch(
              setRemoteSettingValue(
                settings,
                item.path,
                !(getRemoteSettingValue(settings, item.path) ?? false),
              ),
            )
          }
        />
      ))}
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
  const { settings, loading, saving, error, savedAt, persist } = useCircleRemoteSettings(
    db,
    patient,
    user,
  );
  const compactChrome = useCircleCompactChrome();
  const [pendingMode, setPendingMode] = useState<RemoteAppMode | null>(null);

  const patch = (next: PatientRemoteSettingsDoc) => {
    persist({ ...next, patientId: patient.patientId });
  };

  const applyModeChange = (mode: RemoteAppMode) => {
    if (!settings) return;
    patch(setRemoteAppMode(settings, mode));
    setPendingMode(null);
  };

  const customized = settings ? isRemoteSettingsCustomized(settings) : false;

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
            title="Remote Settings"
            subtitle={`Configure ${patient.displayName}'s tablet — changes sync when the patient app is online.`}
            trailing={
              saving || savedAt ? (
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pt-1">
                  {saving ? 'Saving…' : 'Saved'}
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
              <SectionLabel>Application mode</SectionLabel>
              {customized && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  Custom toggles
                </span>
              )}
            </div>
            {customized && settings.appMode && (
              <button
                type="button"
                onClick={() => applyModeChange(settings.appMode!)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-0.5"
              >
                Reset all toggles to{' '}
                {REMOTE_APP_MODES.find((mode) => mode.key === settings.appMode)?.label ?? 'preset'}
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
                      setPendingMode(mode.key);
                    }}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-colors',
                      active
                        ? 'border-blue-300 bg-blue-50/70'
                        : 'border-slate-100 bg-white hover:border-slate-200',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
                      <p className="text-sm font-normal text-slate-800">{mode.label}</p>
                      {active && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mode.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-3">
            <CircleCollapsibleSection title="Language">
              <div className="p-4 space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-0.5">
                  Primary language (patient)
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
                  Use this if the patient changed language and cannot switch back.
                </p>
              </div>
            </CircleCollapsibleSection>

            {REMOTE_PROXY_SECTIONS.map((section) => (
              <CircleCollapsibleSection key={section.id} title={section.title}>
                <div className="p-4">
                  <ProxyToggleList settings={settings} paths={section.toggles} patch={patch} />
                </div>
              </CircleCollapsibleSection>
            ))}

            <CircleCollapsibleSection title="Features & visibility">
              <div className="p-4">
                <ProxyToggleList
                  settings={settings}
                  paths={REMOTE_FEATURE_TOGGLES}
                  patch={patch}
                />
              </div>
            </CircleCollapsibleSection>

            <CircleCollapsibleSection title="3 minute engagement">
              <div className="p-4 space-y-2">
                <ToggleRow
                  label="Daily check-in on startup"
                  description="Once-per-day check-in after the app opens."
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
                  label="Quiet hours"
                  description="Suppress check-in overnight (default 10 PM–6 AM)."
                  enabled={settings.dailyCheckIn?.quietHours?.enabled ?? false}
                  onToggle={() =>
                    patch(
                      setRemoteDailyCheckIn(settings, {
                        quietHours: {
                          enabled: !(settings.dailyCheckIn?.quietHours?.enabled ?? false),
                          start: settings.dailyCheckIn?.quietHours?.start ?? '22:00',
                          end: settings.dailyCheckIn?.quietHours?.end ?? '06:00',
                        },
                      }),
                    )
                  }
                />
                {settings.dailyCheckIn?.quietHours?.enabled && (
                  <div className="grid grid-cols-2 gap-2 px-1">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                      <input
                        type="time"
                        value={settings.dailyCheckIn?.quietHours?.start ?? '22:00'}
                        onChange={(e) =>
                          patch(
                            setRemoteDailyCheckIn(settings, {
                              quietHours: {
                                enabled: settings.dailyCheckIn?.quietHours?.enabled ?? false,
                                start: e.target.value,
                                end: settings.dailyCheckIn?.quietHours?.end ?? '06:00',
                              },
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                      <input
                        type="time"
                        value={settings.dailyCheckIn?.quietHours?.end ?? '06:00'}
                        onChange={(e) =>
                          patch(
                            setRemoteDailyCheckIn(settings, {
                              quietHours: {
                                enabled: settings.dailyCheckIn?.quietHours?.enabled ?? false,
                                start: settings.dailyCheckIn?.quietHours?.start ?? '22:00',
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
              </div>
            </CircleCollapsibleSection>

            <CircleCollapsibleSection title="Quick settings">
              <div className="p-4 space-y-2">
                <div className="p-3 rounded-2xl border border-slate-100 bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-blue-600" />
                    <p className="text-sm font-normal text-slate-800">Font size</p>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => patch(setRemoteContentFontSize(settings, size))}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all',
                          settings.contentFontSize === size
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-white',
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {REMOTE_QUICK_SETTING_TOGGLES.map((item) => (
                  <ToggleRow
                    key={item.path}
                    label={item.label}
                    description={item.description}
                    enabled={readQuickToggle(settings, item.path)}
                    onToggle={() =>
                      patch(
                        writeQuickToggle(settings, item.path, !readQuickToggle(settings, item.path)),
                      )
                    }
                  />
                ))}

                <div className="p-3 rounded-2xl border border-slate-100 bg-white space-y-2">
                  <p className="text-sm font-normal text-slate-800">Communication shortcuts</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REMOTE_VISIBLE_AREA_TOGGLES.map((item) => (
                      <ToggleRow
                        key={item.key}
                        label={item.label}
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

          <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2 pb-2">
            Only caregivers and proxies can change these settings. Family and friends cannot access
            this screen. Individual toggles stay editable after you pick a mode; changing mode resets
            toggles to that preset.
          </p>
        </div>
      </div>

      {pendingMode && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Change application mode?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Switching to{' '}
              <span className="font-semibold">
                {REMOTE_APP_MODES.find((mode) => mode.key === pendingMode)?.label}
              </span>{' '}
              applies that mode&apos;s preset and updates all toggles below. You can still adjust
              individual toggles afterward.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyModeChange(pendingMode)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold"
              >
                Apply mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
