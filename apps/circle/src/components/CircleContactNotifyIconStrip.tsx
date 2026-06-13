import type { CircleContactKind } from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CIRCLE_CONTACT_NOTIFY_META,
  notifyKeysForContactKind,
  type CircleNotifyKey,
} from './CircleContactNotifyGrid';

type CircleContactNotifyIconStripProps = {
  values: Record<CircleNotifyKey, boolean>;
  kind: CircleContactKind;
  hasEmail: boolean;
  hasMobile: boolean;
};

function isNotifyReachable(
  key: CircleNotifyKey,
  hasEmail: boolean,
  hasMobile: boolean,
): boolean {
  if (key === 'sms') return hasMobile;
  return hasEmail;
}

function isNotifyActive(
  key: CircleNotifyKey,
  values: Record<CircleNotifyKey, boolean>,
  hasEmail: boolean,
  hasMobile: boolean,
): boolean {
  return values[key] && isNotifyReachable(key, hasEmail, hasMobile);
}

export function CircleContactNotifyIconStrip({
  values,
  kind,
  hasEmail,
  hasMobile,
}: CircleContactNotifyIconStripProps) {
  const t = useCircleT();
  const keys = notifyKeysForContactKind(kind);
  const options = CIRCLE_CONTACT_NOTIFY_META.filter((option) => keys.includes(option.key));

  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      {options.map((option) => {
        const reachable = isNotifyReachable(option.key, hasEmail, hasMobile);
        const active = isNotifyActive(option.key, values, hasEmail, hasMobile);
        const Icon = option.icon;
        const label = t(option.labelKey);
        const stateLabel = active
          ? t('admin.contact.notifyEnabled')
          : reachable
            ? t('admin.contact.notifyOff')
            : option.key === 'sms'
              ? t('admin.contact.notifyMobileRequired')
              : t('admin.contact.notifyEmailRequired');

        return (
          <span
            key={option.key}
            title={`${label}: ${stateLabel}`}
            aria-label={`${label}: ${stateLabel}`}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-lg border shrink-0',
              active
                ? option.activeClass
                : reachable
                  ? 'border-slate-100 bg-white text-slate-300'
                  : 'border-slate-100 bg-slate-50 text-slate-200',
            )}
          >
            <Icon size={14} strokeWidth={2.5} aria-hidden />
          </span>
        );
      })}
    </div>
  );
}
