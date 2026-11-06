/** Stock Unicode emoji catalog. IDs must stay in sync with the Patient app `constants.ts`. */

export type UnicodeEmoji = {
  id: string;
  char: string;
  label: string;
  visible?: boolean;
};

export type UnicodeEmojiCategory = {
  id: string;
  label: string;
  visible?: boolean;
};

/** ICU default board order (visible first). Hidden stock items are appended by the ICU overlay builder. */
export const ICU_UNICODE_DEFAULT_BOARD_ORDER = [
  'u3',
  'u4',
  'u9',
  'u40',
  'f31',
  'c1',
  'u16',
  'u11',
  'f40',
  'u26',
  'p1',
  'p2',
  'c2',
  'c3',
  'u6',
  'u1',
  'u2',
  'u10',
  'u25',
  'u30',
] as const;

export const UNICODE_EMOJI_CATEGORIES: UnicodeEmojiCategory[] = [
  { id: 'faces', label: 'Faces & Feelings' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'people', label: 'People' },
  { id: 'care', label: 'Care' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'health', label: 'Health' },
  { id: 'symbols', label: 'Symbols' },
];

export const UNICODE_EMOJIS_BY_CATEGORY: Record<string, UnicodeEmoji[]> = {
  faces: [
    { id: 'u1', char: '😀', label: 'Happy' },
    { id: 'u2', char: '😢', label: 'Sad' },
    { id: 'u11', char: '😴', label: 'Sleepy' },
    { id: 'u13', char: '😠', label: 'Angry' },
    { id: 'u14', char: '😮', label: 'Surprised' },
    { id: 'u15', char: '😊', label: 'Smiling' },
    { id: 'u16', char: '🤢', label: 'Nauseous' },
    { id: 'u17', char: '🤔', label: 'Thinking' },
    { id: 'u41', char: '😨', label: 'Scared' },
    { id: 'u40', char: '😣', label: 'Pain' },
    { id: 'u42', char: '🥵', label: 'Hot' },
    { id: 'u43', char: '🥶', label: 'Cold' },
    { id: 'u45', char: '🤕', label: 'Hurt', visible: false },
    { id: 'u44', char: '😮‍💨', label: 'Air', visible: false },
  ],
  gestures: [
    { id: 'u3', char: '👍', label: 'Thumbs up' },
    { id: 'u4', char: '👎', label: 'Thumbs down' },
    { id: 'u6', char: '🙏', label: 'Please' },
    { id: 'u7', char: '👋', label: 'Hello' },
    { id: 'u18', char: '👏', label: 'Clap' },
    { id: 'u21', char: '🤟', label: 'Love you' },
    { id: 'u19', char: '✌️', label: 'Peace' },
    { id: 'u20', char: '🤝', label: 'Agreement' },
    { id: 'u46', char: '✋', label: 'Stop' },
    { id: 'u47', char: '👌', label: 'OK hand', visible: false },
  ],
  people: [
    { id: 'p1', char: '🧑‍⚕️', label: 'Nurse' },
    { id: 'p2', char: '👪', label: 'Family' },
    { id: 'p3', char: '👨', label: 'Man' },
    { id: 'p4', char: '👩', label: 'Woman' },
    { id: 'p5', char: '👶', label: 'Baby' },
    { id: 'p6', char: '👨‍⚕️', label: 'Doctor', visible: false },
  ],
  care: [
    { id: 'c1', char: '🚽', label: 'Toilet' },
    { id: 'c2', char: '🛏️', label: 'Bed' },
    { id: 'c3', char: '♿', label: 'Wheelchair' },
    { id: 'c6', char: '🚿', label: 'Shower' },
    { id: 'c4', char: '💡', label: 'Light' },
    { id: 'c5', char: '🔇', label: 'Quiet' },
    { id: 'c7', char: '🧻', label: 'Paper', visible: false },
    { id: 'c10', char: '👓', label: 'Glasses', visible: false },
    { id: 'c11', char: '🪥', label: 'Toothbrush', visible: false },
    { id: 'c12', char: '📞', label: 'Phone', visible: false },
    { id: 'c8', char: '👂', label: 'Hear', visible: false },
    { id: 'c9', char: '👁️', label: 'See', visible: false },
  ],
  food: [
    { id: 'f40', char: '🍽️', label: 'Meal' },
    { id: 'f31', char: '💧', label: 'Water' },
    { id: 'f1', char: '🍎', label: 'Apple' },
    { id: 'f4', char: '🍌', label: 'Banana' },
    { id: 'f15', char: '🍞', label: 'Bread' },
    { id: 'f18', char: '🧀', label: 'Cheese' },
    { id: 'f19', char: '🍖', label: 'Meat' },
    { id: 'f22', char: '🍕', label: 'Pizza' },
    { id: 'f28', char: '🍝', label: 'Pasta' },
    { id: 'f34', char: '☕', label: 'Coffee' },
    { id: 'f35', char: '🍵', label: 'Tea' },
    { id: 'f36', char: '🧃', label: 'Juice' },
    { id: 'f29', char: '🍰', label: 'Cake', visible: false },
  ],
  health: [
    { id: 'u26', char: '💊', label: 'Medicine' },
    { id: 'u30', char: '🩺', label: 'Stethoscope' },
    { id: 'u29', char: '🩹', label: 'Bandage' },
    { id: 'u27', char: '🏥', label: 'Hospital' },
    { id: 'u12', char: '🤒', label: 'Sick', visible: false },
    { id: 'u28', char: '🚑', label: 'Ambulance', visible: false },
    { id: 'h1', char: '💉', label: 'Syringe', visible: false },
    { id: 'u31', char: '💧', label: 'Water', visible: false },
    { id: 'u32', char: '🍎', label: 'Food', visible: false },
  ],
  symbols: [
    { id: 'u9', char: '❓', label: 'Question' },
    { id: 'u10', char: '❗', label: 'Urgent' },
    { id: 'u22', char: '✅', label: 'Check' },
    { id: 'u23', char: '❌', label: 'Cross' },
    { id: 'u8', char: '🆗', label: 'OK' },
    { id: 'u25', char: '⌚', label: 'Time' },
    { id: 'u24', char: '🏠', label: 'Home' },
    { id: 'u5', char: '❤️', label: 'Heart' },
    { id: 'u48', char: '⏰', label: 'Alarm', visible: false },
  ],
};
