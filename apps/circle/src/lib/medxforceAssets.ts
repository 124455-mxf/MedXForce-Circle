/** MedXForce CDN brand assets — same URLs as the patient app. */
export const MEDXFORCE_CDN_BASE =
  (import.meta.env.VITE_MEDXFORCE_CDN_BASE as string | undefined)?.replace(/\/$/, '') ||
  'https://assets.medxforce.io';

export const BRAND_LOGO_SMALL_URL = `${MEDXFORCE_CDN_BASE}/brand/logos/medsxforce_app_icon.webp`;
export const BRAND_LOGO_LARGE_URL = `${MEDXFORCE_CDN_BASE}/brand/logos/medxforce_large.webp`;
