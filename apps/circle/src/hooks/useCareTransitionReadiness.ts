import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot, type Firestore } from 'firebase/firestore';
import {
  CARE_TRANSITION_PACKS,
  careTransitionOpenItemCount,
  careTransitionProgress,
  careTransitionReadinessRef,
  careTransitionRegionFromCountry,
  canAddCircleHelpTask,
  canClaimCircleHelpTask,
  canManageCareTransitionPack,
  canViewCareTransitionTasks,
  canWorkCareTransitionTasks,
  EMPTY_CARE_TRANSITION_STATE,
  ensureCareTransitionAnnouncementPosted,
  filterChecklistForViewer,
  getCareTransitionPack,
  normalizeMemberRole,
  parseCareTransitionReadinessState,
  writeCareTransitionReadinessState,
  type CareTransitionChecklistItem,
  type CareTransitionCustomTask,
  type CareTransitionKnowCourse,
  type CareTransitionPackId,
  type CareTransitionReadinessState,
  type CareTransitionRegion,
  type CircleHelpTask,
  type CircleMemberRole,
} from '@medxforce/shared';
import {
  buildLocalizedCareTransitionAnnouncementText,
  type CareTransitionTranslateFn,
} from '../lib/localizeCareTransition';

export function useCareTransitionReadiness(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
  memberRole: CircleMemberRole | string,
  /** Optional translator for localized pack-activation announcements. */
  t?: CareTransitionTranslateFn,
) {
  const [state, setState] = useState<CareTransitionReadinessState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = normalizeMemberRole(memberRole);

  useEffect(() => {
    if (!patientId) {
      setState(null);
      return undefined;
    }
    return onSnapshot(
      careTransitionReadinessRef(db, patientId),
      (snap) => {
        if (!snap.exists()) {
          setState({ ...EMPTY_CARE_TRANSITION_STATE });
          return;
        }
        setState(parseCareTransitionReadinessState(snap.data() as Record<string, unknown>));
      },
      () => setState({ ...EMPTY_CARE_TRANSITION_STATE }),
    );
  }, [db, patientId]);

  const pack = getCareTransitionPack(state?.activePackId);
  const dismissedSet = useMemo(
    () => new Set(state?.dismissedIds ?? []),
    [state?.dismissedIds],
  );
  const doneSet = useMemo(() => new Set(state?.doneIds ?? []), [state?.doneIds]);

  const activeItems = useMemo(() => {
    if (!pack || !state) return [] as CareTransitionChecklistItem[];
    return filterChecklistForViewer(
      pack,
      state.region,
      role,
      state.customTasks,
      dismissedSet,
    );
  }, [dismissedSet, pack, role, state]);

  const dismissedItems = useMemo(() => {
    if (!pack || !state) return [] as CareTransitionChecklistItem[];
    const all = filterChecklistForViewer(
      pack,
      state.region,
      role,
      state.customTasks,
      new Set(),
    );
    return all.filter((item) => dismissedSet.has(item.id));
  }, [dismissedSet, pack, role, state]);

  const progress = careTransitionProgress(activeItems, doneSet);
  const canManage = canManageCareTransitionPack(role);
  const canWorkTasks = canWorkCareTransitionTasks(role);
  const canViewTasks = canViewCareTransitionTasks(role);
  const canAddHelp = canAddCircleHelpTask(role);
  const canClaimHelp = canClaimCircleHelpTask(role);
  const loading = patientId != null && state === null;

  const circleHelpTasks = state?.circleHelpTasks ?? [];

  const openItemCount = state ? careTransitionOpenItemCount(state, role) : 0;

  const persist = useCallback(
    async (next: CareTransitionReadinessState) => {
      if (!patientId) return { ...EMPTY_CARE_TRANSITION_STATE };
      setSaving(true);
      setError(null);
      try {
        const written = await writeCareTransitionReadinessState(
          db,
          patientId,
          next,
          memberUid,
        );
        setState(written);
        return written;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save care transition readiness.');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [db, memberUid, patientId],
  );

  const setActivePack = useCallback(
    async (packId: CareTransitionPackId | null) => {
      if (!state || !canManage || !patientId || !memberUid) return;
      const next: CareTransitionReadinessState = {
        ...state,
        activePackId: packId,
        doneIds: [],
        dismissedIds: [],
        packActivatedAt: packId ? Date.now() : null,
        // Reset markers when (re)activating so ensure can post once for this pack.
        announcedPackId: null,
        announcementPostId: null,
      };
      const written = await persist(next);
      if (packId && canManage) {
        try {
          const withAnnouncement = await ensureCareTransitionAnnouncementPosted(db, {
            patientId,
            packId,
            state: written,
            authorUid: memberUid,
            authorName: 'Care team',
            authorRole: role,
            announcementText: t
              ? buildLocalizedCareTransitionAnnouncementText(t, packId)
              : undefined,
          });
          setState(withAnnouncement);
        } catch (err) {
          console.warn('[careTransitionReadiness] announcement post skipped', err);
        }
      }
    },
    [canManage, db, memberUid, patientId, persist, role, state, t],
  );

  const setRegion = useCallback(
    async (region: CareTransitionRegion, options?: { manual?: boolean }) => {
      if (!state || !canManage) return;
      await persist({
        ...state,
        region,
        regionManual: options?.manual !== false,
      });
    },
    [canManage, persist, state],
  );

  /** Apply region from patient profile country unless the user locked a manual override. */
  const syncRegionFromCountry = useCallback(
    async (country: string | null | undefined) => {
      if (!state || !canManage || !patientId) return;
      if (state.regionManual) return;
      const nextRegion = careTransitionRegionFromCountry(country);
      if (nextRegion === state.region) return;
      await persist({
        ...state,
        region: nextRegion,
        regionManual: false,
      });
    },
    [canManage, patientId, persist, state],
  );

  const toggleDone = useCallback(
    async (itemId: string) => {
      if (!state || !canWorkTasks) return;
      const next = new Set(state.doneIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      await persist({ ...state, doneIds: [...next] });
    },
    [canWorkTasks, persist, state],
  );

  const dismissItem = useCallback(
    async (itemId: string) => {
      if (!state || !canWorkTasks) return;
      if (state.dismissedIds.includes(itemId)) return;
      await persist({
        ...state,
        dismissedIds: [...state.dismissedIds, itemId],
        doneIds: state.doneIds.filter((id) => id !== itemId),
      });
    },
    [canWorkTasks, persist, state],
  );

  const restoreDismissed = useCallback(
    async (itemId: string) => {
      if (!state || !canWorkTasks) return;
      await persist({
        ...state,
        dismissedIds: state.dismissedIds.filter((id) => id !== itemId),
      });
    },
    [canWorkTasks, persist, state],
  );

  const addCustomTask = useCallback(
    async (title: string, why: string) => {
      if (!state || !canManage) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      const task: CareTransitionCustomTask = {
        id: `custom-${Date.now()}`,
        title: trimmed.slice(0, 200),
        why: why.trim().slice(0, 500) || 'Added by your circle for this patient.',
        when: 'Custom',
      };
      await persist({
        ...state,
        customTasks: [...state.customTasks, task],
      });
    },
    [canManage, persist, state],
  );

  const removeCustomTask = useCallback(
    async (taskId: string) => {
      if (!state || !canManage) return;
      await persist({
        ...state,
        customTasks: state.customTasks.filter((t) => t.id !== taskId),
        doneIds: state.doneIds.filter((id) => id !== taskId),
        dismissedIds: state.dismissedIds.filter((id) => id !== taskId),
      });
    },
    [canManage, persist, state],
  );

  const attachKnowCourse = useCallback(
    async (course: CareTransitionKnowCourse) => {
      if (!state || !canManage) return;
      if (state.attachedKnow.some((c) => c.id === course.id)) return;
      if (pack?.suggestedKnow.some((c) => c.id === course.id)) return;
      await persist({
        ...state,
        attachedKnow: [...state.attachedKnow, course],
      });
    },
    [canManage, pack?.suggestedKnow, persist, state],
  );

  const addCircleHelpTask = useCallback(
    async (
      title: string,
      note: string,
      memberName: string,
      translations?: CircleHelpTask['translations'],
    ) => {
      if (!state || !canAddHelp || !memberUid) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      const task: CircleHelpTask = {
        id: `help-${Date.now()}`,
        title: trimmed.slice(0, 200),
        note: note.trim().slice(0, 500),
        createdAt: Date.now(),
        createdByUid: memberUid,
        createdByName: (memberName.trim() || 'Circle member').slice(0, 200),
        claimedByUid: '',
        claimedByName: '',
        assignedByUid: '',
        done: false,
        ...(translations?.length ? { translations } : {}),
      };
      await persist({
        ...state,
        circleHelpTasks: [...(state.circleHelpTasks ?? []), task].slice(0, 40),
      });
    },
    [canAddHelp, memberUid, persist, state],
  );

  const claimCircleHelpTask = useCallback(
    async (taskId: string, memberName: string) => {
      if (!state || !canClaimHelp || !memberUid) return;
      const name = memberName.trim() || 'Circle member';
      await persist({
        ...state,
        circleHelpTasks: (state.circleHelpTasks ?? []).map((task) =>
          task.id === taskId && !task.claimedByUid && !task.done
            ? { ...task, claimedByUid: memberUid, claimedByName: name.slice(0, 200) }
            : task,
        ),
      });
    },
    [canClaimHelp, memberUid, persist, state],
  );

  const releaseCircleHelpTask = useCallback(
    async (taskId: string) => {
      if (!state || !memberUid) return;
      await persist({
        ...state,
        circleHelpTasks: (state.circleHelpTasks ?? []).map((task) => {
          if (task.id !== taskId || task.done) return task;
          const canRelease = canManage || task.claimedByUid === memberUid;
          if (!canRelease) return task;
          return { ...task, claimedByUid: '', claimedByName: '', assignedByUid: '' };
        }),
      });
    },
    [canManage, memberUid, persist, state],
  );

  const toggleCircleHelpDone = useCallback(
    async (taskId: string, memberName: string) => {
      if (!state || !canWorkTasks || !memberUid) return;
      const name = (memberName.trim() || 'Circle member').slice(0, 200);
      await persist({
        ...state,
        circleHelpTasks: (state.circleHelpTasks ?? []).map((task) => {
          if (task.id !== taskId) return task;
          if (task.done) return { ...task, done: false };
          return {
            ...task,
            done: true,
            claimedByUid: memberUid,
            claimedByName: name,
          };
        }),
      });
    },
    [canWorkTasks, memberUid, persist, state],
  );

  const removeCircleHelpTask = useCallback(
    async (taskId: string) => {
      if (!state || !memberUid) return;
      await persist({
        ...state,
        circleHelpTasks: (state.circleHelpTasks ?? []).filter((task) => {
          if (task.id !== taskId) return true;
          return !(canManage || task.createdByUid === memberUid);
        }),
      });
    },
    [canManage, memberUid, persist, state],
  );

  const activateSuggestedPack = useCallback(
    async (packId: CareTransitionPackId) => {
      if (!canManage || !patientId || !memberUid) return;
      const base = state ?? { ...EMPTY_CARE_TRANSITION_STATE };
      const written = await persist({
        ...base,
        activePackId: packId,
        doneIds: [],
        dismissedIds: [],
        packActivatedAt: Date.now(),
        announcedPackId: null,
        announcementPostId: null,
      });
      try {
        const withAnnouncement = await ensureCareTransitionAnnouncementPosted(db, {
          patientId,
          packId,
          state: written,
          authorUid: memberUid,
          authorName: 'Care team',
          authorRole: role,
          announcementText: t
            ? buildLocalizedCareTransitionAnnouncementText(t, packId)
            : undefined,
        });
        setState(withAnnouncement);
      } catch (err) {
        console.warn('[careTransitionReadiness] announcement post skipped', err);
      }
    },
    [canManage, db, memberUid, patientId, persist, role, state, t],
  );

  return {
    state,
    loading,
    saving,
    error,
    pack,
    packs: CARE_TRANSITION_PACKS,
    activeItems,
    dismissedItems,
    progress,
    doneSet,
    openItemCount,
    circleHelpTasks,
    canManage,
    canWorkTasks,
    canViewTasks,
    canAddHelp,
    canClaimHelp,
    setActivePack,
    setRegion,
    syncRegionFromCountry,
    toggleDone,
    dismissItem,
    restoreDismissed,
    addCustomTask,
    removeCustomTask,
    attachKnowCourse,
    addCircleHelpTask,
    claimCircleHelpTask,
    releaseCircleHelpTask,
    toggleCircleHelpDone,
    removeCircleHelpTask,
    activateSuggestedPack,
  };
}
