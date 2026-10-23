import {
  CARE_TRANSITION_PACKS,
  isAnnouncementThreadPost,
  type CareTransitionPackId,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import {
  careTransitionContentEnglish,
  careTransitionContentGerman,
  careTransitionContentPolish,
  careTransitionContentSpanish,
} from '../translations/careTransitionContent';

const PACK_TITLE_TO_ID: Map<string, CareTransitionPackId> = (() => {
  const map = new Map<string, CareTransitionPackId>();
  const add = (title: string, id: CareTransitionPackId) => {
    const key = title.trim();
    if (key) map.set(key, id);
  };
  for (const pack of CARE_TRANSITION_PACKS) {
    add(pack.title, pack.id);
  }
  for (const content of [
    careTransitionContentEnglish,
    careTransitionContentGerman,
    careTransitionContentSpanish,
    careTransitionContentPolish,
  ]) {
    for (const [id, pack] of Object.entries(content.packs)) {
      add(pack.title, id as CareTransitionPackId);
    }
  }
  return map;
})();

function announcementTitleLine(text: string): string {
  return (
    text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .find((line) => line.trim())
      ?.trim() ?? ''
  );
}

export function careTransitionPackIdFromAnnouncementPost(
  post: Pick<CircleMemberThreadPost, 'postKind' | 'text'>,
): CareTransitionPackId | null {
  if (!isAnnouncementThreadPost(post)) return null;
  return PACK_TITLE_TO_ID.get(announcementTitleLine(post.text)) ?? null;
}

/** Pack-start announcements stay in the list, but are not unread unless that pack is active. */
export function shouldSuppressInactiveCareTransitionPackAnnouncement(
  post: Pick<CircleMemberThreadPost, 'postKind' | 'text'>,
  activePackId: CareTransitionPackId | string | null | undefined,
): boolean {
  const packId = careTransitionPackIdFromAnnouncementPost(post);
  if (!packId) return false;
  return activePackId !== packId;
}
