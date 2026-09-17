import assert from 'node:assert/strict';
import { UNICODE_EMOJI_CATEGORIES, UNICODE_EMOJIS_BY_CATEGORY } from './unicodeEmojiCatalog';
import {
  applyDefaultIcuUnicodeEmojiOverride,
  applyModeUnicodeEmojiOverrides,
  buildDefaultIcuUnicodeEmojiOverride,
  flattenUnicodeEmojisForIcuBoard,
  hasModeUnicodeEmojiOverride,
  isDefaultIcuUnicodeEmojiOverride,
  sanitizeModeUnicodeEmojiContent,
  toggleModeUnicodeCategoryVisible,
  updateModeUnicodeBoardOrder,
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

assert.equal(isDefaultIcuUnicodeEmojiOverride(undefined), true);
const defaultOverride = buildDefaultIcuUnicodeEmojiOverride();
assert.equal(defaultOverride.categoryVisible?.faces, true);
assert.equal(defaultOverride.emojiVisible?.faces?.u1, true);
assert.equal(defaultOverride.emojiVisible?.food?.f29, false);
assert.equal(defaultOverride.boardOrder?.[0], 'u3');
assert.equal(isDefaultIcuUnicodeEmojiOverride(defaultOverride), true);

const withCustom = buildDefaultIcuUnicodeEmojiOverride(
  [...UNICODE_EMOJI_CATEGORIES, { id: 'custom', label: 'Custom' }],
  {
    ...UNICODE_EMOJIS_BY_CATEGORY,
    faces: [...UNICODE_EMOJIS_BY_CATEGORY.faces, { id: 'custom-face', char: '🤖', label: 'Bot' }],
    custom: [{ id: 'cx1', char: '⭐', label: 'Star' }],
  },
);
assert.equal(withCustom.categoryVisible?.custom, false);
assert.equal(withCustom.emojiVisible?.faces?.['custom-face'], false);
assert.equal(withCustom.emojiVisible?.custom?.cx1, false);

const appliedDefault = applyDefaultIcuUnicodeEmojiOverride({});
assert.equal(isDefaultIcuUnicodeEmojiOverride(appliedDefault.intensive_care), true);
assert.equal(hasModeUnicodeEmojiOverride(appliedDefault), true);

assert.equal(defaultOverride.boardOrder?.[0], 'u3');
const { boardOrder: _boardOrder, ...defaultWithoutBoardOrder } = defaultOverride;
assert.equal(isDefaultIcuUnicodeEmojiOverride(defaultWithoutBoardOrder), true);

const mixedStore = updateModeUnicodeBoardOrder(applyDefaultIcuUnicodeEmojiOverride({}), [
  'u40',
  'c1',
  'u3',
]);
const mixedApplied = applyModeUnicodeEmojiOverrides(
  UNICODE_EMOJI_CATEGORIES,
  UNICODE_EMOJIS_BY_CATEGORY,
  mixedStore.intensive_care,
);
const mixedFlat = flattenUnicodeEmojisForIcuBoard(
  mixedApplied.categories,
  mixedApplied.emojisByCategory,
  mixedStore.intensive_care?.boardOrder,
);
assert.deepEqual(mixedFlat.slice(0, 3).map((item) => item.id), ['u40', 'c1', 'u3']);

const cleanedBoard = sanitizeModeUnicodeEmojiContent({
  intensive_care: { boardOrder: ['u3', '', 1, 'u1'] },
});
assert.deepEqual(cleanedBoard?.intensive_care?.boardOrder, ['u3', 'u1']);

console.log('modeUnicodeEmojiContent tests passed');
