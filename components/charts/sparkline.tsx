"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny inline trend, no axes — used inside stat cards. */
export function Sparkline({
  data,
  height = 48,
}: {
  data: { kg: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-mid)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--primary-mid)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="kg"
            stroke="var(--primary-mid)"
            strokeWidth={2}
            fill="url(#spark-fill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
