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

export async function loadMemberMessageDeliveryPreference(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleMessageDeliveryPreference> {
  const snap = await getDoc(doc(db, 'patients', patientId, 'members', memberUid));
  return parseMessageDeliveryPreference(snap.data()?.messageDelivery);
}

export async function saveMemberMessageDeliveryPreference(
  db: Firestore,
  patientId: string,
  memberUid: string,
  preference: CircleMessageDeliveryPreference,
): Promise<void> {
  await setDoc(
    doc(db, 'patients', patientId, 'members', memberUid),
    { messageDelivery: preference, updatedAt: Date.now() },
    { merge: true },
  );
}
