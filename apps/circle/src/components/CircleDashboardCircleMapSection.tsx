import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  type CircleManagedContact,
  type CircleMemberRole,
  normalizeMemberRole,
} from '@medxforce/shared';
import { useCircleTeamCoverage } from '../hooks/useCircleTeamCoverage';
import { useCircleMapMemberPhotos } from '../hooks/useCircleMapMemberPhotos';
import {
  useCirclePatientThreads,
  type CircleThreadMessage,
  type CircleThreadReply,
} from '../hooks/useCirclePatientThreads';
import type { FamilyGalleryPreviewPhoto } from '../hooks/useFamilyGalleryDashboard';
import type { CircleMapGalleryPhoto } from '../lib/circleMapModel';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CircleDashboardCircleMapModal,
  CircleDashboardCircleMapTile,
} from './CircleDashboardCircleMap';

function managedContactToRecord(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    relationship: contact.relationship,
    circleRole: contact.circleRole,
    proxyTier: contact.proxyTier,
    kind: contact.kind,
  };
}

function contactsToPreferences(
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

function mapMessagesForEngagement(
  rawMessages: CircleThreadMessage[],
  repliesByMessageId: Record<string, CircleThreadReply[]>,
) {
  return rawMessages.map((msg) => ({
    timestamp: msg.updatedAt || msg.createdAt,
    recipients: msg.recipientEmails ?? [],
    replies: (repliesByMessageId[msg.id] ?? []).map((reply) => ({
      timestamp: reply.timestamp,
      senderEmail: reply.senderEmail,
      senderName: reply.senderName,
      sender: reply.senderName,
      isPatient: reply.isPatient,
    })),
  }));
}

function mapGalleryPhotos(photos: FamilyGalleryPreviewPhoto[]): CircleMapGalleryPhoto[] {
  return photos.map((photo) => ({
    source: 'member',
    senderName: photo.senderName,
    date: photo.timestamp,
  }));
}

type CircleDashboardCircleMapSectionProps = {
  user: User;
  db: Firestore;
  patientId: string;
  memberRole: CircleMemberRole;
  patientDisplayName: string;
  patientPhotoUrl?: string;
  patientNickName?: string;
  galleryPhotos: FamilyGalleryPreviewPhoto[];
  enabled: boolean;
  onManageContacts?: () => void;
};

export function CircleDashboardCircleMapSection({
  user,
  db,
  patientId,
  memberRole,
  patientDisplayName,
  patientPhotoUrl,
  patientNickName,
  galleryPhotos,
  enabled,
  onManageContacts,
}: CircleDashboardCircleMapSectionProps) {
  const t = useCircleT();
  const [open, setOpen] = useState(false);
  const role = normalizeMemberRole(memberRole);
  const active = enabled && role !== 'friend';

  const { contacts, loading: contactsLoading } = useCircleTeamCoverage(db, patientId);
  const { photosByEmail, photosByContactId } = useCircleMapMemberPhotos(db, patientId, active);
  const { rawMessages, repliesByMessageId } = useCirclePatientThreads(db, patientId, user, role);

  const preferences = useMemo(
    () => contactsToPreferences(contacts, patientDisplayName, patientNickName),
    [contacts, patientDisplayName, patientNickName],
  );

  const messages = useMemo(
    () => mapMessagesForEngagement(rawMessages, repliesByMessageId),
    [rawMessages, repliesByMessageId],
  );

  const mappedGalleryPhotos = useMemo(() => mapGalleryPhotos(galleryPhotos), [galleryPhotos]);

  if (!active || contactsLoading) return null;

  return (
    <>
      <div className="h-[13rem] sm:h-[14rem]">
        <CircleDashboardCircleMapTile
          preferences={preferences}
          messages={messages}
          galleryPhotos={mappedGalleryPhotos}
          photosByEmail={photosByEmail}
          photosByContactId={photosByContactId}
          patientPhotoUrl={patientPhotoUrl}
          onOpen={() => setOpen(true)}
          t={t}
        />
      </div>

      <CircleDashboardCircleMapModal
        isOpen={open}
        onClose={() => setOpen(false)}
        preferences={preferences}
        messages={messages}
        galleryPhotos={mappedGalleryPhotos}
        photosByEmail={photosByEmail}
        photosByContactId={photosByContactId}
        patientPhotoUrl={patientPhotoUrl}
        onManageContacts={onManageContacts}
        t={t}
      />
    </>
  );
}
