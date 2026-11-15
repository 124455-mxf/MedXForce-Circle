/** @license SPDX-License-Identifier: Apache-2.0 */

type TabPrefs = {
  featuresVisibility?: Record<string, unknown>;
};

/** Care calendar tab — independent of the Assessments sidebar tab. */
export function isScheduleEnabled(prefs: TabPrefs | undefined): boolean {
  const schedule = prefs?.featuresVisibility?.schedule;
  if (schedule === undefined) return true;
  return !!schedule;
}
