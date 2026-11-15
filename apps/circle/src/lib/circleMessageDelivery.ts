import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  DEFAULT_CIRCLE_MESSAGE_DELIVERY,
  type CircleMessageDeliveryPreference,
} from '@medxforce/shared';

export function parseMessageDeliveryPreference(
  value: unknown,
): CircleMessageDeliveryPreference {
  return value === 'email' ? 'email' : DEFAULT_CIRCLE_MESSAGE_DELIVERY;
}

function memberMessagingPrefsRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid, 'prefs', 'messaging');
}

function memberRootRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export async function loadMemberMessageDeliveryPreference(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleMessageDeliveryPreference> {
  const prefsSnap = await getDoc(memberMessagingPrefsRef(db, patientId, memberUid));
  if (prefsSnap.exists()) {
    return parseMessageDeliveryPreference(prefsSnap.data()?.messageDelivery);
  }
  // Legacy: preference lived on the member root doc.
  const rootSnap = await getDoc(memberRootRef(db, patientId, memberUid));
  return parseMessageDeliveryPreference(rootSnap.data()?.messageDelivery);
}

export async function saveMemberMessageDeliveryPreference(
  db: Firestore,
  patientId: string,
  memberUid: string,
  preference: CircleMessageDeliveryPreference,
): Promise<void> {
  await setDoc(
    memberMessagingPrefsRef(db, patientId, memberUid),
    { messageDelivery: preference, updatedAt: Date.now() },
    { merge: true },
  );
}
