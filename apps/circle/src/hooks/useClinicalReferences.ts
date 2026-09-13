/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { ClinicalReference } from '@medxforce/shared';
import { subscribeClinicalReferences } from '../services/clinicalReferenceService';

export function useClinicalReferences(db: Firestore | undefined, patientId: string | undefined) {
  const [references, setReferences] = useState<ClinicalReference[]>([]);
  const [loading, setLoading] = useState(!!(db && patientId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !patientId) {
      setReferences([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const unsub = subscribeClinicalReferences(
      db,
      patientId,
      (next) => {
        setReferences(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [db, patientId]);

  return { references, loading, error };
}
