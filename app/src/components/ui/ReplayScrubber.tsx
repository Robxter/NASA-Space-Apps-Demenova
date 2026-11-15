// Replay scrubber shell (demo only, docs/spec/18 Home 5). Presentational: the caller owns the index and the clock.
// The track is a day strip: one bar per day, height and colour from that day's highest level, so the flood
// reads as a rising block before anyone presses play. Days after the playhead are faded, not hidden.
import type { Severity } from '../../types/contracts';
import { DemoChip } from './DemoChip';
import { SEVERITY_WATER, UI_COPY, type Lang } from './severity';

export interface ScrubberDay {
  /** Short label for the ends of the strip, e.g. "15 feb". */
  label: string;
  /** Highest level on the farm that day; null when there is no data for the day. */
  level: Severity | null;
}

export interface ReplayScrubberProps {
  days: ScrubberDay[];
  index: number;
  /** Full date of the current day, e.g. "22 feb 2026". Also the slider's spoken value. */
  dateLabel: string;
  onIndexChange?: (index: number) => void;
  playing?: boolean;
  onTogglePlay?: () => void;
  /** Skeleton while the replay snapshot loads. */
  loading?: boolean;
  /** Shows the Demo chip (the replay farm is synthetic). */
  demo?: boolean;
  lang?: Lang;
  className?: string;
}

const THUMB = 4; // px, must match .dn-range thumb width in index.css

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path d="M4 2.6v10.8a.8.8 0 0 0 1.2.7l8.6-5.4a.8.8 0 0 0 0-1.4L5.2 1.9a.8.8 0 0 0-1.2.7z" fill="currentColor" />
    </svg>
  );
}

export function ReplayScrubber({
  days,
  index,
  dateLabel,
  onIndexChange,
  playing = false,
  onTogglePlay,
  loading = false,
  demo = true,
  lang = 'es',
  className = '',
}: ReplayScrubberProps) {
  const copy = UI_COPY[lang];
  const n = Math.max(days.length, 1);
  const last = Math.max(n - 1, 1);
  const barWidth = `calc((100% - ${THUMB}px) / ${n} - 2px)`;
  const first = days[0];
  const end = days[days.length - 1];

  return (
    <div className={`flex items-center gap-3 rounded-sheet bg-surface px-3 py-2.5 shadow-sheet ${className}`} aria-busy={loading || undefined}>
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={loading || !onTogglePlay}
        aria-label={playing ? copy.pause : copy.play}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary dn-press disabled:opacity-45"
      >
        <PlayIcon playing={playing} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {loading ? (
            <span className="h-5 w-28 rounded-control bg-skeleton">
              <span className="sr-only">{copy.loading}</span>
            </span>
          ) : (
            <span className="dn-num truncate text-callout font-semibold text-ink">{dateLabel}</span>
          )}
          {demo ? <DemoChip lang={lang} /> : null}
        </div>

        <div className="relative mt-1 h-12">
          <div aria-hidden="true" className="absolute inset-0">
            {(loading ? Array.from({ length: n }, () => null) : days).map((day, i) => {
              const level = day?.level ?? null;
              const ratio = level ? SEVERITY_WATER[level] : 0;
              const height = loading ? 12 : level === null ? 6 : 8 + ratio * 26;
              const left = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${i / last})`;
              // Days after the playhead keep their height (the shape of the event) but stay neutral until reached.
              const ahead = !loading && i > index;
              const skin = loading
                ? 'bg-skeleton'
                : level === null
                  ? 'border border-dashed border-ink-3'
                  : ahead
                    ? 'bg-line'
                    : 'bg-lvl-fill';
              return (
                <span
                  key={i}
                  data-level={level ?? undefined}
                  className={`absolute bottom-2 rounded-[2px] transition-colors duration-200 ease-standard ${skin}`}
                  style={{ left, width: barWidth, height, transform: 'translateX(-50%)' }}
                />
              );
            })}
          </div>
          {!loading ? (
            <input
              type="range"
              className="dn-range relative"
              min={0}
              max={n - 1}
              step={1}
              value={Math.min(Math.max(index, 0), n - 1)}
              onChange={(e) => onIndexChange?.(Number(e.currentTarget.value))}
              disabled={!onIndexChange}
              aria-label={copy.replayDay}
              aria-valuetext={dateLabel}
            />
          ) : null}
        </div>

        {!loading && first && end ? (
          <div className="dn-num flex justify-between text-caption text-ink-3">
            <span>{first.label}</span>
            <span>{end.label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
