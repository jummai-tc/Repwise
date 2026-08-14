import { cn } from "@/lib/utils";

/** Generic circular progress. Used for calories and any single-metric ring. */
export function ProgressRing({
  value,
  max,
  size = 160,
  stroke = 12,
  color = "var(--primary)",
  track = "var(--surface-hover)",
  children,
  label,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${value} of ${max}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

export function CalorieRing({
  consumed,
  target,
  size = 168,
  stroke = 13,
}: {
  consumed: number;
  target: number;
  size?: number;
  stroke?: number;
}) {
  const over = consumed > target;
  const remaining = Math.max(target - consumed, 0);

  return (
    <ProgressRing
      value={consumed}
      max={target}
      size={size}
      stroke={stroke}
      color={over ? "var(--warning)" : "var(--primary)"}
      label={`${consumed} of ${target} calories eaten today`}
    >
      <span className="text-stat-lg">{over ? consumed - target : remaining}</span>
      <span className="mt-1 text-xs font-medium text-muted">
        {over ? "kcal over" : "kcal left"}
      </span>
    </ProgressRing>
  );
}

const MACRO = {
  protein: { color: "var(--macro-protein)", label: "Protein" },
  carbs: { color: "var(--macro-carbs)", label: "Carbs" },
  fat: { color: "var(--macro-fat)", label: "Fat" },
} as const;

export function MacroBar({
  macro,
  label,
  consumed,
  target,
  className,
}: {
  macro: keyof typeof MACRO;
  label?: string;
  consumed: number;
  target: number;
  className?: string;
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = consumed > target;
  const { color } = MACRO[macro];

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-foreground">
          {label ?? MACRO[macro].label}
        </span>
        <span className="text-[0.8125rem] tabular text-subtle">
          <span className={cn("font-medium text-foreground", over && "text-warning")}>
            {Math.round(consumed)}
          </span>
          {" / "}
          {Math.round(target)}g
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: over ? "var(--warning)" : color }}
        />
      </div>
    </div>
  );
}
