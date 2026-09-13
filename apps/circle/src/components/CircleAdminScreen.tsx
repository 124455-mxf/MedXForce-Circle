import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { CircleSettingsUserManagementPanel } from './CircleSettingsUserManagementPanel';
import { CircleWorkTabDashboardBackButton } from './CircleWorkTabSectionIntro';

interface CircleAdminScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  initialUsersTab?: 'people' | 'access' | null;
  onInitialUsersTabConsumed?: () => void;
}

export function CircleAdminScreen({
  user,
  db,
  patient,
  initialUsersTab = null,
  onInitialUsersTabConsumed,
}: CircleAdminScreenProps) {
  const t = useCircleT();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-start gap-2 px-1">
        <CircleWorkTabDashboardBackButton className="-ml-1" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">{t('admin.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t('admin.subtitle')}</p>
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex shrink-0 items-center px-4 py-3.5">
          <h4 className="font-bold text-slate-800">{t('admin.sectionUserManagement')}</h4>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-100">
          <CircleSettingsUserManagementPanel
            user={user}
            db={db}
            patient={patient}
            compact
            initialTab={initialUsersTab ?? undefined}
            onInitialTabConsumed={onInitialUsersTabConsumed}
          />
        </div>
      </section>
    </div>
  );
}
