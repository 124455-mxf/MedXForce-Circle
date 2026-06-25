import { useEffect, useRef, useState } from 'react';
import type { Firestore, QuerySnapshot } from 'firebase/firestore';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  listPatientManagedContacts,
  normalizeInviteEmail,
  parseMemberContactProfile,
  repairInactiveAcceptedMemberDocsForUser,
  repairOrphanAcceptedInvitesForUser,
} from '@medxforce/shared';
import { normalizeCircleUiLanguage, type CircleUiLanguage } from '../lib/circleLanguages';

export type CircleMemberLanguageMaps = {
  byUid: Record<string, CircleUiLanguage>;
  byEmail: Record<string, CircleUiLanguage>;
};

/** Preferred languages for each Circle member (patient contact card + member self-service overrides). */
export function useCirclePatientMemberLanguages(
  db: Firestore,
  patientId: string | undefined,
  userId?: string,
): CircleMemberLanguageMaps {
  const [maps, setMaps] = useState<CircleMemberLanguageMaps>({ byUid: {}, byEmail: {} });
  const [listenerKey, setListenerKey] = useState(0);
  const repairAttemptedRef = useRef(false);

  useEffect(() => {
    repairAttemptedRef.current = false;
  }, [patientId, userId]);

  useEffect(() => {
    if (!patientId) {
      setMaps({ byUid: {}, byEmail: {} });
      return;
    }

    let active = true;
    let contactsByEmail = new Map<string, CircleUiLanguage>();
    let contactsReady = false;
    let pendingMembers: QuerySnapshot | null = null;

    const loadContacts = async () => {
      try {
        const contacts = await listPatientManagedContacts(db, patientId);
        if (!active) return;

        contactsByEmail = new Map(
          contacts.map((contact) => [
            normalizeInviteEmail(contact.email),
            normalizeCircleUiLanguage(contact.language),
          ]),
        );

        contactsReady = true;
        if (pendingMembers) {
          await rebuildFromMembers(pendingMembers);
        }
      } catch (err) {
        console.warn('[useCirclePatientMemberLanguages] contacts load failed', err);
      }
    };

    const rebuildFromMembers = async (snap: QuerySnapshot) => {
      const byUid: Record<string, CircleUiLanguage> = {};
      const byEmail: Record<string, CircleUiLanguage> = {};

      await Promise.all(
        snap.docs.map(async (memberDoc) => {
          const uid = memberDoc.id;
          const data = memberDoc.data() as Record<string, unknown>;
          const profile = parseMemberContactProfile(data);
          const email = normalizeInviteEmail(String(data.invitedEmail ?? ''));

          let lang: CircleUiLanguage = email
            ? (contactsByEmail.get(email) ?? 'English')
            : 'English';

          if (profile?.language) {
            lang = normalizeCircleUiLanguage(profile.language);
            try {
              const circleSnap = await getDoc(doc(db, 'circle_profiles', uid));
              if (circleSnap.data()?.languageSource === 'circle') {
                const circleLang = circleSnap.data()?.language;
                lang = normalizeCircleUiLanguage(
                  typeof circleLang === 'string' ? circleLang : profile.language,
                );
              }
            } catch (err) {
              console.warn('[useCirclePatientMemberLanguages] circle_profiles read failed', err);
            }
          }

          byUid[uid] = lang;
          if (email) byEmail[email] = lang;
        }),
      );

      if (active) setMaps({ byUid, byEmail });
    };

    const maybeRebuild = async () => {
      if (!contactsReady || !pendingMembers) return;
      await rebuildFromMembers(pendingMembers);
    };

    void loadContacts();

    const unsub = onSnapshot(
      collection(db, 'patients', patientId, 'members'),
      (snap) => {
        pendingMembers = snap;
        void maybeRebuild();
      },
      (err) => {
        console.warn('[useCirclePatientMemberLanguages] members listener', err);
        const code = (err as { code?: string }).code;
        if (
          userId
          && code === 'permission-denied'
          && !repairAttemptedRef.current
        ) {
          repairAttemptedRef.current = true;
          void (async () => {
            await repairOrphanAcceptedInvitesForUser(db, userId);
            await repairInactiveAcceptedMemberDocsForUser(db, userId);
            if (active) setListenerKey((key) => key + 1);
          })();
        }
      },
    );

    const interval = window.setInterval(() => {
      void loadContacts();
    }, 60_000);

    return () => {
      active = false;
      unsub();
      window.clearInterval(interval);
    };
  }, [db, patientId, userId, listenerKey]);

  return maps;
}
