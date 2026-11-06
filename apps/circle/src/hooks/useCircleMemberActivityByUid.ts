import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, type Firestore } from 'firebase/firestore';

export function useCircleMemberActivityByUid(
  db: Firestore,
  patientId: string | undefined,
  uids: readonly string[],
): {
  lastOpenByUid: Record<string, number>;
  presenceByUid: Record<string, number>;
  loading: boolean;
} {
  const uidKey = useMemo(() => [...uids].filter(Boolean).sort().join('\n'), [uids]);
  const [lastOpenByUid, setLastOpenByUid] = useState<Record<string, number>>({});
  const [presenceByUid, setPresenceByUid] = useState<Record<string, number>>({});
  const [profilesReady, setProfilesReady] = useState(() => uidKey.length === 0);
  const [presenceReady, setPresenceReady] = useState(!patientId);

  useEffect(() => {
    const list = uidKey ? uidKey.split('\n') : [];
    if (list.length === 0) {
      setLastOpenByUid({});
      setProfilesReady(true);
      return undefined;
    }

    setProfilesReady(false);
    const next: Record<string, number> = {};
    const seen = new Set<string>();
    const markReady = (uid: string) => {
      seen.add(uid);
      if (seen.size >= list.length) setProfilesReady(true);
    };
    const unsubs = list.map((uid) =>
      onSnapshot(
        doc(db, 'circle_profiles', uid),
        (snap) => {
          const openAt = Number(snap.data()?.lastCircleOpenAt);
          if (Number.isFinite(openAt) && openAt > 0) next[uid] = openAt;
          else delete next[uid];
          setLastOpenByUid({ ...next });
          markReady(uid);
        },
        () => {
          delete next[uid];
          setLastOpenByUid({ ...next });
          markReady(uid);
        },
      ),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [db, uidKey]);

  useEffect(() => {
    const list = uidKey ? uidKey.split('\n') : [];
    if (!patientId || list.length === 0) {
      setPresenceByUid({});
      setPresenceReady(true);
      return undefined;
    }

    setPresenceReady(false);
    return onSnapshot(
      collection(db, 'patients', patientId, 'presence'),
      (snap) => {
        const next: Record<string, number> = {};
        for (const presenceDoc of snap.docs) {
          const lastSeen = Number(presenceDoc.data()?.lastSeen);
          if (Number.isFinite(lastSeen) && lastSeen > 0) next[presenceDoc.id] = lastSeen;
        }
        setPresenceByUid(next);
        setPresenceReady(true);
      },
      () => {
        setPresenceByUid({});
        setPresenceReady(true);
      },
    );
  }, [db, patientId, uidKey]);

  return {
    lastOpenByUid,
    presenceByUid,
    loading: !profilesReady || !presenceReady,
  };
}
