import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { MedXForceBrandLogo } from './MedXForceBrandLogo';
import { cancelScheduledAccountDeletion } from '../services/deleteSignedInAccount';
import { useCircleT } from '../lib/circleI18nContext';

export type AccountDeletionHold = {
  eraseAt: number;
  deleteContributions: boolean;
};

export function useAccountDeletionHold(
  db: Firestore | null,
  uid: string | undefined,
): AccountDeletionHold | null | undefined {
  const [hold, setHold] = useState<AccountDeletionHold | null | undefined>(uid ? undefined : null);

  useEffect(() => {
    if (!db || !uid) {
      setHold(null);
      return;
    }
    setHold(undefined);
    return onSnapshot(
      doc(db, 'circle_profiles', uid),
      (snap) => {
        const raw = snap.data()?.accountDeletion as
          | { eraseAt?: unknown; deleteContributions?: unknown }
          | undefined;
        const eraseAt = typeof raw?.eraseAt === 'number' ? raw.eraseAt : 0;
        if (eraseAt > Date.now()) {
          setHold({ eraseAt, deleteContributions: raw?.deleteContributions === true });
        } else {
          setHold(null);
        }
      },
      () => setHold(null),
    );
  }, [db, uid]);

  return hold;
}

export function CircleAccountDeletionHold({
  eraseAt,
  deleteContributions,
  onSignOut,
}: AccountDeletionHold & { onSignOut: () => void }) {
  const t = useCircleT();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const date = new Date(eraseAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-100">
      <div className="bg-white p-6 rounded-[28px] shadow-xl max-w-sm w-full space-y-5 border border-slate-100 text-center">
        <div className="flex justify-center">
          <MedXForceBrandLogo variant="large" className="w-44" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{t('drawer.holdTitle')}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          {deleteContributions
            ? t('drawer.holdRemoved', { date })
            : t('drawer.holdKept', { date })}
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={working}
          onClick={() => {
            setWorking(true);
            setError('');
            void cancelScheduledAccountDeletion()
              .catch(() => setError(t('drawer.deleteAccountFailed')))
              .finally(() => setWorking(false));
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {working ? <Loader2 size={16} className="animate-spin" /> : null}
          {working ? t('drawer.deleteAccountWorking') : t('drawer.cancelScheduledDeletion')}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold"
        >
          {t('drawer.signOut')}
        </button>
      </div>
    </div>
  );
}
