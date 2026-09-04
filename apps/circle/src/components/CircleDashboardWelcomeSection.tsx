import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleMemberOnboarding } from '../hooks/useCircleMemberOnboarding';
import { useCircleInitiateMessagesNotice } from '../hooks/useCircleInitiateMessagesNotice';
import { useCircleRemoteSettingsFromShell } from '../context/CircleSelectedPatientContext';
import { CircleOnboardingWelcomeCard } from './CircleOnboardingWelcomeCard';
import { CircleInitiateMessagesWelcomeCard } from './CircleInitiateMessagesWelcomeCard';

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
  const { settings } = useCircleRemoteSettingsFromShell();
  const { showWelcome, dismissWelcome, dismissing } = useCircleMemberOnboarding(
    db,
    patient.patientId,
    user.uid,
    onboardingEnabled,
  );
  const {
    showNotice: showInitiateNotice,
    dismissNotice,
    dismissing: initiateDismissing,
  } = useCircleInitiateMessagesNotice(
    db,
    patient.patientId,
    user.uid,
    patient.role,
    settings,
    onboardingEnabled,
  );

  if (!showWelcome && !showInitiateNotice) return null;

  return (
    <div className="space-y-3">
      {showWelcome ? (
        <CircleOnboardingWelcomeCard
          patient={patient}
          variant="dashboard"
          onDismiss={() => void dismissWelcome()}
          dismissing={dismissing}
        />
      ) : null}
      {showInitiateNotice ? (
        <CircleInitiateMessagesWelcomeCard
          patient={patient}
          onDismiss={() => void dismissNotice()}
          dismissing={initiateDismissing}
        />
      ) : null}
    </div>
  );
}
