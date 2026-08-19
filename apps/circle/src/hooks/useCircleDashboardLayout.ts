import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDoc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS,
  exclusivePartnerForDashboardWidget,
  hiddenDashboardWidgetsForRolePreset,
  isCircleDashboardWidgetKey,
  isCircleDashboardWidgetVisibleForRole,
  memberDashboardLayoutLegacyRef,
  memberDashboardLayoutRef,
  parseMemberDashboardLayout,
  parsePrefsDashboardLayout,
  resolveCircleDashboardLayoutPreset,
  resolveEffectiveHiddenDashboardWidgets,
  writeMemberDashboardLayout,
  type CircleDashboardLayout,
  type CircleDashboardLayoutPreset,
  type CircleDashboardStoredPreset,
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

    let cancelled = false;

    const unsub = onSnapshot(
      memberDashboardLayoutRef(db, patientId, memberUid),
      (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setParsed(parsePrefsDashboardLayout(snap.data() as Record<string, unknown>));
          return;
        }

        // Migrate: fall back to legacy members/{uid}.dashboardLayout once.
        void getDoc(memberDashboardLayoutLegacyRef(db, patientId, memberUid))
          .then((legacySnap) => {
            if (cancelled) return;
            if (!legacySnap.exists()) {
              setParsed({ layout: null, hasStoredLayout: false });
              return;
            }
            setParsed(
              parseMemberDashboardLayout(legacySnap.data() as Record<string, unknown>),
            );
          })
          .catch(() => {
            if (!cancelled) setParsed({ layout: null, hasStoredLayout: false });
          });
      },
      () => {
        if (!cancelled) setParsed({ layout: null, hasStoredLayout: false });
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [db, memberUid, patientId]);

  const hiddenWidgets = useMemo(() => {
    const effective = resolveEffectiveHiddenDashboardWidgets(
      parsed ?? { layout: null, hasStoredLayout: false },
      memberRole,
    );
    return new Set(effective);
  }, [memberRole, parsed]);

  const activePreset: CircleDashboardStoredPreset = useMemo(() => {
    if (!parsed?.hasStoredLayout) return 'compact';
    return resolveCircleDashboardLayoutPreset([...hiddenWidgets], memberRole);
  }, [hiddenWidgets, memberRole, parsed?.hasStoredLayout]);

  const loading = patientId != null && memberUid != null && parsed === null;

  const isWidgetVisible = useCallback(
    (key: string) => {
      if (!isCircleDashboardWidgetKey(key)) return true;
      return isCircleDashboardWidgetVisibleForRole(key, hiddenWidgets, memberRole);
    },
    [hiddenWidgets, memberRole],
  );

  const persistHidden = useCallback(
    async (nextHidden: CircleDashboardWidgetKey[]) => {
      if (!patientId || !memberUid) return;
      const preset = resolveCircleDashboardLayoutPreset(nextHidden, memberRole);
      const layout = await writeMemberDashboardLayout(
        db,
        patientId,
        memberUid,
        nextHidden,
        preset,
      );
      setParsed({ layout, hasStoredLayout: true });
    },
    [db, memberRole, memberUid, patientId],
  );

  const setWidgetVisible = useCallback(
    async (key: CircleDashboardWidgetKey, visible: boolean) => {
      if (!patientId || !memberUid) return;
      if (
        memberRole === 'friend' &&
        FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS.includes(key) &&
        visible
      ) {
        return;
      }

      const current = resolveEffectiveHiddenDashboardWidgets(
        parsed ?? { layout: null, hasStoredLayout: false },
        memberRole,
      );
      const next = new Set(current);
      if (visible) {
        next.delete(key);
        const partner = exclusivePartnerForDashboardWidget(key);
        if (partner) next.add(partner);
      } else {
        next.add(key);
      }
      await persistHidden([...next]);
    },
    [memberRole, memberUid, parsed, patientId, persistHidden],
  );

  const applyLayoutPreset = useCallback(
    async (preset: CircleDashboardLayoutPreset) => {
      if (!patientId || !memberUid) return;
      await persistHidden(hiddenDashboardWidgetsForRolePreset(memberRole, preset));
    },
    [memberRole, memberUid, persistHidden, patientId],
  );

  const resetToRoleDefaults = useCallback(async () => {
    await applyLayoutPreset('compact');
  }, [applyLayoutPreset]);

  return {
    hiddenWidgets,
    activePreset,
    loading,
    isWidgetVisible,
    setWidgetVisible,
    applyLayoutPreset,
    resetToRoleDefaults,
    hasStoredLayout: parsed?.hasStoredLayout ?? false,
  };
}
