import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  listCircleInvitesForPatient,
  listPatientManagedContacts,
  normalizeInviteEmail,
} from '@medxforce/shared';

export type CircleMemberDisplayNameMaps = {
  byUid: Record<string, string>;
  byEmail: Record<string, string>;
};

/** Names the patient configured for each Circle member (contacts + accepted invites). */
export function useCirclePatientMemberDisplayNames(
  db: Firestore,
  patientId: string | undefined,
): CircleMemberDisplayNameMaps {
  const [maps, setMaps] = useState<CircleMemberDisplayNameMaps>({ byUid: {}, byEmail: {} });

  useEffect(() => {
    if (!patientId) {
      setMaps({ byUid: {}, byEmail: {} });
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const [invites, contacts] = await Promise.all([
          listCircleInvitesForPatient(db, patientId),
          listPatientManagedContacts(db, patientId),
        ]);
        if (!active) return;

        const nameByEmail = new Map(
          contacts.map((contact) => [
            normalizeInviteEmail(contact.email),
            contact.name?.trim() || '',
          ]),
        );
        const byUid: Record<string, string> = {};
        const byEmail: Record<string, string> = {};

        for (const invite of invites) {
          if (invite.status !== 'accepted' || !invite.acceptedByUid) continue;
          const uid = invite.acceptedByUid.trim();
          const email = normalizeInviteEmail(invite.invitedEmail);
          const fromContact = email ? nameByEmail.get(email) : undefined;
          const name = (fromContact || invite.displayName || '').trim();
          if (!name) continue;
          byUid[uid] = name;
          if (email) byEmail[email] = name;
        }

        setMaps({ byUid, byEmail });
      } catch (err) {
        console.warn('[useCirclePatientMemberDisplayNames] load failed', err);
        if (active) setMaps({ byUid: {}, byEmail: {} });
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [db, patientId]);

  return maps;
}
