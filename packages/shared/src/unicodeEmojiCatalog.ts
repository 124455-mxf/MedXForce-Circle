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

export const UNICODE_EMOJI_CATEGORIES: UnicodeEmojiCategory[] = [
  { id: 'faces', label: 'Faces & Feelings' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'health', label: 'Health' },
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
  ],
  gestures: [
    { id: 'u3', char: '👍', label: 'Thumbs up' },
    { id: 'u4', char: '👎', label: 'Thumbs down' },
    { id: 'u6', char: '🙏', label: 'Please' },
    { id: 'u7', char: '👋', label: 'Hello' },
    { id: 'u18', char: '👏', label: 'Clap' },
    { id: 'u19', char: '✌️', label: 'Peace' },
    { id: 'u20', char: '🤝', label: 'Agreement' },
    { id: 'u21', char: '🤟', label: 'Love you' },
  ],
  symbols: [
    { id: 'u5', char: '❤️', label: 'Heart' },
    { id: 'u8', char: '🆗', label: 'OK' },
    { id: 'u9', char: '❓', label: 'Question' },
    { id: 'u10', char: '❗', label: 'Urgent' },
    { id: 'u22', char: '✅', label: 'Check' },
    { id: 'u23', char: '❌', label: 'Cross' },
    { id: 'u24', char: '🏠', label: 'Home' },
    { id: 'u25', char: '⏰', label: 'Time' },
  ],
  food: [
    { id: 'f1', char: '🍎', label: 'Apple' },
    { id: 'f4', char: '🍌', label: 'Banana' },
    { id: 'f15', char: '🍞', label: 'Bread' },
    { id: 'f18', char: '🧀', label: 'Cheese' },
    { id: 'f19', char: '🍖', label: 'Meat' },
    { id: 'f22', char: '🍕', label: 'Pizza' },
    { id: 'f28', char: '🍝', label: 'Pasta' },
    { id: 'f29', char: '🍰', label: 'Cake' },
    { id: 'f34', char: '☕', label: 'Coffee' },
    { id: 'f35', char: '🍵', label: 'Tea' },
    { id: 'f36', char: '🧃', label: 'Juice' },
    { id: 'f31', char: '💧', label: 'Water' },
  ],
  health: [
    { id: 'u12', char: '🤒', label: 'Sick' },
    { id: 'u26', char: '💊', label: 'Medicine' },
    { id: 'u27', char: '🏥', label: 'Hospital' },
    { id: 'u28', char: '🚑', label: 'Ambulance' },
    { id: 'u29', char: '🩹', label: 'Bandage' },
    { id: 'u30', char: '🩺', label: 'Stethoscope' },
    { id: 'u31', char: '💧', label: 'Water' },
    { id: 'u32', char: '🍎', label: 'Food' },
  ],
};
