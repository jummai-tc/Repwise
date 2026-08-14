import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "mid" | "warning" | "info" | "neutral";

const TONE: Record<Tone, { fg: string; soft: string }> = {
  primary: { fg: "var(--primary)", soft: "var(--primary-soft)" },
  mid: { fg: "var(--primary-mid)", soft: "var(--primary-soft)" },
  warning: { fg: "var(--warning)", soft: "var(--warning-soft)" },
  info: { fg: "var(--info)", soft: "var(--info-soft)" },
  neutral: { fg: "var(--muted)", soft: "var(--surface-muted)" },
};

export type StatDelta = {
  /** Signed change. Zero renders as a flat "no change" chip. */
  value: number;
  /** Appended after the number, e.g. "%" or " kg". */
  unit?: string;
  /** What the change is measured against. */
  since?: string;
  /** Set when a fall is the good outcome — losing weight, resting heart rate. */
  invert?: boolean;
};

function DeltaChip({ value, unit = "", since, invert }: StatDelta) {
  const flat = value === 0;
  const good = invert ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold"
      style={{
        // Direction is carried by the arrow and the sign as well as the colour,
        // so this still reads with no colour vision at all.
        background: flat ? "var(--surface-muted)" : good ? "var(--success-soft)" : "var(--danger-soft)",
        color: flat ? "var(--subtle)" : good ? "var(--success)" : "var(--danger)",
      }}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      <span className="tabular">
        {value > 0 ? "+" : ""}
        {value}
        {unit}
      </span>
      {since && <span className="font-medium opacity-70">{since}</span>}
    </span>
  );
}

/**
 * Dashboard metric tile. The number stays the loudest thing on the card; an
 * optional meter underneath makes a target readable without a second glance.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  progress,
  delta,
  href,
  tone = "primary",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  /** 0-100. Renders a meter when provided. */
  progress?: number;
  delta?: StatDelta;
  /** Turns the whole tile into a link. */
  href?: string;
  tone?: Tone;
  className?: string;
}) {
  const { fg, soft } = TONE[tone];

  const body = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ring-inset ring-white/5"
              style={{ background: soft, color: fg }}
            >
              <Icon className="size-4" />
            </span>
          )}
          <span className="text-[0.8125rem] leading-tight font-medium text-balance text-muted">
            {label}
          </span>
        </span>
        {delta && <DeltaChip {...delta} />}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-stat">{value}</span>
        {unit && <span className="text-sm font-medium text-subtle">{unit}</span>}
      </div>

      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: fg,
            }}
          />
        </div>
      )}

      {hint && <p className="tabular mt-auto pt-2.5 text-xs text-subtle">{hint}</p>}
    </>
  );

  const classes = cn(
    "card card-interactive flex min-h-[8.5rem] flex-col p-4 lg:p-5",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
