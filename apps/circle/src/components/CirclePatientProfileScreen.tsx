import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CirclePatientProfilePanel } from './CirclePatientProfilePanel';
import { CircleWorkTabDashboardBackButton } from './CircleWorkTabSectionIntro';

interface CirclePatientProfileScreenProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  patient: CirclePatientSummary;
}

export function CirclePatientProfileScreen({
  user,
  db,
  storage,
  patient,
}: CirclePatientProfileScreenProps) {
  return (
    <div className="space-y-4">
      <CircleWorkTabDashboardBackButton className="px-1 -ml-1" />
      <CirclePatientProfilePanel user={user} db={db} storage={storage} patient={patient} />
    </div>
  );
}
