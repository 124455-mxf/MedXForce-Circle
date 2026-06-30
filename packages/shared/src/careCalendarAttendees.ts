/** @license SPDX-License-Identifier: Apache-2.0 */
import { circleRoleFromContact, proxyTierFromContact } from './circleMemberRoles';
import { normalizeInviteEmail } from './patientPermissions';
import { parseCircleProfileSnapshot } from './circlePatientProfile';
import { resolveCirclePatientPhotoUrl } from './circlePatients';
import type { CareCalendarAttendee, CareCalendarAttendeeRole } from './careCalendar';

const APPOINTMENT_ATTENDEE_ROLES = new Set<CareCalendarAttendeeRole>([
  'proxy',
  'caregiver',
  'family',
  'patient',
]);

export type CareCalendarAttendeeOption = CareCalendarAttendee & {
  email?: string;
  avatarUrl?: string;
  group: 'patient' | 'caregivers' | 'family';
};

function toAttendeeRole(role: string): CareCalendarAttendeeRole {
  if (role === 'proxy') return 'proxy';
  if (role === 'caregiver') return 'caregiver';
  if (role === 'family') return 'family';
  if (role === 'friend') return 'friend';
  if (role === 'patient') return 'patient';
  return 'other';
}

function contactEmail(contact: Record<string, unknown>): string | undefined {
  const email = String(contact.email || contact.emailVerify || '').trim();
  return email || undefined;
}

export type CareCalendarPatientAttendeeSource = {
  patientId: string;
  profileSnapshot?: unknown;
  photoUrl?: unknown;
  preferences?: Record<string, unknown>;
  displayName?: string;
};

export function resolveCareCalendarPatientAttendee(
  source: CareCalendarPatientAttendeeSource,
): CareCalendarAttendeeOption | null {
  const patientId = String(source.patientId || '').trim();
  if (!patientId) return null;

  const snapshot = source.profileSnapshot
    ? parseCircleProfileSnapshot(source.profileSnapshot)
    : null;

  let name = '';
  if (snapshot) {
    const nick = snapshot.identity.nickName?.trim();
    const first = snapshot.identity.firstName?.trim();
    const last = snapshot.identity.lastName?.trim();
    name = nick || [first, last].filter(Boolean).join(' ').trim();
  }
  if (!name && source.preferences) {
    name = String(source.preferences.userName || '').trim();
  }
  if (!name) {
    name = String(source.displayName || '').trim();
  }
  if (!name) name = 'Patient';

  const email = snapshot?.identity.email?.trim() || undefined;
  const avatarUrl = resolveCirclePatientPhotoUrl(
    snapshot?.identity.profilePicture,
    typeof source.photoUrl === 'string' ? source.photoUrl : undefined,
  );

  return {
    contactId: patientId,
    name,
    role: 'patient',
    group: 'patient',
    ...(email ? { email } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

export function buildCareCalendarAttendeeOptions(patientData: {
  caregivers?: Record<string, unknown>[];
  friendsAndFamily?: Record<string, unknown>[];
  patient?: CareCalendarAttendeeOption | null;
}): CareCalendarAttendeeOption[] {
  const options: CareCalendarAttendeeOption[] = [];
  const seen = new Set<string>();

  if (patientData.patient) {
    options.push(patientData.patient);
    seen.add(patientData.patient.contactId);
  }

  for (const contact of [
    ...(patientData.caregivers || []),
    ...(patientData.friendsAndFamily || []),
  ]) {
    const contactId = String(contact.id || '').trim();
    const name = String(contact.name || '').trim();
    if (!contactId || !name || seen.has(contactId)) continue;

    const role = toAttendeeRole(circleRoleFromContact(contact));
    if (!APPOINTMENT_ATTENDEE_ROLES.has(role)) continue;

    seen.add(contactId);
    const proxyTier = role === 'proxy' ? proxyTierFromContact(contact) ?? undefined : undefined;
    const email = contactEmail(contact);
    const avatarUrl =
      typeof contact.avatarUrl === 'string' && contact.avatarUrl.trim()
        ? contact.avatarUrl.trim()
        : undefined;

    options.push({
      contactId,
      name,
      role,
      group: role === 'family' ? 'family' : 'caregivers',
      ...(email ? { email } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(proxyTier ? { proxyTier } : {}),
    });
  }

  const patient = patientData.patient;
  const others = options
    .filter((option) => option.group !== 'patient')
    .sort((a, b) => a.name.localeCompare(b.name));

  return patient ? [patient, ...others] : others;
}

export function filterCareCalendarAttendeeOptions(
  options: CareCalendarAttendeeOption[],
  query: string,
): CareCalendarAttendeeOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) => {
    const name = option.name.toLowerCase();
    const email = String(option.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });
}

export function sanitizeCareCalendarAttendees(attendees: CareCalendarAttendee[]): CareCalendarAttendee[] {
  return attendees.filter((a) => APPOINTMENT_ATTENDEE_ROLES.has(a.role));
}

export function attendeeFromCareCalendarOption(
  option: CareCalendarAttendeeOption,
): CareCalendarAttendee {
  return {
    contactId: option.contactId,
    name: option.name,
    role: option.role,
    ...(option.proxyTier ? { proxyTier: option.proxyTier } : {}),
  };
}

/** Default invitees when a Circle member creates a new appointment. */
export function defaultNewCircleCareCalendarAttendees(
  options: CareCalendarAttendeeOption[],
  organizerContactId?: string,
): CareCalendarAttendee[] {
  const attendees: CareCalendarAttendee[] = [];
  const seen = new Set<string>();

  const add = (option: CareCalendarAttendeeOption | undefined) => {
    if (!option || seen.has(option.contactId)) return;
    seen.add(option.contactId);
    attendees.push(attendeeFromCareCalendarOption(option));
  };

  add(options.find((option) => option.role === 'patient'));

  if (organizerContactId) {
    add(options.find((option) => option.contactId === organizerContactId));
  }

  return attendees;
}

export function enrichCareCalendarAttendeeOptionsWithPhotos(
  options: CareCalendarAttendeeOption[],
  photosByContactId: Record<string, string>,
  photosByEmail: Record<string, string>,
): CareCalendarAttendeeOption[] {
  return options.map((option) => ({
    ...option,
    avatarUrl:
      option.avatarUrl
      || photosByContactId[option.contactId]
      || (option.email ? photosByEmail[normalizeInviteEmail(option.email)] : undefined),
  }));
}

export function formatCareCalendarAttendeeSummary(
  attendees: CareCalendarAttendee[],
  options?: { excludePatient?: boolean },
): string {
  const list = options?.excludePatient
    ? attendees.filter((attendee) => attendee.role !== 'patient')
    : attendees;
  if (!list.length) return '';
  return list.map((attendee) => attendee.name).join(', ');
}

export function careCalendarAttendeeRoleLabelKey(role: CareCalendarAttendeeRole): string {
  if (role === 'patient') return 'circleRoles.patient';
  return `circleRoles.${role === 'other' ? 'caregiver' : role}`;
}
