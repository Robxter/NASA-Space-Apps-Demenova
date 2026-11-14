// The soil core: water rises with the level (design/BRIEF.md, "Signature"). Decorative; the word carries meaning.
import type { Severity } from '../../types/contracts';
import { SEVERITY_WATER } from './severity';

export interface SeverityGlyphProps {
  level: Severity;
  /** Height in px; width follows at 7:9. */
  size?: number;
  /** For use on the solid Severe banner: white outline and water. */
  inverse?: boolean;
  /** Plays the Severe ripple once (two pulses). Hidden under prefers-reduced-motion. */
  onset?: boolean;
  className?: string;
}

export function SeverityGlyph({ level, size = 18, inverse = false, onset = false, className = '' }: SeverityGlyphProps) {
  const water = SEVERITY_WATER[level];
  const innerTop = 2.5;
  const innerHeight = 13; // inner height of the core in a 14x18 box
  const waterHeight = innerHeight * water;
  const stroke = inverse ? 'var(--dn-on-severe-solid)' : 'var(--lvl-ink)';
  const fill = inverse ? 'var(--dn-on-severe-solid)' : 'var(--lvl-fill)';
  const width = (size * 7) / 9;

  return (
    <span
      data-level={level}
      aria-hidden="true"
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width, height: size }}
    >
      {onset ? (
        <span
          className="dn-ripple absolute inset-0 rounded-glyph border-2 animate-dn-ripple"
          style={{ borderColor: inverse ? 'var(--dn-on-severe-solid)' : 'var(--dn-severe-fill)' }}
        />
      ) : null}
      <svg viewBox="0 0 14 18" width={width} height={size} className="relative block overflow-visible">
        {water > 0 ? (
          <rect
            x="2.5"
            y={innerTop + innerHeight - waterHeight}
            width="9"
            height={waterHeight}
            rx={water === 1 ? 1.5 : 0.5}
            fill={fill}
            style={{ transition: 'y 600ms cubic-bezier(.2,0,0,1), height 600ms cubic-bezier(.2,0,0,1)' }}
          />
        ) : null}
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
