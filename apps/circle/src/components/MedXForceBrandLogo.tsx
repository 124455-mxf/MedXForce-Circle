import { cn } from '@medxforce/shared';
import { BRAND_LOGO_LARGE_URL, BRAND_LOGO_SMALL_URL } from '../lib/medxforceAssets';

interface MedXForceBrandLogoProps {
  variant?: 'small' | 'large';
  className?: string;
}

export function MedXForceBrandLogo({ variant = 'small', className }: MedXForceBrandLogoProps) {
  return (
    <img
      src={variant === 'large' ? BRAND_LOGO_LARGE_URL : BRAND_LOGO_SMALL_URL}
      alt="MedXForce"
      className={cn(
        'object-contain',
        variant === 'small' ? 'w-7 h-7' : 'w-40 h-auto',
        className,
      )}
      referrerPolicy="no-referrer"
    />
  );
}
