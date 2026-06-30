/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import { ChevronDown, Search, Users } from 'lucide-react';
import {
  careCalendarAttendeeRoleLabelKey,
  filterCareCalendarAttendeeOptions,
  formatCareCalendarAttendeeSummary,
  type CareCalendarAttendee,
  type CareCalendarAttendeeOption,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarAttendeeFieldsProps = {
  options: CareCalendarAttendeeOption[];
  attendees: CareCalendarAttendee[];
  onChange: (attendees: CareCalendarAttendee[]) => void;
  translate: (key: string) => string;
  roleLabel: (roleKey: string) => string;
  searchPlaceholder: string;
  searchNoMatches: string;
  caregiversSectionLabel: string;
  familySectionLabel: string;
  patientSectionLabel: string;
  defaultExpanded?: boolean;
};

function attendeeFromOption(option: CareCalendarAttendeeOption): CareCalendarAttendee {
  return {
    contactId: option.contactId,
    name: option.name,
    role: option.role,
    ...(option.proxyTier ? { proxyTier: option.proxyTier } : {}),
  };
}

function AttendeeAvatar({ photoUrl, name }: { photoUrl?: string; name: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="w-10 h-10 shrink-0 rounded-full object-cover border border-slate-100"
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
      {initial}
    </div>
  );
}

export function CircleCareCalendarAttendeeFields({
  options,
  attendees,
  onChange,
  translate: tr,
  roleLabel,
  searchPlaceholder,
  searchNoMatches,
  caregiversSectionLabel,
  familySectionLabel,
  patientSectionLabel,
  defaultExpanded = false,
}: CircleCareCalendarAttendeeFieldsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const isSearchActive = searchFocused || searchQuery.trim().length > 0;
  const selectedIds = new Set(attendees.map((a) => a.contactId));
  const summary = formatCareCalendarAttendeeSummary(attendees, { excludePatient: true });

  const filtered = useMemo(
    () => filterCareCalendarAttendeeOptions(options, searchQuery),
    [options, searchQuery],
  );
  const caregivers = filtered.filter((option) => option.group === 'caregivers');
  const family = filtered.filter((option) => option.group === 'family');
  const patientOptions = filtered.filter((option) => option.group === 'patient');

  const toggle = (option: CareCalendarAttendeeOption) => {
    if (selectedIds.has(option.contactId)) {
      onChange(attendees.filter((a) => a.contactId !== option.contactId));
      return;
    }
    onChange([...attendees, attendeeFromOption(option)]);
  };

  const renderRoleBadge = (option: CareCalendarAttendeeOption) => {
    const roleText = roleLabel(careCalendarAttendeeRoleLabelKey(option.role));
    const tierText =
      option.proxyTier === 'backup'
        ? tr('fields.attendeeProxyBackup')
        : option.proxyTier === 'primary'
          ? tr('fields.attendeeProxyPrimary')
          : null;
    const badgeClass =
      option.role === 'patient'
        ? 'text-amber-800 bg-amber-50'
        : option.role === 'family'
          ? 'text-violet-700 bg-violet-50'
          : option.role === 'proxy'
            ? 'text-blue-700 bg-blue-50'
            : 'text-slate-600 bg-slate-100';

    return (
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0',
          badgeClass,
        )}
      >
        {tierText ? `${roleText} · ${tierText}` : roleText}
      </span>
    );
  };

  const renderRow = (option: CareCalendarAttendeeOption) => {
    const checked = selectedIds.has(option.contactId);
    return (
      <label
        key={option.contactId}
        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors bg-white"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(option)}
          className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        <AttendeeAvatar photoUrl={option.avatarUrl} name={option.name} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-700 text-sm">{option.name}</p>
          {option.email && <p className="text-xs text-slate-500 truncate">{option.email}</p>}
        </div>
        {renderRoleBadge(option)}
      </label>
    );
  };

  const renderSection = (title: string, items: CareCalendarAttendeeOption[]) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
        <div className="space-y-2">{items.map(renderRow)}</div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-800 font-bold text-sm"
        aria-expanded={expanded}
      >
        <Users size={18} className="shrink-0" />
        <span className="shrink-0">{tr('fields.attendees')}</span>
        {!expanded && (
          <span className="flex-1 min-w-0 truncate font-normal text-slate-500 text-xs">
            {summary || tr('fields.attendeesOptional')}
          </span>
        )}
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-white">
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  setExpanded(true);
                }}
                onBlur={() => setSearchFocused(false)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
              />
            </div>
          </div>

          <div
            className={cn(
              'px-4 pb-4 overflow-y-auto space-y-4 transition-[max-height]',
              isSearchActive
                ? 'max-h-[min(36rem,75dvh)]'
                : expanded
                  ? 'max-h-80'
                  : 'max-h-56',
            )}
          >
            {options.length === 0 ? (
              <p className="text-slate-500 text-xs py-2">{tr('fields.attendeesEmpty')}</p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-500 text-xs py-6 text-center">{searchNoMatches}</p>
            ) : (
              <>
                {renderSection(patientSectionLabel, patientOptions)}
                {renderSection(caregiversSectionLabel, caregivers)}
                {renderSection(familySectionLabel, family)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
