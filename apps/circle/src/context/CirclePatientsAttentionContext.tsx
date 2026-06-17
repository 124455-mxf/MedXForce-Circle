import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CirclePatientAttentionMonitor } from '../components/CirclePatientAttentionMonitor';
import {
  summarizeOtherPatientsAttention,
  type CirclePatientAttentionBadge,
} from '../lib/circlePatientAttentionBadge';

type CirclePatientsAttentionContextValue = {
  badgesByPatientId: Record<string, CirclePatientAttentionBadge>;
  otherPatientsSummary: ReturnType<typeof summarizeOtherPatientsAttention>;
};

const CirclePatientsAttentionContext = createContext<CirclePatientsAttentionContextValue>({
  badgesByPatientId: {},
  otherPatientsSummary: { totalUnread: 0, hasUrgentAlert: false, patientCount: 0 },
});

export function CirclePatientsAttentionProvider({
  db,
  user,
  patients,
  selectedPatientId,
  children,
}: {
  db: Firestore;
  user: User;
  patients: CirclePatientSummary[];
  selectedPatientId: string | null;
  children: ReactNode;
}) {
  const [badgesByPatientId, setBadgesByPatientId] = useState<
    Record<string, CirclePatientAttentionBadge>
  >({});

  const handleBadge = useCallback((patientId: string, badge: CirclePatientAttentionBadge) => {
    setBadgesByPatientId((prev) => {
      const existing = prev[patientId];
      if (
        existing &&
        existing.totalUnread === badge.totalUnread &&
        existing.hasUrgentAlert === badge.hasUrgentAlert
      ) {
        return prev;
      }
      return { ...prev, [patientId]: badge };
    });
  }, []);

  useEffect(() => {
    const activeIds = new Set(patients.map((p) => p.patientId));
    setBadgesByPatientId((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => activeIds.has(id)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [patients]);

  const backgroundPatients = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.patientId !== selectedPatientId &&
          !p.isPendingProvision &&
          p.provisionStatus !== 'pending',
      ),
    [patients, selectedPatientId],
  );

  const otherPatientsSummary = useMemo(
    () => summarizeOtherPatientsAttention(badgesByPatientId, selectedPatientId),
    [badgesByPatientId, selectedPatientId],
  );

  const value = useMemo(
    () => ({ badgesByPatientId, otherPatientsSummary }),
    [badgesByPatientId, otherPatientsSummary],
  );

  return (
    <CirclePatientsAttentionContext.Provider value={value}>
      {backgroundPatients.map((patient) => (
        <CirclePatientAttentionMonitor
          key={patient.patientId}
          db={db}
          user={user}
          patient={patient}
          onBadge={handleBadge}
        />
      ))}
      {children}
    </CirclePatientsAttentionContext.Provider>
  );
}

export function useCirclePatientsAttention() {
  return useContext(CirclePatientsAttentionContext);
}
