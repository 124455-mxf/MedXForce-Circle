import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  listCircleInvitesForPatient,
  listPatientManagedContacts,
  normalizeInviteEmail,
  parseMemberContactProfile,
  parsePatientManagedContacts,
} from '@medxforce/shared';

export type CircleMemberDisplayNameMaps = {
  byUid: Record<string, string>;
  byEmail: Record<string, string>;
};

/** Names for Circle members: patient-managed contact, overridden by member self-service profile. */
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
    let latestContacts: Awaited<ReturnType<typeof listPatientManagedContacts>> = [];
    let latestInvites: Awaited<ReturnType<typeof listCircleInvitesForPatient>> = [];
    let profileByEmail = new Map<string, string>();

    const rebuild = () => {
      if (!active) return;

      const nameByEmail = new Map(
        latestContacts.map((contact) => [
          normalizeInviteEmail(contact.email),
          contact.name?.trim() || '',
        ]),
      );

      for (const [email, name] of profileByEmail) {
        if (name) nameByEmail.set(email, name);
      }

      const byUid: Record<string, string> = {};
      const byEmail: Record<string, string> = {};

      for (const invite of latestInvites) {
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
    };

    const loadStatic = async () => {
      try {
        const [invites, contacts] = await Promise.all([
          listCircleInvitesForPatient(db, patientId),
          listPatientManagedContacts(db, patientId),
        ]);
        if (!active) return;
        latestInvites = invites;
        latestContacts = contacts;
        rebuild();
      } catch (err) {
        console.warn('[useCirclePatientMemberDisplayNames] load failed', err);
        if (active) setMaps({ byUid: {}, byEmail: {} });
      }
    };

    void loadStatic();

    const unsubPatient = onSnapshot(doc(db, 'patients', patientId), (snap) => {
      if (!snap.exists()) return;
      latestContacts = parsePatientManagedContacts(snap.data() as Record<string, unknown>);
      rebuild();
    });

    const unsubMembers = onSnapshot(
      collection(db, 'patients', patientId, 'members'),
      (snap) => {
        const next = new Map<string, string>();
        snap.forEach((memberDoc) => {
          const data = memberDoc.data() as Record<string, unknown>;
          const email = normalizeInviteEmail(String(data.invitedEmail ?? ''));
          if (!email) return;
          const profile = parseMemberContactProfile(data);
          if (profile?.name) next.set(email, profile.name);
        });
        profileByEmail = next;
        rebuild();
      },
      (err) => {
        console.warn('[useCirclePatientMemberDisplayNames] members listener', err);
      },
    );

    return () => {
      active = false;
      unsubPatient();
      unsubMembers();
    };
  }, [db, patientId]);

  return maps;
}
