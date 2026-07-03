import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { CircleCollapsibleSection } from './CircleCollapsibleSection';
import { CircleSettingsUserManagementPanel } from './CircleSettingsUserManagementPanel';
import { CircleWorkTabDashboardBackButton } from './CircleWorkTabSectionIntro';

interface CircleAdminScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

export function CircleAdminScreen({ user, db, patient }: CircleAdminScreenProps) {
  const t = useCircleT();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 px-1">
        <CircleWorkTabDashboardBackButton className="-ml-1" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">{t('admin.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t('admin.subtitle')}</p>
        </div>
      </div>

      <CircleCollapsibleSection title={t('admin.sectionUserManagement')}>
        <CircleSettingsUserManagementPanel user={user} db={db} patient={patient} compact />
      </CircleCollapsibleSection>
    </div>
  );
}
