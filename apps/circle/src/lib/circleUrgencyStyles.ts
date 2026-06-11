import { cn } from './utils';
import type { CircleAlertAttentionKind } from './circleAlertAttentionUrgency';

/** Shared urgency tokens — refined accents instead of flat red/blue fills. */
export function circleUrgencyInboxRowClass(
  kind: CircleAlertAttentionKind | null,
  urgent: boolean,
  unread: boolean,
  summaryRow: boolean,
): string {
  if (summaryRow) {
    return unread
      ? 'border-indigo-200/80 bg-white shadow-sm'
      : 'border-indigo-100 bg-white shadow-sm hover:border-indigo-200/80 hover:bg-indigo-50/30';
  }
  if (kind && urgent) {
    return kind === 'alert'
      ? 'bg-white border border-red-100/80 shadow-sm'
      : 'bg-white border border-sky-100/80 shadow-sm';
  }
  if (unread) {
    return 'bg-red-50/35 hover:bg-red-50/50';
  }
  return 'hover:bg-slate-50/80';
}

export function circleUrgencyLeftAccentClass(
  kind: CircleAlertAttentionKind | null,
  urgent: boolean,
  unread: boolean,
  summaryRow: boolean,
): string | false {
  if (!unread) return false;
  if (summaryRow) return 'circle-urgency-accent-indigo';
  if (kind && urgent) {
    return kind === 'alert' ? 'circle-urgency-accent-alert' : 'circle-urgency-accent-attention';
  }
  if (kind) {
    return kind === 'alert' ? 'circle-urgency-accent-alert-soft' : 'circle-urgency-accent-attention-soft';
  }
  return 'circle-urgency-accent-unread';
}

export function circleUrgencyStatusBadgeClass(
  kind: 'alert' | 'attention' | 'new-summary' | 'new-reply' | 'new-message',
): string {
  const base =
    'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ring-1 ring-inset';
  switch (kind) {
    case 'alert':
      return cn(base, 'bg-red-50 text-red-800 ring-red-200/70 circle-urgency-badge-alert');
    case 'attention':
      return cn(base, 'bg-sky-50 text-sky-800 ring-sky-200/70 circle-urgency-badge-attention');
    case 'new-summary':
      return cn(base, 'bg-indigo-50 text-indigo-800 ring-indigo-200/70');
    case 'new-reply':
    case 'new-message':
      return cn(base, 'bg-red-50 text-red-800 ring-red-200/70');
    default:
      return base;
  }
}

export function circleUrgencyBannerWrapClass(
  kind: CircleAlertAttentionKind,
  urgent: boolean,
): string {
  const base =
    'relative overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow';
  if (kind === 'alert') {
    return cn(
      base,
      urgent
        ? 'border-red-100/90 circle-urgency-banner-card-alert'
        : 'border-red-100/70',
    );
  }
  return cn(
    base,
    urgent
      ? 'border-sky-100/90 circle-urgency-banner-card-attention'
      : 'border-sky-100/70',
  );
}

export function circleUrgencyBannerIconClass(kind: CircleAlertAttentionKind): string {
  return kind === 'alert'
    ? 'border-red-100 bg-gradient-to-br from-red-50 to-white text-red-600'
    : 'border-sky-100 bg-gradient-to-br from-sky-50 to-white text-sky-600';
}

export function circleUrgencyBannerTitleClass(kind: CircleAlertAttentionKind): string {
  return kind === 'alert' ? 'text-red-900' : 'text-sky-900';
}
