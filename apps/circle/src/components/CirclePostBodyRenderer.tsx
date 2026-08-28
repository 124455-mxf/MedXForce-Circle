import {
  circleThreadPostBoldTitleLine,
  isAnnouncementThreadPost,
  isAppointmentInviteThreadPost,
  isDropInThreadPost,
  isPollThreadPost,
  isVisitCaptureThreadPost,
  normalizeMemberRole,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { Firestore } from 'firebase/firestore';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { CircleAnnouncementPost } from './CircleAnnouncementPost';
import { CircleAppointmentInvitePost } from './CircleAppointmentInvitePost';
import { CircleDropInTranscriptMessage } from './CircleDropInTranscriptMessage';
import { CircleMessageBodyPreview } from './CircleMessageBodyPreview';
import { CircleStoredTranslationMessage } from './CircleStoredTranslationMessage';
import { CirclePollPost } from './CirclePollPost';
import { CircleVisitCapturePost } from './CircleVisitCapturePost';

export function CirclePostBodyRenderer({
  post,
  isOwn,
  viewerLanguage,
  t,
  disableTruncate = false,
  boldFirstLine,
  db,
  patientId,
  memberUid,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  onRecordVisit,
  onTakeNotes,
  authorDisplayName,
  translationTargetLanguages,
}: {
  post: CircleMemberThreadPost;
  isOwn: boolean;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  disableTruncate?: boolean;
  boldFirstLine?: boolean;
  db?: Firestore;
  patientId?: string;
  memberUid?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  onRecordVisit?: (entryId?: string) => void;
  onTakeNotes?: (entryId: string, dateKey: string) => void;
  authorDisplayName?: string;
  translationTargetLanguages?: CircleUiLanguage[];
}) {
  const resolvedBoldFirstLine = boldFirstLine ?? circleThreadPostBoldTitleLine(post);

  if (isAnnouncementThreadPost(post)) {
    return (
      <CircleAnnouncementPost
        post={post}
        isOwn={isOwn}
        viewerLanguage={viewerLanguage}
        t={t}
      />
    );
  }

  if (isPollThreadPost(post) && db && patientId && memberUid) {
    return (
      <CirclePollPost
        post={post}
        db={db}
        patientId={patientId}
        memberUid={memberUid}
        memberDisplayName={memberDisplayName}
        isProxy={normalizeMemberRole(memberRole ?? '') === 'proxy'}
        memberRole={memberRole}
        isOwn={isOwn}
        viewerLanguage={viewerLanguage}
        translationTargetLanguages={translationTargetLanguages}
        t={t}
      />
    );
  }

  if (isAppointmentInviteThreadPost(post) && db && patientId && memberUid) {
    return (
      <CircleAppointmentInvitePost
        post={post}
        db={db}
        patientId={patientId}
        memberUid={memberUid}
        memberContactId={memberContactId}
        memberDocContactId={memberDocContactId}
        inviteContactId={inviteContactId}
        memberDisplayName={memberDisplayName}
        memberRole={memberRole}
        t={t}
        disableTruncate={disableTruncate}
        onRecordVisit={onRecordVisit}
        onTakeNotes={onTakeNotes}
      />
    );
  }

  if (isVisitCaptureThreadPost(post)) {
    return (
      <CircleVisitCapturePost
        text={post.text}
        translations={post.translations}
        viewerLanguage={viewerLanguage}
        t={t}
        disableTruncate={disableTruncate}
        capturedByDisplayName={authorDisplayName}
      />
    );
  }

  if (isDropInThreadPost(post)) {
    return (
      <CircleDropInTranscriptMessage
        text={post.text}
        translations={post.translations}
        viewerLanguage={viewerLanguage}
        className="text-slate-700 text-base font-medium"
        t={t}
        disableTruncate={disableTruncate}
      />
    );
  }

  if (isOwn) {
    return (
      <CircleMessageBodyPreview
        text={post.text}
        className="text-slate-700 text-base"
        boldFirstLine={resolvedBoldFirstLine}
        disableTruncate={disableTruncate}
      />
    );
  }

  return (
    <CircleStoredTranslationMessage
      text={post.text}
      translations={post.translations}
      viewerLanguage={viewerLanguage}
      className="text-slate-700 text-base font-medium"
      t={t}
      translateIfMissing
      boldFirstLine={resolvedBoldFirstLine}
      disableTruncate={disableTruncate}
    />
  );
}
