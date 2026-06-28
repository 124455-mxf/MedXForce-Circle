export function remainingSlideshowSeconds(
  progressPercent: number,
  slideDurationSeconds: number,
): number {
  const clamped = Math.min(100, Math.max(0, progressPercent));
  return ((100 - clamped) / 100) * slideDurationSeconds;
}

export function formatSlideshowCountdown(remainingSeconds: number): string {
  const total = Math.max(0, Math.ceil(remainingSeconds));
  if (total > 99) {
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return String(total);
}
