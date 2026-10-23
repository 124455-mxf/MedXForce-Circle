import type { CareCalendarEntryKind } from '@medxforce/shared';
import type { CareCalendarEpisodePatchInput } from '@medxforce/shared';
import { parseMedxforceApiJson, resolveMedxforceApiBase } from '../lib/medxforceApi';

export async function patchCareCalendarEpisodeFields(params: {
  patientId: string;
  entryId: string;
  kind: CareCalendarEntryKind;
} & CareCalendarEpisodePatchInput): Promise<void> {
  const base = resolveMedxforceApiBase();
  if (!base) {
    throw new Error('Patient API is not configured (VITE_MEDXFORCE_API_URL).');
  }
  const { patientId, entryId, kind, ...episode } = params;
  const res = await fetch(`${base}/api/care-calendar/episode-patch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, entryId, kind, ...episode }),
  });
  await parseMedxforceApiJson<{ success: boolean }>(res);
}
