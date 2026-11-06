import assert from 'node:assert/strict';
import {
  parseCircleMessageReadRecord,
} from './circleMessageInboxRead';
import {
  circleThreadInboxReadDocId,
  parseCircleThreadPostReadRecord,
} from './circleThreadInboxRead';

assert.equal(parseCircleMessageReadRecord('m1', { lastReadAt: 0 }), null);
assert.deepEqual(parseCircleMessageReadRecord('m1', { messageId: 'm1', lastReadAt: 42 }), {
  messageId: 'm1',
  lastReadAt: 42,
});
assert.deepEqual(parseCircleMessageReadRecord('m2', { lastReadAt: 9 }), {
  messageId: 'm2',
  lastReadAt: 9,
});

assert.equal(circleThreadInboxReadDocId('open', 'postA'), 'open_postA');
assert.deepEqual(
  parseCircleThreadPostReadRecord('open_postA', {
    postId: 'postA',
    threadKind: 'open',
    lastReadAt: 15,
  }),
  { postId: 'postA', threadKind: 'open', lastReadAt: 15 },
);
assert.deepEqual(parseCircleThreadPostReadRecord('restricted_xyz', { lastReadAt: 3 }), {
  postId: 'xyz',
  threadKind: 'restricted',
  lastReadAt: 3,
});
assert.equal(parseCircleThreadPostReadRecord('open_x', { lastReadAt: 0 }), null);

console.log('circle inbox read parse tests ok');
