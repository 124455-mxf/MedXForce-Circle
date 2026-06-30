/** @license SPDX-License-Identifier: Apache-2.0 */
import type { CareCalendarAddressSuggestion } from '@medxforce/shared';

function apiBase(): string {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '';
}

export async function searchCareCalendarAddresses(
  query: string,
): Promise<CareCalendarAddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const base = apiBase();
  if (!base) throw new Error('Patient API URL is not configured');

  const url = `${base}/api/address-search?${new URLSearchParams({ q })}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Address search failed');

  const data = (await response.json()) as { results?: CareCalendarAddressSuggestion[] };
  return data.results ?? [];
}
