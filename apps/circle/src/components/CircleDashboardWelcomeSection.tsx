import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleMemberOnboarding } from '../hooks/useCircleMemberOnboarding';
import { CircleOnboardingWelcomeCard } from './CircleOnboardingWelcomeCard';

export function CircleDashboardWelcomeSection({
  user,
  db,
  patient,
}: {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}) {
  const onboardingEnabled = patient.isPendingProvision !== true;
  const { showWelcome, dismissWelcome, dismissing } = useCircleMemberOnboarding(
    db,
    patient.patientId,
    user.uid,
    onboardingEnabled,
  );

  if (!showWelcome) return null;

  return (
    <CircleOnboardingWelcomeCard
      patient={patient}
      variant="dashboard"
      onDismiss={() => void dismissWelcome()}
      dismissing={dismissing}
    />
  );
}
