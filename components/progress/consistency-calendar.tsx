import { cn } from "@/lib/utils";
import { iso } from "@/lib/date";

const WEEKS = 12;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Twelve weeks of training history as a grid: one column per week, one row per
 * weekday. Reads at a glance whether someone is actually consistent, which a
 * streak number alone hides.
 */
export function ConsistencyCalendar({ trained }: { trained: Set<string> }) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Wind back to the Monday that starts the earliest visible week.
  const jsDay = today.getDay();
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
  const firstMonday = new Date(today);
  firstMonday.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7);

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(firstMonday);
      date.setDate(firstMonday.getDate() + w * 7 + d);
      return date;
    }),
  );

  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between py-[1px] text-[10px] text-subtle">
        {DAY_LABELS.map((l, i) => (
          <span key={i} className="flex h-4 items-center">
            {l}
          </span>
        ))}
      </div>

      <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((date) => {
              const key = iso(date);
              const isFuture = date > today;
              const didTrain = trained.has(key);
              return (
                <span
                  key={key}
                  title={`${date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}${didTrain ? " — trained" : ""}`}
                  className={cn(
                    "size-4 rounded-[4px]",
                    isFuture
                      ? "bg-surface-muted/60"
                      : didTrain
                        ? "bg-primary"
                        : "bg-surface-muted",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
