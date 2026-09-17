import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

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
  title,
  showWhenOffline = false,
}: PatientOnlineIndicatorProps) {
  const t = useCircleT();
  const resolvedTitle =
    title ?? (online ? t('presence.patientAppActive') : t('presence.patientAppInactive'));

  if (!online && !showWhenOffline) return null;

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full shrink-0',
        online ? 'bg-emerald-500' : 'bg-slate-300',
        className,
      )}
      title={resolvedTitle}
      aria-label={resolvedTitle}
      role="status"
    />
  );
}
