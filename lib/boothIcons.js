export const DEFAULT_BOOTH_ICONS = ['🔬', '🧮', '🏛️', '🎨', '🎵', '🌍', '💡', '📚', '🎭', '🎪'];

export const BOOTH_ICON_OPTIONS = [
  '🔬', '🧮', '🏛️', '🎨', '🎵', '🌍', '💡', '📚', '🎭', '🎪',
  '🍔', '🍿', '🎮', '🎲', '🧪', '⚽', '🎯', '🎈', '🖼️', '🎤',
  '🍀', '🌸', '🐾', '🚀', '🎬', '📷', '🧩', '🎁', '🍩', '🎳',
];

// booth.icon(관리자 지정)이 있으면 그걸, 없으면 인덱스로 기본 아이콘을 순환
export function boothIcon(booth, index) {
  if (booth?.icon) return booth.icon;
  return DEFAULT_BOOTH_ICONS[((index % DEFAULT_BOOTH_ICONS.length) + DEFAULT_BOOTH_ICONS.length) % DEFAULT_BOOTH_ICONS.length];
}
