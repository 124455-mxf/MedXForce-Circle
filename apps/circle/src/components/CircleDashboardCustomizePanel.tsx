import { useState } from 'react';
import type { User } from 'firebase/auth';
import { LayoutGrid, Loader2 } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import {
  CIRCLE_DASHBOARD_WIDGET_SECTIONS,
  isCircleDashboardWidgetAvailable,
  normalizeMemberRole,
  type CircleDashboardLayoutSection,
  type CircleDashboardWidgetKey,
  type CirclePatientSummary,
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

function DashboardWidgetToggle({
  title,
  visible,
  disabled,
  disabledHint,
  saving,
  onToggle,
}: {
  title: string;
  visible: boolean;
  disabled?: boolean;
  disabledHint?: string;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-4 py-3.5 rounded-2xl border',
        disabled ? 'border-slate-100 bg-slate-50/80 opacity-70' : 'border-slate-100 bg-white',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 text-sm">{title}</p>
        {disabled && disabledHint ? (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{disabledHint}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={title}
        disabled={disabled || saving}
        onClick={onToggle}
        className={cn(
          'w-14 h-8 rounded-full transition-all duration-300 relative shrink-0 mt-0.5',
          visible ? 'bg-blue-600' : 'bg-slate-300',
          (disabled || saving) && 'opacity-60 cursor-not-allowed',
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
  const keys = CIRCLE_DASHBOARD_WIDGET_SECTIONS[section];

  return (
    <section className="space-y-2">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
        {t(DASHBOARD_LAYOUT_SECTION_TITLE_KEYS[section])}
      </h4>
      <div className="space-y-2">
        {keys.map((key) => {
          const available = isCircleDashboardWidgetAvailable(key, patient.capabilities);
          const visible = available && !hiddenWidgets.has(key);
          return (
            <DashboardWidgetToggle
              key={key}
              title={t(DASHBOARD_WIDGET_TITLE_KEYS[key])}
              visible={visible}
              disabled={!available}
              disabledHint={!available ? t('settings.dashboardWidgetUnavailable') : undefined}
              saving={saving}
              onToggle={() => onToggle(key, !visible)}
            />
          );
        })}
      </div>
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
  const { hiddenWidgets, loading, setWidgetVisible, resetToRoleDefaults } =
    useCircleDashboardLayout(
      db,
      patient?.patientId,
      user.uid,
      memberRole,
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
      setError(t('settings.dashboardCustomizeSaveFailed'));
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
      setError(t('settings.dashboardCustomizeSaveFailed'));
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
        {t('settings.dashboardCustomizeMandatoryHint')}
      </p>

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
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
