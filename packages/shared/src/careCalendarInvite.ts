/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { normalizeInviteEmail, type CircleMemberRole } from './patientPermissions';
import type {
  CareCalendarAttendee,
  CareCalendarAttendeeResponse,
  CareCalendarAttendeeResponseRecord,
  CareCalendarAttendeeResponseSummary,
  CareCalendarEntry,
  CareCalendarEntryKind,
} from './careCalendar';
import { formatCareCalendarTimeRange, isCareCalendarAppointmentPast } from './careCalendar';
import {
  canParticipateInCircleOpenThread,
  circleMemberThreadPostsCollection,
  type CircleMemberThreadPost,
} from './circleMemberThreads';

export type {
  CareCalendarAttendeeResponse,
  CareCalendarAttendeeResponseRecord,
  CareCalendarAttendeeResponseSummary,
} from './careCalendar';

export const APPOINTMENT_INVITE_POST_MARKER = 'Appointment invite —';

export type ParsedAppointmentInvitePost = {
  entryId: string;
  title: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  kind: CareCalendarEntryKind;
  visitSubtype?: string;
  inviteTargetUids: string[];
  inviteeNames: string[];
};

export function attendeeNeedsAppointmentInvite(attendee: CareCalendarAttendee): boolean {
  return attendee.role !== 'patient';
}

export function defaultAttendeeInviteResponse(
  attendee: CareCalendarAttendee,
): CareCalendarAttendeeResponse {
  if (!attendeeNeedsAppointmentInvite(attendee)) return 'accepted';
  return attendee.response ?? 'pending';
}

export function normalizeCareCalendarAttendeesForSave(
  attendees: CareCalendarAttendee[] | undefined,
  previous?: CareCalendarAttendee[],
): CareCalendarAttendee[] | undefined {
  if (!attendees?.length) return undefined;
  const previousByContact = new Map(
    (previous ?? []).map((attendee) => [attendee.contactId, attendee]),
  );
  return attendees.map((attendee) => {
    const prior = previousByContact.get(attendee.contactId);
    if (!attendeeNeedsAppointmentInvite(attendee)) {
      return { ...attendee, response: 'accepted' as const };
    }
    if (prior && prior.name === attendee.name && prior.role === attendee.role) {
      return {
        ...attendee,
        response: prior.response ?? 'pending',
        ...(prior.respondedAt != null ? { respondedAt: prior.respondedAt } : {}),
        ...(prior.respondedByUid ? { respondedByUid: prior.respondedByUid } : {}),
      };
    }
    return { ...attendee, response: 'pending' as const };
  });
}

export function buildAttendeeResponseSummary(
  attendees: CareCalendarAttendee[] | undefined,
): CareCalendarAttendeeResponseSummary | undefined {
  if (!attendees?.length) return undefined;
  const summary: CareCalendarAttendeeResponseSummary = {};
  for (const attendee of attendees) {
    if (
      attendee.response &&
      attendee.response !== 'pending' &&
      attendee.respondedAt != null &&
      attendee.respondedByUid
    ) {
      summary[attendee.contactId] = {
        response: attendee.response,
        respondedAt: attendee.respondedAt,
        respondedByUid: attendee.respondedByUid,
      };
    }
  }
  return Object.keys(summary).length ? summary : undefined;
}

export function parseAttendeeResponseSummary(
  raw: unknown,
): CareCalendarAttendeeResponseSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const summary: CareCalendarAttendeeResponseSummary = {};
  for (const [contactId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const response = row.response === 'accepted' || row.response === 'declined' ? row.response : null;
    const respondedAt = row.respondedAt != null ? Number(row.respondedAt) : null;
    const respondedByUid = row.respondedByUid ? String(row.respondedByUid) : '';
    if (!response || respondedAt == null || !respondedByUid) continue;
    summary[contactId] = { response, respondedAt, respondedByUid };
  }
  return Object.keys(summary).length ? summary : undefined;
}

export function mergeAttendeeResponses(
  attendees: CareCalendarAttendee[] | undefined,
  summary?: CareCalendarAttendeeResponseSummary,
): CareCalendarAttendee[] | undefined {
  if (!attendees?.length) return attendees;
  return attendees.map((attendee) => {
    const fromSummary = summary?.[attendee.contactId];
    if (!fromSummary) return attendee;
    return {
      ...attendee,
      response: fromSummary.response,
      respondedAt: fromSummary.respondedAt,
      respondedByUid: fromSummary.respondedByUid,
    };
  });
}

