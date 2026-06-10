import { Loader2, Shield, SlidersHorizontal } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  REMOTE_APP_MODES,
  REMOTE_FEATURE_TOGGLES,
  REMOTE_QUICK_SETTING_TOGGLES,
  REMOTE_VISIBLE_AREA_TOGGLES,
  getRemoteSettingValue,
  setRemoteAppMode,
  setRemoteContentFontSize,
  setRemoteDailyCheckIn,
  setRemoteSettingValue,
  setRemoteVisibleArea,
  type CirclePatientSummary,
  type PatientRemoteSettingsDoc,
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

  const patch = (next: PatientRemoteSettingsDoc) => {
    persist({ ...next, patientId: patient.patientId });
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
            <SectionLabel>Application mode</SectionLabel>
            <div className="space-y-2">
              {REMOTE_APP_MODES.map((mode) => {
                const active = settings.appMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => patch(setRemoteAppMode(settings, mode.key))}
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

          <section className="space-y-2">
            <SectionLabel>Features &amp; visibility</SectionLabel>
            <div className="grid grid-cols-1 gap-2">
              {REMOTE_FEATURE_TOGGLES.map((item) => (
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
          </section>

          <section className="space-y-2">
            <SectionLabel>3 minute engagement</SectionLabel>
            <div className="space-y-2">
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
          </section>

          <section className="space-y-2">
            <SectionLabel>Quick settings</SectionLabel>
            <div className="space-y-2">
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
          </section>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2 pb-2">
            Only caregivers and proxies can change these settings. Family and friends cannot access
            this screen.
          </p>
        </div>
      </div>
    </div>
  );
}
