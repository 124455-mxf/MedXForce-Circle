/** UTC offset in minutes for an IANA timezone at a given instant (includes DST). */
export function getTimeZoneUtcOffsetMinutes(timeZone: string, date = new Date()): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const zoneDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return (zoneDate.getTime() - utcDate.getTime()) / 60_000;
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Positive when patient local time is ahead of the viewer's. */
export function getPatientViewerTimeDifferenceMinutes(
  patientTimeZone: string,
  viewerTimeZone: string,
  date = new Date(),
): number {
  return (
    getTimeZoneUtcOffsetMinutes(patientTimeZone, date) -
    getTimeZoneUtcOffsetMinutes(viewerTimeZone, date)
  );
}

export function splitTimeDifferenceMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const abs = Math.abs(totalMinutes);
  return {
    hours: Math.floor(abs / 60),
    minutes: abs % 60,
  };
}
