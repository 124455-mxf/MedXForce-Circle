import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CircleCollapsibleSection } from './CircleCollapsibleSection';
import { CirclePatientProfilePanel } from './CirclePatientProfilePanel';
import { CircleSettingsUserManagementPanel } from './CircleSettingsUserManagementPanel';
import { CircleWorkTabDashboardBackButton } from './CircleWorkTabSectionIntro';

interface CircleAdminScreenProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  patient: CirclePatientSummary;
}

export function CircleAdminScreen({ user, db, storage, patient }: CircleAdminScreenProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 px-1">
        <CircleWorkTabDashboardBackButton className="-ml-1" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">Admin</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Patient profile and circle management
          </p>
        </div>
      </div>

      <CircleCollapsibleSection title="Patient profile">
        <CirclePatientProfilePanel user={user} db={db} storage={storage} patient={patient} compact />
      </CircleCollapsibleSection>

      <CircleCollapsibleSection title="User management">
        <CircleSettingsUserManagementPanel user={user} db={db} patient={patient} compact />
      </CircleCollapsibleSection>
    </div>
  );
}
