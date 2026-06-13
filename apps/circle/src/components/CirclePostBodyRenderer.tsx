import {
  circleThreadPostBoldTitleLine,
  isDropInThreadPost,
  isVisitCaptureThreadPost,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
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
}: {
  post: CircleMemberThreadPost;
  isOwn: boolean;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  disableTruncate?: boolean;
  boldFirstLine?: boolean;
}) {
  const resolvedBoldFirstLine = boldFirstLine ?? circleThreadPostBoldTitleLine(post);

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
