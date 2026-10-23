import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ChevronDown, Columns2, LayoutGrid, LayoutList, Loader2, Rows2, type LucideIcon } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import {
  CIRCLE_DASHBOARD_WIDGET_SECTIONS,
  isCircleDashboardWidgetAvailable,
  normalizeMemberRole,
  subscribeRemoteSettings,
  usesIcuHomeLayout,
  type CircleDashboardLayoutPreset,
  type CircleDashboardLayoutSection,
  type CircleDashboardWidgetKey,
  type CirclePatientSummary,
  type RemoteAppMode,
} from '@medxforce/shared';
import { useCircleDashboardLayout } from '../hooks/useCircleDashboardLayout';
import {
  DASHBOARD_LAYOUT_SECTION_TITLE_KEYS,
  DASHBOARD_WIDGET_TITLE_KEYS,
} from '../lib/circleDashboardLayoutI18n';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

type CircleDashboardCustomizePanelProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
};

function LayoutChoiceButton({
  active,
  disabled,
  icon: Icon,
  label,
  note,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border text-center transition-colors disabled:opacity-60',
        active
          ? 'border-blue-600 bg-blue-50 text-blue-800'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      <Icon size={18} aria-hidden className={active ? 'text-blue-700' : 'text-slate-400'} />
      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className={cn('text-[11px] font-medium leading-tight', active ? 'text-blue-700/80' : 'text-slate-400')}>
        {note}
      </span>
    </button>
  );
}

function PatientActivityDensityPicker({
  compactVisible,
  expandedVisible,
  saving,
  onSelect,
}: {
  compactVisible: boolean;
  expandedVisible: boolean;
  saving: boolean;
  onSelect: (compact: boolean) => void;
}) {
  const t = useCircleT();
  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-sm">
          {t('dashboard.customizePatientActivityTitle')}
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {t('dashboard.customizePatientActivityHint')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LayoutChoiceButton
          active={compactVisible}
          disabled={saving}
          icon={Columns2}
          label={t('dashboard.customizePatientActivityCompact')}
          note={t('dashboard.customizePatientActivityCompactNote')}
          onClick={() => onSelect(true)}
        />
        <LayoutChoiceButton
          active={expandedVisible}
          disabled={saving}
          icon={Rows2}
          label={t('dashboard.customizePatientActivityExpanded')}
          note={t('dashboard.customizePatientActivityExpandedNote')}
          onClick={() => onSelect(false)}
        />
      </div>
    </div>
  );
}

