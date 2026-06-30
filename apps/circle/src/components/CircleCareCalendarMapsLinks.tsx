/** @license SPDX-License-Identifier: Apache-2.0 */
import { MapPin } from 'lucide-react';
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
};

export function CircleCareCalendarMapsLinks({
  address,
  ct,
  showFullAddress = false,
  sectionHeader,
}: CircleCareCalendarMapsLinksProps) {
  if (!hasCareCalendarAddress(address)) return null;

  const appleMapsUrl = buildAppleMapsUrl(address);
  const googleMapsUrl = buildGoogleMapsUrl(address);
  const preferApple = prefersAppleMapsPlatform();
  const addressLines = showFullAddress ? formatCareCalendarAddressDisplayLines(address) : [];
  const linkClass =
    'inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 hover:underline';
  const secondaryClass =
    'inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:underline';

  const mapsLinks = (
    <div className="flex flex-wrap gap-2">
      {preferApple ? (
        <>
          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <MapPin size={12} />
            {ct('openMaps')}
          </a>
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={secondaryClass}>
            {ct('openGoogleMaps')}
          </a>
        </>
      ) : (
        <>
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <MapPin size={12} />
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
              <MapPin size={12} />
              {address.label || ct('openMaps')}
            </a>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={secondaryClass}>
              {ct('openGoogleMaps')}
            </a>
          </>
        ) : (
          <>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <MapPin size={12} />
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
    <div className="space-y-1">
      {sectionHeader ? (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{sectionHeader}</p>
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
