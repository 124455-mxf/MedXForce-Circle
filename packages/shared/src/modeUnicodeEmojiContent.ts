import type { UnicodeEmoji, UnicodeEmojiCategory } from './unicodeEmojiCatalog';

export type ModeUnicodeEmojiOverride = {
  categoryOrder?: string[];
  categoryVisible?: Record<string, boolean>;
  emojiOrder?: Record<string, string[]>;
  emojiVisible?: Record<string, Record<string, boolean>>;
};

export type ModeUnicodeEmojiContentStore = {
  intensive_care?: ModeUnicodeEmojiOverride;
};

export const ICU_UNICODE_EMOJI_MODE = 'intensive_care' as const;

const MAX_IDS = 80;

function sanitizeIdList(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 80);
  return ids.length ? ids.slice(0, MAX_IDS) : undefined;
}

function sanitizeBoolMap(raw: unknown): Record<string, boolean> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean' && key.length > 0 && key.length < 80) {
      out[key] = value;
    }
    if (Object.keys(out).length >= MAX_IDS) break;
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeNestedBoolMap(raw: unknown): Record<string, Record<string, boolean>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, Record<string, boolean>> = {};
  for (const [catId, nested] of Object.entries(raw as Record<string, unknown>)) {
    if (catId.length === 0 || catId.length >= 80) continue;
    const map = sanitizeBoolMap(nested);
    if (map) out[catId] = map;
    if (Object.keys(out).length >= MAX_IDS) break;
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeEmojiOrder(raw: unknown): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [catId, nested] of Object.entries(raw as Record<string, unknown>)) {
    if (catId.length === 0 || catId.length >= 80) continue;
    const list = sanitizeIdList(nested);
    if (list) out[catId] = list;
    if (Object.keys(out).length >= MAX_IDS) break;
  }
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeModeUnicodeEmojiOverride(raw: unknown): ModeUnicodeEmojiOverride | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const d = raw as Record<string, unknown>;
  const override: ModeUnicodeEmojiOverride = {};
  const categoryOrder = sanitizeIdList(d.categoryOrder);
  const categoryVisible = sanitizeBoolMap(d.categoryVisible);
  const emojiOrder = sanitizeEmojiOrder(d.emojiOrder);
  const emojiVisible = sanitizeNestedBoolMap(d.emojiVisible);
  if (categoryOrder) override.categoryOrder = categoryOrder;
  if (categoryVisible) override.categoryVisible = categoryVisible;
  if (emojiOrder) override.emojiOrder = emojiOrder;
  if (emojiVisible) override.emojiVisible = emojiVisible;
  return Object.keys(override).length ? override : undefined;
}

export function sanitizeModeUnicodeEmojiContent(raw: unknown): ModeUnicodeEmojiContentStore | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const icu = sanitizeModeUnicodeEmojiOverride(
    (raw as Record<string, unknown>)[ICU_UNICODE_EMOJI_MODE],
  );
  if (!icu) return {};
  return { [ICU_UNICODE_EMOJI_MODE]: icu };
}

export function readModeUnicodeEmojiOverride(
  store: ModeUnicodeEmojiContentStore | undefined,
  mode: string = ICU_UNICODE_EMOJI_MODE,
): ModeUnicodeEmojiOverride | undefined {
  if (!store) return undefined;
  return store[mode as keyof ModeUnicodeEmojiContentStore];
}

export function modeUnicodeEmojiOverrideIsEmpty(override?: ModeUnicodeEmojiOverride | null): boolean {
  if (!override) return true;
  return !(
    override.categoryOrder?.length ||
    (override.categoryVisible && Object.keys(override.categoryVisible).length) ||
    (override.emojiOrder && Object.keys(override.emojiOrder).length) ||
    (override.emojiVisible && Object.keys(override.emojiVisible).length)
  );
}

export function hasModeUnicodeEmojiOverride(
  store: ModeUnicodeEmojiContentStore | undefined,
  mode: string = ICU_UNICODE_EMOJI_MODE,
): boolean {
  return !modeUnicodeEmojiOverrideIsEmpty(readModeUnicodeEmojiOverride(store, mode));
}