function DashboardWidgetToggle({
  title,
  visible,
  saving,
  onToggle,
}: {
  title: string;
  visible: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-2xl border border-slate-100 bg-white">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 text-sm">{title}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={title}
        disabled={saving}
        onClick={onToggle}
        className={cn(
          'w-14 h-8 rounded-full transition-all duration-300 relative shrink-0 mt-0.5',
          visible ? 'bg-blue-600' : 'bg-slate-300',
          saving && 'opacity-60 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-0 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300',
            visible ? 'translate-x-7' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

function DashboardSectionToggles({
  section,
  patient,
  hiddenWidgets,
  saving,
  onToggle,
}: {
  section: CircleDashboardLayoutSection;
  patient: CirclePatientSummary;
  hiddenWidgets: ReadonlySet<CircleDashboardWidgetKey>;
  saving: boolean;
  onToggle: (key: CircleDashboardWidgetKey, visible: boolean) => void;
}) {
  const t = useCircleT();
  const [collapsed, setCollapsed] = useState(true);
  const role = normalizeMemberRole(patient.role);
  const keys = CIRCLE_DASHBOARD_WIDGET_SECTIONS[section].filter((key) =>
    isCircleDashboardWidgetAvailable(key, patient.capabilities, role),
  );
  if (keys.length === 0) return null;

  const onCount = keys.filter((key) => !hiddenWidgets.has(key)).length;

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((open) => !open)}
        className="w-full flex items-center justify-between gap-2 px-1 py-1 text-left"
        aria-expanded={!collapsed}
      >
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t(DASHBOARD_LAYOUT_SECTION_TITLE_KEYS[section])}
        </h4>
        <span className="flex items-center gap-1.5 shrink-0">
          {collapsed ? (
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">
              {t('settings.dashboardCustomizeSectionOnCount', { count: onCount })}
            </span>
          ) : null}
          <ChevronDown
            size={16}
            className={cn(
              'text-slate-400 transition-transform',
              collapsed && '-rotate-90',
            )}
            aria-hidden
          />
        </span>
      </button>
      {collapsed ? null : (
        <div className="space-y-2">
          {keys.map((key) => {
            const visible = !hiddenWidgets.has(key);
            return (
              <DashboardWidgetToggle
                key={key}
                title={t(DASHBOARD_WIDGET_TITLE_KEYS[key])}
                visible={visible}
                saving={saving}
                onToggle={() => onToggle(key, !visible)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export function CircleDashboardCustomizePanel({
  user,
  db,
  patient,
}: CircleDashboardCustomizePanelProps) {
  const t = useCircleT();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const memberRole = normalizeMemberRole(patient?.role ?? 'caregiver');
  const [appMode, setAppMode] = useState<RemoteAppMode | null>(null);
  const icuHome = usesIcuHomeLayout(memberRole, appMode);

  useEffect(() => {
    if (!patient?.patientId) {
      setAppMode(null);
      return undefined;
    }
    return subscribeRemoteSettings(db, patient.patientId, (remote) => {
      setAppMode(remote?.appMode ?? null);
    });
  }, [db, patient?.patientId]);

  const { hiddenWidgets, activePreset, loading, setWidgetVisible, applyLayoutPreset, resetToRoleDefaults } =
    useCircleDashboardLayout(
      db,
      patient?.patientId,
      user.uid,
      memberRole,
      appMode,
    );

  const handleToggle = async (key: CircleDashboardWidgetKey, visible: boolean) => {
    if (!patient || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setWidgetVisible(key, visible);
      setSaved(true);
    } catch (err) {
      console.warn('[CircleDashboardCustomizePanel]', err);
      const detail =
        err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
          ? ` (${(err as { code: string }).code})`
          : err instanceof Error && err.message
            ? ` (${err.message})`
            : '';
      setError(`${t('settings.dashboardCustomizeSaveFailed')}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async (preset: CircleDashboardLayoutPreset) => {
    if (!patient || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await applyLayoutPreset(preset);
      setSaved(true);
    } catch (err) {
      console.warn('[CircleDashboardCustomizePanel] preset', err);
      const detail =
        err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
          ? ` (${(err as { code: string }).code})`
          : err instanceof Error && err.message
            ? ` (${err.message})`
            : '';
      setError(`${t('settings.dashboardCustomizeSaveFailed')}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!patient || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await resetToRoleDefaults();
      setSaved(true);
    } catch (err) {
      console.warn('[CircleDashboardCustomizePanel] reset', err);
      const detail =
        err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
          ? ` (${(err as { code: string }).code})`
          : err instanceof Error && err.message
            ? ` (${err.message})`
            : '';
      setError(`${t('settings.dashboardCustomizeSaveFailed')}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500">{t('settings.dashboardCustomizeNoPatient')}</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <LayoutGrid size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">{t('drawer.customizeDashboard')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {t('settings.dashboardCustomizeSubtitle', { name: patient.displayName })}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl p-4">
        {t(
          icuHome
            ? 'settings.dashboardCustomizeMandatoryHintIcu'
            : 'settings.dashboardCustomizeMandatoryHint',
        )}
      </p>
      {icuHome ? (
        <p className="text-xs text-blue-800 leading-relaxed bg-blue-50 border border-blue-100 rounded-2xl p-4">
          {t('settings.dashboardCustomizeIcuHint')}
        </p>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-sm">
            {t('settings.dashboardCustomizePresetTitle')}
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {t(
              icuHome
                ? 'settings.dashboardCustomizePresetHintIcu'
                : 'settings.dashboardCustomizePresetHint',
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LayoutChoiceButton
            active={activePreset === 'compact'}
            disabled={saving || loading}
            icon={LayoutGrid}
            label={t('settings.dashboardCustomizePresetCompact')}
            note={t('settings.dashboardCustomizePresetCompactNote')}
            onClick={() => void handleApplyPreset('compact')}
          />
          <LayoutChoiceButton
            active={activePreset === 'detailed'}
            disabled={saving || loading}
            icon={LayoutList}
            label={t('settings.dashboardCustomizePresetDetailed')}
            note={t('settings.dashboardCustomizePresetDetailedNote')}
            onClick={() => void handleApplyPreset('detailed')}
          />
        </div>
        {activePreset === 'custom' ? (
          <p className="text-[11px] text-slate-400">
            {t('settings.dashboardCustomizePresetCustom')}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {isCircleDashboardWidgetAvailable(
            'patient-activity',
            patient.capabilities,
            memberRole,
          ) ? (
            <PatientActivityDensityPicker
              compactVisible={!hiddenWidgets.has('patient-activity-compact')}
              expandedVisible={!hiddenWidgets.has('patient-activity')}
              saving={saving}
              onSelect={(compact) =>
                void handleToggle(
                  compact ? 'patient-activity-compact' : 'patient-activity',
                  true,
                )
              }
            />
          ) : null}
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pt-2">
            {t('settings.dashboardCustomizeTilesHeading')}
          </h4>
          {(Object.keys(CIRCLE_DASHBOARD_WIDGET_SECTIONS) as CircleDashboardLayoutSection[]).map(
            (section) => (
              <DashboardSectionToggles
                key={section}
                section={section}
                patient={patient}
                hiddenWidgets={hiddenWidgets}
                saving={saving}
                onToggle={(key, visible) => void handleToggle(key, visible)}
              />
            ),
          )}
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}
      {saved && !error ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {t('settings.dashboardCustomizeSaved')}
        </p>
      ) : null}
      {saving ? (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> {t('admin.contact.saving')}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving || loading}
        onClick={() => void handleReset()}
        className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {t('settings.dashboardCustomizeReset')}
      </button>
    </div>
  );
}
