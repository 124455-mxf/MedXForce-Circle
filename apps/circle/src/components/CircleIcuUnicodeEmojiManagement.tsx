import { useMemo, useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { ChevronLeft, Eye, EyeOff, GripVertical, RotateCcw, Smile } from 'lucide-react';
import {
  UNICODE_EMOJI_CATEGORIES,
  UNICODE_EMOJIS_BY_CATEGORY,
  applyModeUnicodeEmojiOverrides,
  clearModeUnicodeEmojiOverride,
  hasModeUnicodeEmojiOverride,
  readModeUnicodeEmojiOverride,
  toggleModeUnicodeCategoryVisible,
  toggleModeUnicodeEmojiVisible,
  updateModeUnicodeCategoryOrder,
  updateModeUnicodeEmojiOrder,
  type ModeUnicodeEmojiContentStore,
  type PatientRemoteSettingsDoc,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import type { CircleTranslator } from '../lib/circleI18nContext';

const ICU_EMOJI_LABEL_KEYS: Record<string, string> = {
  Happy: 'happy',
  Sad: 'sad',
  Sleepy: 'sleepy',
  Angry: 'angry',
  Surprised: 'surprised',
  Smiling: 'smiling',
  Nauseous: 'nauseous',
  Thinking: 'thinking',
  'Thumbs up': 'thumbsUp',
  'Thumbs down': 'thumbsDown',
  Please: 'please',
  Hello: 'hello',
  Clap: 'clap',
  Peace: 'peace',
  Agreement: 'agreement',
  'Love you': 'loveYou',
  Heart: 'heart',
  OK: 'ok',
  Question: 'question',
  Urgent: 'urgent',
  Check: 'check',
  Cross: 'cross',
  Home: 'home',
  Time: 'time',
  Apple: 'apple',
  Banana: 'banana',
  Bread: 'bread',
  Cheese: 'cheese',
  Meat: 'meat',
  Pizza: 'pizza',
  Pasta: 'pasta',
  Cake: 'cake',
  Coffee: 'coffee',
  Tea: 'tea',
  Juice: 'juice',
  Water: 'water',
  Sick: 'sick',
  Medicine: 'medicine',
  Hospital: 'hospital',
  Ambulance: 'ambulance',
  Bandage: 'bandage',
  Stethoscope: 'stethoscope',
  Food: 'food',
};

type CircleIcuUnicodeEmojiManagementProps = {
  t: CircleTranslator;
  settings: PatientRemoteSettingsDoc;
  onPatch: (next: PatientRemoteSettingsDoc) => void;
};

export function CircleIcuUnicodeEmojiManagement({
  t,
  settings,
  onPatch,
}: CircleIcuUnicodeEmojiManagementProps) {
  const [collapsed, setCollapsed] = useState(true);
  const store = settings.modeUnicodeEmojiContent;
  const override = readModeUnicodeEmojiOverride(store);
  const hasOverride = hasModeUnicodeEmojiOverride(store);

  const { categories, emojisByCategory } = useMemo(
    () => applyModeUnicodeEmojiOverrides(UNICODE_EMOJI_CATEGORIES, UNICODE_EMOJIS_BY_CATEGORY, override),
    [override],
  );

  const persistStore = (nextStore: ModeUnicodeEmojiContentStore) => {
    onPatch({
      ...settings,
      modeUnicodeEmojiContent: hasModeUnicodeEmojiOverride(nextStore) ? nextStore : {},
    });
  };

  const categoryLabel = (id: string, fallback: string) => {
    const translated = t(`remoteSettings.icuEmoji.categories.${id}`);
    return translated.startsWith('remoteSettings.') ? fallback : translated;
  };

  const emojiLabel = (label: string) => {
    const key = ICU_EMOJI_LABEL_KEYS[label];
    if (!key) return label;
    const translated = t(`remoteSettings.icuEmoji.labels.${key}`);
    return translated.startsWith('remoteSettings.') ? label : translated;
  };

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((open) => !open)}
        className="w-full p-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 text-blue-700 min-w-0 text-left">
          <Smile size={20} className="shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm leading-snug">{t('remoteSettings.icuEmoji.heading')}</h4>
            <p className="text-xs text-slate-500 font-medium truncate">
              {t('remoteSettings.icuEmoji.desc')}
            </p>
          </div>
        </div>
        <ChevronLeft
          size={22}
          className={cn('text-slate-400 transition-transform shrink-0', !collapsed ? '-rotate-90' : 'rotate-0')}
        />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-4 border-t border-blue-100"
          >
            <p className="text-sm text-slate-600 leading-snug pt-3">{t('remoteSettings.icuEmoji.hint')}</p>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={!hasOverride}
                onClick={() => persistStore(clearModeUnicodeEmojiOverride(store))}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-colors',
                  hasOverride
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'border-slate-100 text-slate-300 cursor-not-allowed',
                )}
              >
                <RotateCcw size={16} />
                {t('remoteSettings.icuEmoji.reset')}
              </button>
            </div>

            <Reorder.Group
              axis="y"
              values={categories}
              onReorder={(newOrder) =>
                persistStore(updateModeUnicodeCategoryOrder(store, newOrder.map((c) => c.id)))
              }
              className="space-y-4 max-h-[min(50vh,480px)] overflow-y-auto pr-1"
            >
              {categories.map((cat) => {
                const catVisible = cat.visible !== false;
                const emojis = emojisByCategory[cat.id] || [];
                return (
                  <Reorder.Item
                    key={cat.id}
                    value={cat}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical size={18} className="text-slate-300 shrink-0 cursor-grab" />
                        <span className="font-bold text-slate-800 truncate">
                          {categoryLabel(cat.id, cat.label)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => persistStore(toggleModeUnicodeCategoryVisible(store, cat.id, catVisible))}
                        className={cn(
                          'p-2 rounded-xl transition-colors shrink-0',
                          catVisible ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:bg-slate-100',
                        )}
                        title={catVisible ? t('remoteSettings.icuEmoji.hidden') : t('remoteSettings.icuEmoji.visible')}
                      >
                        {catVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>

                    <Reorder.Group
                      axis="y"
                      values={emojis}
                      onReorder={(newOrder) =>
                        persistStore(updateModeUnicodeEmojiOrder(store, cat.id, newOrder.map((e) => e.id)))
                      }
                      className="space-y-2 pl-6"
                    >
                      {emojis.map((emoji) => {
                        const emojiVisible = emoji.visible !== false;
                        return (
                          <Reorder.Item
                            key={emoji.id}
                            value={emoji}
                            className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical size={16} className="text-slate-300 shrink-0" />
                            <span className="text-2xl w-10 text-center shrink-0">{emoji.char}</span>
                            <span className="flex-1 text-sm font-medium text-slate-600 truncate">
                              {emojiLabel(emoji.label)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                persistStore(
                                  toggleModeUnicodeEmojiVisible(store, cat.id, emoji.id, emojiVisible),
                                )
                              }
                              className={cn(
                                'p-1.5 rounded-lg transition-colors shrink-0',
                                emojiVisible
                                  ? 'text-blue-600 hover:bg-blue-50'
                                  : 'text-slate-400 hover:bg-slate-100',
                              )}
                            >
                              {emojiVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
