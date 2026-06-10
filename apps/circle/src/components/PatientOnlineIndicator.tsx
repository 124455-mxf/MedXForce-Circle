import { cn } from '../lib/utils';

type PatientOnlineIndicatorProps = {
  online: boolean;
  className?: string;
  title?: string;
  /** Show a muted dot when offline (Circle sub-page header). */
  showWhenOffline?: boolean;
};

export function PatientOnlineIndicator({
  online,
  className,
  title = online ? 'Patient app is active' : 'Patient app is not active',
  showWhenOffline = false,
}: PatientOnlineIndicatorProps) {
  if (!online && !showWhenOffline) return null;

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full shrink-0',
        online ? 'bg-emerald-500' : 'bg-slate-300',
        className,
      )}
      title={title}
      aria-label={title}
      role="status"
    />
  );
}
