import { useCallback, useEffect, useState } from 'react';

export type LightboxStageBounds = { width: number; height: number };

export type LightboxMediaFit = {
  maxWidth: number;
  maxHeight: number;
  fillRatio: number;
  aspect: number;
  radiusClass: string;
  showBackdrop: boolean;
  objectFit: 'contain';
};

export function fitMediaInLightboxStage(
  mediaWidth: number,
  mediaHeight: number,
  stage: LightboxStageBounds,
): Pick<LightboxMediaFit, 'maxWidth' | 'maxHeight' | 'fillRatio' | 'aspect'> {
  const safeW = Math.max(1, mediaWidth);
  const safeH = Math.max(1, mediaHeight);
  const aspect = safeW / safeH;

  if (stage.width <= 0 || stage.height <= 0) {
    return { maxWidth: 0, maxHeight: 0, fillRatio: 0, aspect };
  }

  const stageAspect = stage.width / stage.height;
  let maxWidth: number;
  let maxHeight: number;

  if (aspect > stageAspect) {
    maxWidth = stage.width;
    maxHeight = stage.width / aspect;
  } else {
    maxHeight = stage.height;
    maxWidth = stage.height * aspect;
  }

  const fillRatio = (maxWidth * maxHeight) / (stage.width * stage.height);
  return { maxWidth, maxHeight, fillRatio, aspect };
}

export function capLightboxFitToNativeSize(
  maxWidth: number,
  maxHeight: number,
  nativeWidth: number,
  nativeHeight: number,
): { maxWidth: number; maxHeight: number } {
  if (maxWidth <= nativeWidth && maxHeight <= nativeHeight) {
    return { maxWidth, maxHeight };
  }

  const scale = Math.min(1, nativeWidth / maxWidth, nativeHeight / maxHeight);
  return {
    maxWidth: Math.max(1, Math.round(maxWidth * scale)),
    maxHeight: Math.max(1, Math.round(maxHeight * scale)),
  };
}

export function lightboxCornerRadiusClass(aspect: number): string {
  if (aspect >= 3.5) return 'rounded-xl';
  if (aspect >= 2.2) return 'rounded-2xl';
  if (aspect <= 0.45) return 'rounded-2xl';
  return 'rounded-3xl';
}

export function buildLightboxMediaFit(
  mediaWidth: number,
  mediaHeight: number,
  stage: LightboxStageBounds,
): LightboxMediaFit | null {
  if (mediaWidth <= 0 || mediaHeight <= 0 || stage.width <= 0 || stage.height <= 0) {
    return null;
  }

  const containFit = fitMediaInLightboxStage(mediaWidth, mediaHeight, stage);
  const { aspect, maxWidth, maxHeight } = containFit;
  const fillRatio =
    (maxWidth * maxHeight) / (stage.width * stage.height);

  return {
    maxWidth,
    maxHeight,
    fillRatio,
    aspect,
    radiusClass: lightboxCornerRadiusClass(aspect),
    showBackdrop: false,
    objectFit: 'contain',
  };
}

/** Inner content box of a padded lightbox stage (excludes padding). */
export function measureLightboxContentBox(element: HTMLElement): LightboxStageBounds {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return {
    width: Math.max(0, Math.round(rect.width - padX)),
    height: Math.max(0, Math.round(rect.height - padY)),
  };
}

export function useLightboxStageBounds<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [bounds, setBounds] = useState<LightboxStageBounds>({ width: 0, height: 0 });
  const ref = useCallback((node: T | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) {
      setBounds({ width: 0, height: 0 });
      return;
    }

    const update = () => {
      setBounds(measureLightboxContentBox(element));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [element]);

  return { ref, bounds };
}
