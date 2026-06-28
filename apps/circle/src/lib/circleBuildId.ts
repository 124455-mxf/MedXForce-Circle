declare const __CIRCLE_BUILD_ID__: string | undefined;
declare const __CIRCLE_APP_VERSION__: string | undefined;
declare const __CIRCLE_GIT_SHA__: string | undefined;

/** Baked in at production build — use to verify hosted vs localhost bundle. */
export const CIRCLE_BUILD_ID =
  typeof __CIRCLE_BUILD_ID__ !== 'undefined' ? __CIRCLE_BUILD_ID__ : 'dev';

export const CIRCLE_APP_VERSION =
  typeof __CIRCLE_APP_VERSION__ !== 'undefined' ? __CIRCLE_APP_VERSION__ : '0.0.0-dev';

export const CIRCLE_GIT_SHA =
  typeof __CIRCLE_GIT_SHA__ !== 'undefined' ? __CIRCLE_GIT_SHA__ : 'dev';

/** Shown on startup splash — e.g. "v0.1.0 · 43ec8fa". */
export function formatCircleBuildLabel(): string {
  return `v${CIRCLE_APP_VERSION} · ${CIRCLE_GIT_SHA}`;
}

/** Full build stamp for support / debugging. */
export function formatCircleBuildDetail(): string {
  return `${formatCircleBuildLabel()} · ${CIRCLE_BUILD_ID}`;
}
