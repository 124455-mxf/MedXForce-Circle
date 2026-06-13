import {
  circleThreadPostBoldTitleLine,
  isDropInThreadPost,
  isVisitCaptureThreadPost,
  parseVisitCapturePostText,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { CircleUiLanguage } from './circleLanguages';
import type { CircleTranslator } from './circleI18nContext';
import {
  buildDropInPostPreviewText,
  buildVisitCapturePostPreviewText,
  trimCirclePostBodyPreview,
} from './circlePostBodyPreview';
import { parseDropInTranscriptText } from './dropInTranscriptDisplay';
import { resolveStoredMessageText } from './messageTranslationDisplay';
import { translateCircleMemberRole } from './circleScreenI18n';

const INBOX_TITLE_CHARS = 80;
const INBOX_SNIPPET_CHARS = 120;

function trimInboxSnippet(text: string, max = INBOX_SNIPPET_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function resolvePostDisplayText(
  post: CircleMemberThreadPost,
  viewerLanguage: CircleUiLanguage,
  viewerUid: string,
): string {
  const isOwn = post.authorUid === viewerUid;
  return isOwn
    ? post.text.trim()
    : resolveStoredMessageText(
        { text: post.text, translations: post.translations },
        viewerLanguage,
      ).displayText.trim();
}

function discussionPostTitleLine(
  post: CircleMemberThreadPost,
  viewerLanguage: CircleUiLanguage,
  viewerUid: string,
): string {
  const body = resolvePostDisplayText(post, viewerLanguage, viewerUid);
  if (!body) return post.authorName;
  const firstLine = body.split('\n').find((line) => line.trim())?.trim() || body;
  return trimInboxSnippet(firstLine, INBOX_TITLE_CHARS);
}

export function circlePostInboxTitle(
  t: CircleTranslator,
  post: CircleMemberThreadPost,
  viewerLanguage: CircleUiLanguage,
  viewerUid: string,
): string {
  if (isDropInThreadPost(post)) {
    const parsed = parseDropInTranscriptText(post.text);
    if (parsed?.titleLine) return parsed.titleLine;
  }
  if (isVisitCaptureThreadPost(post)) {
    const parsed = parseVisitCapturePostText(post.text);
    if (parsed?.heading) return parsed.heading;
  }
  const boldLine = circleThreadPostBoldTitleLine(post);
  if (boldLine) {
    const newlineIdx = post.text.indexOf('\n');
    if (newlineIdx >= 0) return post.text.slice(0, newlineIdx).trim();
  }
  return discussionPostTitleLine(post, viewerLanguage, viewerUid);
}

export function circlePostInboxSnippet(
  post: CircleMemberThreadPost,
  viewerLanguage: CircleUiLanguage,
  viewerUid: string,
  t: CircleTranslator,
): string {
  const parsedDropIn = parseDropInTranscriptText(post.text);
  if (parsedDropIn) {
    return trimInboxSnippet(buildDropInPostPreviewText(parsedDropIn));
  }
  const parsedVisit = parseVisitCapturePostText(post.text);
  if (parsedVisit) {
    return trimInboxSnippet(buildVisitCapturePostPreviewText(parsedVisit));
  }

  const isOwn = post.authorUid === viewerUid;
  const replyPreview = post.lastReplyPreviewText?.trim();
  if ((post.replyCount ?? 0) > 0 && replyPreview) {
    const replierLabel =
      post.lastReplyAuthorUid === viewerUid
        ? t('circle.inboxSnippetYouReplied')
        : t('circle.inboxSnippetReplied', {
            name: post.lastReplyAuthorName?.trim() || post.authorName,
          });
    return `${replierLabel} · ${trimInboxSnippet(replyPreview)}`;
  }

  const body = resolvePostDisplayText(post, viewerLanguage, viewerUid);
  if (!body) return '';

  const boldLine = circleThreadPostBoldTitleLine(post);
  if (boldLine) {
    const newlineIdx = body.indexOf('\n');
    const rest = newlineIdx >= 0 ? body.slice(newlineIdx + 1).trim() : '';
    if (rest) return trimInboxSnippet(rest);
  }

  const roleLabel = isOwn
    ? t('circle.inboxSnippetYouPosted')
    : t('circle.inboxSnippetFrom', {
        name: post.authorName,
        role: translateCircleMemberRole(t, post.authorRole),
      });
  const preview = trimInboxSnippet(body);
  return preview ? `${roleLabel} · ${preview}` : roleLabel;
}

export function circlePostDetailSubtitle(
  t: CircleTranslator,
  post: CircleMemberThreadPost,
  isOwn: boolean,
  ownRoleLabel: string,
): string {
  if (isOwn) return ownRoleLabel;
  return `${post.authorName} · ${translateCircleMemberRole(t, post.authorRole)}`;
}

export function circlePostInboxRowAuthorLine(
  t: CircleTranslator,
  post: CircleMemberThreadPost,
  viewerUid: string,
  ownRoleLabel: string,
): string {
  if (post.authorUid === viewerUid) {
    return `${t('circle.you')} · ${ownRoleLabel}`;
  }
  return t('circle.inboxSnippetFrom', {
    name: post.authorName,
    role: translateCircleMemberRole(t, post.authorRole),
  });
}
