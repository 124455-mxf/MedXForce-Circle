import type { CircleDiaryEntry } from '@medxforce/shared';

/**
 * Live author label for diary cards: prefer current member/contact display name
 * over the snapshot stored on the entry at write time.
 */
export function resolveCircleDiaryAuthorLabel(
  entry: Pick<CircleDiaryEntry, 'authorUid' | 'authorName' | 'patientId' | 'entryKind'>,
  options: {
    patientDisplayName: string;
    displayNameByUid: Record<string, string>;
    systemAuthorLabel: string;
  },
): string {
  if (entry.entryKind === 'system') return options.systemAuthorLabel;

  if (entry.authorUid === entry.patientId) {
    return options.patientDisplayName.trim() || entry.authorName;
  }

  const live = options.displayNameByUid[entry.authorUid]?.trim();
  return live || entry.authorName;
}
