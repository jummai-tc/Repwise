import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  label,
  tone = "primary",
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
  tone?: "primary" | "mid" | "warning" | "info";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bg = {
    primary: "var(--primary)",
    mid: "var(--primary-mid)",
    warning: "var(--warning)",
    info: "var(--info)",
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barClassName)}
        style={{ width: `${pct}%`, background: bg }}
      />
    </div>
  );
}
