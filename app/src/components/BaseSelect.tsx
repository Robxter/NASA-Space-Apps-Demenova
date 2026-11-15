// Base-map chooser for the risk map and Farm setup (block 4). A native select: compact at 360 px with up to four
// choices, keyboard and screen-reader ready, no new dependency. Font size 16 px so iOS does not zoom (mobile-native).
import type { BaseId } from '../screens/Map/baseLayers';
import { usePrefs } from '../state/prefs';

export function BaseSelect({ value, onChange, options }: { value: BaseId; onChange: (v: BaseId) => void; options: BaseId[] }) {
  const { t } = usePrefs();
  return (
    <select
      aria-label={t('map.base')}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value as BaseId)}
      className="min-h-11 touch-manipulation rounded-control border border-line-strong bg-surface px-3 text-[16px] font-semibold text-ink shadow-banner"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {t(`map.base.${o}`)}
        </option>
      ))}
    </select>
  );
}
