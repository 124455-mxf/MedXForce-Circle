import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Bell, Sparkles, X } from 'lucide-react';
import {
  listUnreadProfileNotifications,
  markProfileNotificationRead,
  parseCircleProfileMeta,
  isGenericProfileSummary,
  type CirclePatientProfileMeta,
  type CirclePatientSummary,
  type CircleProfileNotificationRow,
} from '@medxforce/shared';
import { doc, getDoc } from 'firebase/firestore';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import {
  formatProfileNotificationTimeT,
  profileNotificationChangesT,
  profileNotificationFieldListT,
  profileNotificationTitleT,
} from '../lib/profileNotificationI18n';
import {
  filterLocallyDismissedProfileNotifications,
  rememberDismissedProfileNotificationRow,
} from '../lib/circleProfileNotificationDismiss';

interface CircleProfileChangeBannerProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

export function CircleProfileChangeBanner({ user, db, patient }: CircleProfileChangeBannerProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const [notifications, setNotifications] = useState<CircleProfileNotificationRow[]>([]);
  const [profileMeta, setProfileMeta] = useState<CirclePatientProfileMeta | null>(null);

  const isProxy = patient.role === 'proxy' && !!patient.capabilities.inviteMembers;

  useEffect(() => {
    if (!isProxy) {
      setNotifications([]);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const patientSnap = await getDoc(doc(db, 'patients', patient.patientId));
        let meta: CirclePatientProfileMeta | null = null;
        if (patientSnap.exists()) {
          meta = parseCircleProfileMeta(patientSnap.data().profileMeta);
        }
        const rows = await listUnreadProfileNotifications(db, patient.patientId, user.uid, 3);
        if (active) {
          setProfileMeta(meta);
          setNotifications(
            filterLocallyDismissedProfileNotifications(patient.patientId, user.uid, rows),
          );
        }
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
    setNotifications((prev) => prev.filter((item) => item.id !== row.id));
    rememberDismissedProfileNotificationRow(patient.patientId, user.uid, row);
    try {
      await markProfileNotificationRead(db, patient.patientId, row.id, user.uid);
    } catch (err) {
      console.warn('[CircleProfileChangeBanner] dismiss', err);
    }
  };

  return (
    <div className="space-y-2">
      {notifications.map((row) => {
        const rowMeta =
          profileMeta &&
          profileMeta.updatedAt > 0 &&
          Math.abs(row.timestamp - profileMeta.updatedAt) <= 60_000
            ? profileMeta
            : null;
        const fieldList = profileNotificationFieldListT(
          t,
          row.changedLabels,
          row.summary,
          rowMeta,
        );
        return (
        <div
          key={row.id}
          className="flex items-start gap-3 p-4 rounded-2xl border border-amber-100 bg-amber-50/80"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
            {row.type === 'ai_discovery' ? <Sparkles size={18} /> : <Bell size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                {profileNotificationTitleT(t, row.type, row.summary)}
              </p>
              {row.timestamp > 0 && (
                <span className="text-[10px] text-slate-400 shrink-0 tabular-nums whitespace-nowrap">
                  {formatProfileNotificationTimeT(t, language, row.timestamp)}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-800 mt-1 leading-snug">
              {profileNotificationChangesT(t, row.changedLabels, row.type, row.summary, rowMeta)}
            </p>
            {fieldList.length > 0 && (
              <ul className="mt-2 space-y-1">
                {fieldList.map((field) => (
                  <li key={field} className="text-xs text-slate-600 leading-snug flex items-start gap-1.5">
                    <span className="text-amber-600 shrink-0">•</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            )}
            {row.summary && fieldList.length === 0 && !isGenericProfileSummary(row.summary) && (
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{row.summary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void dismiss(row)}
            className="p-2 rounded-xl text-slate-400 hover:bg-white/80 shrink-0"
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>
        );
      })}
    </div>
  );
}
