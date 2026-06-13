import { useCircleT } from '../lib/circleI18nContext';

export function CircleExpandablePostToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useCircleT();
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800"
    >
      {expanded ? t('messages.bodyShowLess') : t('messages.bodyShowMore')}
    </button>
  );
}
