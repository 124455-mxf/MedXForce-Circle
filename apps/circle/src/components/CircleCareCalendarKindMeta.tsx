/** @license SPDX-License-Identifier: Apache-2.0 */
import { isCareCalendarInternalMeeting, type CareCalendarDayEvent } from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarKindMetaProps = {
  kind: CareCalendarDayEvent['kind'];
  visitSubtype?: CareCalendarDayEvent['visitSubtype'];
  source?: CareCalendarDayEvent['source'];
  ct: (key: string, params?: Record<string, unknown>) => string;
  className?: string;
};

/** Kind / subtype line — Internal meetings get a green pill for quick scanning. */
export function CircleCareCalendarKindMeta({
  kind,
  visitSubtype,
  source,
  ct,
  className,
}: CircleCareCalendarKindMetaProps) {
  const isInternal = isCareCalendarInternalMeeting(kind);
  const extras = [
    !isInternal && visitSubtype ? ct(`visitSubtype.${visitSubtype}`) : null,
    source === 'circle' ? ct('fromCircle') : null,
  ].filter(Boolean);

  return (
    <p className={cn('mt-0.5 flex flex-wrap items-center gap-1.5', className)}>
      {isInternal ? (
        <span className="inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {ct(`kinds.${kind}`)}
        </span>
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
          {ct(`kinds.${kind}`)}
        </span>
      )}
      {extras.map((label) => (
        <span
          key={String(label)}
          className="text-[10px] font-bold uppercase tracking-wider text-violet-700"
        >
          · {label}
        </span>
      ))}
    </p>
  );
}
