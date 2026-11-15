import './nodeWindowShim';
import assert from 'node:assert/strict';
import {
  resolveCircleInboxViewForThread,
  circlePostInboxViewsForMember,
} from './circlePostInboxViews';

const proxy = 'proxy';
const caregiver = 'caregiver';
const friend = 'friend';

for (const role of [proxy, caregiver] as const) {
  assert.equal(
    resolveCircleInboxViewForThread('care_transition', 'restricted', role),
    'care_transition',
    `${role}: keep Tasks on Care team`,
  );
  assert.equal(
    resolveCircleInboxViewForThread('care_transition', 'open', role),
    'care_transition',
    `${role}: keep Tasks on Everybody`,
  );
  assert.equal(
    resolveCircleInboxViewForThread('drop_ins', 'restricted', role),
    'drop_ins',
  );
  assert.equal(
    resolveCircleInboxViewForThread('visit_captures', 'open', role),
    'visit_captures',
  );
  assert.equal(
    resolveCircleInboxViewForThread('discussion', 'restricted', role),
    'discussion',
  );
  assert.equal(
    resolveCircleInboxViewForThread('appointments', 'open', role),
    'appointments',
    `${role}: appointments stay on Everybody`,
  );
  assert.equal(
    resolveCircleInboxViewForThread('appointments', 'restricted', role),
    'discussion',
    `${role}: appointments fall back to Discussion on Care team`,
  );
}

assert.equal(
  circlePostInboxViewsForMember('open', friend).includes('care_transition'),
  false,
);
assert.equal(
  circlePostInboxViewsForMember('open', friend).includes('appointments'),
  false,
);

console.log('circlePostInboxViews audience-folder persistence ok');
