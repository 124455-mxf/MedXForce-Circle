import { cn } from '../lib/utils';

/** Pill/badge counters cap at 99+ from 100 upward. */
export function formatCircleBadgeCount(count: number): string {
  if (count >= 100) return '99+';
  return String(count);
}

function badgeMinWidthClass(count: number): string {
  return count >= 100 ? 'min-w-[22px] px-1' : 'min-w-[14px] px-0.5';
}

/** Red pill counters — matches Circle bottom nav badge styling. */
export function CircleNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = formatCircleBadgeCount(count);
  return (
    <span
      className={cn(
        'absolute -top-1 -right-2 h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold leading-none flex items-center justify-center tabular-nums pointer-events-none ring-2 ring-white',
        badgeMinWidthClass(count),
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}

/** Inline tab label badge (In/Out, Archived, etc.). */
export function CircleTabCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = formatCircleBadgeCount(count);
  return (
    <span
      className={cn(
        'h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold leading-none inline-flex items-center justify-center tabular-nums shrink-0',
        badgeMinWidthClass(count),
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}

type CircleFolderCountBadgeProps = {
  unread: number;
  total: number;
  placement?: 'inline' | 'overlay';
  /** Active primary pill (e.g. blue browse tab). */
  onPrimary?: boolean;
};

/** Red when unread > 0; otherwise gray total for the folder. Hidden when empty. */
export function CircleFolderCountBadge({
  unread,
  total,
  placement = 'inline',
  onPrimary = false,
}: CircleFolderCountBadgeProps) {
  const showUnread = unread > 0;
  const count = showUnread ? unread : total;
  if (count <= 0) return null;

  const label = formatCircleBadgeCount(count);
  const toneClass = showUnread
    ? 'bg-red-500 text-white ring-white'
    : onPrimary
      ? 'bg-white/25 text-white ring-white/40'
      : 'bg-slate-200 text-slate-600 ring-white';

  const sharedClass = cn(
    'h-[14px] rounded-full text-[9px] font-bold leading-none flex items-center justify-center tabular-nums pointer-events-none ring-2',
    badgeMinWidthClass(count),
    toneClass,
  );

  if (placement === 'overlay') {
    return (
      <span className={cn(sharedClass, 'absolute -top-0.5 -right-1.5')} aria-hidden>
        {label}
      </span>
    );
  }

  return (
    <span className={cn(sharedClass, 'inline-flex shrink-0')} aria-hidden>
      {label}
    </span>
  );
}

