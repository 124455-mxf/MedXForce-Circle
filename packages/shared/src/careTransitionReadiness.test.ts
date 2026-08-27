import assert from 'node:assert/strict';
import {
  careTransitionFolderCounts,
  careTransitionOpenItemCount,
  careTransitionPackRemainingCount,
  careTransitionVisiblePackItems,
  EMPTY_CARE_TRANSITION_STATE,
  type CareTransitionReadinessState,
  type CircleHelpTask,
} from './careTransitionReadiness';

function draftIcuToWard(overrides: Partial<CareTransitionReadinessState> = {}): CareTransitionReadinessState {
  return {
    ...EMPTY_CARE_TRANSITION_STATE,
    activePackId: 'icu-to-ward',
    packLive: false,
    ...overrides,
  };
}

const openHelp: CircleHelpTask = {
  id: 'help-1',
  title: 'Pick up groceries',
  note: '',
  createdAt: 1,
  createdByUid: 'u1',
  createdByName: 'Proxy',
  claimedByUid: '',
  claimedByName: '',
  assignedByUid: '',
  done: false,
};

const draft = draftIcuToWard();
assert.equal(careTransitionVisiblePackItems(draft, 'proxy').length, 4);
assert.equal(careTransitionPackRemainingCount(draft, 'proxy'), 0);
assert.equal(careTransitionOpenItemCount(draft, 'proxy'), 0);
assert.deepEqual(careTransitionFolderCounts(draft, 'proxy'), { total: 0, unread: 0 });

const live = draftIcuToWard({ packLive: true });
assert.equal(careTransitionPackRemainingCount(live, 'proxy'), 4);
assert.equal(careTransitionOpenItemCount(live, 'proxy'), 4);
assert.deepEqual(careTransitionFolderCounts(live, 'proxy'), { total: 4, unread: 4 });

const draftWithHelp = draftIcuToWard({ circleHelpTasks: [openHelp] });
assert.equal(careTransitionPackRemainingCount(draftWithHelp, 'proxy'), 0);
assert.equal(careTransitionOpenItemCount(draftWithHelp, 'proxy'), 1);
assert.deepEqual(careTransitionFolderCounts(draftWithHelp, 'proxy'), { total: 1, unread: 1 });

console.log('careTransitionReadiness.test.ts: ok');
