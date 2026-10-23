import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { UserRound } from 'lucide-react';
import { circleDisplayFirstName, type CirclePatientSummary } from '@medxforce/shared';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { useCircleT } from '../lib/circleI18nContext';
import {
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionHeaderStackClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { cn } from '../lib/utils';
import { CircleCareTransitionReadinessPanel } from './CircleCareTransitionReadinessPanel';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';
import { CirclePatientProfilePanel } from './CirclePatientProfilePanel';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';

interface CirclePatientProfileScreenProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  patient: CirclePatientSummary;
  onOpenCircleHelp?: () => void;
  onOpenRemoteSettingsApplicationMode?: () => void;
}

export function CirclePatientProfileScreen({
  user,
  db,
  storage,
  patient,
  onOpenCircleHelp,
  onOpenRemoteSettingsApplicationMode,
}: CirclePatientProfileScreenProps) {
  const compactChrome = useCircleCompactChrome();
  const t = useCircleT();
  const [careTransitionOpen, setCareTransitionOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass)}>
          <CircleWorkTabSectionIntro
            icon={UserRound}
            iconClassName="text-slate-600"
            title={t('nav.patientProfile')}
            subtitle={t('admin.profile.hint')}
          />
        </div>

        <div className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass, 'space-y-5 pb-6')}>
          <CirclePatientProfilePanel
            user={user}
            db={db}
            storage={storage}
            patient={patient}
            embedded
            onOpenCircleHelp={onOpenCircleHelp}
            onOpenCareTransition={() => setCareTransitionOpen(true)}
            onOpenRemoteSettingsApplicationMode={onOpenRemoteSettingsApplicationMode}
          />
        </div>
      </div>

      <CircleMessageExpandOverlay
        open={careTransitionOpen}
        title={t('careTransition.title')}
        subtitle={t('careTransition.subtitle', {
          name: circleDisplayFirstName(patient.displayName, patient.firstName),
        })}
        onClose={() => setCareTransitionOpen(false)}
        t={t}
      >
        <CircleCareTransitionReadinessPanel
          user={user}
          db={db}
          patient={patient}
          hideHeader
          showCircleHelp={false}
        />
      </CircleMessageExpandOverlay>
    </div>
  );
}
