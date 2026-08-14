/** @license SPDX-License-Identifier: Apache-2.0 */
import { MapPin, type LucideIcon } from 'lucide-react';
import {
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
  formatCareCalendarAddressDisplayLines,
  hasCareCalendarAddress,
  prefersAppleMapsPlatform,
  type CareCalendarAddress,
} from '@medxforce/shared';

type CircleCareCalendarMapsLinksProps = {
  address: CareCalendarAddress;
  ct: (key: string) => string;
  showFullAddress?: boolean;
  sectionHeader?: string;
  sectionHeaderIcon?: LucideIcon;
};

export function CircleCareCalendarMapsLinks({
  address,
  ct,
  showFullAddress = false,
  sectionHeader,
  sectionHeaderIcon: SectionHeaderIcon,
}: CircleCareCalendarMapsLinksProps) {
  if (!hasCareCalendarAddress(address)) return null;

  const appleMapsUrl = buildAppleMapsUrl(address);
  const googleMapsUrl = buildGoogleMapsUrl(address);
  const preferApple = prefersAppleMapsPlatform();
  const addressLines = showFullAddress ? formatCareCalendarAddressDisplayLines(address) : [];
  const linkClass =
    'inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 hover:underline';
  const secondaryClass =
    'inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:underline';

  const mapsLinks = (
    <div className="flex flex-wrap gap-2">
      {preferApple ? (
        <>
          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <MapPin size={14} />
            {ct('openMaps')}
          </a>
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={secondaryClass}>
            {ct('openGoogleMaps')}
          </a>
        </>
      ) : (
        <>
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <MapPin size={14} />
            {ct('openGoogleMaps')}
          </a>
          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className={secondaryClass}>
            {ct('openMaps')}
          </a>
        </>
      )}
    </div>
  );

  if (!showFullAddress) {
    return (
      <div className="flex flex-wrap gap-2">
        {preferApple ? (
          <>
            <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <MapPin size={14} />
              {address.label || ct('openMaps')}
            </a>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={secondaryClass}>
              {ct('openGoogleMaps')}
            </a>
          </>
        ) : (
          <>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <MapPin size={14} />
              {address.label || ct('openGoogleMaps')}
            </a>
            <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className={secondaryClass}>
              {ct('openMaps')}
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {sectionHeader ? (
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          {SectionHeaderIcon ? (
            <SectionHeaderIcon size={14} className="shrink-0 text-violet-600" aria-hidden />
          ) : null}
          {sectionHeader}
        </p>
      ) : null}
      {addressLines.map((line) => (
        <p key={line} className="text-sm text-slate-600">
          {line}
        </p>
      ))}
      {mapsLinks}
    </div>
  );
}
