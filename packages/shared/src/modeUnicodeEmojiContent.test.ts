import assert from 'node:assert/strict';
import {
  applyModeUnicodeEmojiOverrides,
  hasModeUnicodeEmojiOverride,
  sanitizeModeUnicodeEmojiContent,
  toggleModeUnicodeCategoryVisible,
} from './modeUnicodeEmojiContent';

const store = toggleModeUnicodeCategoryVisible({}, 'faces', true);
assert.equal(hasModeUnicodeEmojiOverride(store), true);
assert.equal(store.intensive_care?.categoryVisible?.faces, false);

const applied = applyModeUnicodeEmojiOverrides(
  [{ id: 'faces', label: 'Faces & Feelings', visible: true }],
  { faces: [{ id: 'u1', char: '😀', label: 'Happy', visible: true }] },
  store.intensive_care,
);
assert.equal(applied.categories[0]?.visible, false);

const cleaned = sanitizeModeUnicodeEmojiContent({
  intensive_care: {
    categoryVisible: { faces: false, skip: 'nope' },
    categoryOrder: ['faces', 1, ''],
  },
});
assert.deepEqual(cleaned?.intensive_care?.categoryVisible, { faces: false });
assert.deepEqual(cleaned?.intensive_care?.categoryOrder, ['faces']);
assert.deepEqual(sanitizeModeUnicodeEmojiContent({ intensive_care: {} }), {});

console.log('modeUnicodeEmojiContent tests passed');
