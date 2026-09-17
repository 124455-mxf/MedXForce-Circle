import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  getBrowserTimeZone,
  getCircleUserProfile,
  isValidIanaTimeZone,
  saveCircleUserProfile,
} from '@medxforce/shared';

/** Persist the device time zone the first time a Circle member has none saved. */
export async function hydrateCircleMemberTimeZone(
  db: Firestore,
  user: User,
): Promise<string> {
  const browserZone = getBrowserTimeZone();
  try {
    const profile = await getCircleUserProfile(db, user.uid);
    if (isValidIanaTimeZone(profile?.timezoneId)) {
      return profile.timezoneId.trim();
    }
    await saveCircleUserProfile(db, user.uid, {
      timezoneId: browserZone,
      ...(user.email?.trim() ? { email: user.email.trim() } : {}),
      ...(user.displayName?.trim() ? { displayName: user.displayName.trim() } : {}),
    });
  } catch (err) {
    console.warn('[Circle] Could not persist member time zone —', err);
  }
  return browserZone;
}
