import { useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { ChevronRight, Users } from 'lucide-react';
import type { CircleMemberThreadKind } from '@medxforce/shared';
import { useCircleTeamCoverage } from '../hooks/useCircleTeamCoverage';
import { useCircleMapMemberPhotos } from '../hooks/useCircleMapMemberPhotos';
import { useCircleT } from '../lib/circleI18nContext';
import {
  contactsForCircleThread,
  contactsToCircleMapPreferences,
} from '../lib/circleMapContacts';
import { buildCircleMapModel } from '../lib/circleMapModel';
import { cn } from '../lib/utils';
import { circleSectionContextHintClass } from '../lib/circleSectionStyles';
import { circleThreadDescriptionI18n } from '../lib/circleScreenI18n';
import { CircleDashboardCircleMapModal } from './CircleDashboardCircleMap';

const PREVIEW_AVATARS = 5;

type CircleThreadMembersRowProps = {
  db: Firestore;
  patientId: string;
  patientDisplayName: string;
  patientPhotoUrl?: string;
  isPendingProvision?: boolean;
  threadKind: CircleMemberThreadKind;
};

export function CircleThreadMembersRow({
  db,
  patientId,
  patientDisplayName,
  patientPhotoUrl,
  isPendingProvision = false,
  threadKind,
}: CircleThreadMembersRowProps) {
  const t = useCircleT();
  const [open, setOpen] = useState(false);
  const { contacts, loading } = useCircleTeamCoverage(db, patientId, isPendingProvision);
  const { photosByEmail, photosByContactId } = useCircleMapMemberPhotos(db, patientId, true);

  const threadContacts = useMemo(
    () => contactsForCircleThread(contacts, threadKind),
    [contacts, threadKind],
  );

  const preferences = useMemo(
    () => contactsToCircleMapPreferences(threadContacts, patientDisplayName),
    [patientDisplayName, threadContacts],
  );

  const model = useMemo(
    () =>
      buildCircleMapModel({
        preferences,
        photosByEmail,
        photosByContactId,
        patientPhotoUrl,
        mode: 'members',
        t,
      }),
    [photosByContactId, photosByEmail, patientPhotoUrl, preferences, t],
  );

  const members = model.nodes;
  const preview = members.slice(0, PREVIEW_AVATARS);
  const count = members.length;
  const countLabel =
    threadKind === 'restricted'
      ? t('circle.membersRowCountRestricted', { count })
      : t('circle.membersRowCountOpen', { count });
  const ariaLabel =
    threadKind === 'restricted'
      ? t('circle.membersRowRestrictedAria', { count })
      : t('circle.membersRowOpenAria', { count });

  if (loading) {
    return <p className={cn(circleSectionContextHintClass, 'px-0')}>{circleThreadDescriptionI18n(t, threadKind)}</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className="w-full flex items-center gap-2.5 rounded-xl py-1 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
      >
        <div className="flex items-center shrink-0 pl-0.5">
          {preview.length > 0 ? (
            preview.map((node, index) => (
              <div
                key={node.id}
                className="relative h-7 w-7 rounded-full ring-2 ring-white overflow-hidden bg-slate-200"
                style={{ marginLeft: index === 0 ? 0 : -8, zIndex: preview.length - index }}
              >
                {node.photoUrl ? (
                  <img
                    src={node.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-[9px] font-black text-white"
                    style={{ backgroundColor: node.color }}
                  >
                    {node.initials}
                  </span>
                )}
              </div>
            ))
          ) : (
            <span className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center ring-2 ring-white">
              <Users size={14} aria-hidden />
            </span>
          )}
        </div>
        <span className="min-w-0 flex-1 text-xs font-semibold text-slate-600 truncate">
          {countLabel}
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden />
      </button>

      <CircleDashboardCircleMapModal
        isOpen={open}
        onClose={() => setOpen(false)}
        preferences={preferences}
        photosByEmail={photosByEmail}
        photosByContactId={photosByContactId}
        patientPhotoUrl={patientPhotoUrl}
        initialMode="members"
        subtitle={
          threadKind === 'restricted'
            ? t('circle.membersModalSubtitleRestricted')
            : t('circle.membersModalSubtitleOpen')
        }
        t={t}
      />
    </>
  );
}
