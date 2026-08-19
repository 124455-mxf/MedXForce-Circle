import { useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  type CircleMemberRole,
} from '@medxforce/shared';
import { useCircleTeamCoverageFromDashboard } from '../context/CircleTeamCoverageContext';
import { useCircleMapMemberPhotos } from '../hooks/useCircleMapMemberPhotos';
import type { CircleThreadMessage, CircleThreadReply } from '../hooks/useCirclePatientThreads';
import { useCirclePatientThreadsContext } from '../context/CirclePatientThreadsContext';
import type { FamilyGalleryPreviewPhoto } from '../hooks/useFamilyGalleryDashboard';
import type { CircleMapGalleryPhoto } from '../lib/circleMapModel';
import { contactsToCircleMapPreferences } from '../lib/circleMapContacts';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CircleDashboardCircleMapModal,
  CircleDashboardCircleMapTile,
} from './CircleDashboardCircleMap';

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
  db: Firestore;
  patientId: string;
  memberRole: CircleMemberRole;
  patientDisplayName: string;
  patientPhotoUrl?: string;
  patientNickName?: string;
  galleryPhotos: FamilyGalleryPreviewPhoto[];
  showVisual: boolean;
  showCompact: boolean;
  onManageContacts?: () => void;
};

export function CircleDashboardCircleMapSection({
  db,
  patientId,
  memberRole,
  patientDisplayName,
  patientPhotoUrl,
  patientNickName,
  galleryPhotos,
  showVisual,
  showCompact,
  onManageContacts,
}: CircleDashboardCircleMapSectionProps) {
  void memberRole;
  const t = useCircleT();
  const [open, setOpen] = useState(false);
  const active = showVisual || showCompact;

  const { contacts, loading: contactsLoading } = useCircleTeamCoverageFromDashboard();
  const { photosByEmail, photosByContactId } = useCircleMapMemberPhotos(db, patientId, active);
  const { rawMessages, repliesByMessageId } = useCirclePatientThreadsContext();

  const preferences = useMemo(
    () => contactsToCircleMapPreferences(contacts, patientDisplayName, patientNickName),
    [contacts, patientDisplayName, patientNickName],
  );

  const messages = useMemo(
    () => mapMessagesForEngagement(rawMessages, repliesByMessageId),
    [rawMessages, repliesByMessageId],
  );

  const mappedGalleryPhotos = useMemo(() => mapGalleryPhotos(galleryPhotos), [galleryPhotos]);

  if (!active || contactsLoading) return null;

  const tileProps = {
    preferences,
    messages,
    galleryPhotos: mappedGalleryPhotos,
    photosByEmail,
    photosByContactId,
    patientPhotoUrl,
    onOpen: () => setOpen(true),
    t,
  };

  return (
    <div className="space-y-3">
      {showVisual ? (
        <div className="h-[15rem] sm:h-[16.5rem]">
          <CircleDashboardCircleMapTile {...tileProps} variant="visual" />
        </div>
      ) : null}
      {showCompact ? <CircleDashboardCircleMapTile {...tileProps} variant="compact" /> : null}

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
    </div>
  );
}
