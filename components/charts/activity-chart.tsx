"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

/**
 * Minutes trained each day this week.
 *
 * Emphasis rather than categorical: today is the point of the chart, so it gets
 * the accent and every other day sits back in the de-emphasis fill. Rest days
 * have no bar at all — the gap is the information.
 */
export function ActivityChart({
  data,
  todayLabel,
  height = 160,
}: {
  data: { day: string; minutes: number }[];
  /** Short weekday name of the current day, e.g. "Wed". */
  todayLabel?: string;
  height?: number;
}) {
  // Today is the day worth pointing at — unless today is a rest day, in which
  // case the week's longest session is, and the chart is never all-gray.
  const todayMinutes = data.find((d) => d.day === todayLabel)?.minutes ?? 0;
  const best = Math.max(...data.map((d) => d.minutes));
  const emphasised =
    todayMinutes > 0
      ? todayLabel
      : data.find((d) => d.minutes === best && best > 0)?.day;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-hover)", radius: 8 }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              boxShadow: "var(--shadow-lg)",
              fontSize: 13,
            }}
            itemStyle={{ color: "var(--foreground)" }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(value) => [
              Number(value) === 0 ? "Rest day" : `${Number(value)} min`,
              "Trained",
            ]}
          />
          <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={34}>
            {data.map((d) => (
              <Cell
                key={d.day}
                fill={
                  d.day === emphasised
                    ? "var(--primary-mid)"
                    : "var(--chart-neutral)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