export function applyModeUnicodeEmojiOverrides(
  categories: UnicodeEmojiCategory[],
  emojisByCategory: Record<string, UnicodeEmoji[]>,
  override?: ModeUnicodeEmojiOverride | null,
): { categories: UnicodeEmojiCategory[]; emojisByCategory: Record<string, UnicodeEmoji[]> } {
  if (!override) {
    return {
      categories: categories.map((c) => ({ ...c })),
      emojisByCategory: Object.fromEntries(
        Object.entries(emojisByCategory).map(([id, emojis]) => [id, emojis.map((e) => ({ ...e }))]),
      ),
    };
  }

  let ordered = [...categories];
  if (override.categoryOrder?.length) {
    const rank = new Map(override.categoryOrder.map((id, i) => [id, i]));
    ordered.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
  }

  ordered = ordered.map((c) => ({
    ...c,
    visible:
      override.categoryVisible?.[c.id] !== undefined
        ? override.categoryVisible[c.id]
        : c.visible,
  }));

  const mergedEmojis: Record<string, UnicodeEmoji[]> = {};
  for (const cat of ordered) {
    let emojis = [...(emojisByCategory[cat.id] || [])];
    const order = override.emojiOrder?.[cat.id];
    if (order?.length) {
      const rank = new Map(order.map((id, i) => [id, i]));
      emojis.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
    }
    emojis = emojis.map((e) => ({
      ...e,
      visible:
        override.emojiVisible?.[cat.id]?.[e.id] !== undefined
          ? override.emojiVisible[cat.id][e.id]
          : e.visible,
    }));
    mergedEmojis[cat.id] = emojis;
  }

  return { categories: ordered, emojisByCategory: mergedEmojis };
}

function patchStore(
  store: ModeUnicodeEmojiContentStore | undefined,
  mode: string,
  patch: ModeUnicodeEmojiOverride | undefined,
): ModeUnicodeEmojiContentStore {
  const next: ModeUnicodeEmojiContentStore = { ...(store || {}) };
  if (!patch || Object.keys(patch).length === 0) {
    delete next[mode as keyof ModeUnicodeEmojiContentStore];
  } else {
    next[mode as keyof ModeUnicodeEmojiContentStore] = {
      ...next[mode as keyof ModeUnicodeEmojiContentStore],
      ...patch,
    };
  }
  return next;
}

export function updateModeUnicodeCategoryOrder(
  store: ModeUnicodeEmojiContentStore | undefined,
  categoryOrder: string[],
  mode: string = ICU_UNICODE_EMOJI_MODE,
): ModeUnicodeEmojiContentStore {
  const prev = readModeUnicodeEmojiOverride(store, mode) || {};
  return patchStore(store, mode, { ...prev, categoryOrder });
}

export function updateModeUnicodeEmojiOrder(
  store: ModeUnicodeEmojiContentStore | undefined,
  catId: string,
  emojiOrder: string[],
  mode: string = ICU_UNICODE_EMOJI_MODE,
): ModeUnicodeEmojiContentStore {
  const prev = readModeUnicodeEmojiOverride(store, mode) || {};
  return patchStore(store, mode, {
    ...prev,
    emojiOrder: { ...prev.emojiOrder, [catId]: emojiOrder },
  });
}

export function toggleModeUnicodeCategoryVisible(
  store: ModeUnicodeEmojiContentStore | undefined,
  catId: string,
  currentlyVisible: boolean,
  mode: string = ICU_UNICODE_EMOJI_MODE,
): ModeUnicodeEmojiContentStore {
  const prev = readModeUnicodeEmojiOverride(store, mode) || {};
  return patchStore(store, mode, {
    ...prev,
    categoryVisible: { ...prev.categoryVisible, [catId]: !currentlyVisible },
  });
}

export function toggleModeUnicodeEmojiVisible(
  store: ModeUnicodeEmojiContentStore | undefined,
  catId: string,
  emojiId: string,
  currentlyVisible: boolean,
  mode: string = ICU_UNICODE_EMOJI_MODE,
): ModeUnicodeEmojiContentStore {
  const prev = readModeUnicodeEmojiOverride(store, mode) || {};
  return patchStore(store, mode, {
    ...prev,
    emojiVisible: {
      ...prev.emojiVisible,
      [catId]: { ...prev.emojiVisible?.[catId], [emojiId]: !currentlyVisible },
    },
  });
}

export function clearModeUnicodeEmojiOverride(
  store: ModeUnicodeEmojiContentStore | undefined,
  mode: string = ICU_UNICODE_EMOJI_MODE,
): ModeUnicodeEmojiContentStore {
  const next: ModeUnicodeEmojiContentStore = { ...(store || {}) };
  delete next[mode as keyof ModeUnicodeEmojiContentStore];
  return next;
}
