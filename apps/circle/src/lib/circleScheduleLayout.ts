/** @license SPDX-License-Identifier: Apache-2.0 */

/** Scrollable week grid — compact when day detail sits below on tablet portrait. */
export const CIRCLE_SCHEDULE_WEEK_SCROLL_CLASS =
  'flex-1 min-h-0 overflow-auto overscroll-contain rounded-xl border border-slate-100 schedule-week-scroll tablet-portrait:flex-none tablet-portrait:min-h-0';

/** Week view shell — leave room for day-detail panel on tablet portrait. */
export const CIRCLE_SCHEDULE_WEEK_VIEW_SHELL_CLASS =
  'flex flex-col min-h-0 flex-1 tablet-portrait:flex-initial tablet-portrait:shrink-0';

export const CIRCLE_SCHEDULE_DAY_DETAIL_PANEL_CLASS =
  'rounded-2xl border border-slate-100 bg-slate-50/80 p-5 space-y-5';

export const CIRCLE_SCHEDULE_DAY_DETAIL_SECTION_CLASS = 'space-y-3';
