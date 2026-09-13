import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDoc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS,
  exclusivePartnerForDashboardWidget,
  hiddenDashboardWidgetsForRolePreset,
  overlayPatientActivityDensity,
  applyExclusiveDashboardWidgetPairs,
  isCircleDashboardWidgetKey,
  isCircleDashboardWidgetVisibleForRole,
  memberDashboardLayoutLegacyRef,
  memberDashboardLayoutRef,
  parseMemberDashboardLayout,
  parsePrefsDashboardLayout,
  resolveCircleDashboardLayoutPreset,
  resolveEffectiveHiddenDashboardWidgets,
  usesIcuHomeLayout,
  writeMemberDashboardLayout,
  type CircleDashboardLayoutPreset,
  type CircleDashboardStoredPreset,
  type CircleDashboardWidgetKey,
  type CircleMemberRole,
  type ParsedCircleDashboardLayout,
  type RemoteAppMode,
} from '@medxforce/shared';

export function useCircleDashboardLayout(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
  memberRole: CircleMemberRole,
  appMode?: RemoteAppMode | null,
) {
  const [parsed, setParsed] = useState<ParsedCircleDashboardLayout | null>(null);
  const icuSlot = usesIcuHomeLayout(memberRole, appMode);

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
              setParsed({ layout: null, hasStoredLayout: false, hasStoredIcuLayout: false });
              return;
            }
            setParsed(
              parseMemberDashboardLayout(legacySnap.data() as Record<string, unknown>),
            );
          })
          .catch(() => {
            if (!cancelled) {
              setParsed({ layout: null, hasStoredLayout: false, hasStoredIcuLayout: false });
            }
          });
      },
      () => {
        if (!cancelled) {
          setParsed({ layout: null, hasStoredLayout: false, hasStoredIcuLayout: false });
        }
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [db, memberUid, patientId]);

  const hiddenWidgets = useMemo(() => {
    const effective = resolveEffectiveHiddenDashboardWidgets(
      parsed ?? { layout: null, hasStoredLayout: false, hasStoredIcuLayout: false },
      memberRole,
      appMode,
    );
    return new Set(effective);
  }, [appMode, memberRole, parsed]);

  const activePreset: CircleDashboardStoredPreset = useMemo(() => {
    if (icuSlot) {
      if (!parsed?.hasStoredIcuLayout) return 'compact';
      return resolveCircleDashboardLayoutPreset([...hiddenWidgets], memberRole, appMode);
    }
    if (!parsed?.hasStoredLayout) return 'compact';
    return resolveCircleDashboardLayoutPreset([...hiddenWidgets], memberRole, appMode);
  }, [appMode, hiddenWidgets, icuSlot, memberRole, parsed?.hasStoredIcuLayout, parsed?.hasStoredLayout]);

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
      const exclusive = applyExclusiveDashboardWidgetPairs(nextHidden);
      const preset = resolveCircleDashboardLayoutPreset(exclusive, memberRole, appMode);
      const slot = icuSlot ? 'icu' : 'daily';
      const layout = await writeMemberDashboardLayout(
        db,
        patientId,
        memberUid,
        exclusive,
        preset,
        { slot },
      );
      setParsed((prev) => {
        if (slot === 'icu') {
          return {
            layout: {
              hiddenWidgets: prev?.layout?.hiddenWidgets ?? [],
              preset: prev?.layout?.preset,
              icuHiddenWidgets: layout.icuHiddenWidgets,
              icuPreset: layout.icuPreset,
            },
            hasStoredLayout: prev?.hasStoredLayout ?? false,
            hasStoredIcuLayout: true,
          };
        }
        return {
          layout: {
            hiddenWidgets: layout.hiddenWidgets,
            preset: layout.preset,
            icuHiddenWidgets: prev?.layout?.icuHiddenWidgets,
            icuPreset: prev?.layout?.icuPreset,
          },
          hasStoredLayout: true,
          hasStoredIcuLayout: prev?.hasStoredIcuLayout ?? false,
        };
      });
    },
    [appMode, db, icuSlot, memberRole, memberUid, patientId],
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
        parsed ?? { layout: null, hasStoredLayout: false, hasStoredIcuLayout: false },
        memberRole,
        appMode,
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
    [appMode, memberRole, memberUid, parsed, patientId, persistHidden],
  );

  const applyLayoutPreset = useCallback(
    async (preset: CircleDashboardLayoutPreset) => {
      if (!patientId || !memberUid) return;
      const presetHidden = hiddenDashboardWidgetsForRolePreset(memberRole, preset, appMode);
      await persistHidden(overlayPatientActivityDensity(presetHidden, hiddenWidgets, memberRole));
    },
    [appMode, hiddenWidgets, memberRole, memberUid, persistHidden, patientId],
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
    hasStoredLayout: icuSlot
      ? (parsed?.hasStoredIcuLayout ?? false)
      : (parsed?.hasStoredLayout ?? false),
    usesIcuHomeLayout: icuSlot,
  };
}
