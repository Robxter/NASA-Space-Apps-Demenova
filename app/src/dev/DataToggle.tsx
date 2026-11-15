// DEV ONLY (break-ui Phase 3): "Demo data / Worst case / Empty / One / Offline" switch. Plain chrome, not part of the
// design under test. It reloads with ?data=<kind> so the choice survives a reload; the hash route is kept.
import { WORST_KINDS, worstKindFromUrl } from './worst-case';

export default function DataToggle() {
  const current = worstKindFromUrl(window.location.search) ?? 'demo';
  const kinds = ['demo', ...WORST_KINDS] as const;
  const go = (kind: string) => {
    const url = new URL(window.location.href);
    if (kind === 'demo') url.searchParams.delete('data');
    else url.searchParams.set('data', kind);
    window.location.assign(url.toString());
  };
  return (
    <div
      role="radiogroup"
      aria-label="Dev data"
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-1/2 z-[2000] flex -translate-x-1/2 rounded-full border border-line bg-surface-2 p-0.5 text-caption text-ink"
    >
      {kinds.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={current === k}
          onClick={() => go(k)}
          className={`min-h-8 rounded-full px-2.5 ${current === k ? 'bg-surface font-semibold' : ''}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
