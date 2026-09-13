/** MedXForce CDN brand assets — same URLs as the patient app. */
export const MEDXFORCE_CDN_BASE =
  (import.meta.env.VITE_MEDXFORCE_CDN_BASE as string | undefined)?.replace(/\/$/, '') ||
  'https://assets.medxforce.io';

/** Bump when replacing files at the same CDN paths so browsers pick up new logos. */
export const BRAND_ASSET_VERSION = '20260909b';

export const BRAND_LOGO_SMALL_URL = `${MEDXFORCE_CDN_BASE}/brand/logos/medxforce_small.webp?v=${BRAND_ASSET_VERSION}`;
export const BRAND_LOGO_LARGE_URL = `${MEDXFORCE_CDN_BASE}/brand/logos/medxforce_large.webp?v=${BRAND_ASSET_VERSION}`;
