/** Circle UI text size preference — scales rem-based Tailwind via root font-size. */

export type CircleTextSize = 'small' | 'medium' | 'large';

export const CIRCLE_TEXT_SIZE_STORAGE_KEY = 'circleTextSize';

export const CIRCLE_TEXT_SIZE_CHANGED = 'circle-text-size-changed';

export const CIRCLE_TEXT_SIZE_OPTIONS: readonly CircleTextSize[] = [
  'small',
  'medium',
  'large',
] as const;

/** Root font-size percentages — Medium matches browser default (usually 16px). */
export const CIRCLE_TEXT_SIZE_ROOT_PERCENT: Record<CircleTextSize, string> = {
  small: '87.5%',
  medium: '100%',
  large: '112.5%',
};

export function normalizeCircleTextSize(value: unknown): CircleTextSize {
  if (value === 'small' || value === 'large') return value;
  return 'medium';
}

export function circleTextSizeKeyForUid(uid: string): string {
  return `medx_circle_text_size:${uid}`;
}

export function getCircleTextSize(): CircleTextSize {
  try {
    return normalizeCircleTextSize(localStorage.getItem(CIRCLE_TEXT_SIZE_STORAGE_KEY));
  } catch {
    return 'medium';
  }
}

export function applyCircleTextSize(size: CircleTextSize): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.fontSize = CIRCLE_TEXT_SIZE_ROOT_PERCENT[size];
  document.documentElement.dataset.circleTextSize = size;
}

export function setCircleTextSize(size: CircleTextSize, options?: { uid?: string | null }): void {
  const next = normalizeCircleTextSize(size);
  try {
    const uid = options?.uid?.trim();
    if (uid) {
      localStorage.setItem(circleTextSizeKeyForUid(uid), next);
      localStorage.removeItem(CIRCLE_TEXT_SIZE_STORAGE_KEY);
    } else {
      localStorage.setItem(CIRCLE_TEXT_SIZE_STORAGE_KEY, next);
    }
  } catch {
    /* ignore */
  }
  applyCircleTextSize(next);
  try {
    window.dispatchEvent(new Event(CIRCLE_TEXT_SIZE_CHANGED));
  } catch {
    /* ignore */
  }
}

/** Apply cached preference as early as possible (before React paint). */
export function bootstrapCircleTextSize(): CircleTextSize {
  const size = getCircleTextSize();
  applyCircleTextSize(size);
  return size;
}
