import { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  analyticsSummariesCollection,
  filterSummariesForMember,
  parsePatientAnalyticsSummary,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
} from '@medxforce/shared';

export function useCircleAnalyticsSummaries(
  db: Firestore,
  patient: CirclePatientSummary | null,
) {
  const [summaries, setSummaries] = useState<PatientAnalyticsSummary[]>([]);
  const [totalFromServer, setTotalFromServer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const patientId = patient?.patientId ?? '';
  const role = patient?.role ?? 'friend';
  const capabilities = patient?.capabilities;

  useEffect(() => {
    if (!patientId) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    return onSnapshot(
      analyticsSummariesCollection(db, patientId),
      (snap) => {
        const parsed = snap.docs
          .map((d) => parsePatientAnalyticsSummary(d.id, d.data() as Record<string, unknown>))
          .filter((s): s is PatientAnalyticsSummary => s != null);
        setTotalFromServer(parsed.length);
        setSummaries(
          capabilities
            ? filterSummariesForMember(parsed, role, capabilities)
            : parsed,
        );
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [capabilities, db, patientId, role]);

  const byMetricId = useMemo(() => {
    const map = new Map<string, PatientAnalyticsSummary>();
    for (const s of summaries) {
      map.set(s.metricId, s);
    }
    return map;
  }, [summaries]);

  return { summaries, byMetricId, totalFromServer, loading, error };
}
