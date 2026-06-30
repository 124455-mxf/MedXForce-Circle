/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useState } from 'react';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import {
  buildCareCalendarAttendeeOptions,
  enrichCareCalendarAttendeeOptionsWithPhotos,
  resolveCareCalendarPatientAttendee,
  type CareCalendarAttendeeOption,
} from '@medxforce/shared';
import {
  loadCircleMapPhotosByContactId,
  loadCircleMapPhotosByEmail,
} from '../lib/circleMapPhotos';

export function useCareCalendarAttendeeOptions(
  db: Firestore | undefined,
  patientId: string | undefined,
): CareCalendarAttendeeOption[] {
  const [options, setOptions] = useState<CareCalendarAttendeeOption[]>([]);

  useEffect(() => {
    if (!db || !patientId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const snap = await getDoc(doc(db, 'patients', patientId));
      if (cancelled || !snap.exists()) {
        if (!cancelled) setOptions([]);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      const preferences =
        data.preferences && typeof data.preferences === 'object'
          ? (data.preferences as Record<string, unknown>)
          : undefined;

      const patient = resolveCareCalendarPatientAttendee({
        patientId,
        profileSnapshot: data.profileSnapshot,
        photoUrl: data.photoUrl,
        preferences,
        displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
      });

      const base = buildCareCalendarAttendeeOptions({
        caregivers: Array.isArray(data.caregivers)
          ? (data.caregivers as Record<string, unknown>[])
          : [],
        friendsAndFamily: Array.isArray(data.friendsAndFamily)
          ? (data.friendsAndFamily as Record<string, unknown>[])
          : [],
        patient,
      });

      const [photosByEmail, photosByContactId] = await Promise.all([
        loadCircleMapPhotosByEmail(db, patientId),
        loadCircleMapPhotosByContactId(db, patientId),
      ]);

      if (!cancelled) {
        setOptions(
          enrichCareCalendarAttendeeOptionsWithPhotos(base, photosByContactId, photosByEmail),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, patientId]);

  return options;
}
