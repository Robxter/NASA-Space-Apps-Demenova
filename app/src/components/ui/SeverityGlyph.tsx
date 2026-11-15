// The soil core: water rises with the level (DESIGN.md, "The Soil Core"). Decorative; the word carries meaning.
// Water height comes from --lvl-ratio (tokens.css) through .dn-core-water (index.css), so a level change is the
// water rising or falling in place. `onset` replays the last step, Warning to Severe, once (the "Flood" moment).
import type { Severity } from '../../types/contracts';

export interface SeverityGlyphProps {
  level: Severity;
  /** Height in px; width follows at 7:9. */
  size?: number;
  /** For use on the solid Severe banner: white outline and water. */
  inverse?: boolean;
  /** The water rises once from the Warning mark to full (700 ms). Still under prefers-reduced-motion. */
  onset?: boolean;
  className?: string;
}

export function SeverityGlyph({ level, size = 18, inverse = false, onset = false, className = '' }: SeverityGlyphProps) {
  const stroke = inverse ? 'var(--dn-on-severe-solid)' : 'var(--lvl-ink)';
  const fill = inverse ? 'var(--dn-on-severe-solid)' : 'var(--lvl-fill)';
  const width = Math.round(((size * 7) / 9) * 10) / 10;

  return (
    <span
      data-level={level}
      aria-hidden="true"
      className={`inline-flex shrink-0 ${onset && level === 'severe' ? 'is-onset' : ''} ${className}`}
    >
      <svg viewBox="0 0 14 18" width={width} height={size} className="block">
        <rect className="dn-core-water" x="2.5" y="2.5" width="9" height="13" rx="1" fill={fill} />
        <rect
          x="1"
          y="1"
          width="12"
          height="16"
          rx="3"
          fill="none"
          stroke={stroke}
          strokeWidth="1.6"
          strokeDasharray={level === 'stale' ? '2.4 2' : undefined}
        />
      </svg>
    </span>
  );
}
