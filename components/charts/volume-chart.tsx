"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function VolumeChart({
  data,
  height = 200,
}: {
  data: { week: string; volume: number }[];
  height?: number;
}) {
  const best = Math.max(...data.map((d) => d.volume));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: "var(--subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            tick={{ fill: "var(--subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={38}
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
            labelStyle={{ color: "var(--muted)" }}
            itemStyle={{ color: "var(--foreground)" }}
            formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
          />
          <Bar dataKey="volume" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((d) => (
              <Cell
                key={d.week}
                // Best week in the plotted green; the rest recede to the
                // de-emphasis fill so the peak is what you see first.
                fill={d.volume === best ? "var(--primary-mid)" : "var(--chart-neutral)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
