import type { CareCalendarVisitBrief } from '@medxforce/shared';
import { parseMedxforceApiJson, resolveMedxforceApiBase } from '../lib/medxforceApi';
import type { VisitBriefAnalyticsContext } from '../lib/circleAnalyticsDetailRange';

export async function generateVisitBrief(params: {
  patientId: string;
  careCalendarEntryId: string;
  generatedByUid?: string;
  generatedByName?: string;
  assessmentHighlights?: string[];
  analyticsWindow?: VisitBriefAnalyticsContext;
}): Promise<CareCalendarVisitBrief> {
  const base = resolveMedxforceApiBase();
  if (!base) {
    throw new Error('Patient API is not configured (VITE_MEDXFORCE_API_URL).');
  }
  const res = await fetch(`${base}/api/visit-brief/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseMedxforceApiJson<{ success: boolean; brief: CareCalendarVisitBrief }>(res);
  return data.brief;
}
