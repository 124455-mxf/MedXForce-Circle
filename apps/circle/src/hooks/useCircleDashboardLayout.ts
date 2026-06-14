import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot, type Firestore } from 'firebase/firestore';
import {
  defaultHiddenDashboardWidgetsForRole,
  isCircleDashboardWidgetKey,
  isCircleDashboardWidgetVisible,
  memberDashboardLayoutRef,
  parseMemberDashboardLayout,
  resolveEffectiveHiddenDashboardWidgets,
  writeMemberDashboardLayout,
  type CircleDashboardLayout,
  type CircleDashboardWidgetKey,
  type CircleMemberRole,
} from '@medxforce/shared';

export function useCircleDashboardLayout(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
  memberRole: CircleMemberRole,
) {
  const [parsed, setParsed] = useState<{
    layout: CircleDashboardLayout | null;
    hasStoredLayout: boolean;
  } | null>(null);

  useEffect(() => {
    if (!patientId || !memberUid) {
      setParsed(null);
      return undefined;
    }

    return onSnapshot(
      memberDashboardLayoutRef(db, patientId, memberUid),
      (snap) => {
        if (!snap.exists()) {
          setParsed({ layout: null, hasStoredLayout: false });
          return;
        }
        setParsed(parseMemberDashboardLayout(snap.data() as Record<string, unknown>));
      },
      () => setParsed({ layout: null, hasStoredLayout: false }),
    );
  }, [db, memberUid, patientId]);

  const hiddenWidgets = useMemo(() => {
    const effective = resolveEffectiveHiddenDashboardWidgets(
      parsed ?? { layout: null, hasStoredLayout: false },
      memberRole,
    );
    return new Set(effective);
  }, [memberRole, parsed]);

  const loading = patientId != null && memberUid != null && parsed === null;

  const isWidgetVisible = useCallback(
    (key: string) =>
      isCircleDashboardWidgetKey(key)
        ? isCircleDashboardWidgetVisible(key, hiddenWidgets)
        : true,
    [hiddenWidgets],
  );

  const setWidgetVisible = useCallback(
    async (key: CircleDashboardWidgetKey, visible: boolean) => {
      if (!patientId || !memberUid) return;

      const current = resolveEffectiveHiddenDashboardWidgets(
        parsed ?? { layout: null, hasStoredLayout: false },
        memberRole,
      );
      const next = new Set(current);
      if (visible) next.delete(key);
      else next.add(key);

      const layout = await writeMemberDashboardLayout(
        db,
        patientId,
        memberUid,
        [...next],
      );
      setParsed({ layout, hasStoredLayout: true });
    },
    [db, memberRole, memberUid, parsed, patientId],
  );

  const resetToRoleDefaults = useCallback(async () => {
    if (!patientId || !memberUid) return;

    const layout = await writeMemberDashboardLayout(
      db,
      patientId,
      memberUid,
      defaultHiddenDashboardWidgetsForRole(memberRole),
    );
    setParsed({ layout, hasStoredLayout: true });
  }, [db, memberRole, memberUid, patientId]);

  return {
    hiddenWidgets,
    loading,
    isWidgetVisible,
    setWidgetVisible,
    resetToRoleDefaults,
    hasStoredLayout: parsed?.hasStoredLayout ?? false,
  };
}
