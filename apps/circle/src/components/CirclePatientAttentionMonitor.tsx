import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { usePatientAttentionBadge } from '../hooks/usePatientAttentionBadge';
import type { CirclePatientAttentionBadge } from '../lib/circlePatientAttentionBadge';

interface CirclePatientAttentionMonitorProps {
  db: Firestore;
  user: User;
  patient: CirclePatientSummary;
  onBadge: (patientId: string, badge: CirclePatientAttentionBadge) => void;
}

/** Invisible listener — tracks unread / alert counts for one background patient. */
export function CirclePatientAttentionMonitor({
  db,
  user,
  patient,
  onBadge,
}: CirclePatientAttentionMonitorProps) {
  const badge = usePatientAttentionBadge(db, user, patient);

  useEffect(() => {
    onBadge(patient.patientId, badge);
  }, [badge, onBadge, patient.patientId]);

  return null;
}
