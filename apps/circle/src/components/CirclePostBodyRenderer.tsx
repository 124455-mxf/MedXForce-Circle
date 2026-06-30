import {
  circleThreadPostBoldTitleLine,
  isAppointmentInviteThreadPost,
  isDropInThreadPost,
  isVisitCaptureThreadPost,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { Firestore } from 'firebase/firestore';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { CircleAppointmentInvitePost } from './CircleAppointmentInvitePost';
import { CircleDropInTranscriptMessage } from './CircleDropInTranscriptMessage';
import { CircleMessageBodyPreview } from './CircleMessageBodyPreview';
import { CircleStoredTranslationMessage } from './CircleStoredTranslationMessage';
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
  memberDisplayName,
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
  memberDisplayName?: string;
}) {
  const resolvedBoldFirstLine = boldFirstLine ?? circleThreadPostBoldTitleLine(post);

  if (isAppointmentInviteThreadPost(post) && db && patientId && memberUid) {
    return (
      <CircleAppointmentInvitePost
        post={post}
        db={db}
        patientId={patientId}
        memberUid={memberUid}
        memberContactId={memberContactId}
        memberDocContactId={memberDocContactId}
        memberDisplayName={memberDisplayName}
        t={t}
        disableTruncate={disableTruncate}
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
      />
    );
  }

  if (isDropInThreadPost(post)) {
    return (
      <CircleDropInTranscriptMessage
        text={post.text}
        translations={post.translations}
        viewerLanguage={viewerLanguage}
        className="text-slate-700 font-medium"
        t={t}
        disableTruncate={disableTruncate}
      />
    );
  }

  if (isOwn) {
    return (
      <CircleMessageBodyPreview
        text={post.text}
        className="text-slate-700"
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
      className="text-slate-700 font-medium"
      t={t}
      translateIfMissing
      boldFirstLine={resolvedBoldFirstLine}
      disableTruncate={disableTruncate}
    />
  );
}
