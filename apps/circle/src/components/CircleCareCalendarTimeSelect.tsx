/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo } from 'react';
import {
  buildCareCalendarTimeOptions,
  careCalendarTimeInputValue,
  formatCareCalendarTime,
  snapCareCalendarTimeInput,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarTimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  minMinutes?: number;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

export function CircleCareCalendarTimeSelect({
  value,
  onChange,
  minMinutes,
  className,
  id,
  'aria-label': ariaLabel,
}: CircleCareCalendarTimeSelectProps) {
  const options = useMemo(
    () => buildCareCalendarTimeOptions(minMinutes),
    [minMinutes],
  );
  const resolvedValue = useMemo(() => {
    if (!value) return value;
    const snapped = snapCareCalendarTimeInput(value);
    const optionValues = new Set(options.map((minutes) => careCalendarTimeInputValue(minutes)));
    return optionValues.has(snapped) ? snapped : value;
  }, [options, value]);

  useEffect(() => {
    if (!value) return;
    const snapped = snapCareCalendarTimeInput(value);
    if (snapped !== value) onChange(snapped);
  }, [onChange, value]);

  return (
    <select
      id={id}
      value={resolvedValue}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn(className, 'min-w-0 max-w-full box-border')}
    >
      {options.map((minutes) => {
        const optionValue = careCalendarTimeInputValue(minutes);
        return (
          <option key={optionValue} value={optionValue}>
            {formatCareCalendarTime(minutes)}
          </option>
        );
      })}
    </select>
  );
}
