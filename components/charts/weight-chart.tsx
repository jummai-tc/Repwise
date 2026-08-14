"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axisTick = { fill: "var(--subtle)", fontSize: 11 };

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  boxShadow: "var(--shadow-lg)",
  fontSize: 13,
  padding: "8px 12px",
};

export function WeightChart({
  data,
  targetKg,
  height = 240,
}: {
  data: { date: string; kg: number }[];
  targetKg?: number;
  height?: number;
}) {
  const values = data.map((d) => d.kg);
  const min = Math.floor(Math.min(...values, targetKg ?? Infinity) - 1);
  const max = Math.ceil(Math.max(...values) + 1);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-mid)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary-mid)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            }
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis domain={[min, max]} tick={axisTick} axisLine={false} tickLine={false} width={44} />

          {targetKg && (
            <ReferenceLine
              y={targetKg}
              stroke="var(--border-strong)"
              strokeDasharray="4 4"
              label={{
                value: "Goal",
                position: "insideTopRight",
                fill: "var(--subtle)",
                fontSize: 11,
              }}
            />
          )}

          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "var(--muted)", marginBottom: 2 }}
            itemStyle={{ color: "var(--foreground)" }}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
              })
            }
            formatter={(value) => [`${Number(value)} kg`, "Weight"]}
          />
          <Area
            type="monotone"
            dataKey="kg"
            stroke="var(--primary-mid)"
            strokeWidth={2}
            fill="url(#weight-fill)"
            dot={false}
            activeDot={{ r: 4.5, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
