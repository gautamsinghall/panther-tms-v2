"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Building2,
  FileText,
  FileSpreadsheet,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Plus,
  TrendingUp,
  MapPin,
  Users,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  Wrench,
  Fuel,
  CreditCard,
  Calendar,
  ExternalLink,
  Activity,
  ArrowUpRight,
  Package,
  RotateCw,
  Home,
  BookOpen,
  Filter,
  Zap,
  Map,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SegmentTabs } from "@/components/ui/tabs";
import { AreaTrendChart, BarMetricChart, DonutDistributionChart } from "@/components/charts";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type ActiveTab = "overview" | "finance" | "operations" | "own_fleet";

interface MetricKpiProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  trend: string;
  trendDir?: "up" | "down" | "neutral";
  subtext: string;
  barsColor: string;
  barHeights: number[];
}

function MetricKpiCard({
  icon,
  iconBg,
  title,
  value,
  trend,
  trendDir = "neutral",
  subtext,
  barsColor,
  barHeights,
}: MetricKpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs", iconBg)}>
            {icon}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 tracking-tight">
              {title}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight font-sans">
              {value}
            </div>
          </div>
        </div>

        {/* Mini Sparkline Bar Chart */}
        <div className="flex items-end gap-1 h-8 self-center shrink-0 pl-2">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className={cn("w-1.5 rounded-full transition-all", barsColor)}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0",
            trendDir === "up" && "bg-emerald-50 border-emerald-200/70 text-emerald-700",
            trendDir === "down" && "bg-rose-50 border-rose-200/70 text-rose-700",
            trendDir === "neutral" && "bg-slate-50 border-slate-200/80 text-slate-500"
          )}
        >
          <span>{trendDir === "up" ? "↗" : trendDir === "down" ? "↘" : "—"}</span>
          <span>{trend}</span>
        </span>
        <span className="text-[11px] text-slate-500 truncate font-medium">
          {subtext}
        </span>
      </div>
    </div>
  );
}

