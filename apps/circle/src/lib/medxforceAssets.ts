/** MedXForce CDN brand assets — same URLs as the patient app. */
export const MEDXFORCE_CDN_BASE =
  (import.meta.env.VITE_MEDXFORCE_CDN_BASE as string | undefined)?.replace(/\/$/, '') ||
  'https://assets.medxforce.io';

/** Bump when replacing files in public/brand/logos so browsers pick up new logos. */
export const BRAND_ASSET_VERSION = '20260917';

/** Sign mark (logo_sign_med_force.svg) — favicon, header icon. */
export const BRAND_LOGO_SMALL_URL = `/brand/logos/medxforce_small.svg?v=${BRAND_ASSET_VERSION}`;
/** Full wordmark (logo_med_force.svg) — login and large brand placements. */
export const BRAND_LOGO_LARGE_URL = `/brand/logos/medxforce_large.svg?v=${BRAND_ASSET_VERSION}`;
