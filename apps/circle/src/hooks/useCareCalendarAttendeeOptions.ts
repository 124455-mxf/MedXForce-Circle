/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore';
import {
  buildCareCalendarAttendeeOptions,
  composeContactDisplayName,
  enrichCareCalendarAttendeeOptionsWithPhotos,
  normalizeInviteEmail,
  parseMemberContactProfile,
  resolveCareCalendarPatientAttendee,
  type CareCalendarAttendeeOption,
  type CircleMemberContactProfile,
} from '@medxforce/shared';
import { loadCircleMapPhotoMaps } from '../lib/circleMapPhotos';

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

      const profileByEmail = new Map<string, CircleMemberContactProfile>();
      try {
        const membersSnap = await getDocs(collection(db, 'patients', patientId, 'members'));
        await Promise.all(
          membersSnap.docs.map(async (memberDoc) => {
            if (memberDoc.id.startsWith('contact_')) return;
            const memberData = memberDoc.data() as Record<string, unknown>;
            const email = normalizeInviteEmail(String(memberData.invitedEmail || ''));
            if (!email) return;
            try {
              const prefsSnap = await getDoc(
                doc(db, 'patients', patientId, 'members', memberDoc.id, 'prefs', 'contact'),
              );
              const profile =
                parseMemberContactProfile(
                  prefsSnap.exists()
                    ? (prefsSnap.data() as Record<string, unknown>)
                    : memberData,
                ) ?? parseMemberContactProfile(memberData);
              if (profile) profileByEmail.set(email, profile);
            } catch {
              const profile = parseMemberContactProfile(memberData);
              if (profile) profileByEmail.set(email, profile);
            }
          }),
        );
      } catch {
        /* Patient contact arrays remain the fallback directory. */
      }

      const withLiveNames = base.map((option) => {
        const email = option.email ? normalizeInviteEmail(option.email) : '';
        const profile = email ? profileByEmail.get(email) : undefined;
        if (!profile) return option;
        const name = composeContactDisplayName(profile) || profile.name.trim();
        return name && name !== option.name ? { ...option, name } : option;
      });

      const { byEmail, byContactId } = await loadCircleMapPhotoMaps(db, patientId);

      if (!cancelled) {
        setOptions(
          enrichCareCalendarAttendeeOptionsWithPhotos(withLiveNames, byContactId, byEmail),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, patientId]);

  return options;
}
