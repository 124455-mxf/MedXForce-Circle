import { AlertCircle, Bell, MessageSquare, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

const NOTIFY_META = [
  {
    key: 'alert' as const,
    labelKey: 'admin.contact.notifyAlert',
    descKey: 'admin.contact.notifyAlertDesc',
    icon: Bell,
    activeClass: 'bg-red-50 border-red-200 text-red-600',
    iconClass: 'bg-red-600 text-white',
  },
  {
    key: 'attention' as const,
    labelKey: 'admin.contact.notifyAttention',
    descKey: 'admin.contact.notifyAttentionDesc',
    icon: AlertCircle,
    activeClass: 'bg-orange-50 border-orange-200 text-orange-600',
    iconClass: 'bg-orange-600 text-white',
  },
  {
    key: 'message' as const,
    labelKey: 'admin.contact.notifyMessage',
    descKey: 'admin.contact.notifyMessageDesc',
    icon: MessageSquare,
    activeClass: 'bg-blue-50 border-blue-200 text-blue-600',
    iconClass: 'bg-blue-600 text-white',
  },
  {
    key: 'sms' as const,
    labelKey: 'admin.contact.notifySms',
    descKey: 'admin.contact.notifySmsDesc',
    icon: Smartphone,
    activeClass: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    iconClass: 'bg-emerald-600 text-white',
  },
];

export type CircleNotifyKey = (typeof NOTIFY_META)[number]['key'];

type CircleContactNotifyGridProps = {
  values: Record<CircleNotifyKey, boolean>;
  hasEmail: boolean;
  hasMobile: boolean;
  keys?: readonly CircleNotifyKey[];
  /** When true, SMS cannot be toggled (non-proxy self-service). */
  lockSms?: boolean;
  onToggle: (key: CircleNotifyKey) => void;
};

export function CircleContactNotifyGrid({
  values,
  hasEmail,
  hasMobile,
  keys,
  lockSms = false,
  onToggle,
}: CircleContactNotifyGridProps) {
  const t = useCircleT();
  const options = keys
    ? NOTIFY_META.filter((option) => keys.includes(option.key))
    : NOTIFY_META;

  return (
    <div
      className={cn(
        'grid gap-2',
        options.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2',
      )}
    >
      {options.map((option) => {
        const active = values[option.key];
        const needsEmail = option.key === 'alert' || option.key === 'attention' || option.key === 'message';
        const needsMobile = option.key === 'sms';
        const locked = option.key === 'sms' && lockSms;
        const reachable =
          !locked && ((needsEmail && hasEmail) || (needsMobile && hasMobile) || (!needsEmail && !needsMobile));

        return (
          <button
            key={option.key}
            type="button"
            disabled={!reachable}
            onClick={() => {
              if (!reachable) return;
              onToggle(option.key);
            }}
            className={cn(
              'relative overflow-hidden p-3 rounded-2xl border text-left transition-all min-w-0',
              active && reachable
                ? option.activeClass
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200',
              !reachable && 'opacity-70 cursor-not-allowed',
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  active && reachable ? option.iconClass : 'bg-slate-50 text-slate-400',
                )}
              >
                <option.icon size={16} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide">{t(option.labelKey)}</p>
                <p className="text-[10px] font-medium opacity-70">{t(option.descKey)}</p>
              </div>
            </div>
            {!reachable && (
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                {locked
                  ? t('admin.contact.notifyManagedByProxy')
                  : needsMobile
                    ? t('admin.contact.notifyMobileRequired')
                    : t('admin.contact.notifyEmailRequired')}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function notifyKeysForContactKind(
  kind: 'caregiver' | 'family' | 'friend' | 'contact',
): readonly CircleNotifyKey[] {
  return kind === 'contact' ? ['message', 'sms'] : ['alert', 'attention', 'message', 'sms'];
}
