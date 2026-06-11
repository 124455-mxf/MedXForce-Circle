import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Mail, MessageSquare, Smartphone } from 'lucide-react';
import {
  DEFAULT_CIRCLE_MESSAGE_DELIVERY,
  type CircleMessageDeliveryPreference,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  loadMemberMessageDeliveryPreference,
  saveMemberMessageDeliveryPreference,
} from '../lib/circleMessageDelivery';
import {
  setCircleReplySortOrder,
  setCircleThreadSortOrder,
  type CircleMessageSortOrder,
} from '../lib/circleMessagePreferences';
import { useCircleReplySortOrder } from '../hooks/useCircleReplySortOrder';
import { useCircleThreadSortOrder } from '../hooks/useCircleThreadSortOrder';
import { useCircleT } from '../lib/circleI18nContext';

interface CircleSettingsMessagingPanelProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

function MessageSortOrderControl({
  title,
  description,
  ariaLabel,
  value,
  onChange,
  oldestLabel,
  newestLabel,
}: {
  title: string;
  description: string;
  ariaLabel: string;
  value: CircleMessageSortOrder;
  onChange: (order: CircleMessageSortOrder) => void;
  oldestLabel: string;
  newestLabel: string;
}) {
  return (
    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
      <div className="space-y-1">
        <p className="font-bold text-slate-800">{title}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div
        className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5"
        role="group"
        aria-label={ariaLabel}
      >
        {(['oldest', 'newest'] as CircleMessageSortOrder[]).map((order) => {
          const active = value === order;
          return (
            <button
              key={order}
              type="button"
              onClick={() => onChange(order)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all',
                active
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
                {order === 'oldest' ? oldestLabel : newestLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CircleSettingsMessagingPanel({
  user,
  db,
  patient,
}: CircleSettingsMessagingPanelProps) {
  const t = useCircleT();
  const replySort = useCircleReplySortOrder();
  const threadSort = useCircleThreadSortOrder();
  const deliveryOptions: {
    value: CircleMessageDeliveryPreference;
    label: string;
    description: string;
    icon: typeof Smartphone;
  }[] = [
    {
      value: 'app',
      label: t('settings.deliveryApp'),
      description: t('settings.deliveryAppDesc'),
      icon: Smartphone,
    },
    {
      value: 'email',
      label: t('settings.deliveryEmail'),
      description: t('settings.deliveryEmailDesc'),
      icon: Mail,
    },
  ];
  const [delivery, setDelivery] = useState<CircleMessageDeliveryPreference>(
    DEFAULT_CIRCLE_MESSAGE_DELIVERY,
  );
  const [loadingPref, setLoadingPref] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingPref(true);
    void loadMemberMessageDeliveryPreference(db, patient.patientId, user.uid)
      .then((pref) => {
        if (active) setDelivery(pref);
      })
      .catch(() => {
        if (active) setError(t('settings.loadPrefFailed'));
      })
      .finally(() => {
        if (active) setLoadingPref(false);
      });
    return () => {
      active = false;
    };
  }, [db, patient.patientId, user.uid]);

  const handleDeliveryChange = useCallback(
    async (next: CircleMessageDeliveryPreference) => {
      setDelivery(next);
      setSavingPref(true);
      setError(null);
      try {
        await saveMemberMessageDeliveryPreference(db, patient.patientId, user.uid, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('settings.savePrefFailed'));
      } finally {
        setSavingPref(false);
      }
    },
    [db, patient.patientId, user.uid],
  );

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <MessageSquare size={22} />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-800">{t('settings.messagingTitle')}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('settings.messagingSubtitle', { name: patient.displayName })}
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">{t('settings.receiveTitle')}</p>
          <p className="text-sm text-slate-400">{t('settings.receiveSubtitle')}</p>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-2" role="radiogroup" aria-label={t('settings.deliveryAria')}>
          {deliveryOptions.map((option) => {
            const Icon = option.icon;
            const active = delivery === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={loadingPref || savingPref}
                onClick={() => void handleDeliveryChange(option.value)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3',
                  active
                    ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100'
                    : 'bg-white/70 border-slate-200 hover:border-slate-300',
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm">{option.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <MessageSortOrderControl
        title={t('settings.replySortTitle')}
        description={t('settings.replySortDesc')}
        ariaLabel={t('settings.replySortTitle')}
        value={replySort}
        onChange={setCircleReplySortOrder}
        oldestLabel={t('sort.oldestFirst')}
        newestLabel={t('sort.newestFirst')}
      />

      <MessageSortOrderControl
        title={t('settings.threadSortTitle')}
        description={t('settings.threadSortDesc')}
        ariaLabel={t('settings.threadSortTitle')}
        value={threadSort}
        onChange={setCircleThreadSortOrder}
        oldestLabel={t('sort.oldestFirst')}
        newestLabel={t('sort.newestFirst')}
      />
    </div>
  );
}
