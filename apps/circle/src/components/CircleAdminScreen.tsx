import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CircleCollapsibleSection } from './CircleCollapsibleSection';
import { CirclePatientProfilePanel } from './CirclePatientProfilePanel';
import { CircleSettingsUserManagementPanel } from './CircleSettingsUserManagementPanel';

interface CircleAdminScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

export function CircleAdminScreen({ user, db, patient }: CircleAdminScreenProps) {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h3 className="font-bold text-slate-800">Admin</h3>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          Patient profile and circle management
        </p>
      </div>

      <CircleCollapsibleSection title="Patient profile">
        <CirclePatientProfilePanel user={user} db={db} patient={patient} compact />
      </CircleCollapsibleSection>

      <CircleCollapsibleSection title="User management">
        <CircleSettingsUserManagementPanel user={user} db={db} patient={patient} compact />
      </CircleCollapsibleSection>
    </div>
  );
}
