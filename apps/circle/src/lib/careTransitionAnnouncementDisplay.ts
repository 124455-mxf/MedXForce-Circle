import {
  CARE_TRANSITION_PACKS,
  getCareTransitionPack,
  type CareTransitionPackId,
} from '@medxforce/shared';
import {
  careTransitionContentEnglish,
  careTransitionContentGerman,
  careTransitionContentPolish,
  careTransitionContentSpanish,
} from '../translations/careTransitionContent';

const FALLBACK_OPEN_HINT =
  'Open Care transition readiness on Home or under Circle → checklist to mark items done or dismiss what does not apply.';

function normalizeAnnouncementLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function packStripLines(packId: CareTransitionPackId): Set<string> {
  const lines = new Set<string>();
  const add = (value?: string) => {
    const key = normalizeAnnouncementLine(value ?? '');
    if (key) lines.add(key);
  };
  const pack = getCareTransitionPack(packId) ?? CARE_TRANSITION_PACKS.find((row) => row.id === packId);
  add(pack?.title);
  add(pack?.subtitle);
  add(FALLBACK_OPEN_HINT);
  for (const content of [
    careTransitionContentEnglish,
    careTransitionContentGerman,
    careTransitionContentSpanish,
    careTransitionContentPolish,
  ]) {
    add(content.announcementOpenHint);
    const localized = content.packs[packId as keyof typeof content.packs];
    if (localized) {
      add(localized.title);
      add(localized.subtitle);
    }
  }
  return lines;
}

/** User note from a pack announcement, after stripping template title / subtitle / hint. */
export function extractCareTransitionAnnouncementNote(
  text: string,
  packId: CareTransitionPackId,
): string {
  const strip = packStripLines(packId);
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !strip.has(normalizeAnnouncementLine(line)))
    .join('\n')
    .trim();
}