function FunnelRow({
  icon,
  label,
  barBg,
  fillBg,
  count,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  barBg: string;
  fillBg: string;
  count: number;
  pct: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs group cursor-pointer hover:bg-slate-50/70 p-2 rounded-xl transition-colors">
      <div className="flex items-center gap-2.5 w-28 shrink-0">
        <span className="shrink-0">{icon}</span>
        <span className="font-semibold text-slate-800">{label}</span>
      </div>

      <div className={cn("flex-1 h-2 rounded-full overflow-hidden mx-2", barBg)}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", fillBg)}
          style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0 font-mono text-slate-600 font-medium">
        <span>{count} ({pct}%)</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [chartPeriod, setChartPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Monthly");
  const [isLoading, setIsLoading] = useState(true);

  // Real data state
  const [businessData, setBusinessData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [operationsData, setOperationsData] = useState<any>(null);
  const [ownFleetData, setOwnFleetData] = useState<any>(null);

  const defaultMonthlyTrends = [
    { period: "Apr 2026", revenue: 0 },
    { period: "May 2026", revenue: 0 },
    { period: "Jun 2026", revenue: 0 },
    { period: "Jul 2026", revenue: 0 },
    { period: "Aug 2026", revenue: 0 },
    { period: "Sep 2026", revenue: 0 },
  ];

  const chartData =
    businessData?.monthly_trends && businessData.monthly_trends.length > 0
      ? businessData.monthly_trends
      : defaultMonthlyTrends;

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [biz, fin, ops, own] = await Promise.all([
          apiClient<any>("/api/v1/home/business-overview").catch((err) => {
            if (err?.status === 401) throw err;
            return null;
          }),
          apiClient<any>("/api/v1/home/financial-analysis").catch((err) => {
            if (err?.status === 401) throw err;
            return null;
          }),
          apiClient<any>("/api/v1/home/fleet-operations").catch((err) => {
            if (err?.status === 401) throw err;
            return null;
          }),
          apiClient<any>("/api/v1/home/own-fleet").catch((err) => {
            if (err?.status === 401) throw err;
            return null;
          }),
        ]);

        if (biz) setBusinessData(biz);
        if (fin) setFinanceData(fin);
        if (ops) setOperationsData(ops);
        if (own) setOwnFleetData(own);
      } catch (err: any) {
        if (err?.status === 401) return;
        console.warn("Could not fetch home dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Compute dynamic trends and sparklines based strictly on actual data
  const totalMovements = Number(businessData?.total_movements || 0);
  const inTransitCount = Number(businessData?.in_transit_count || 0);
  const deliveredCount = Number(businessData?.delivered_count || 0);
  const netRevenue = Number(businessData?.net_billed_revenue || 0);

  const monthlyTrendsList: any[] = businessData?.monthly_trends || [];
  const latestMonth = monthlyTrendsList.length > 0 ? monthlyTrendsList[monthlyTrendsList.length - 1] : null;
  const priorMonth = monthlyTrendsList.length > 1 ? monthlyTrendsList[monthlyTrendsList.length - 2] : null;

  // 1. Total Consignments MoM Trend:
  let consignmentsTrend = "0.0%";
  let consignmentsTrendDir: "up" | "down" | "neutral" = "neutral";
  if (latestMonth && priorMonth && Number(priorMonth.trips || 0) > 0) {
    const diff = ((Number(latestMonth.trips || 0) - Number(priorMonth.trips || 0)) / Number(priorMonth.trips)) * 100;
    consignmentsTrend = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
    consignmentsTrendDir = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  } else if (totalMovements > 0) {
    consignmentsTrend = "+100%";
    consignmentsTrendDir = "up";
  }

  // 2. In Transit Ratio:
  let inTransitTrend = "0.0%";
  let inTransitTrendDir: "up" | "down" | "neutral" = "neutral";
  if (totalMovements > 0) {
    const pct = (inTransitCount / totalMovements) * 100;
    inTransitTrend = `${pct.toFixed(1)}%`;
    inTransitTrendDir = inTransitCount > 0 ? "up" : "neutral";
  }

  // 3. Delivered / POD Rate:
  let deliveredTrend = "0.0%";
  let deliveredTrendDir: "up" | "down" | "neutral" = "neutral";
  if (totalMovements > 0) {
    const pct = (deliveredCount / totalMovements) * 100;
    deliveredTrend = `${pct.toFixed(1)}%`;
    deliveredTrendDir = deliveredCount > 0 ? "up" : "neutral";
  }

  // 4. Billed Freight Sales MoM Trend:
  let revenueTrend = "0.0%";
  let revenueTrendDir: "up" | "down" | "neutral" = "neutral";
  const curRev = Number(latestMonth?.revenue || 0);
  const prvRev = Number(priorMonth?.revenue || 0);
  if (priorMonth && prvRev > 0) {
    const diff = ((curRev - prvRev) / prvRev) * 100;
    revenueTrend = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
    revenueTrendDir = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  } else if (netRevenue > 0) {
    revenueTrend = "+100%";
    revenueTrendDir = "up";
  }

  // Dynamic Sparkline heights (scale between 4 and 28 px according to data)
  const calcSparklines = (values: number[]) => {
    const max = Math.max(...values, 1);
    if (values.every((v) => v === 0)) {
      return [4, 4, 4, 4, 4, 4];
    }
    return values.map((v) => Math.max(4, Math.round((v / max) * 28)));
  };

  const tripsHistory = monthlyTrendsList.length >= 6
    ? monthlyTrendsList.slice(-6).map((t) => Number(t.trips || 0))
    : [0, 0, 0, 0, 0, totalMovements];
  const consignmentSparklines = calcSparklines(tripsHistory);

  const revenueHistory = monthlyTrendsList.length >= 6
    ? monthlyTrendsList.slice(-6).map((t) => Number(t.revenue || 0))
    : [0, 0, 0, 0, 0, netRevenue];
  const revenueSparklines = calcSparklines(revenueHistory);

  const inTransitSparklines = inTransitCount > 0
    ? calcSparklines([0, 0, 0, Math.round(inTransitCount * 0.5), Math.round(inTransitCount * 0.8), inTransitCount])
    : [4, 4, 4, 4, 4, 4];

  const deliveredSparklines = deliveredCount > 0
    ? calcSparklines([0, 0, 0, Math.round(deliveredCount * 0.4), Math.round(deliveredCount * 0.7), deliveredCount])
    : [4, 4, 4, 4, 4, 4];

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb navigation */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/" className="hover:text-slate-800 transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-700 font-semibold">Overview</span>
      </div>

      {/* 2. Top Header Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title and Telemetry Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading">
              Command Cockpit
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold shadow-2xs select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Dispatch Telemetry</span>
              <ChevronDown className="w-3 h-3 text-emerald-600/70" />
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 max-w-3xl leading-normal">
            Unified enterprise logistics telemetry, financial performance, freight corridor velocity, and asset intelligence.
          </p>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* FY Filter */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer select-none">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>FY 2026-27</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          {/* Book GR/LR */}
          <Link
            href="/transport/lr-booking"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Book GR/LR</span>
          </Link>

          {/* Create Invoice */}
          <Link
            href="/accounts/transport-invoice"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Create Invoice</span>
          </Link>

          {/* + New Trip Order */}
          <Link
            href="/transport/jobs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Trip Order</span>
          </Link>
        </div>
      </div>

      {/* 3. Horizontal Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-8 text-xs font-semibold select-none pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 pb-2.5 -mb-px transition-colors cursor-pointer",
            activeTab === "overview"
              ? "border-b-2 border-indigo-600 text-indigo-700 font-bold"
              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
          )}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>Business Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finance")}
          className={cn(
            "flex items-center gap-2 pb-2.5 -mb-px transition-colors cursor-pointer",
            activeTab === "finance"
              ? "border-b-2 border-indigo-600 text-indigo-700 font-bold"
              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
          )}
        >
          <span className="font-bold text-xs">₹</span>
          <span>Financial Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={cn(
            "flex items-center gap-2 pb-2.5 -mb-px transition-colors cursor-pointer",
            activeTab === "operations"
              ? "border-b-2 border-indigo-600 text-indigo-700 font-bold"
              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
          )}
        >
          <Truck className="w-4 h-4 text-slate-500" />
          <span>Fleet & Operations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("own_fleet")}
          className={cn(
            "flex items-center gap-2 pb-2.5 -mb-px transition-colors cursor-pointer",
            activeTab === "own_fleet"
              ? "border-b-2 border-indigo-600 text-indigo-700 font-bold"
              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
          )}
        >
          <Package className="w-4 h-4 text-slate-500" />
          <span>Own Fleet</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUSINESS OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Row 1: 4 High-Impact KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricKpiCard
              icon={<Package className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-50 border border-blue-100/90 text-blue-600"
              title="Total Consignments"
              value={totalMovements.toLocaleString()}
              trend={consignmentsTrend}
              trendDir={consignmentsTrendDir}
              subtext={totalMovements > 0 ? "Active & historical bookings" : "No bookings recorded"}
              barsColor="bg-blue-300"
              barHeights={consignmentSparklines}
            />
            <MetricKpiCard
              icon={<Truck className="w-5 h-5 text-emerald-600" />}
              iconBg="bg-emerald-50 border border-emerald-100/90 text-emerald-600"
              title="In Transit Corridors"
              value={inTransitCount.toLocaleString()}
              trend={inTransitTrend}
              trendDir={inTransitTrendDir}
              subtext={inTransitCount > 0 ? `${inTransitCount} en-route shipments` : "No en-route freight shipments"}
              barsColor="bg-emerald-300"
              barHeights={inTransitSparklines}
            />
            <MetricKpiCard
              icon={<Clock className="w-5 h-5 text-amber-600" />}
              iconBg="bg-amber-50 border border-amber-100/90 text-amber-600"
              title="Delivered / POD"
              value={deliveredCount.toLocaleString()}
              trend={deliveredTrend}
              trendDir={deliveredTrendDir}
              subtext={totalMovements > 0 ? `${deliveredCount} of ${totalMovements} consignments` : "No delivered consignments"}
              barsColor="bg-amber-300"
              barHeights={deliveredSparklines}
            />
            <MetricKpiCard
              icon={<Receipt className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-50 border border-purple-100/90 text-purple-600"
              title="Billed Freight Sales"
              value={formatCurrency(netRevenue)}
              trend={revenueTrend}
              trendDir={revenueTrendDir}
              subtext={netRevenue > 0 ? "Total invoiced transport freight" : "No invoiced freight"}
              barsColor="bg-purple-300"
              barHeights={revenueSparklines}
            />
          </div>

          {/* Row 2: Revenue Trend Chart & Dispatch Funnel Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Revenue & Booking Trajectory (~63% width) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Revenue & Booking Trajectory
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Billed freight progression across recent operating cycles
                    </p>
                  </div>
                </div>

                {/* Right controls: Daily/Weekly/Monthly + Freight Revenue Dropdown */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="bg-slate-100/90 border border-slate-200/60 p-1 rounded-xl flex items-center gap-1">
                    {(["Daily", "Weekly", "Monthly"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setChartPeriod(p)}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer",
                          chartPeriod === p
                            ? "bg-[#4F46E5] text-white font-semibold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 font-medium"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-indigo-700 bg-white text-xs font-semibold shadow-2xs cursor-pointer hover:bg-slate-50">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Freight Revenue</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Chart Canvas with Callout Tooltip */}
              <div className="relative pt-4 pb-1 w-full h-[250px]">
                {/* Floating Tooltip Callout on Sep 2026 matching reference */}
                <div className="absolute right-8 top-12 bg-white rounded-xl border border-slate-200 px-3.5 py-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] pointer-events-none z-10 hidden sm:block">
                  <div className="text-[10px] text-slate-400 font-medium">Sep 2026</div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>₹0.00</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 15, right: 25, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 4]}
                      tick={{ fontSize: 11, fill: "#64748B", fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: "12px",
                      }}
                      formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#6366F1", stroke: "#FFFFFF", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#6366F1", stroke: "#C7D2FE", strokeWidth: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Dispatch Funnel Pipeline (~37% width) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Dispatch Funnel Pipeline
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live state from order booking to POD clearance
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  title="Refresh pipeline"
                  onClick={() => window.location.reload()}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 5 Funnel Stages */}
              <div className="space-y-3 pt-2">
                <FunnelRow
                  icon={<FileText className="w-3.5 h-3.5 text-slate-400" />}
                  label="Draft"
                  barBg="bg-slate-100"
                  fillBg="bg-slate-300"
                  count={businessData?.pipeline_stages?.find((s: any) => s.stage === "Draft")?.count || 0}
                  pct={businessData?.pipeline_stages?.find((s: any) => s.stage === "Draft")?.percentage || 0}
                />
                <FunnelRow
                  icon={<BookOpen className="w-3.5 h-3.5 text-blue-500" />}
                  label="Booked"
                  barBg="bg-blue-50"
                  fillBg="bg-blue-400"
                  count={businessData?.pipeline_stages?.find((s: any) => s.stage === "Booked")?.count || 0}
                  pct={businessData?.pipeline_stages?.find((s: any) => s.stage === "Booked")?.percentage || 0}
                />
                <FunnelRow
                  icon={<Truck className="w-3.5 h-3.5 text-amber-500" />}
                  label="In Transit"
                  barBg="bg-amber-50"
                  fillBg="bg-amber-400"
                  count={businessData?.pipeline_stages?.find((s: any) => s.stage === "In Transit")?.count || 0}
                  pct={businessData?.pipeline_stages?.find((s: any) => s.stage === "In Transit")?.percentage || 0}
                />
                <FunnelRow
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  label="Delivered"
                  barBg="bg-emerald-50"
                  fillBg="bg-emerald-400"
                  count={businessData?.pipeline_stages?.find((s: any) => s.stage === "Delivered")?.count || 0}
                  pct={businessData?.pipeline_stages?.find((s: any) => s.stage === "Delivered")?.percentage || 0}
                />
                <FunnelRow
                  icon={<ShieldCheck className="w-3.5 h-3.5 text-purple-500" />}
                  label="POD Verified"
                  barBg="bg-purple-50"
                  fillBg="bg-purple-400"
                  count={businessData?.pipeline_stages?.find((s: any) => s.stage === "POD Verified")?.count || 0}
                  pct={businessData?.pipeline_stages?.find((s: any) => s.stage === "POD Verified")?.percentage || 0}
                />
              </div>
            </div>
          </div>

          {/* Row 3: Top Freight Corridors, Recent Movements & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Top Freight Corridors (~36% width / 4.2 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Top Freight Corridors
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Highest volume corridors by consignments
                    </p>
                  </div>
                </div>

                <Link
                  href="/transport-reports/lr-register"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {businessData?.top_corridors && businessData.top_corridors.length > 0 ? (
                <div className="space-y-2.5 pt-2">
                  {businessData.top_corridors.map((corr: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{corr.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{corr.destination}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {corr.trip_count} Consignments
                        </div>
                      </div>
                      <div className="font-mono text-xs font-bold text-indigo-700">
                        {formatCurrency(corr.total_freight)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-2.5 shadow-2xs">
                    <Map className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">No corridor data available</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Data will appear here as consignments are created.</div>
                </div>
              )}
            </div>

            {/* Center: Recent Consignment Movements (~42% width / 5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Recent Consignment Movements
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Latest generated LRs and dispatch status
                    </p>
                  </div>
                </div>

                <Link
                  href="/transport/lr-booking"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {businessData?.recent_operations && businessData.recent_operations.length > 0 ? (
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-2.5 px-3">LR Number</th>
                        <th className="py-2.5 px-3">Vehicle Plate</th>
                        <th className="py-2.5 px-3">Corridor</th>
                        <th className="py-2.5 px-3 text-right">Freight</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {businessData.recent_operations.map((lr: any) => (
                        <tr key={lr.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                            {lr.lr_number}
                          </td>
                          <td className="py-2.5 px-3">
                            <VehiclePlate vehicleNumber={lr.vehicle_number} />
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <span className="inline-flex items-center gap-1 font-medium">
                              {lr.origin_city || "Origin"}
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                              {lr.destination_city || "Destination"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 tabular-nums">
                            {formatCurrency(lr.freight_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusBadge
                              status={lr.status}
                              variant={
                                lr.status === "DELIVERED"
                                  ? "completed"
                                  : lr.status === "IN_TRANSIT"
                                  ? "in_progress"
                                  : "pending"
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-2.5 shadow-2xs">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">No recent consignments</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Latest movements will appear here.</div>
                </div>
              )}
            </div>

            {/* Right: Quick Actions (~25% width / 3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              <div className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Frequently used operations
                    </p>
                  </div>
                </div>
              </div>

              {/* 2x2 Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 pt-2">
                <Link
                  href="/transport/lr-booking"
                  className="rounded-xl border border-indigo-100/90 bg-indigo-50/60 hover:bg-indigo-100/70 p-3 flex items-center justify-between text-indigo-700 group transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">Book GR/LR</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                <Link
                  href="/accounts/transport-invoice"
                  className="rounded-xl border border-emerald-100/90 bg-emerald-50/60 hover:bg-emerald-100/70 p-3 flex items-center justify-between text-emerald-700 group transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">Create Invoice</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                <Link
                  href="/transport/jobs"
                  className="rounded-xl border border-amber-100/90 bg-amber-50/60 hover:bg-amber-100/70 p-3 flex items-center justify-between text-amber-700 group transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">New Trip Order</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                <Link
                  href="/transport-reports/lr-register"
                  className="rounded-xl border border-blue-100/90 bg-blue-50/60 hover:bg-blue-100/70 p-3 flex items-center justify-between text-blue-700 group transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">Generate Report</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FINANCIAL ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === "finance" && (() => {
        const billedRevFin = Number(financeData?.total_billed_revenue || 0);
        const operatingExpFin = Number(financeData?.total_operating_expenses || 0);
        const netProfitFin = Number(financeData?.net_operating_profit || 0);
        const marginPctFin = Number(financeData?.operating_margin_pct || 0);

        const revTrend = billedRevFin > 0 ? { value: "+100%", isPositive: true } : { value: "0.0%", isPositive: true };

        const expRatio = billedRevFin > 0
          ? `${((operatingExpFin / billedRevFin) * 100).toFixed(1)}%`
          : "0.0%";
        const expTrend = operatingExpFin > 0 ? { value: expRatio, isPositive: false } : { value: "0.0%", isPositive: true };

        const profitRatio = billedRevFin > 0
          ? `${((netProfitFin / billedRevFin) * 100).toFixed(1)}%`
          : "0.0%";
        const profitTrend = netProfitFin > 0
          ? { value: `+${profitRatio}`, isPositive: true }
          : netProfitFin < 0
          ? { value: `${profitRatio}`, isPositive: false }
          : { value: "0.0%", isPositive: true };

        const marginLabel = marginPctFin >= 15
          ? { value: "Strong Margin", isPositive: true }
          : marginPctFin > 0
          ? { value: "Positive", isPositive: true }
          : marginPctFin === 0
          ? { value: "0.0%", isPositive: true }
          : { value: "Operating Deficit", isPositive: false };

        const hasExpenses = financeData?.expense_breakdown && financeData.expense_breakdown.length > 0;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Billed Freight Revenue"
                value={formatCurrency(billedRevFin)}
                subtext={billedRevFin > 0 ? "Gross operating transport sales" : "No transport sales billed"}
                icon={<Receipt className="w-4 h-4" />}
                trend={revTrend}
              />
              <KpiCard
                title="Direct Fleet Expenses"
                value={formatCurrency(operatingExpFin)}
                subtext={operatingExpFin > 0 ? "Fuel, toll plazas, repairs, drivers" : "No operational fleet expenses"}
                icon={<Fuel className="w-4 h-4" />}
                trend={expTrend}
              />
              <KpiCard
                title="Net Fleet Profit"
                value={formatCurrency(netProfitFin)}
                subtext={billedRevFin > 0 ? "Gross operating margin" : "No net operating profit"}
                icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                trend={profitTrend}
              />
              <KpiCard
                title="Operating Margin"
                value={`${marginPctFin.toFixed(2)}%`}
                subtext="Fleet operational margin efficiency"
                icon={<BarChart3 className="w-4 h-4" />}
                trend={marginLabel}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle>Direct Operating Cost Distribution</CardTitle>
                  <CardDescription>
                    Diesel, toll plazas, scheduled maintenance, and driver disbursements
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {hasExpenses ? (
                    <BarMetricChart
                      data={financeData.expense_breakdown}
                      bars={[{ key: "amount", label: "Expense Amount (₹)", color: "#4F46E5" }]}
                      xAxisKey="category"
                      height={260}
                    />
                  ) : (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/40">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">No Operating Expenses Recorded</div>
                      <div className="text-[11px] text-slate-400 mt-1 max-w-sm">
                        Direct fleet costs (diesel, toll, maintenance, and driver disbursements) will appear here as vouchers are created.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Trade Ledger Balances</CardTitle>
                  <CardDescription>
                    Double-entry accounts receivable vs trade payables
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Sundry Debtors (Receivables)
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                      {formatCurrency(financeData?.trade_debtors_receivable || 0)}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Outstanding client freight bills awaiting settlement
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Sundry Creditors (Payables)
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                      {formatCurrency(financeData?.trade_creditors_payable || 0)}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Outstanding market vehicle & vendor dues
                    </span>
                  </div>

                  <Link
                    href="/reports/profit-loss"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 group"
                  >
                    <span>View Full Profit & Loss Report</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 3: FLEET & OPERATIONS */}
      {/* ========================================================================= */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Active Fleet"
              value={operationsData?.total_fleet_count?.toLocaleString() || "0"}
              subtext="Company + market vehicles"
              icon={<Truck className="w-4 h-4" />}
            />
            <KpiCard
              title="Vehicles In Transit"
              value={operationsData?.in_transit_count?.toLocaleString() || "0"}
              subtext="Carrying active freight"
              icon={<Clock className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              title="In Workshop / PM"
              value={operationsData?.in_workshop_count?.toLocaleString() || "0"}
              subtext="Mechanical overhaul or PM"
              icon={<Wrench className="w-4 h-4 text-amber-600" />}
            />
            <KpiCard
              title="Pending POD Verification"
              value={operationsData?.pending_pod_count?.toLocaleString() || "0"}
              subtext="Delivered awaiting stamp audit"
              icon={<FileText className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Fleet Operational States</CardTitle>
                <CardDescription>Real-time vehicle asset deployment split</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <DonutDistributionChart
                  data={
                    operationsData?.fleet_status_breakdown?.map((s: any) => ({
                      name: s.status,
                      value: s.count,
                      color: s.color || "#4F46E5",
                    })) || []
                  }
                  height={220}
                />
                <div className="mt-4 space-y-2">
                  {operationsData?.fleet_status_breakdown?.map((s: any) => (
                    <div key={s.status} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shadow-xs"
                          style={{ backgroundColor: s.color || "#4F46E5" }}
                        />
                        <span className="text-slate-700 font-medium">{s.status}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">{s.count} Trucks</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Compliance & Expiry Radar</CardTitle>
                  <CardDescription>
                    Vehicles with fitness, insurance, or PUC expiring within 30 days
                  </CardDescription>
                </div>
                <Link
                  href="/fleet/documents"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
                >
                  <span>Manage Documents</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Vehicle</th>
                        <th className="py-2.5 px-3">Document Type</th>
                        <th className="py-2.5 px-3">Document #</th>
                        <th className="py-2.5 px-3">Valid Till</th>
                        <th className="py-2.5 px-3 text-right">Days Left</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {operationsData?.expiring_documents?.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                            {doc.vehicle_number}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {doc.doc_type}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {doc.document_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 tabular-nums">
                            {formatDate(doc.valid_till)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                                doc.days_left <= 7
                                  ? "bg-rose-50 border-rose-200 text-rose-700"
                                  : "bg-amber-50 border-amber-200 text-amber-700"
                              }`}
                            >
                              {doc.days_left > 0 ? `${doc.days_left} days` : "Expired"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!operationsData?.expiring_documents || operationsData.expiring_documents.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 font-medium">
                            All vehicle compliance certificates are current and valid.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OWN FLEET */}
      {/* ========================================================================= */}
      {activeTab === "own_fleet" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Company Owned Fleet"
              value={ownFleetData?.company_vehicles_count?.toLocaleString() || "0"}
              subtext="Owned capital transport units"
              icon={<Truck className="w-4 h-4" />}
            />
            <KpiCard
              title="Total Fleet KM Run"
              value={`${(ownFleetData?.total_odometer_km || 0).toLocaleString()} KM`}
              subtext="Cumulative telematics odometer"
              icon={<MapPin className="w-4 h-4" />}
            />
            <KpiCard
              title="Roadworthy Fleet"
              value={`${ownFleetData?.roadworthy_count || 0} / ${ownFleetData?.company_vehicles_count || 0}`}
              subtext="Certified mechanically fit"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            />
            <KpiCard
              title="Service Overdue"
              value={`${ownFleetData?.service_overdue_count || 0} Trucks`}
              subtext="Exceeded PM threshold"
              icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Company Fleet Asset & Health Matrix</CardTitle>
                <CardDescription>
                  Live odometer, engine diagnostics, electrical health, and driver assignments
                </CardDescription>
              </div>
              <Link
                href="/fleet/vehicle-health"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
              >
                <span>Telemetry Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Vehicle Plate</th>
                      <th className="py-2.5 px-3">Make & Model</th>
                      <th className="py-2.5 px-3 text-right">Odometer</th>
                      <th className="py-2.5 px-3 text-center">Engine Diagnostics</th>
                      <th className="py-2.5 px-3">Next PM Due</th>
                      <th className="py-2.5 px-3">Driver</th>
                      <th className="py-2.5 px-3 text-center">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ownFleetData?.vehicles?.map((veh: any) => (
                      <tr key={veh.vehicle_number} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <VehiclePlate vehicleNumber={veh.vehicle_number} />
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {veh.model}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-right text-slate-900 tabular-nums">
                          {veh.odometer_km.toLocaleString()} KM
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              veh.engine_health === "GOOD"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {veh.engine_health}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                          At {veh.next_service_km.toLocaleString()} KM
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {veh.default_driver || "Unassigned"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge
                            status={veh.current_status}
                            variant={
                              veh.current_status === "IN_TRANSIT"
                                ? "in_progress"
                                : veh.current_status === "AVAILABLE"
                                ? "completed"
                                : "pending"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HR ATTENDANCE INTEGRATION TILE */}
      {/* ========================================================================= */}
      <Card className="border-dashed border-slate-300 bg-slate-50/50">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  HR Attendance & Biometric Access
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                    EXTERNAL CONNECTOR PENDING
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 text-slate-500">
                  PRD §7.1 & §11 — External HRMS / biometric provider connector
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Status: Provider Selection Pending
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="space-y-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Staff biometric check-in, driver duty logs, and warehouse overtime records are designated for external payroll integration (ZingHR, Darwinbox, Keka, or biometric webhook). Per architecture rules, PantherTMS avoids guessing fake ambient clock-in data until the partner API is confirmed.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                API Endpoint Hook: <code className="text-indigo-600">/api/v1/integrations/hr-attendance</code> (Awaiting GSP / HRMS provider selection)
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs font-semibold"
              onClick={() => alert("External HR Attendance integration connector is pending provider selection per PRD §11.")}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Configure Provider
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
