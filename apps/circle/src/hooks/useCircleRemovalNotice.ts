import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { deleteField, doc, onSnapshot, updateDoc, type Firestore } from 'firebase/firestore';
import type { CircleTranslator } from '../lib/circleI18nContext';

/** Shows the notice written when a proxy removes this account from one patient. */
export function useCircleRemovalNotice(
  db: Firestore,
  user: User | null,
  t: CircleTranslator,
  showToast: (message: string, tone?: 'info') => void,
): void {
  const shownAt = useRef(0);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    return onSnapshot(doc(db, 'circle_profiles', uid), (snap) => {
      const notice = snap.get('removalNotice') as
        | { patientName?: string; contributionsRemoved?: boolean; at?: number }
        | undefined;
      const at = typeof notice?.at === 'number' ? notice.at : 0;
      const patientName = String(notice?.patientName ?? '').trim();
      if (!at || !patientName || at === shownAt.current) return;
      shownAt.current = at;
      showToast(
        notice?.contributionsRemoved
          ? t('admin.users.removalNoticeRemoved', { patient: patientName })
          : t('admin.users.removalNoticeKept', { patient: patientName }),
        'info',
      );
      void updateDoc(doc(db, 'circle_profiles', uid), {
        removalNotice: deleteField(),
      }).catch(() => {
        /* The notice can show again next launch if this write fails. */
      });
    });
  }, [db, showToast, t, user?.uid]);
}
