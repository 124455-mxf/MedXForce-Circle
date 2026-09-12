import assert from 'node:assert/strict';
import { UNICODE_EMOJI_CATEGORIES, UNICODE_EMOJIS_BY_CATEGORY } from './unicodeEmojiCatalog';
import {
  applyDefaultIcuUnicodeEmojiOverride,
  applyModeUnicodeEmojiOverrides,
  buildDefaultIcuUnicodeEmojiOverride,
  hasModeUnicodeEmojiOverride,
  isDefaultIcuUnicodeEmojiOverride,
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

assert.equal(isDefaultIcuUnicodeEmojiOverride(undefined), false);
const defaultOverride = buildDefaultIcuUnicodeEmojiOverride();
assert.equal(defaultOverride.categoryVisible?.faces, true);
assert.equal(defaultOverride.emojiVisible?.faces?.u1, true);
assert.equal(isDefaultIcuUnicodeEmojiOverride(defaultOverride), true);

const withCustom = buildDefaultIcuUnicodeEmojiOverride(
  [...UNICODE_EMOJI_CATEGORIES, { id: 'custom', label: 'Custom' }],
  {
    ...UNICODE_EMOJIS_BY_CATEGORY,
    faces: [...UNICODE_EMOJIS_BY_CATEGORY.faces, { id: 'custom-face', char: '🤖', label: 'Bot' }],
    custom: [{ id: 'c1', char: '⭐', label: 'Star' }],
  },
);
assert.equal(withCustom.categoryVisible?.custom, false);
assert.equal(withCustom.emojiVisible?.faces?.['custom-face'], false);
assert.equal(withCustom.emojiVisible?.custom?.c1, false);

const appliedDefault = applyDefaultIcuUnicodeEmojiOverride({});
assert.equal(isDefaultIcuUnicodeEmojiOverride(appliedDefault.intensive_care), true);
assert.equal(hasModeUnicodeEmojiOverride(appliedDefault), true);

console.log('modeUnicodeEmojiContent tests passed');
