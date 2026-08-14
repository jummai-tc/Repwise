import { cn } from "@/lib/utils";

/**
 * The dashboard's focal meter: a single ratio against a limit, drawn as a
 * segmented arc so the reader can count progress rather than estimate it.
 *
 * Segments are deliberate. A continuous ring makes "83%" a guess; 40 ticks
 * make it countable, and the unfilled ticks show the size of what is left
 * instead of leaving empty space. One hue throughout — this is a meter, not a
 * categorical chart, so colour carries no identity here.
 */
export function ScoreRing({
  value,
  max = 100,
  size = 220,
  segments = 44,
  label,
  children,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  segments?: number;
  /** Accessible description; the visible centre content is `children`. */
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = Math.round(pct * segments);

  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const inner = outer - size * 0.075;

  // The arc runs from -220° to 40°, leaving a 100° gap at the bottom for the
  // caption. Angles are measured clockwise from 3 o'clock, as SVG expects.
  const START = -220;
  const SWEEP = 260;

  const ticks = Array.from({ length: segments }, (_, i) => {
    const angle = ((START + (SWEEP * i) / (segments - 1)) * Math.PI) / 180;
    return {
      i,
      x1: cx + inner * Math.cos(angle),
      y1: cy + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy + outer * Math.sin(angle),
      on: i < filled,
    };
  });

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} aria-hidden>
        {ticks.map((t) => (
          <line
            key={t.i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            strokeWidth={size * 0.018}
            strokeLinecap="round"
            stroke={t.on ? "var(--primary)" : "var(--surface-muted)"}
            opacity={t.on ? 1 : 0.9}
          />
        ))}
      </svg>

      {/* The lit segments cast a soft mint bloom behind the numerals. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[18%] rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(63,224,143,0.16), transparent 70%)" }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/**
 * A horizontal ratio-against-limit meter. Same hue as every other meter on the
 * page: the label says which metric it is, so the colour does not have to.
 */
export function Meter({
  label,
  value,
  target,
  unit,
  display,
  tone = "primary",
  className,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  /** Overrides the "value / target unit" readout when a custom one reads better. */
  display?: string;
  tone?: "primary" | "warning";
  className?: string;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const color = tone === "warning" ? "var(--warning)" : "var(--primary-mid)";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-[0.8125rem] font-medium text-foreground">{label}</span>
        <span className="tabular shrink-0 text-[0.8125rem] text-subtle">
          {display ?? (
            <>
              <span className="font-semibold text-foreground">{value}</span>
              {" / "}
              {target}
              {unit ? ` ${unit}` : ""}
            </>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
