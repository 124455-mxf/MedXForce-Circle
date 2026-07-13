/** @license SPDX-License-Identifier: Apache-2.0 */
import {
  getCareTransitionPack,
  type CareTransitionChecklistItem,
  type CareTransitionKnowCourse,
  type CareTransitionPack,
  type CareTransitionPackId,
} from '@medxforce/shared';
export type CareTransitionTranslateFn = (
  path: string,
  params?: Record<string, unknown>,
) => string;

function resolveOrFallback(
  t: CareTransitionTranslateFn,
  path: string,
  fallback: string,
): string {
  const value = t(path);
  return value === path ? fallback : value;
}

export function localizeCareTransitionPack(
  t: CareTransitionTranslateFn,
  pack: CareTransitionPack,
): CareTransitionPack {
  const base = `careTransitionContent.packs.${pack.id}`;
  return {
    ...pack,
    title: resolveOrFallback(t, `${base}.title`, pack.title),
    subtitle: resolveOrFallback(t, `${base}.subtitle`, pack.subtitle),
    fromLabel: resolveOrFallback(t, `${base}.fromLabel`, pack.fromLabel),
    toLabel: resolveOrFallback(t, `${base}.toLabel`, pack.toLabel),
    suggestedKnow: pack.suggestedKnow.map((course) => localizeCareTransitionKnow(t, course)),
  };
}

export function localizeCareTransitionItem(
  t: CareTransitionTranslateFn,
  item: CareTransitionChecklistItem,
): CareTransitionChecklistItem {
  if (item.custom) return item;
  const base = `careTransitionContent.items.${item.id}`;
  return {
    ...item,
    title: resolveOrFallback(t, `${base}.title`, item.title),
    why: resolveOrFallback(t, `${base}.why`, item.why),
    when: resolveOrFallback(t, `${base}.when`, item.when),
  };
}

export function localizeCareTransitionKnow(
  t: CareTransitionTranslateFn,
  course: CareTransitionKnowCourse,
): CareTransitionKnowCourse {
  if (course.id.startsWith('know-custom-')) return course;
  const base = `careTransitionContent.know.${course.id}`;
  return {
    ...course,
    title: resolveOrFallback(t, `${base}.title`, course.title),
    audience: resolveOrFallback(t, `${base}.audience`, course.audience),
  };
}

export function buildLocalizedCareTransitionAnnouncementText(
  t: CareTransitionTranslateFn,
  packId: CareTransitionPackId,
): string {
  const pack = getCareTransitionPack(packId);
  if (!pack) {
    return t('careTransition.title');
  }
  const localized = localizeCareTransitionPack(t, pack);
  const hint = resolveOrFallback(
    t,
    'careTransitionContent.announcementOpenHint',
    'Open Care transition readiness on Home or under Circle → checklist to mark items done or dismiss what does not apply.',
  );
  return [localized.title, '', localized.subtitle, '', hint].join('\n');
}

export function buildLocalizedTaskCopyText(
  t: CareTransitionTranslateFn,
  packTitle: string,
  item: CareTransitionChecklistItem,
  patientName: string,
): string {
  const localized = localizeCareTransitionItem(t, item);
  const lines = [
    `${t('careTransition.title')} — ${patientName}`,
    packTitle,
    '',
    localized.title,
  ];
  if (localized.when) {
    lines.push(`${t('careTransition.copyWhen')}: ${localized.when}`);
  }
  if (localized.why) {
    lines.push('', localized.why);
  }
  return lines.join('\n');
}
