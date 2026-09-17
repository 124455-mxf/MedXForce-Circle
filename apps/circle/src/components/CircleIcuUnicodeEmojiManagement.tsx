import { useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { ChevronLeft, Eye, EyeOff, Globe, GripVertical, RotateCcw, Smile } from 'lucide-react';
import {
  UNICODE_EMOJI_CATEGORIES,
  UNICODE_EMOJIS_BY_CATEGORY,
  applyDefaultIcuUnicodeEmojiOverride,
  applyModeUnicodeEmojiOverrides,
  buildDefaultIcuUnicodeEmojiOverride,
  clearModeUnicodeEmojiOverride,
  flattenUnicodeEmojisForIcuBoard,
  hasModeUnicodeEmojiOverride,
  isDefaultIcuUnicodeEmojiOverride,
  readModeUnicodeEmojiOverride,
  toggleModeUnicodeEmojiVisible,
  updateModeUnicodeBoardOrder,
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
  Pain: 'pain',
  Scared: 'scared',
  Hot: 'hot',
  Cold: 'cold',
  Air: 'air',
  Hurt: 'hurt',
  Stop: 'stop',
  'OK hand': 'okHand',
  Alarm: 'alarm',
  Nurse: 'nurse',
  Family: 'family',
  Man: 'man',
  Woman: 'woman',
  Baby: 'baby',
  Doctor: 'doctor',
  Toilet: 'toilet',
  Bed: 'bed',
  Wheelchair: 'wheelchair',
  Light: 'light',
  Quiet: 'quiet',
  Shower: 'shower',
  Paper: 'paper',
  Hear: 'hear',
  See: 'see',
  Glasses: 'glasses',
  Meal: 'meal',
  Syringe: 'syringe',
  Phone: 'phone',
  Toothbrush: 'toothbrush',
};

type CircleIcuUnicodeEmojiManagementProps = {
  t: CircleTranslator;
  settings: PatientRemoteSettingsDoc;
  onPatch: (next: PatientRemoteSettingsDoc) => void;
};

function GripReorderItem<T>({
  value,
  className,
  children,
}: {
  value: T;
  className?: string;
  children: (startDrag: (event: ReactPointerEvent) => void) => ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      className={className}
      style={{ touchAction: 'pan-y' }}
    >
      {children((event) => {
        event.stopPropagation();
        controls.start(event);
      })}
    </Reorder.Item>
  );
}

export function CircleIcuUnicodeEmojiManagement({
  t,
  settings,
  onPatch,
}: CircleIcuUnicodeEmojiManagementProps) {
  const [collapsed, setCollapsed] = useState(true);
  const store = settings.modeUnicodeEmojiContent;
  const override = readModeUnicodeEmojiOverride(store);
  const followGlobal = override?.followGlobal === true;
  const isDefaultLayout = isDefaultIcuUnicodeEmojiOverride(override);
  const effectiveOverride = useMemo(() => {
    if (followGlobal) return undefined;
    return override ?? buildDefaultIcuUnicodeEmojiOverride();
  }, [followGlobal, override]);

  const { categories, emojisByCategory } = useMemo(
    () => applyModeUnicodeEmojiOverrides(UNICODE_EMOJI_CATEGORIES, UNICODE_EMOJIS_BY_CATEGORY, effectiveOverride),
    [effectiveOverride],
  );
  const boardItems = useMemo(
    () =>
      flattenUnicodeEmojisForIcuBoard(categories, emojisByCategory, effectiveOverride?.boardOrder, {
        includeHidden: true,
      }),
    [categories, emojisByCategory, effectiveOverride?.boardOrder],
  );
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((cat) => [cat.id, cat])),
    [categories],
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
    <div className="rounded-2xl border border-red-200/80 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((open) => !open)}
        className="w-full p-4 flex items-start justify-between gap-3 hover:bg-red-50/50 transition-colors"
      >
        <div className="flex items-start gap-3 text-red-800 min-w-0 text-left">
          <Smile size={20} className="shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm leading-snug">{t('remoteSettings.icuEmoji.heading')}</h4>
            <p className="text-xs text-slate-500 font-medium leading-snug">
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
            className="overflow-hidden px-4 pb-4 space-y-4 border-t border-red-100"
          >
            <div className="grid grid-cols-2 gap-2 pt-3">
              <button
                type="button"
                disabled={isDefaultLayout}
                onClick={() => persistStore(applyDefaultIcuUnicodeEmojiOverride(store))}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-w-0',
                  isDefaultLayout
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'border-red-200 text-red-800 hover:bg-red-50',
                )}
              >
                <RotateCcw size={14} className="shrink-0" />
                <span className="leading-snug text-center">{t('remoteSettings.icuEmoji.useDefault')}</span>
              </button>
              <button
                type="button"
                disabled={followGlobal}
                onClick={() => persistStore(clearModeUnicodeEmojiOverride(store))}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-w-0',
                  followGlobal
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                <Globe size={14} className="shrink-0" />
                <span className="leading-snug text-center">{t('remoteSettings.icuEmoji.reset')}</span>
              </button>
              <p className="text-xs text-slate-500 font-medium leading-snug whitespace-pre-line">
                {t('remoteSettings.icuEmoji.defaultHint')}
              </p>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                {t('remoteSettings.icuEmoji.globalHint')}
              </p>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-snug">
              {t('remoteSettings.icuEmoji.icuOnly')}
            </p>

            <Reorder.Group
              axis="y"
              values={boardItems}
              onReorder={(newOrder) =>
                persistStore(updateModeUnicodeBoardOrder(store, newOrder.map((item) => item.id)))
              }
              className="space-y-2 touch-pan-y"
            >
              {boardItems.map((emoji) => {
                const emojiVisible = emoji.visible !== false;
                const category = categoryById[emoji.categoryId];
                return (
                  <GripReorderItem
                    key={`${emoji.categoryId}:${emoji.id}`}
                    value={emoji}
                    className={cn(
                      'flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100',
                      !emojiVisible && 'opacity-60',
                    )}
                  >
                    {(startEmojiDrag) => (
                      <>
                        <button
                          type="button"
                          onPointerDown={startEmojiDrag}
                          className="touch-none shrink-0 p-1 -ml-1 rounded-lg text-slate-300 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical size={16} />
                        </button>
                        <span className="text-2xl w-10 text-center shrink-0">{emoji.char}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-700 truncate">
                            {emojiLabel(emoji.label)}
                          </span>
                          {category ? (
                            <span className="block text-[11px] text-slate-400 truncate">
                              {categoryLabel(category.id, category.label)}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            persistStore(
                              toggleModeUnicodeEmojiVisible(
                                store,
                                emoji.categoryId,
                                emoji.id,
                                emojiVisible,
                              ),
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
                      </>
                    )}
                  </GripReorderItem>
                );
              })}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
