declare const __CIRCLE_BUILD_ID__: string | undefined;

/** Baked in at production build — use to verify hosted vs localhost bundle. */
export const CIRCLE_BUILD_ID =
  typeof __CIRCLE_BUILD_ID__ !== 'undefined' ? __CIRCLE_BUILD_ID__ : 'dev';
