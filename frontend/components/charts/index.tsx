"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// ==============================================================================
// 1. Area Trend Chart (Revenue / Expenses / Margin Progression)
// ==============================================================================

export interface AreaTrendDataPoint {
  period: string;
  [key: string]: any;
}

interface AreaTrendChartProps {
  data: AreaTrendDataPoint[];
  series: {
    key: string;
    label: string;
    color: string;
  }[];
  height?: number;
  valueFormatter?: (val: number) => string;
}

export function AreaTrendChart({
  data,
  series,
  height = 240,
  valueFormatter = (v) => formatCurrency(v),
}: AreaTrendChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F6" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12, fill: "#667085" }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#667085" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => {
              if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
              if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
              if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
              return `₹${val}`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
            }}
            formatter={(value: any) => [valueFormatter(Number(value)), ""]}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad-${s.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==============================================================================
// 2. Bar Metric Chart (Category Comparisons & Cost Breakdown)
// ==============================================================================

interface BarMetricChartProps {
  data: any[];
  bars: {
    key: string;
    label: string;
    color: string;
  }[];
  xAxisKey: string;
  height?: number;
  valueFormatter?: (val: number) => string;
}

export function BarMetricChart({
  data,
  bars,
  xAxisKey,
  height = 240,
  valueFormatter = (v) => formatCurrency(v),
}: BarMetricChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F6" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: "#667085" }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#667085" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => {
              if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
              if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
              if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
              return `₹${val}`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
            }}
            formatter={(value: any) => [valueFormatter(Number(value)), ""]}
          />
          {bars.length > 1 && <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />}
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==============================================================================
// 3. Donut Distribution Chart (Fleet Status, Expense Split)
// ==============================================================================

interface DonutDistributionChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  valueFormatter?: (val: number) => string;
}

export function DonutDistributionChart({
  data,
  height = 220,
  innerRadius = 55,
  outerRadius = 80,
  valueFormatter = (v) => `${v}`,
}: DonutDistributionChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
            }}
            formatter={(value: any, name: any) => [valueFormatter(Number(value)), name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
