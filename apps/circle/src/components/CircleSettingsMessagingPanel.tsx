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

const DELIVERY_OPTIONS: {
  value: CircleMessageDeliveryPreference;
  label: string;
  description: string;
  icon: typeof Smartphone;
}[] = [
  {
    value: 'app',
    label: 'Circle app',
    description: 'Read and reply in MedXForce Circle. No email copy of each message.',
    icon: Smartphone,
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Receive messages by email and reply from your inbox.',
    icon: Mail,
  },
];

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
}: {
  title: string;
  description: string;
  ariaLabel: string;
  value: CircleMessageSortOrder;
  onChange: (order: CircleMessageSortOrder) => void;
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
              {order === 'oldest' ? 'Oldest first' : 'Newest first'}
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
  const replySort = useCircleReplySortOrder();
  const threadSort = useCircleThreadSortOrder();
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
        if (active) setError('Could not load your messaging preference.');
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
        setError(err instanceof Error ? err.message : 'Could not save preference.');
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
          <h3 className="font-bold text-slate-800">Messaging settings</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Configure how you receive and reply to messages from {patient.displayName}.
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">How you receive messages</p>
          <p className="text-sm text-slate-400">
            Circle app is recommended. Email is optional for reply-by-mail.
          </p>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-2" role="radiogroup" aria-label="Message delivery">
          {DELIVERY_OPTIONS.map((option) => {
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
        title="Reply sort order"
        description="Choose whether replies in a patient conversation appear oldest-first or newest-first."
        ariaLabel="Reply sort order"
        value={replySort}
        onChange={setCircleReplySortOrder}
      />

      <MessageSortOrderControl
        title="Circle message sort order"
        description="Choose whether posts in Circle conversation and care coordination appear oldest-first or newest-first."
        ariaLabel="Circle message sort order"
        value={threadSort}
        onChange={setCircleThreadSortOrder}
      />
    </div>
  );
}
