/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo } from 'react';
import {
  buildCareCalendarDurationOptions,
  clampCareCalendarDurationMinutes,
  formatCareCalendarDuration,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarDurationSelectProps = {
  valueMinutes: number;
  onChange: (minutes: number) => void;
  startMinutes?: number;
  formatOption?: (minutes: number) => string;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

export function CircleCareCalendarDurationSelect({
  valueMinutes,
  onChange,
  startMinutes,
  formatOption = formatCareCalendarDuration,
  className,
  id,
  'aria-label': ariaLabel,
}: CircleCareCalendarDurationSelectProps) {
  const options = useMemo(
    () => buildCareCalendarDurationOptions(startMinutes),
    [startMinutes],
  );
  const resolvedMinutes = useMemo(
    () => clampCareCalendarDurationMinutes(startMinutes, valueMinutes),
    [startMinutes, valueMinutes],
  );

  useEffect(() => {
    if (resolvedMinutes !== valueMinutes) onChange(resolvedMinutes);
  }, [onChange, resolvedMinutes, valueMinutes]);

  return (
    <select
      id={id}
      value={String(resolvedMinutes)}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={ariaLabel}
      className={cn(className, 'min-w-0 max-w-full box-border')}
    >
      {options.map((minutes) => (
        <option key={minutes} value={minutes}>
          {formatOption(minutes)}
        </option>
      ))}
    </select>
  );
}
