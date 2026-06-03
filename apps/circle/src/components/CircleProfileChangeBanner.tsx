import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Bell, Sparkles, X } from 'lucide-react';
import {
  listUnreadProfileNotifications,
  markProfileNotificationRead,
  type CirclePatientSummary,
  type CircleProfileNotificationRow,
} from '@medxforce/shared';

interface CircleProfileChangeBannerProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

export function CircleProfileChangeBanner({ user, db, patient }: CircleProfileChangeBannerProps) {
  const [notifications, setNotifications] = useState<CircleProfileNotificationRow[]>([]);

  const isProxy = !!patient.capabilities.inviteMembers;

  useEffect(() => {
    if (!isProxy) {
      setNotifications([]);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const rows = await listUnreadProfileNotifications(db, patient.patientId, user.uid, 3);
        if (active) setNotifications(rows);
      } catch (err) {
        console.warn('[CircleProfileChangeBanner]', err);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [db, isProxy, patient.patientId, user.uid]);

  if (!isProxy || notifications.length === 0) return null;

  const dismiss = async (row: CircleProfileNotificationRow) => {
    try {
      await markProfileNotificationRead(db, patient.patientId, row.id, user.uid);
      setNotifications((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      console.warn('[CircleProfileChangeBanner] dismiss', err);
    }
  };

  return (
    <div className="space-y-2">
      {notifications.map((row) => (
        <div
          key={row.id}
          className="flex items-start gap-3 p-4 rounded-2xl border border-amber-100 bg-amber-50/80"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
            {row.type === 'ai_discovery' ? <Sparkles size={18} /> : <Bell size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              {row.type === 'ai_discovery' ? 'MedIsOn profile update' : 'Patient profile update'}
            </p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{row.summary}</p>
            {row.changedLabels.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">{row.changedLabels.join(' · ')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void dismiss(row)}
            className="p-2 rounded-xl text-slate-400 hover:bg-white/80 shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