export function formatAppointmentInvitePostText(params: {
  entryId: string;
  title: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  kind: CareCalendarEntryKind;
  visitSubtype?: string;
  inviteeNames: string[];
}): string {
  const timeLabel = formatCareCalendarTimeRange(params.startTimeMinutes, params.endTimeMinutes);
  const dateLabel = new Date(`${params.startDateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const lines = [
    `${APPOINTMENT_INVITE_POST_MARKER} ${params.title.trim()}`,
    `${dateLabel}${timeLabel ? ` · ${timeLabel}` : ''}`,
    `Type: ${params.kind}${params.visitSubtype ? ` · ${params.visitSubtype}` : ''}`,
  ];
  if (params.inviteeNames.length) {
    lines.push(`Invited: ${params.inviteeNames.join(', ')}`);
  }
  lines.push(`entry:${params.entryId}`);
  return lines.join('\n');
}

export function isAppointmentInviteThreadPost(post: {
  text: string;
  postKind?: string;
}): boolean {
  if (post.postKind === 'appointment_invite') return true;
  return post.text.trimStart().startsWith(APPOINTMENT_INVITE_POST_MARKER);
}

export function parseAppointmentInvitePost(
  post: Pick<CircleMemberThreadPost, 'text' | 'careCalendarEntryId' | 'inviteTargetUids'>,
): ParsedAppointmentInvitePost | null {
  if (!isAppointmentInviteThreadPost(post)) return null;
  const entryId = post.careCalendarEntryId || '';
  if (!entryId) return null;

  const lines = post.text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim());
  const titleLine = lines[0] ?? '';
  const title = titleLine.startsWith(APPOINTMENT_INVITE_POST_MARKER)
    ? titleLine.slice(APPOINTMENT_INVITE_POST_MARKER.length).trim()
    : titleLine;
  const inviteeLine = lines.find((line) => line.startsWith('Invited:'));
  const inviteeNames = inviteeLine
    ? inviteeLine
        .slice('Invited:'.length)
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const typeLine = lines.find((line) => line.startsWith('Type:'));
  const kindToken = typeLine?.split('·')[0]?.replace('Type:', '').trim() || 'doctor';
  const visitSubtype = typeLine?.includes('·')
    ? typeLine.split('·').slice(1).join('·').trim()
    : undefined;

  return {
    entryId,
    title,
    startDateKey: '',
    kind: (['doctor', 'wellness', 'rehab', 'other'].includes(kindToken)
      ? kindToken
      : 'doctor') as CareCalendarEntryKind,
    visitSubtype: visitSubtype || undefined,
    inviteTargetUids: post.inviteTargetUids ?? [],
    inviteeNames,
  };
}

export function inviteTargetsForMember(
  post: Pick<CircleMemberThreadPost, 'inviteTargetUids' | 'authorUid'>,
  memberUid: string,
): boolean {
  if (post.authorUid === memberUid) return false;
  return (post.inviteTargetUids ?? []).includes(memberUid);
}

export function memberInviteContactIds(
  context: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId'
  >,
): string[] {
  return [
    ...new Set(
      [context.contactId, context.memberDocContactId, context.inviteContactId].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
}

function parseInvitedNamesFromAppointmentPostText(text: string): string[] {
  const line = text.split('\n').find((row) => row.startsWith('Invited:'));
  if (!line) return [];
  return line
    .replace('Invited:', '')
    .split(',')
    .map((name) => normalizeContactLabel(name.trim()))
    .filter(Boolean);
}

export function isAppointmentInviteVisibleToMember(
  post: Pick<
    CircleMemberThreadPost,
    'inviteTargetUids' | 'inviteeContactIds' | 'authorUid' | 'postKind' | 'text'
  >,
  memberUid: string,
  inviteContext?: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId' | 'displayName'
  >,
): boolean {
  if (!isAppointmentInviteThreadPost(post)) return true;
  if (post.authorUid === memberUid) return true;
  if ((post.inviteTargetUids ?? []).includes(memberUid)) return true;
  if (inviteContext) {
    const contactIds = memberInviteContactIds(inviteContext);
    if (contactIds.some((id) => (post.inviteeContactIds ?? []).includes(id))) return true;
    const displayName = inviteContext.displayName
      ? normalizeContactLabel(inviteContext.displayName)
      : '';
    if (displayName) {
      const invitedNames = parseInvitedNamesFromAppointmentPostText(post.text);
      if (invitedNames.some((name) => name === displayName)) return true;
    }
  }
  return false;
}

export function buildInviteeContactIds(
  attendees: CareCalendarAttendee[] | undefined | null,
): string[] {
  if (!attendees?.length) return [];
  return [
    ...new Set(
      attendees
        .filter(attendeeNeedsAppointmentInvite)
        .map((attendee) => attendee.contactId)
        .filter((contactId): contactId is string => Boolean(contactId)),
    ),
  ];
}

export async function resolveInviteeMemberUids(
  db: Firestore,
  patientId: string,
  attendees: CareCalendarAttendee[] | undefined | null,
): Promise<string[] | null> {
  const invitees = (attendees ?? []).filter(attendeeNeedsAppointmentInvite);
  if (!invitees.length) return null;
  const uidByContact = await resolveMemberUidsByContactIds(db, patientId, invitees);
  const uids = [...new Set([...uidByContact.values()])];
  return uids.length ? uids : null;
}

function normalizeContactLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

type ContactDirectoryEntry = {
  email?: string;
  name: string;
  normalizedName: string;
};

async function loadContactDirectoryByContactId(
  db: Firestore,
  patientId: string,
): Promise<Map<string, ContactDirectoryEntry>> {
  const map = new Map<string, ContactDirectoryEntry>();
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) return map;
  const data = snap.data() as Record<string, unknown>;
  const contacts = [
    ...(Array.isArray(data.caregivers) ? data.caregivers : []),
    ...(Array.isArray(data.friendsAndFamily) ? data.friendsAndFamily : []),
  ] as Record<string, unknown>[];
  for (const contact of contacts) {
    const contactId = String(contact.id || '').trim();
    const name = String(contact.name || contact.displayName || '').trim();
    const email = normalizeInviteEmail(String(contact.email || contact.emailVerify || ''));
    if (!contactId) continue;
    map.set(contactId, {
      email: email || undefined,
      name,
      normalizedName: normalizeContactLabel(name),
    });
  }
  return map;
}

export async function resolveMemberUidsByContactIds(
  db: Firestore,
  patientId: string,
  invitees: CareCalendarAttendee[],
): Promise<Map<string, string>> {
  const wanted = new Map(
    invitees
      .filter((attendee) => attendee.contactId)
      .map((attendee) => [
        attendee.contactId,
        normalizeContactLabel(attendee.name),
      ]),
  );
  const result = new Map<string, string>();
  if (!wanted.size) return result;

  const contactDirectory = await loadContactDirectoryByContactId(db, patientId);
  const membersSnap = await getDocs(collection(db, 'patients', patientId, 'members'));
  const activeMembers = membersSnap.docs.filter((memberDoc) => {
    const status = memberDoc.data().status;
    return status !== 'revoked';
  });

  for (const memberDoc of activeMembers) {
    const data = memberDoc.data() as Record<string, unknown>;
    const contactId = String(data.contactId || '').trim();
    if (!contactId || !wanted.has(contactId) || result.has(contactId)) continue;
    result.set(contactId, memberDoc.id);
  }

  let unresolvedContactIds = [...wanted.keys()].filter((contactId) => !result.has(contactId));
  if (unresolvedContactIds.length) {
    for (const memberDoc of activeMembers) {
      const displayName = normalizeContactLabel(String(memberDoc.data().displayName || ''));
      if (!displayName) continue;
      for (const contactId of unresolvedContactIds) {
        if (result.has(contactId)) continue;
        const wantedName = wanted.get(contactId) || '';
        const directoryName = contactDirectory.get(contactId)?.normalizedName || '';
        if (wantedName === displayName || (directoryName && directoryName === displayName)) {
          result.set(contactId, memberDoc.id);
        }
      }
    }
  }

  unresolvedContactIds = [...wanted.keys()].filter((contactId) => !result.has(contactId));
  if (unresolvedContactIds.length) {
    for (const memberDoc of activeMembers) {
      const invitedEmail = normalizeInviteEmail(String(memberDoc.data().invitedEmail || ''));
      if (!invitedEmail) continue;
      for (const contactId of unresolvedContactIds) {
        if (result.has(contactId)) continue;
        if (contactDirectory.get(contactId)?.email === invitedEmail) {
          result.set(contactId, memberDoc.id);
        }
      }
    }
  }

  unresolvedContactIds = [...wanted.keys()].filter((contactId) => !result.has(contactId));
  if (unresolvedContactIds.length) {
    for (const memberDoc of activeMembers) {
      const invitedEmail = normalizeInviteEmail(String(memberDoc.data().invitedEmail || ''));
      if (!invitedEmail) continue;
      const emailLocal = normalizeContactLabel(invitedEmail.split('@')[0] || '');
      if (!emailLocal) continue;
      for (const contactId of unresolvedContactIds) {
        if (result.has(contactId)) continue;
        const wantedName = wanted.get(contactId) || '';
        const directoryName = contactDirectory.get(contactId)?.normalizedName || '';
        if (wantedName === emailLocal || (directoryName && directoryName === emailLocal)) {
          result.set(contactId, memberDoc.id);
        }
      }
    }
  }

  unresolvedContactIds = [...wanted.keys()].filter((contactId) => !result.has(contactId));
  if (unresolvedContactIds.length) {
    for (const memberDoc of activeMembers) {
      const data = memberDoc.data() as Record<string, unknown>;
      const inviteRef = String(data.inviteRef || '').trim();
      if (!inviteRef) continue;
      const inviteSnap = await getDoc(doc(db, 'circle_invites', inviteRef));
      if (!inviteSnap.exists()) continue;
      const inviteData = inviteSnap.data() as Record<string, unknown>;
      if (inviteData.status !== 'accepted') continue;
      const contactId = String(inviteData.contactId || '').trim();
      if (!contactId || !unresolvedContactIds.includes(contactId) || result.has(contactId)) continue;
      result.set(contactId, memberDoc.id);
    }
  }

  unresolvedContactIds = [...wanted.keys()].filter((contactId) => !result.has(contactId));
  if (unresolvedContactIds.length) {
    const invitesSnap = await getDocs(
      query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
    );
    for (const inviteDoc of invitesSnap.docs) {
      const data = inviteDoc.data() as Record<string, unknown>;
      if (data.status !== 'accepted') continue;
      const contactId = String(data.contactId || '').trim();
      const acceptedByUid = String(data.acceptedByUid || '').trim();
      if (!contactId || !acceptedByUid || !unresolvedContactIds.includes(contactId)) continue;
      result.set(contactId, acceptedByUid);
    }
  }

  unresolvedContactIds = [...wanted.keys()].filter((contactId) => !result.has(contactId));
  if (unresolvedContactIds.length) {
    const invitesSnap = await getDocs(
      query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
    );
    for (const inviteDoc of invitesSnap.docs) {
      const data = inviteDoc.data() as Record<string, unknown>;
      if (data.status !== 'accepted') continue;
      const invitedEmail = normalizeInviteEmail(String(data.invitedEmail || ''));
      const acceptedByUid = String(data.acceptedByUid || '').trim();
      if (!invitedEmail || !acceptedByUid) continue;
      for (const contactId of unresolvedContactIds) {
        if (result.has(contactId)) continue;
        if (contactDirectory.get(contactId)?.email === invitedEmail) {
          result.set(contactId, acceptedByUid);
        }
      }
    }
  }

  return result;
}

function changedInviteAttendees(
  before: CareCalendarAttendee[] | undefined,
  after: CareCalendarAttendee[] | undefined,
): CareCalendarAttendee[] {
  const beforeIds = new Set((before ?? []).map((attendee) => attendee.contactId));
  return (after ?? []).filter((attendee) => {
    if (!attendeeNeedsAppointmentInvite(attendee)) return false;
    if (!beforeIds.has(attendee.contactId)) return true;
    const prior = before?.find((item) => item.contactId === attendee.contactId);
    return !prior || prior.response === 'declined';
  });
}

export async function publishCareCalendarInvitePosts(
  db: Firestore,
  params: {
    patientId: string;
    entry: Pick<
      CareCalendarEntry,
      | 'id'
      | 'title'
      | 'startDateKey'
      | 'startTimeMinutes'
      | 'endTimeMinutes'
      | 'kind'
      | 'visitSubtype'
      | 'attendees'
    >;
    previousAttendees?: CareCalendarAttendee[];
    authorUid: string;
    authorName: string;
    authorRole: CircleMemberRole;
    patientOwnerAuthor?: boolean;
  },
): Promise<boolean> {
  try {
    const canAuthor =
      params.patientOwnerAuthor || canParticipateInCircleOpenThread(params.authorRole);
    if (!canAuthor) return false;

    const invitees = changedInviteAttendees(params.previousAttendees, params.entry.attendees);
    if (!invitees.length) return true;

    const uidByContact = await resolveMemberUidsByContactIds(db, params.patientId, invitees);
    const inviteTargetUids = [...new Set([...uidByContact.values()])];
    const inviteeContactIds = [
      ...new Set(invitees.map((attendee) => attendee.contactId).filter(Boolean)),
    ];
    const unresolvedInvitees = invitees.filter((attendee) => !uidByContact.has(attendee.contactId));
    if (unresolvedInvitees.length) {
      console.warn(
        'Care calendar invite: could not match Circle accounts for invitees',
        unresolvedInvitees.map((attendee) => attendee.name),
      );
    }
    if (!inviteTargetUids.length) {
      console.warn(
        'Care calendar invite: no Circle member accounts matched invitees',
        invitees.map((attendee) => attendee.name),
      );
      return false;
    }

    const text = formatAppointmentInvitePostText({
      entryId: params.entry.id,
      title: params.entry.title,
      startDateKey: params.entry.startDateKey,
      startTimeMinutes: params.entry.startTimeMinutes,
      endTimeMinutes: params.entry.endTimeMinutes,
      kind: params.entry.kind,
      visitSubtype: params.entry.visitSubtype,
      inviteeNames: invitees.map((attendee) => attendee.name),
    });

    const now = Date.now();
    const col = circleMemberThreadPostsCollection(db, params.patientId, 'open');
    const postRef = doc(col);
    const batch = writeBatch(db);
    batch.set(postRef, {
      patientId: params.patientId,
      threadKind: 'open',
      authorUid: params.authorUid,
      authorName: params.authorName.trim() || 'Circle member',
      authorRole: params.authorRole,
      text,
      createdAt: now,
      respondLocked: false,
      postKind: 'appointment_invite',
      careCalendarEntryId: params.entry.id,
      inviteTargetUids,
      ...(inviteeContactIds.length ? { inviteeContactIds } : {}),
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Care calendar invite notification failed', err);
    return false;
  }
}

export async function respondToCareCalendarInvite(
  db: Firestore,
  patientId: string,
  entryId: string,
  memberContactId: string,
  memberUid: string,
  response: Exclude<CareCalendarAttendeeResponse, 'pending'>,
): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'patients', patientId, 'care_calendar', entryId), {
    [`attendeeResponseSummary.${memberContactId}`]: {
      response,
      respondedAt: now,
      respondedByUid: memberUid,
    },
    updatedAt: now,
  });
}

export function attendeeResponseLabel(
  attendee: CareCalendarAttendee,
): CareCalendarAttendeeResponse {
  return attendee.response ?? 'pending';
}

export function shouldHideDeclinedAppointmentForContact(
  attendees: CareCalendarAttendee[] | undefined,
  memberContactId: string | undefined,
): boolean {
  if (!memberContactId || !attendees?.length) return false;
  const self = attendees.find((attendee) => attendee.contactId === memberContactId);
  return self?.response === 'declined';
}

export const SYNTHETIC_APPOINTMENT_INVITE_POST_ID_PREFIX = 'care-calendar-invite-';

export type CareCalendarMemberInviteContext = {
  memberUid: string;
  contactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  displayName?: string;
};

export function syntheticAppointmentInvitePostId(entryId: string): string {
  return `${SYNTHETIC_APPOINTMENT_INVITE_POST_ID_PREFIX}${entryId}`;
}

export function isSyntheticAppointmentInvitePostId(id: string): boolean {
  return id.startsWith(SYNTHETIC_APPOINTMENT_INVITE_POST_ID_PREFIX);
}

export function findCareCalendarAttendeeForMember(
  attendees: CareCalendarAttendee[] | undefined,
  context: CareCalendarMemberInviteContext,
): CareCalendarAttendee | undefined {
  if (!attendees?.length) return undefined;
  const contactIds = [
    context.contactId,
    context.memberDocContactId,
    context.inviteContactId,
  ].filter((id): id is string => Boolean(id));
  for (const id of contactIds) {
    const match = attendees.find((attendee) => attendee.contactId === id);
    if (match) return match;
  }
  const normalizedName = context.displayName
    ? normalizeContactLabel(context.displayName)
    : '';
  if (normalizedName) {
    const byName = attendees.find(
      (attendee) => normalizeContactLabel(attendee.name) === normalizedName,
    );
    if (byName) return byName;
  }
  return undefined;
}

export function resolveCareCalendarMemberContactId(
  attendees: CareCalendarAttendee[] | undefined,
  context: CareCalendarMemberInviteContext,
): string | undefined {
  return findCareCalendarAttendeeForMember(attendees, context)?.contactId;
}

function attendeeInviteResponseForMember(
  entry: CareCalendarEntry,
  context: CareCalendarMemberInviteContext,
): CareCalendarAttendeeResponse {
  const attendees = mergeAttendeeResponses(entry.attendees, entry.attendeeResponseSummary);
  const self = findCareCalendarAttendeeForMember(attendees, context);
  return self?.response ?? 'pending';
}

export function pendingAppointmentInviteEntriesForMember(
  entries: CareCalendarEntry[],
  context: CareCalendarMemberInviteContext,
): CareCalendarEntry[] {
  if (!context.memberUid) return [];
  return entries.filter((entry) => {
    if (entry.cancelledAt) return false;
    if (
      isCareCalendarAppointmentPast(
        entry.startDateKey,
        entry.startTimeMinutes,
        entry.endTimeMinutes,
      )
    ) {
      return false;
    }
    const attendees = mergeAttendeeResponses(entry.attendees, entry.attendeeResponseSummary);
    const invitedByUid = (entry.inviteeMemberUids ?? []).includes(context.memberUid);
    const self = findCareCalendarAttendeeForMember(attendees, context);
    if (!invitedByUid && (!self || !attendeeNeedsAppointmentInvite(self))) return false;
    const response = attendeeInviteResponseForMember(entry, context);
    return response !== 'accepted' && response !== 'declined';
  });
}

function hasVisibleInvitePostForEntry(
  posts: CircleMemberThreadPost[],
  entryId: string,
  context: CareCalendarMemberInviteContext,
): boolean {
  return posts.some(
    (post) =>
      isAppointmentInviteThreadPost(post) &&
      post.careCalendarEntryId === entryId &&
      isAppointmentInviteVisibleToMember(post, context.memberUid, context),
  );
}

export function buildSyntheticAppointmentInvitePost(
  entry: CareCalendarEntry,
  patientId: string,
  memberUid: string,
): CircleMemberThreadPost {
  const attendees = mergeAttendeeResponses(entry.attendees, entry.attendeeResponseSummary) ?? [];
  const invitees = attendees.filter(attendeeNeedsAppointmentInvite);
  const text = formatAppointmentInvitePostText({
    entryId: entry.id,
    title: entry.title,
    startDateKey: entry.startDateKey,
    startTimeMinutes: entry.startTimeMinutes,
    endTimeMinutes: entry.endTimeMinutes,
    kind: entry.kind,
    visitSubtype: entry.visitSubtype,
    inviteeNames: invitees.map((attendee) => attendee.name),
  });
  return {
    id: syntheticAppointmentInvitePostId(entry.id),
    patientId,
    threadKind: 'open',
    authorUid: entry.createdByUid,
    authorName: entry.createdByName.trim() || 'Circle member',
    authorRole: entry.source === 'circle' ? 'caregiver' : 'proxy',
    text,
    createdAt: entry.updatedAt,
    postKind: 'appointment_invite',
    careCalendarEntryId: entry.id,
    inviteTargetUids: [memberUid],
  };
}

/** Surface pending calendar invites in Circle when thread notification posts were not created. */
export function mergeAppointmentInvitePostsWithCareCalendar(
  posts: CircleMemberThreadPost[],
  entries: CareCalendarEntry[],
  context: CareCalendarMemberInviteContext,
  patientId: string,
): CircleMemberThreadPost[] {
  const pending = pendingAppointmentInviteEntriesForMember(entries, context);
  const synthetic = pending
    .filter((entry) => !hasVisibleInvitePostForEntry(posts, entry.id, context))
    .map((entry) => buildSyntheticAppointmentInvitePost(entry, patientId, context.memberUid));
  if (!synthetic.length) return posts;
  return [...posts, ...synthetic];
}
