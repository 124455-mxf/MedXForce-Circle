import { useEffect, useState } from 'react';
import { shouldRequireCirclePortrait } from '../lib/circleDeviceProfile';

export function useCirclePortraitRequired(): boolean {
  const [required, setRequired] = useState(() => shouldRequireCirclePortrait());

  useEffect(() => {
    const update = () => setRequired(shouldRequireCirclePortrait());
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return required;
}
