import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, type Firestore, type QuerySnapshot } from 'firebase/firestore';
import {
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
    let profileByEmail = new Map<string, string>();
    let pendingMembers: QuerySnapshot | null = null;

    const rebuild = (memberSnap?: QuerySnapshot) => {
      if (memberSnap) pendingMembers = memberSnap;
      const snap = memberSnap ?? pendingMembers;
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

      if (snap) {
        snap.forEach((memberDoc) => {
          const uid = memberDoc.id;
          const data = memberDoc.data() as Record<string, unknown>;
          const email = normalizeInviteEmail(String(data.invitedEmail ?? ''));
          const profile = parseMemberContactProfile(data);
          const fromContact = email ? nameByEmail.get(email) : undefined;
          const name = (
            profile?.name ||
            fromContact ||
            (typeof data.displayName === 'string' ? data.displayName : '')
          ).trim();
          if (!name) return;
          byUid[uid] = name;
          if (email) byEmail[email] = name;
        });
      }

      setMaps({ byUid, byEmail });
    };

    const loadStatic = async () => {
      try {
        const contacts = await listPatientManagedContacts(db, patientId);
        if (!active) return;
        latestContacts = contacts;
        rebuild();
      } catch (err) {
        console.warn('[useCirclePatientMemberDisplayNames] load failed', err);
        if (active) setMaps({ byUid: {}, byEmail: {} });
      }
    };

    void loadStatic();

    const unsubPatient = onSnapshot(
      doc(db, 'patients', patientId),
      (snap) => {
        if (!snap.exists()) return;
        latestContacts = parsePatientManagedContacts(snap.data() as Record<string, unknown>);
        rebuild();
      },
      (err) => {
        console.warn('[useCirclePatientMemberDisplayNames] patient listener', err);
      },
    );

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
        rebuild(snap);
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
