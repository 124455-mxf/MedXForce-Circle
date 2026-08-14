import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  findManagedContactByEmail,
  getCircleUserProfile,
  listPatientManagedContacts,
  normalizeInviteEmail,
  readMemberContactProfile,
  saveCircleUserProfile,
} from '@medxforce/shared';
import {
  normalizeCircleUiLanguage,
  type CircleUiLanguage,
} from '../lib/circleLanguages';
import { circleUiLanguageKeyForUid } from '../lib/circleSessionStorage';

/**
 * Resolve preferred Circle UI language for a member.
 * Prefer an explicit Circle override; otherwise use the managed-contact language
 * set when the patient/proxy invited them (same source as introduction emails).
 */
export async function resolveCircleUiLanguageForMember(
  db: Firestore,
  user: User,
  patientIds: string[],
): Promise<{ language: CircleUiLanguage; source: 'circle' | 'patient' | 'default' }> {
  const profile = await getCircleUserProfile(db, user.uid);
  if (profile?.languageSource === 'circle' && profile.language?.trim()) {
    return {
      language: normalizeCircleUiLanguage(profile.language),
      source: 'circle',
    };
  }

  const email = normalizeInviteEmail(user.email || '');
  if (email) {
    for (const patientId of patientIds) {
      if (!patientId) continue;
      try {
        const contacts = await listPatientManagedContacts(db, patientId);
        const contact = findManagedContactByEmail(contacts, email);
        const memberProfile = await readMemberContactProfile(db, patientId, user.uid);
        const raw =
          memberProfile?.language?.trim()
          || contact?.language?.trim()
          || '';
        if (raw) {
          return {
            language: normalizeCircleUiLanguage(raw),
            source: 'patient',
          };
        }
      } catch (err) {
        console.warn('[Circle] Contact language lookup skipped —', patientId, err);
      }
    }
  }

  if (profile?.language?.trim()) {
    return {
      language: normalizeCircleUiLanguage(profile.language),
      source: profile.languageSource === 'circle' ? 'circle' : 'patient',
    };
  }

  return { language: 'English', source: 'default' };
}

/**
 * Apply contact/invite language to the Circle UI when the member has not chosen
 * an explicit Circle override yet. Persists to circle_profiles so later sessions
 * and welcome email dispatch see the same language.
 */
export async function hydrateCircleUiLanguageFromContacts(
  db: Firestore,
  user: User,
  patientIds: string[],
  setLanguage: (language: CircleUiLanguage) => void,
): Promise<CircleUiLanguage> {
  const resolved = await resolveCircleUiLanguageForMember(db, user, patientIds);
  setLanguage(resolved.language);

  try {
    localStorage.setItem(circleUiLanguageKeyForUid(user.uid), resolved.language);
  } catch {
    /* ignore */
  }

  if (resolved.source !== 'default') {
    const profile = await getCircleUserProfile(db, user.uid);
    const already =
      profile?.languageSource === 'circle'
      || (
        normalizeCircleUiLanguage(profile?.language) === resolved.language
        && Boolean(profile?.language?.trim())
      );
    if (!already || profile?.languageSource !== resolved.source) {
      // Never overwrite an explicit Circle My-contact choice.
      if (profile?.languageSource !== 'circle') {
        await saveCircleUserProfile(db, user.uid, {
          language: resolved.language,
          languageSource: resolved.source === 'circle' ? 'circle' : 'patient',
          email: user.email || undefined,
          displayName: user.displayName || undefined,
        });
      }
    }
  }

  return resolved.language;
}

/** Contact language for one patient — used for welcome email localization. */
export async function resolveContactLanguageForPatient(
  db: Firestore,
  patientId: string,
  memberUid: string,
  memberEmail: string,
): Promise<string | undefined> {
  const email = normalizeInviteEmail(memberEmail);
  if (!email || !patientId) return undefined;
  try {
    const contacts = await listPatientManagedContacts(db, patientId);
    const contact = findManagedContactByEmail(contacts, email);
    const memberProfile = await readMemberContactProfile(db, patientId, memberUid);
    const raw =
      memberProfile?.language?.trim()
      || contact?.language?.trim()
      || '';
    return raw || undefined;
  } catch (err) {
    console.warn('[Circle] Welcome contact language lookup skipped —', patientId, err);
    return undefined;
  }
}
