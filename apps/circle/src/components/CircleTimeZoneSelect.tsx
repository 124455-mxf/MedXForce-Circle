import { useMemo } from 'react';
import {
  buildTimeZoneSelectOptions,
  getBrowserTimeZone,
  groupTimeZoneSelectOptions,
  normalizeTimeZoneId,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleTimeZoneSelectProps = {
  value: string;
  onChange: (value: string) => void;
  preferredIds?: Array<string | null | undefined>;
  className?: string;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
};

export function CircleTimeZoneSelect({
  value,
  onChange,
  preferredIds,
  className,
  id,
  'aria-label': ariaLabel,
  disabled,
}: CircleTimeZoneSelectProps) {
  const options = useMemo(
    () => buildTimeZoneSelectOptions([value, ...(preferredIds ?? [])]),
    [preferredIds, value],
  );
  const { pinned, groups } = useMemo(() => groupTimeZoneSelectOptions(options), [options]);
  const resolved = normalizeTimeZoneId(value, getBrowserTimeZone());

  return (
    <select
      id={id}
      value={resolved}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={cn(className, 'min-w-0 max-w-full box-border')}
    >
      {pinned.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
      {groups.map((group) => (
        <optgroup key={group.offsetLabel} label={group.offsetLabel}>
          {group.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
