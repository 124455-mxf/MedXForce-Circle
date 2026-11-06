import {
  circleThreadPostBoldTitleLine,
  isAppointmentInviteThreadPost,
  isCirclePollClosed,
  isDropInThreadPost,
  isPollThreadPost,
  isVisitCaptureThreadPost,
  parseAppointmentInvitePost,
  parseVisitCapturePostText,
  APPOINTMENT_INVITE_POST_MARKER,
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
import { formatCirclePollClosesAt, translateCircleMemberRole } from './circleScreenI18n';
import { careTransitionPackIdFromAnnouncementPost } from './careTransitionAnnouncementUnread';

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

function circlePollEndedAt(
  post: Pick<CircleMemberThreadPost, 'pollClosedAt' | 'pollClosesAt'>,
): number | undefined {
  if (typeof post.pollClosedAt === 'number' && post.pollClosedAt > 0) return post.pollClosedAt;
  if (typeof post.pollClosesAt === 'number' && post.pollClosesAt > 0) return post.pollClosesAt;
  return undefined;
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
  if (isPollThreadPost(post) && post.text.trim()) {
    return trimInboxSnippet(
      resolvePostDisplayText(post, viewerLanguage, viewerUid) || post.text.trim(),
      INBOX_TITLE_CHARS,
    );
  }
  if (isDropInThreadPost(post)) {
    const parsed = parseDropInTranscriptText(post.text);
    if (parsed?.titleLine) return parsed.titleLine;
  }
  if (isVisitCaptureThreadPost(post)) {
    const parsed = parseVisitCapturePostText(post.text);
    if (parsed?.dateLabel) {
      return t('circle.meetingCaptureHeading', { date: parsed.dateLabel });
    }
    if (parsed?.heading) return parsed.heading;
  }
  if (isAppointmentInviteThreadPost(post)) {
    const parsed = parseAppointmentInvitePost(post);
    if (parsed?.title) return parsed.title;
    const firstLine = post.text.split('\n')[0]?.trim() ?? '';
    if (firstLine.startsWith(APPOINTMENT_INVITE_POST_MARKER)) {
      return firstLine.slice(APPOINTMENT_INVITE_POST_MARKER.length).trim();
    }
  }
  if (careTransitionPackIdFromAnnouncementPost(post)) {
    return discussionPostTitleLine(post, viewerLanguage, viewerUid);
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
    const preview = trimInboxSnippet(buildVisitCapturePostPreviewText(parsedVisit));
    if (post.careCalendarEntryId?.trim()) {
      return trimInboxSnippet(`${t('circle.captureFromAppointment')} · ${preview}`);
    }
    return preview;
  }
  if (isAppointmentInviteThreadPost(post)) {
    const parsed = parseAppointmentInvitePost(post);
    const lines = post.text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('entry:'));
    const scheduleLine = lines.find(
      (line, index) =>
        index > 0 && !line.startsWith('Type:') && !line.startsWith('Invited:'),
    );
    const kind = parsed?.kind;
    const kindLabel = kind
      ? t(`dashboard.careCalendar.kinds.${kind}`)
      : undefined;
    const subtypeLabel =
      parsed?.visitSubtype && kind !== 'wellness'
        ? t(`dashboard.careCalendar.visitSubtype.${parsed.visitSubtype}`)
        : undefined;
    const typeLabel = [kindLabel, subtypeLabel].filter(Boolean).join(' · ');
    const preview = [scheduleLine, typeLabel].filter(Boolean).join(' · ');
    if (preview) return trimInboxSnippet(preview);
  }

  if (isPollThreadPost(post)) {
    if (isCirclePollClosed(post)) {
      const replyPreview = post.lastReplyPreviewText?.trim();
      if (replyPreview) return trimInboxSnippet(replyPreview);
      const closedAt = circlePollEndedAt(post);
      return closedAt
        ? t('circle.inboxSnippetPollClosed', { date: formatCirclePollClosesAt(closedAt) })
        : t('circle.pollClosed');
    }
    const replyPreview = post.lastReplyPreviewText?.trim();
    if ((post.replyCount ?? 0) > 0 && replyPreview) {
      return trimInboxSnippet(
        t('circle.inboxSnippetPollReplied', {
          count: post.replyCount ?? 0,
          preview: replyPreview,
        }),
      );
    }
    const description = post.pollDescription?.trim();
    if (description) return trimInboxSnippet(description);
    return '';
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

  if (careTransitionPackIdFromAnnouncementPost(post)) {
    const newlineIdx = body.indexOf('\n');
    const rest = newlineIdx >= 0 ? body.slice(newlineIdx + 1).trim() : '';
    if (rest) return trimInboxSnippet(rest);
  }

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

export function circlePollInboxBadgeLabel(
  t: CircleTranslator,
  post: Pick<CircleMemberThreadPost, 'pollClosedAt' | 'pollClosesAt'>,
): string {
  if (isCirclePollClosed(post)) {
    return t('circle.pollClosed');
  }
  if (typeof post.pollClosesAt === 'number' && post.pollClosesAt > 0) {
    return t('circle.inboxSnippetPollCloses', {
      date: formatCirclePollClosesAt(post.pollClosesAt),
    });
  }
  return t('circle.inboxSnippetPoll');
}

export function circlePostDetailSubtitle(
  t: CircleTranslator,
  post: CircleMemberThreadPost,
  isOwn: boolean,
  ownRoleLabel: string,
  authorDisplayName = post.authorName,
): string {
  if (isOwn) return ownRoleLabel;
  return `${authorDisplayName} · ${translateCircleMemberRole(t, post.authorRole)}`;
}

export function circlePostInboxRowAuthorLine(
  t: CircleTranslator,
  post: CircleMemberThreadPost,
  viewerUid: string,
  ownRoleLabel: string,
  authorDisplayName = post.authorName,
): string {
  if (post.authorUid === viewerUid) {
    return `${t('circle.you')} · ${ownRoleLabel}`;
  }
  return t('circle.inboxSnippetFrom', {
    name: authorDisplayName,
    role: translateCircleMemberRole(t, post.authorRole),
  });
}
