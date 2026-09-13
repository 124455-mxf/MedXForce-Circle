import { useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  canSeeCircleRestrictedThread,
  type CircleMemberRole,
} from '@medxforce/shared';
import { useCircleTeamCoverageFromDashboard } from '../context/CircleTeamCoverageContext';
import { useCircleMapMemberPhotos } from '../hooks/useCircleMapMemberPhotos';
import { useCircleMemberThread } from '../hooks/useCircleMemberThread';
import { useCirclePatientThreadsContext } from '../context/CirclePatientThreadsContext';
import type { FamilyGalleryPreviewPhoto } from '../hooks/useFamilyGalleryDashboard';
import {
  contactsToCircleMapPreferences,
  mapCirclePostsForEngagement,
  mapGalleryPhotosForEngagement,
  mapMessagesForEngagement,
} from '../lib/circleMapContacts';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CircleDashboardCircleMapModal,
  CircleDashboardCircleMapTile,
} from './CircleDashboardCircleMap';

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
  const t = useCircleT();
  const [open, setOpen] = useState(false);
  const active = showVisual || showCompact;
  const includeRestrictedPosts = canSeeCircleRestrictedThread(memberRole);

  const { contacts, loading: contactsLoading } = useCircleTeamCoverageFromDashboard();
  const { photosByEmail, photosByContactId, uidByEmail, uidByContactId } = useCircleMapMemberPhotos(
    db,
    patientId,
    active,
  );
  const { rawMessages, repliesByMessageId } = useCirclePatientThreadsContext();
  const { posts: openPosts } = useCircleMemberThread(db, patientId, 'open', active);
  const { posts: restrictedPosts } = useCircleMemberThread(
    db,
    patientId,
    'restricted',
    active && includeRestrictedPosts,
  );

  const preferences = useMemo(
    () => contactsToCircleMapPreferences(contacts, patientDisplayName, patientNickName),
    [contacts, patientDisplayName, patientNickName],
  );

  const messages = useMemo(
    () => [
      ...mapMessagesForEngagement(rawMessages, repliesByMessageId),
      ...mapCirclePostsForEngagement(openPosts),
      ...mapCirclePostsForEngagement(restrictedPosts),
    ],
    [openPosts, rawMessages, repliesByMessageId, restrictedPosts],
  );

  const mappedGalleryPhotos = useMemo(
    () => mapGalleryPhotosForEngagement(galleryPhotos),
    [galleryPhotos],
  );

  if (!active || contactsLoading) return null;

  const tileProps = {
    preferences,
    messages,
    galleryPhotos: mappedGalleryPhotos,
    photosByEmail,
    photosByContactId,
    uidByEmail,
    uidByContactId,
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
        uidByEmail={uidByEmail}
        uidByContactId={uidByContactId}
        patientPhotoUrl={patientPhotoUrl}
        onManageContacts={onManageContacts}
        t={t}
      />
    </div>
  );
}
