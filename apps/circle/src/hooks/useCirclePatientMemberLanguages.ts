import { useEffect, useState } from 'react';
import type { Firestore, QuerySnapshot } from 'firebase/firestore';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  listCircleInvitesForPatient,
  listPatientManagedContacts,
  normalizeInviteEmail,
  parseMemberContactProfile,
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
): CircleMemberLanguageMaps {
  const [maps, setMaps] = useState<CircleMemberLanguageMaps>({ byUid: {}, byEmail: {} });

  useEffect(() => {
    if (!patientId) {
      setMaps({ byUid: {}, byEmail: {} });
      return;
    }

    let active = true;
    let contactsByEmail = new Map<string, CircleUiLanguage>();
    let emailByUid = new Map<string, string>();
    let contactsReady = false;
    let pendingMembers: QuerySnapshot | null = null;

    const loadContactsAndInvites = async () => {
      const [invites, contacts] = await Promise.all([
        listCircleInvitesForPatient(db, patientId),
        listPatientManagedContacts(db, patientId),
      ]);
      if (!active) return;

      contactsByEmail = new Map(
        contacts.map((contact) => [
          normalizeInviteEmail(contact.email),
          normalizeCircleUiLanguage(contact.language),
        ]),
      );

      emailByUid = new Map();
      for (const invite of invites) {
        if (invite.status !== 'accepted' || !invite.acceptedByUid) continue;
        const uid = invite.acceptedByUid.trim();
        const email = normalizeInviteEmail(invite.invitedEmail);
        if (email) emailByUid.set(uid, email);
      }

      contactsReady = true;
      if (pendingMembers) {
        await rebuildFromMembers(pendingMembers);
      }
    };

    const rebuildFromMembers = async (snap: QuerySnapshot) => {
      const byUid: Record<string, CircleUiLanguage> = {};
      const byEmail: Record<string, CircleUiLanguage> = {};

      for (const [uid, email] of emailByUid) {
        const base = contactsByEmail.get(email) ?? 'English';
        byUid[uid] = base;
        byEmail[email] = base;
      }

      await Promise.all(
        snap.docs.map(async (memberDoc) => {
          const uid = memberDoc.id;
          const data = memberDoc.data() as Record<string, unknown>;
          const profile = parseMemberContactProfile(data);
          const email =
            normalizeInviteEmail(String(data.invitedEmail ?? '')) || emailByUid.get(uid) || '';

          let lang: CircleUiLanguage = email
            ? (contactsByEmail.get(email) ?? 'English')
            : 'English';

          if (profile?.language) {
            lang = normalizeCircleUiLanguage(profile.language);
            const circleSnap = await getDoc(doc(db, 'circle_profiles', uid));
            if (circleSnap.data()?.languageSource === 'circle') {
              const circleLang = circleSnap.data()?.language;
              lang = normalizeCircleUiLanguage(
                typeof circleLang === 'string' ? circleLang : profile.language,
              );
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

    void loadContactsAndInvites();

    const unsub = onSnapshot(collection(db, 'patients', patientId, 'members'), (snap) => {
      pendingMembers = snap;
      void maybeRebuild();
    });

    const interval = window.setInterval(() => {
      void loadContactsAndInvites();
    }, 60_000);

    return () => {
      active = false;
      unsub();
      window.clearInterval(interval);
    };
  }, [db, patientId]);

  return maps;
}
