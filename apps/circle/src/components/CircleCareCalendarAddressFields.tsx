/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, MapPin, Search } from 'lucide-react';
import {
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
  formatCareCalendarAddressParts,
  hasCareCalendarAddress,
  prefersAppleMapsPlatform,
  suggestionToCareCalendarAddress,
  type CareCalendarAddress,
  type CareCalendarAddressSuggestion,
} from '@medxforce/shared';
import { searchCareCalendarAddresses } from '../services/careCalendarAddressSearch';
import { cn } from '../lib/utils';

type CircleCareCalendarAddressFieldsProps = {
  address: CareCalendarAddress;
  onChange: (address: CareCalendarAddress) => void;
  translate: (key: string) => string;
  defaultExpanded?: boolean;
};

function addressSummary(address: CareCalendarAddress): string | null {
  if (address.label.trim()) return address.label.trim();
  const parts = formatCareCalendarAddressParts(address);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function CircleCareCalendarAddressFields({
  address,
  onChange,
  translate: tr,
  defaultExpanded = false,
}: CircleCareCalendarAddressFieldsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CareCalendarAddressSuggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const summary = addressSummary(address);
  const hasAddress = hasCareCalendarAddress(address);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      void searchCareCalendarAddresses(q)
        .then((results) => {
          setSuggestions(results);
          setSearchOpen(true);
        })
        .catch(() => setSearchError(tr('errors.searchFailed')))
        .finally(() => setSearching(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery, tr]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const patchAddress = (patch: Partial<CareCalendarAddress>, keepCoords = false) => {
    onChange({
      ...address,
      ...patch,
      ...(keepCoords
        ? {}
        : {
            latitude: undefined,
            longitude: undefined,
          }),
    });
  };

  const applySuggestion = (suggestion: CareCalendarAddressSuggestion) => {
    onChange(suggestionToCareCalendarAddress(suggestion));
    setSearchQuery('');
    setSuggestions([]);
    setSearchOpen(false);
    setExpanded(true);
  };

  const showMapsPreview = hasAddress;
  const appleMapsUrl = showMapsPreview ? buildAppleMapsUrl(address) : null;
  const googleMapsUrl = showMapsPreview ? buildGoogleMapsUrl(address) : null;
  const preferApple = prefersAppleMapsPlatform();

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-800 font-bold text-sm"
        aria-expanded={expanded}
      >
        <MapPin size={18} className="shrink-0" />
        <span className="shrink-0">{tr('fields.location')}</span>
        {!expanded && (
          <span className="flex-1 min-w-0 truncate font-normal text-slate-500 text-xs">
            {summary || tr('fields.locationOptional')}
          </span>
        )}
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4 border-t border-slate-100 pt-3">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
                className="w-full min-w-0 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm box-border"
                placeholder={tr('fields.searchLocation')}
              />
              {searching && (
                <Loader2
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                />
              )}
            </div>

            {searchOpen && suggestions.length > 0 && (
              <ul className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {suggestions.map((suggestion) => (
                  <li key={`${suggestion.latitude},${suggestion.longitude},${suggestion.formatted}`}>
                    <button
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="w-full text-left px-3 py-2.5 hover:bg-violet-50 border-b border-slate-50 last:border-b-0 text-xs"
                    >
                      <p className="font-bold text-slate-800">{suggestion.label}</p>
                      <p className="text-slate-500 mt-0.5 line-clamp-2">{suggestion.formatted}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {searchError && <p className="text-red-600 mt-1 text-xs">{searchError}</p>}
          </div>

          <input
            value={address.label}
            onChange={(e) => patchAddress({ label: e.target.value })}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm box-border"
            placeholder={tr('fields.locationLabel')}
          />
          <input
            value={address.line1 || ''}
            onChange={(e) => patchAddress({ line1: e.target.value })}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm box-border"
            placeholder={tr('fields.addressLine')}
          />
          <input
            value={address.suite || ''}
            onChange={(e) => patchAddress({ suite: e.target.value })}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm box-border"
            placeholder={tr('fields.suite')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={address.city || ''}
              onChange={(e) => patchAddress({ city: e.target.value })}
              className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm box-border"
              placeholder={tr('fields.city')}
            />
            <input
              value={address.state || ''}
              onChange={(e) => patchAddress({ state: e.target.value })}
              className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm box-border"
              placeholder={tr('fields.state')}
            />
          </div>

          {showMapsPreview && appleMapsUrl && googleMapsUrl && (
            <div className="flex flex-wrap gap-2 pt-1">
              {preferApple ? (
                <>
                  <a
                    href={appleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-violet-200 text-violet-700 font-bold hover:bg-violet-50 text-xs"
                  >
                    <MapPin size={16} />
                    {tr('openMaps')}
                  </a>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs"
                  >
                    {tr('openGoogleMaps')}
                  </a>
                </>
              ) : (
                <>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-violet-200 text-violet-700 font-bold hover:bg-violet-50 text-xs"
                  >
                    <MapPin size={16} />
                    {tr('openGoogleMaps')}
                  </a>
                  <a
                    href={appleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs"
                  >
                    {tr('openMaps')}
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
