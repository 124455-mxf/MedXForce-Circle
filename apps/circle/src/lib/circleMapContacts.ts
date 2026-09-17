import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  circleRoleFromContact,
  type CircleManagedContact,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { CircleThreadMessage, CircleThreadReply } from '../hooks/useCirclePatientThreads';
import type { FamilyGalleryPreviewPhoto } from '../hooks/useFamilyGalleryDashboard';
import type { CircleMapGalleryPhoto } from './circleMapModel';

export function managedContactToRecord(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    relationship: contact.relationship,
    circleRole: contact.circleRole,
    proxyTier: contact.proxyTier,
    kind: contact.kind,
  };
}

export function contactsToCircleMapPreferences(
  contacts: CircleManagedContact[],
  patientName: string,
  nickName?: string,
) {
  const caregivers = contacts.filter((c) => c.kind === 'caregiver').map(managedContactToRecord);
  const friendsAndFamily = contacts
    .filter((c) => c.kind === 'family' || c.kind === 'friend')
    .map(managedContactToRecord);
  const messagingContacts = contacts.filter((c) => c.kind === 'contact').map(managedContactToRecord);

  return {
    userName: patientName,
    fullUserDetails: nickName ? { identity: { nickName } } : undefined,
    caregivers,
    friendsAndFamily,
    contacts: messagingContacts,
  };
}

function contactCircleRole(contact: CircleManagedContact) {
  return contact.circleRole || circleRoleFromContact(managedContactToRecord(contact));
}

/** People who can actually read this Circle thread — not messaging-only contacts. */
export function contactsForCircleThread(
  contacts: CircleManagedContact[],
  threadKind: CircleMemberThreadKind,
): CircleManagedContact[] {
  return contacts.filter((contact) => {
    if (contact.kind === 'contact') return false;
    const role = contactCircleRole(contact);
    return threadKind === 'restricted'
      ? canSeeCircleRestrictedThread(role)
      : canParticipateInCircleOpenThread(role);
  });
}

export function mapMessagesForEngagement(
  rawMessages: CircleThreadMessage[],
  repliesByMessageId: Record<string, CircleThreadReply[]>,
) {
  return rawMessages.map((msg) => ({
    timestamp: msg.updatedAt || msg.createdAt,
    senderName: msg.senderName,
    senderUid: msg.senderUid,
    recipients: msg.recipientEmails ?? [],
    replies: (repliesByMessageId[msg.id] ?? []).map((reply) => ({
      timestamp: reply.timestamp,
      senderEmail: reply.senderEmail,
      senderName: reply.senderName,
      sender: reply.senderName,
      senderUid: reply.senderUid,
      isPatient: reply.isPatient,
    })),
  }));
}

export function mapCirclePostsForEngagement(posts: CircleMemberThreadPost[]) {
  return posts.map((post) => ({
    timestamp: post.createdAt,
    senderName: post.authorName,
    senderUid: post.authorUid,
    recipients: [] as string[],
    replies: [] as Record<string, unknown>[],
  }));
}

export function mapGalleryPhotosForEngagement(
  photos: FamilyGalleryPreviewPhoto[],
): CircleMapGalleryPhoto[] {
  return photos.map((photo) => ({
    source: photo.source === 'patient' ? 'patient' : 'member',
    senderName: photo.senderName,
    uploadedByUid: photo.uploadedByUid,
    date: photo.timestamp,
  }));
}
