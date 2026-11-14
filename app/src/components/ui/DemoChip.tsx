// "Demo" label for synthetic content (DATA_POLICY: origin synthetic -> visible "Demo" label). Hatched, earth-toned,
// deliberately unlike a severity badge so it never reads as a status. The hint is the tooltip and spoken text.
import { UI_COPY, type Lang } from './severity';

export interface DemoChipProps {
  lang?: Lang;
  className?: string;
}

export function DemoChip({ lang = 'es', className = '' }: DemoChipProps) {
  const copy = UI_COPY[lang];
  return (
    <span
      title={copy.demoHint}
      className={`inline-flex items-center whitespace-nowrap rounded-full border border-alluvium px-2 py-0.5 text-caption font-semibold text-alluvium ${className}`}
      style={{ backgroundImage: 'var(--dn-hatch)' }}
    >
      {copy.demo}
      <span className="sr-only">: {copy.demoHint}</span>
    </span>
  );
}
